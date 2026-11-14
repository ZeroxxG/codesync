import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Hocuspocus } from "@hocuspocus/server";
import { Redis as HocuspocusRedis } from "@hocuspocus/extension-redis";
import Redis from "ioredis";
import { initRedisSubscriber, stopRedisSubscriber } from "../src/redisSubscriber.js";

describe("Multi-Instance Realtime Clustering via Redis", () => {
  let server1: Hocuspocus;
  let server2: Hocuspocus;
  let redisPublisher: Redis;

  const redisHost = "127.0.0.1";
  const redisPort = 6379;

  beforeAll(async () => {
    redisPublisher = new Redis({ host: redisHost, port: redisPort });

    // Server Instance 1
    const ext1 = new HocuspocusRedis({
      host: redisHost,
      port: redisPort,
      prefix: "codesync:test:yjs",
      identifier: "realtime-srv-1",
    });

    server1 = new Hocuspocus({
      port: 1281,
      extensions: [ext1],
    });
    await server1.listen();
    await initRedisSubscriber(server1);

    // Server Instance 2
    const ext2 = new HocuspocusRedis({
      host: redisHost,
      port: redisPort,
      prefix: "codesync:test:yjs",
      identifier: "realtime-srv-2",
    });

    server2 = new Hocuspocus({
      port: 1282,
      extensions: [ext2],
    });
    await server2.listen();
    await initRedisSubscriber(server2);
  });

  afterAll(async () => {
    const withTimeout = (p: Promise<any>, ms = 2000) =>
      Promise.race([p, new Promise((resolve) => setTimeout(resolve, ms))]);

    try {
      await withTimeout(server1?.destroy());
    } catch {}
    try {
      await withTimeout(server2?.destroy());
    } catch {}
    try {
      await withTimeout(stopRedisSubscriber());
    } catch {}
    try {
      if (redisPublisher) {
        redisPublisher.disconnect();
      }
    } catch {}
  }, 10000);

  it("synchronizes Yjs edits across two distinct server instances via Redis", async () => {
    const editRoom = `cluster-edit-${Date.now()}`;
    const conn1 = await server1.openDirectConnection(editRoom);
    const conn2 = await server2.openDirectConnection(editRoom);

    expect(conn1.document).toBeDefined();
    expect(conn2.document).toBeDefined();

    // Client on Server 1 edits code
    await conn1.transact((doc: any) => {
      doc.getText("monaco").insert(0, "print('hello from server 1')\n");
    });

    // Wait up to 1500ms for Redis pub/sub to propagate to Server 2
    let synced = false;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 50));
      const text2 = conn2.document?.getText("monaco").toString();
      if (text2?.includes("hello from server 1")) {
        synced = true;
        break;
      }
    }

    expect(synced).toBe(true);
    expect(conn2.document?.getText("monaco").toString()).toBe("print('hello from server 1')\n");

    // Client on Server 2 appends code
    await conn2.transact((doc: any) => {
      const len = doc.getText("monaco").length;
      doc.getText("monaco").insert(len, "print('appended by server 2')\n");
    });

    // Wait for Server 1 to receive update from Server 2
    let syncedBack = false;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 50));
      const text1 = conn1.document?.getText("monaco").toString();
      if (text1?.includes("appended by server 2")) {
        syncedBack = true;
        break;
      }
    }

    expect(syncedBack).toBe(true);
    const finalText = "print('hello from server 1')\nprint('appended by server 2')\n";
    expect(conn1.document?.getText("monaco").toString()).toBe(finalText);
    expect(conn2.document?.getText("monaco").toString()).toBe(finalText);

    await conn1.disconnect();
    await conn2.disconnect();
  });

  it("relays code execution output to clients connected across both server instances", async () => {
    const runRoom = `cluster-run-${Date.now()}`;
    const conn1 = await server1.openDirectConnection(runRoom);
    const conn2 = await server2.openDirectConnection(runRoom);

    const received1: any[] = [];
    const received2: any[] = [];

    const doc1 = server1.documents.get(runRoom);
    const doc2 = server2.documents.get(runRoom);

    expect(doc1).toBeDefined();
    expect(doc2).toBeDefined();

    const origBroadcast1 = doc1.broadcastStateless.bind(doc1);
    const origBroadcast2 = doc2.broadcastStateless.bind(doc2);

    doc1.broadcastStateless = (payload: string) => {
      received1.push(JSON.parse(payload));
      origBroadcast1(payload);
    };
    doc2.broadcastStateless = (payload: string) => {
      received2.push(JSON.parse(payload));
      origBroadcast2(payload);
    };


    // Publish run chunk to Redis
    const runChunkEvent = {
      type: "run_output",
      run_id: "test-run-cluster-123",
      room_slug: runRoom,
      chunk: "Execution output streamed across cluster\n",
    };

    await redisPublisher.publish(`room:${runRoom}:runs`, JSON.stringify(runChunkEvent));

    // Wait for message arrival on both instances
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 50));
      if (received1.length > 0 && received2.length > 0) break;
    }

    expect(received1.length).toBeGreaterThanOrEqual(1);
    expect(received2.length).toBeGreaterThanOrEqual(1);
    expect(received1[0].chunk).toBe("Execution output streamed across cluster\n");
    expect(received2[0].chunk).toBe("Execution output streamed across cluster\n");

    await conn1.disconnect();
    await conn2.disconnect();
  });
});
