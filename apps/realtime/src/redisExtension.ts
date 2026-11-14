import { Redis as HocuspocusRedis } from "@hocuspocus/extension-redis";
import { log } from "./logger.js";

export function createRedisExtension(): HocuspocusRedis | null {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379/0";
  const normalizedUrl = redisUrl.replace("://localhost:", "://127.0.0.1:");

  try {
    const url = new URL(normalizedUrl);
    const host = url.hostname || "127.0.0.1";
    const port = Number(url.port) || 6379;

    log("info", "Configuring Hocuspocus Redis extension for clustering", {
      host,
      port,
      prefix: "codesync:yjs",
    });

    return new HocuspocusRedis({
      host,
      port,
      prefix: "codesync:yjs",
      identifier: `realtime-${process.pid}-${Math.random().toString(36).substring(2, 7)}`,
    });
  } catch (err: any) {
    log("error", "Failed to initialize Hocuspocus Redis extension", {
      error: err.message,
    });
    return null;
  }
}
