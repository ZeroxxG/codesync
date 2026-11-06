# Setup checklist (for you, before starting the agent)

## 1. Tools on your machine
- Git, Node.js 20+, Python 3.12+, Docker (with Docker Compose), and Claude Code
- Check: `git --version`, `node -v`, `python3 --version`, `docker compose version`

## 2. GitHub
1. Create a new **empty** repo on GitHub (no README, no .gitignore, no license) so the first push doesn't conflict.
2. Authenticate: run `gh auth login`, or set up an SSH key.
3. Make sure commits link to your account:
   ```
   git config --global user.name "Your Name"
   git config --global user.email "your-github-email@example.com"
   ```
   The email must be one that's verified on your GitHub account, or commits won't appear on your contribution graph.

## 3. Put these files in a folder and push the first commit
```
cd codesync
git init -b main
git add .
git commit -m "add project brief and agent rules"
git remote add origin <YOUR REPO URL>
git push -u origin main
```
Confirm that `git push` worked from your terminal before involving the agent.

## 4. Fill in the placeholder
Open `CLAUDE.md` and replace `<PASTE YOUR GITHUB REPO URL HERE>` with your real repo URL.

## 5. Start the agent
```
cd codesync
claude
```
Then paste the "Session 0" prompt from `docs/PHASE_PROMPTS.md`, and continue phase by phase.

## 6. Habits that make this project worth having
- Read every phase's diff before moving on. You must be able to explain every part.
- Don't skip the adversarial sandbox tests in Phase 3.
- Deploy the runner on a separate VM from the rest of the app once Phase 3 works.
- Run the load test yourself and keep the real numbers. Only use measured results on your resume.
- If an interviewer asks, say plainly that you directed a coding agent and reviewed its work.
