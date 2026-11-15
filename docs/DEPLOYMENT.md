# CodeSync Deployment Guide: Vercel + Microsoft Azure

This guide documents the production deployment of CodeSync using a hybrid architecture:
- **Frontend (`apps/web`)**: Hosted on **Vercel** with automatic Vite detection and edge reverse-proxying.
- **Backend Infrastructure**: Hosted on an **Azure Linux VM (Standard_B2s)** via Docker Compose.
- **Database**: **Azure Database for PostgreSQL Flexible Server (Standard_B1ms)** (Free for 12 months with Azure for Students).

---

## 1. Architecture Overview
 
- **Frontend**: Vercel serves the React SPA and proxies `/api/*` requests to the Azure VM via `apps/web/vercel.json`.
- **Backend Stack**:
  - `api`: Django 5.1 + Gunicorn on port `8000`.
  - `realtime-1` & `realtime-2`: Two Hocuspocus WebSocket instances on port `1234` load-balanced via Nginx `ip_hash`.
  - `redis`: Internal message broker and Yjs document sync.
  - `runner`: Celery worker with access to the VM's host Docker daemon (`/var/run/docker.sock`) to execute sandboxed code.
  - `nginx`: Ingress reverse proxy handling ports `80`, `443`, and `1234`.

---

## 2. Provision Azure Resources (Azure for Students)

### 2.1 Resource Group
Create a resource group in your target region:
```bash
az group create --name codesync-rg --location eastus
```

### 2.2 PostgreSQL Flexible Server (Free 12 Months)
```bash
az postgres flexible-server create \
  --resource-group codesync-rg \
  --name codesync-pg \
  --location eastus \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 16 \
  --admin-user codesync \
  --admin-password "<STRONG_PASSWORD>" \
  --yes

# Create database
az postgres flexible-server db create \
  --resource-group codesync-rg \
  --server-name codesync-pg \
  --database-name codesync

# Allow Azure services and inbound connections
az postgres flexible-server firewall-rule create \
  --resource-group codesync-rg \
  --name codesync-pg \
  --rule-name AllowAllAzure \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### 2.3 Azure Linux VM (Standard_B2s)
```bash
az vm create \
  --resource-group codesync-rg \
  --name codesync-vm \
  --image Ubuntu2404 \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-sku Standard

# Open required inbound ports in Network Security Group (NSG)
az vm open-port --resource-group codesync-rg --name codesync-vm --port 80 --priority 100
az vm open-port --resource-group codesync-rg --name codesync-vm --port 443 --priority 110
az vm open-port --resource-group codesync-rg --name codesync-vm --port 1234 --priority 120
```

---

## 3. Configure the Azure VM

### 3.1 SSH into VM
```bash
ssh azureuser@<VM_PUBLIC_IP>
```

### 3.2 Install Docker & Docker Compose Plugin
```bash
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin 

sudo usermod -aG docker azureuser
newgrp docker
```

### 3.3 Clone Repository & Set Up Environment
```bash
sudo git clone https://github.com/<YOUR_GITHUB_ORG>/codesync.git /opt/codesync
sudo chown -R azureuser:azureuser /opt/codesync
cd /opt/codesync

cp .env.production.example .env
nano .env
```
Fill in the values:
- `DJANGO_SECRET_KEY`: generated random string (50+ chars)
- `POSTGRES_HOST`: `codesync-pg.postgres.database.azure.com`
- `POSTGRES_PASSWORD`: `<STRONG_PASSWORD>`
- `INTERNAL_API_TOKEN`: generated random string (32+ chars)
- `DJANGO_CORS_ALLOWED_ORIGINS`: `https://your-app.vercel.app,https://*.vercel.app`

### 3.4 Build Sandbox Execution Images
```bash
cd /opt/codesync
docker build -t codesync-sandbox-python:latest docker/sandbox-python/
docker build -t codesync-sandbox-javascript:latest docker/sandbox-javascript/
docker build -t codesync-sandbox-cpp:latest docker/sandbox-cpp/
```

### 3.5 Launch Services & Run Migrations
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod up -d --build

# Run migrations and create superuser
docker compose exec api python manage.py migrate
docker compose exec api python manage.py createsuperuser
```

---

## 4. Deploy Frontend on Vercel

1. Log into [Vercel](https://vercel.com) and click **Add New... ➔ Project**.
2. Select your `codesync` GitHub repository.
3. In **Project Settings**:
   - **Root Directory**: `apps/web`
   - **Framework Preset**: `Vite`
4. In **Environment Variables**:
   - `VITE_REALTIME_URL`: `ws://<VM_PUBLIC_IP>:1234` (or `wss://<DOMAIN>:1234` when using custom domain with SSL).
5. In `apps/web/vercel.json`, ensure the proxy rewrite points to your Azure VM host:
   ```json
   {
     "source": "/api/:path*",
     "destination": "http://<VM_PUBLIC_IP>/api/:path*"
   }
   ```
6. Click **Deploy**.

---

## 5. Ongoing Updates & Future CI/CD

### 5.1 Manual Updates (Current)
Whenever you push updates to GitHub, pull the latest code on your Azure VM:
```bash
cd /opt/codesync
git pull origin main
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod up -d --build
```
Vercel will automatically rebuild and deploy the frontend whenever you push to `main`.

### 5.2 Future Automated CI/CD (After App Goes Live)
Once your live deployment is verified and running stably, you can automate VM deployments by adding this job to `.github/workflows/ci.yml`:
```yaml
  deploy-backend:
    name: Deploy Backend to Azure VM
    runs-on: ubuntu-latest
    needs: [python-test, node-test]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    steps:
      - name: SSH Deploy to Azure VM
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.AZURE_VM_IP }}
          username: azureuser
          key: ${{ secrets.AZURE_VM_SSH_KEY }}
          script: |
            cd /opt/codesync
            git pull origin main
            docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod up -d --build
            docker image prune -f
```
And adding `AZURE_VM_IP` and `AZURE_VM_SSH_KEY` to your GitHub Repository Secrets.
