import { Server } from "@hocuspocus/server";
import dotenv from "dotenv";

dotenv.config();

const port = Number(process.env.REALTIME_PORT || 1234);

const server = Server.configure({
  port,

  async onConnect(data) {
    const { documentName, requestParameters } = data;
    console.log(`[Realtime] Client connecting to room: "${documentName}" params:`, Object.fromEntries(requestParameters));
  },

  async onDisconnect(data) {
    const { documentName, clientsCount } = data;
    console.log(`[Realtime] Client disconnected from "${documentName}". Remaining clients: ${clientsCount}`);
  },

  async onChange(data) {
    const { documentName } = data;
    // Debounced snapshot saving to Django will be hooked here in Phase 2
  },
});

server.listen().then(() => {
  console.log(`[Realtime] Hocuspocus collaboration server listening on port ${port}`);
});
