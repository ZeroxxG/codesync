/**
 * Realtime WebSocket CRDT Convergence Smoke Test
 * Connects two WebSocket clients to a room and verifies mutual Yjs text convergence.
 */
import { createRequire } from "node:module";
import http from "node:http";

const require = createRequire(import.meta.url);

// Support both host paths and container paths
let HocuspocusProvider, Y, WebSocket;

try {
  const hp = await import("../apps/web/node_modules/@hocuspocus/provider/dist/hocuspocus-provider.esm.js");
  HocuspocusProvider = hp.HocuspocusProvider;
} catch {
  try {
    const hp = require("@hocuspocus/provider");
    HocuspocusProvider = hp.HocuspocusProvider;
  } catch (e) {
    console.error("Could not load @hocuspocus/provider:", e.message);
    process.exit(1);
  }
}

try {
  Y = await import("../apps/realtime/node_modules/yjs/dist/yjs.mjs");
} catch {
  try {
    Y = require("yjs");
  } catch (e) {
    console.error("Could not load yjs:", e.message);
    process.exit(1);
  }
}

// In Node 21+, global.WebSocket exists. Otherwise fallback to ws package.
if (typeof globalThis.WebSocket !== "undefined") {
  WebSocket = globalThis.WebSocket;
} else {
  try {
    WebSocket = (await import("../apps/realtime/node_modules/ws/index.js")).default;
  } catch {
    WebSocket = require("ws");
  }
}

const roomSlug = process.argv[2] || `smoke-room-${Date.now()}`;
const targetUrl = process.argv[3] || "ws://localhost:1234";

console.log(`Testing realtime CRDT convergence for room "${roomSlug}" on ${targetUrl}...`);

async function runConvergence() {
  let p1, p2;

  const connectPromise = (name, user) => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout connecting client ${user}`));
      }, 8000);

      const provider = new HocuspocusProvider({
        url: targetUrl,
        name: roomSlug,
        token: "anonymous",
        parameters: { user },
        WebSocketPolyfill: WebSocket,
        onSynced: ({ state }) => {
          if (state) {
            clearTimeout(timeout);
            resolve(provider);
          }
        },
        onAuthenticationFailed: () => {
          clearTimeout(timeout);
          reject(new Error(`Auth failed for client ${user}`));
        },
      });
    });
  };

  try {
    p1 = await connectPromise("doc1", "TesterA");
    p2 = await connectPromise("doc2", "TesterB");
    console.log("  ✓ Both WebSocket clients connected and synced with Hocuspocus");

    const text1 = p1.document.getText("monaco");
    const text2 = p2.document.getText("monaco");

    const payload = `print("CodeSync CRDT Smoke Test: ${Date.now()}")\n`;

    const convergencePromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`CRDT sync timeout. P2 text: "${text2.toString()}"`));
      }, 5000);

      text2.observe(() => {
        if (text2.toString() === payload) {
          clearTimeout(timer);
          resolve();
        }
      });
    });

    // Client 1 types text
    text1.insert(0, payload);

    await convergencePromise;
    console.log("  ✓ CRDT edit converged successfully across WebSocket clients!");
    return 0;
  } finally {
    if (p1) p1.destroy();
    if (p2) p2.destroy();
  }
}

runConvergence()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("  ✗ Convergence failed:", err.message);
    process.exit(1);
  });
