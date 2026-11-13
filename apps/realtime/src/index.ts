import { Server } from "@hocuspocus/server";
import dotenv from "dotenv";
import { AuthContext, verifyRoomAccess } from "./auth.js";
import { debounceRoomSave, flushRoomSave, loadRoomSnapshot } from "./persistence.js";

dotenv.config();

const port = Number(process.env.REALTIME_PORT || 1234);

export const server = Server.configure({
  port,

  async onAuthenticate(data) {
    const { token, requestParameters, documentName } = data;
    const jwtToken = token || requestParameters.get("token") || undefined;
    const viewerToken = requestParameters.get("viewer_token") || undefined;
    const displayName = requestParameters.get("user") || undefined;

    const authContext = await verifyRoomAccess(documentName, jwtToken, viewerToken, displayName);

    if (authContext.role === "viewer") {
      data.connection.readOnly = true;
    }

    console.log(
      `[Realtime] Authenticated user "${authContext.username}" (role: ${authContext.role}, readOnly: ${data.connection.readOnly}) in room "${documentName}"`
    );

    return {
      user: authContext,
    };
  },

  async onLoadDocument(data) {
    const { documentName, document } = data;
    console.log(`[Realtime] Loading document state for room: "${documentName}"`);
    await loadRoomSnapshot(documentName, document);
    return document;
  },

  async onChange(data) {
    const { documentName, document } = data;
    debounceRoomSave(documentName, document);
  },

  async onStoreDocument(data) {
    const { documentName, document } = data;
    console.log(`[Realtime] Flushing document snapshot to storage for room: "${documentName}"`);
    await flushRoomSave(documentName, document);
  },

  async onConnect(data) {
    const { documentName } = data;
    console.log(`[Realtime] Client connected to room: "${documentName}"`);
  },

  async onDisconnect(data) {
    const { documentName, clientsCount } = data;
    console.log(`[Realtime] Client disconnected from "${documentName}". Remaining clients: ${clientsCount}`);
  },
});

if (process.env.NODE_ENV !== "test") {
  server.listen().then(() => {
    console.log(`[Realtime] Hocuspocus collaboration server listening on port ${port}`);
  });
}
