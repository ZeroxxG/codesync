import { Server } from "@hocuspocus/server";
import dotenv from "dotenv";
import { AuthContext, verifyRoomAccess } from "./auth.js";

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

    console.log(
      `[Realtime] Authenticated user "${authContext.username}" (role: ${authContext.role}, guest: ${authContext.isGuest}) in room "${documentName}"`
    );

    return {
      user: authContext,
    };
  },

  async onConnect(data) {
    const { documentName, requestParameters } = data;
    console.log(`[Realtime] Client connected to room: "${documentName}"`);
  },

  async onDisconnect(data) {
    const { documentName, clientsCount } = data;
    console.log(`[Realtime] Client disconnected from "${documentName}". Remaining clients: ${clientsCount}`);
  },

  async onChange(data) {
    const { documentName } = data;
    // Debounced snapshot saving to Django wired in Step 9
  },
});

if (process.env.NODE_ENV !== "test") {
  server.listen().then(() => {
    console.log(`[Realtime] Hocuspocus collaboration server listening on port ${port}`);
  });
}
