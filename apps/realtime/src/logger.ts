export type LogLevel = "debug" | "info" | "warn" | "error";

export function log(level: LogLevel, message: string, meta: Record<string, any> = {}): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    service: "codesync-realtime",
    message,
    ...meta,
  };

  const jsonStr = JSON.stringify(entry);
  if (level === "error") {
    console.error(jsonStr);
  } else if (level === "warn") {
    console.warn(jsonStr);
  } else {
    console.log(jsonStr);
  }
}
