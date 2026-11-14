/**
 * CodeSync Realtime Multi-Room / Concurrent-Editor Load Testing Benchmark
 * Simulates M rooms with N concurrent WebSocket editors per room syncing CRDT edits via clustered Hocuspocus.
 */
import { createRequire } from "node:module";
import WebSocket from "../apps/realtime/node_modules/ws/index.js";
import { HocuspocusProvider } from "../apps/web/node_modules/@hocuspocus/provider/dist/hocuspocus-provider.esm.js";

const require = createRequire(import.meta.url);
const { Hocuspocus } = require("../apps/realtime/node_modules/@hocuspocus/server");
const { Redis: HocuspocusRedis } = require("../apps/realtime/node_modules/@hocuspocus/extension-redis");

// Ignore teardown disconnect noise from ioredis
process.on("uncaughtException", (err) => {
  if (err.message?.includes("Connection is closed") || err.code === "ECONNABORTED") return;
  console.error("Uncaught exception:", err);
});

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    rooms: 5,
    clientsPerRoom: 4,
    editsPerClient: 10,
    url: process.env.BENCHMARK_REALTIME_URL || null,
    standalone: true,
    token: "anonymous",
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--rooms" && args[i + 1]) config.rooms = parseInt(args[++i], 10);
    else if (args[i] === "--clients" && args[i + 1]) config.clientsPerRoom = parseInt(args[++i], 10);
    else if (args[i] === "--edits" && args[i + 1]) config.editsPerClient = parseInt(args[++i], 10);
    else if (args[i] === "--url" && args[i + 1]) {
      config.url = args[++i];
      config.standalone = false;
    } else if (args[i] === "--token" && args[i + 1]) config.token = args[++i];
  }
  return config;
}

function percentile(sortedArr, p) {
  if (sortedArr.length === 0) return 0;
  const idx = Math.min(Math.floor((p / 100) * sortedArr.length), sortedArr.length - 1);
  return sortedArr[idx];
}

async function runBenchmark() {
  const config = parseArgs();
  const totalClients = config.rooms * config.clientsPerRoom;

  let server1 = null;
  let server2 = null;
  let serverUrls = [];

  if (config.standalone) {
    console.log("Starting clustered Hocuspocus test nodes with Redis backend...");
    const ext1 = new HocuspocusRedis({
      host: "127.0.0.1",
      port: 6379,
      prefix: "bench:yjs:cluster",
      identifier: "bench-srv-1",
    });
    server1 = new Hocuspocus({ port: 1285, extensions: [ext1] });
    await server1.listen();

    const ext2 = new HocuspocusRedis({
      host: "127.0.0.1",
      port: 6379,
      prefix: "bench:yjs:cluster",
      identifier: "bench-srv-2",
    });
    server2 = new Hocuspocus({ port: 1286, extensions: [ext2] });
    await server2.listen();

    serverUrls = ["ws://127.0.0.1:1285", "ws://127.0.0.1:1286"];
    console.log("Clustered instances ready on ports 1285 & 1286.\n");
  } else {
    serverUrls = [config.url];
  }

  console.log(`====================================================`);
  console.log(` CodeSync Realtime Load Test Benchmark`);
  console.log(` Cluster Endpoints:    ${serverUrls.join(", ")}`);
  console.log(` Concurrent Rooms (M): ${config.rooms}`);
  console.log(` Clients Per Room (N): ${config.clientsPerRoom}`);
  console.log(` Total Active Editors: ${totalClients}`);
  console.log(` Edits Per Client:     ${config.editsPerClient}`);
  console.log(` Total Target Ops:     ${totalClients * config.editsPerClient}`);
  console.log(`====================================================\n`);

  const connectionLatencies = [];
  const editPropagationLatencies = [];
  let connectionErrors = 0;
  let editErrors = 0;

  const roomGroups = [];
  const startTime = Date.now();

  // Phase 1: Connect and sync all clients across all rooms
  console.log(`Connecting and syncing ${totalClients} clients across ${config.rooms} rooms...`);
  for (let r = 0; r < config.rooms; r++) {
    const roomSlug = `bench-room-${Date.now()}-${r}`;
    const clients = [];

    for (let c = 0; c < config.clientsPerRoom; c++) {
      const targetUrl = serverUrls[c % serverUrls.length];
      const connStart = performance.now();

      const providerPromise = new Promise((resolve) => {
        let settled = false;
        const provider = new HocuspocusProvider({
          url: targetUrl,
          name: roomSlug,
          token: config.token,
          WebSocketPolyfill: WebSocket,
          onSynced: ({ state }) => {
            if (state && !settled) {
              settled = true;
              const connEnd = performance.now();
              connectionLatencies.push(connEnd - connStart);
              resolve(provider);
            }
          },
          onAuthenticationFailed: () => {
            if (!settled) {
              settled = true;
              connectionErrors++;
              resolve(null);
            }
          },
        });

        setTimeout(() => {
          if (!settled) {
            settled = true;
            connectionErrors++;
            resolve(null);
          }
        }, 8000);
      });

      clients.push(providerPromise);
    }
    roomGroups.push({ roomSlug, clientsPromises: clients });
  }

  // Await all connections
  const resolvedRooms = [];
  for (const group of roomGroups) {
    const providers = (await Promise.all(group.clientsPromises)).filter(Boolean);
    resolvedRooms.push({ roomSlug: group.roomSlug, providers });
  }

  const activeConnected = resolvedRooms.reduce((acc, r) => acc + r.providers.length, 0);
  console.log(`Successfully connected & synced ${activeConnected}/${totalClients} clients.\n`);

  // Phase 2: Perform concurrent cross-server edits and measure propagation latency
  console.log(`Beginning concurrent collaborative editing...`);
  const editStartOverall = performance.now();
  const editTasks = [];

  for (const group of resolvedRooms) {
    if (group.providers.length < 2) continue;

    // Sender on Server 1, Receiver on Server 2
    const sender = group.providers[0];
    const receiver = group.providers[1];

    const task = (async () => {
      for (let e = 0; e < config.editsPerClient; e++) {
        const marker = `[op-${group.roomSlug}-${e}-${Date.now()}]`;
        const sendTimestamp = performance.now();

        const propagationPromise = new Promise((resolve) => {
          let resolved = false;
          const handler = () => {
            const text = receiver.document.getText("monaco").toString();
            if (text.includes(marker) && !resolved) {
              resolved = true;
              const receiveTimestamp = performance.now();
              editPropagationLatencies.push(receiveTimestamp - sendTimestamp);
              receiver.document.getText("monaco").unobserve(handler);
              resolve(true);
            }
          };

          receiver.document.getText("monaco").observe(handler);

          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              editErrors++;
              try { receiver.document.getText("monaco").unobserve(handler); } catch {}
              resolve(false);
            }
          }, 5000);
        });

        sender.document.getText("monaco").insert(0, `${marker}\n`);
        await propagationPromise;
        await new Promise((r) => setTimeout(r, 10));
      }
    })();

    editTasks.push(task);
  }

  await Promise.all(editTasks);
  const editEndOverall = performance.now();

  // Phase 3: Cleanup
  for (const group of resolvedRooms) {
    for (const p of group.providers) {
      try {
        p.destroy();
      } catch {}
    }
  }

  await new Promise((r) => setTimeout(r, 400));

  if (server1) {
    try { await server1.destroy(); } catch {}
  }
  if (server2) {
    try { await server2.destroy(); } catch {}
  }

  // Calculate statistics
  connectionLatencies.sort((a, b) => a - b);
  editPropagationLatencies.sort((a, b) => a - b);

  const totalEditDurationSec = (editEndOverall - editStartOverall) / 1000;
  const totalEditsMeasured = editPropagationLatencies.length;
  const throughput = totalEditDurationSec > 0 ? (totalEditsMeasured / totalEditDurationSec).toFixed(1) : "0";

  const results = {
    totalClients,
    activeConnected,
    connectionErrors,
    connections: {
      minMs: connectionLatencies[0] ? connectionLatencies[0].toFixed(2) : "0",
      p50Ms: percentile(connectionLatencies, 50).toFixed(2),
      p90Ms: percentile(connectionLatencies, 90).toFixed(2),
      p95Ms: percentile(connectionLatencies, 95).toFixed(2),
      p99Ms: percentile(connectionLatencies, 99).toFixed(2),
      maxMs: connectionLatencies[connectionLatencies.length - 1] ? connectionLatencies[connectionLatencies.length - 1].toFixed(2) : "0",
    },
    crdtPropagation: {
      samples: totalEditsMeasured,
      errors: editErrors,
      minMs: editPropagationLatencies[0] ? editPropagationLatencies[0].toFixed(2) : "0",
      p50Ms: percentile(editPropagationLatencies, 50).toFixed(2),
      p90Ms: percentile(editPropagationLatencies, 90).toFixed(2),
      p95Ms: percentile(editPropagationLatencies, 95).toFixed(2),
      p99Ms: percentile(editPropagationLatencies, 99).toFixed(2),
      maxMs: editPropagationLatencies[editPropagationLatencies.length - 1] ? editPropagationLatencies[editPropagationLatencies.length - 1].toFixed(2) : "0",
      throughputOpsSec: throughput,
    },
    totalTimeSec: ((Date.now() - startTime) / 1000).toFixed(2),
  };

  console.log(`\n================== RESULTS ==================`);
  console.log(`Connection Latency (Handshake + Initial Sync):`);
  console.log(`  Min: ${results.connections.minMs} ms | p50: ${results.connections.p50Ms} ms | p95: ${results.connections.p95Ms} ms | p99: ${results.connections.p99Ms} ms | Max: ${results.connections.maxMs} ms`);
  console.log(`CRDT Cross-Instance Propagation Latency:`);
  console.log(`  Samples: ${results.crdtPropagation.samples} ops`);
  console.log(`  Min: ${results.crdtPropagation.minMs} ms | p50: ${results.crdtPropagation.p50Ms} ms | p95: ${results.crdtPropagation.p95Ms} ms | p99: ${results.crdtPropagation.p99Ms} ms | Max: ${results.crdtPropagation.maxMs} ms`);
  console.log(`  Throughput: ${results.crdtPropagation.throughputOpsSec} sync ops/sec`);
  console.log(`  Errors:     ${results.crdtPropagation.errors}`);
  console.log(`=============================================\n`);

  return results;
}

runBenchmark().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error("Benchmark failed with error:", err);
  process.exit(1);
});
