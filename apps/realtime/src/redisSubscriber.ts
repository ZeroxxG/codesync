import { Redis } from "ioredis";
import type { Hocuspocus } from "@hocuspocus/server";

let subscriber: Redis | null = null;

export function initRedisSubscriber(server: Hocuspocus): Redis {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379/0";
  console.log(`[Realtime] Initializing Redis subscriber for execution runs on ${redisUrl}`);

  subscriber = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });

  subscriber.psubscribe("room:*:runs", (err, count) => {
    if (err) {
      console.error("[Realtime] Failed to subscribe to Redis execution channels:", err);
    } else {
      console.log(`[Realtime] Subscribed to ${count} execution channels pattern (room:*:runs)`);
    }
  });

  subscriber.on("pmessage", (_pattern, channel, message) => {
    try {
      // channel format: room:<slug>:runs
      const parts = channel.split(":");
      if (parts.length >= 3) {
        const roomSlug = parts[1];
        const doc = server.documents.get(roomSlug);
        if (doc) {
          // Broadcast the execution event to all connected clients in this room
          doc.broadcastStateless(message);
        }
      }
    } catch (e) {
      console.error("[Realtime] Error broadcasting Redis run message:", e);
    }
  });

  subscriber.on("error", (err) => {
    console.warn("[Realtime] Redis subscriber warning:", err.message);
  });

  return subscriber;
}

export async function stopRedisSubscriber(): Promise<void> {
  if (subscriber) {
    await subscriber.quit();
    subscriber = null;
  }
}
