import { Server } from "@hocuspocus/server";
import dotenv from "dotenv";
import path from "path";
import { AuthContext, verifyRoomAccess } from "./auth.js";
import { debounceRoomSave, flushRoomSave, loadRoomSnapshot } from "./persistence.js";
import { initRedisSubscriber } from "./redisSubscriber.js";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config();

const port = Number(process.env.REALTIME_PORT || 1234);

export const server = Server.configure({
  port,

  async onAuthenticate(data) {
    const { token, requestParameters, documentName } = data;
    const isJwt = (t?: string) => Boolean(t && t.split(".").length === 3);

    const rawToken = token || requestParameters.get("token") || undefined;
    const jwtToken = isJwt(rawToken) ? rawToken : undefined;

    const viewerToken = requestParameters.get("viewer_token") || undefined;
    const editorToken = requestParameters.get("editor_token") || undefined;
    const inviteToken =
      requestParameters.get("invite_token") ||
      requestParameters.get("invite") ||
      (!isJwt(rawToken) && rawToken && rawToken !== "anonymous" ? rawToken : undefined);
    const displayName = requestParameters.get("user") || undefined;

    const authContext = await verifyRoomAccess(
      documentName,
      jwtToken,
      inviteToken,
      displayName,
      viewerToken,
      editorToken
    );

    if (authContext.role === "viewer") {
      data.connection.readOnly = true;
    } else {
      data.connection.readOnly = false;
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

  async onRequest(data) {
    const { request, response, instance } = data;
    const url = request.url?.split("?")[0];
    if (url === "/health" || url === "/health/") {
      response.writeHead(200, {
        "Content-Type": "application/json",
      });
      response.end(
        JSON.stringify({
          status: "healthy",
          service: "codesync-realtime",
          port,
          documents_count: instance.documents.size,
          timestamp: new Date().toISOString(),
        })
      );
      // Falsy rejection halts Hocuspocus default response without throwing an unhandled error
      return Promise.reject();
    }
  },

});


if (process.env.NODE_ENV !== "test") {
  server.listen().then(() => {
    console.log(`[Realtime] Hocuspocus collaboration server listening on port ${port}`);
    initRedisSubscriber(server);
  });
}
