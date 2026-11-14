import { Redis } from "ioredis";
import type { Hocuspocus } from "@hocuspocus/server";

const activeSubscribers: Redis[] = [];

export async function initRedisSubscriber(server: Hocuspocus): Promise<Redis> {
  const rawUrl = process.env.REDIS_URL || "redis://localhost:6379/0";
  const redisUrl = rawUrl.replace("://localhost:", "://127.0.0.1:");

  const sub = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });

  activeSubscribers.push(sub);

  sub.on("pmessage", (_pattern, channel, message) => {
    try {
      const parts = channel.split(":");
      if (parts.length >= 3) {
        const roomSlug = parts[1];
        const doc = server.documents.get(roomSlug);
        if (doc) {
          doc.broadcastStateless(message);
        }
      }
    } catch (e) {
      console.error("[Realtime] Error broadcasting Redis run message:", e);
    }
  });



  sub.on("error", (err) => {
    console.warn("[Realtime] Redis subscriber warning:", err.message);
  });

  await sub.psubscribe("room:*:runs");

  return sub;
}

export async function stopRedisSubscriber(): Promise<void> {
  while (activeSubscribers.length > 0) {
    const s = activeSubscribers.pop();
    if (s) {
      try {
        await s.quit();
      } catch {
        // ignore teardown errors
      }
    }
  }
}
