import { Server } from "@hocuspocus/server";
import dotenv from "dotenv";
import path from "path";
import { AuthContext, verifyRoomAccess } from "./auth.js";
import { log } from "./logger.js";
import { debounceRoomSave, flushRoomSave, loadRoomSnapshot } from "./persistence.js";
import { createRedisExtension } from "./redisExtension.js";
import { initRedisSubscriber } from "./redisSubscriber.js";


dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config();

const port = Number(process.env.REALTIME_PORT || 1234);

const redisExt = createRedisExtension();
const extensions = redisExt ? [redisExt] : [];

export const server = Server.configure({
  port,
  extensions,


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

    log("info", "User authenticated in room", {
      username: authContext.username,
      role: authContext.role,
      readOnly: data.connection.readOnly,
      room: documentName,
    });

    return {
      user: authContext,
    };
  },

  async onLoadDocument(data) {
    const { documentName, document } = data;
    log("info", "Loading document snapshot", { room: documentName });
    await loadRoomSnapshot(documentName, document);
    return document;
  },

  async beforeHandleMessage(data) {
    const { update, documentName } = data;
    const maxDocBytes = Number(process.env.MAX_DOCUMENT_BYTES || 1048576);
    if (update && update.byteLength > maxDocBytes) {
      log("warn", "Oversized message update rejected", {
        room: documentName,
        byteLength: update.byteLength,
        limit: maxDocBytes,
      });
      throw new Error(`Message update size (${update.byteLength} bytes) exceeds limit (${maxDocBytes} bytes)`);
    }
  },

  async onChange(data) {

    const { documentName, document } = data;
    debounceRoomSave(documentName, document);
  },

  async onStoreDocument(data) {
    const { documentName, document } = data;
    log("info", "Flushing document snapshot", { room: documentName });
    await flushRoomSave(documentName, document);
  },

  async onConnect(data) {
    const { documentName } = data;
    log("info", "Client connected to room", { room: documentName });
  },

  async onDisconnect(data) {
    const { documentName, clientsCount } = data;
    log("info", "Client disconnected from room", { room: documentName, remainingClients: clientsCount });
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
