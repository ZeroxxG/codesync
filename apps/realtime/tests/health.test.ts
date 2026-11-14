import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import { server } from "../src/index.js";

describe("Realtime Health Check", () => {
  const testPort = 1299;

  beforeAll(async () => {
    server.configure({ port: testPort });
    await server.listen();
  });

  afterAll(async () => {
    await server.destroy();
  });

  it("responds with 200 OK and healthy status on /health", async () => {
    const data = await new Promise<{ status: string; service: string }>((resolve, reject) => {
      http
        .get(`http://127.0.0.1:${testPort}/health`, (res) => {
          expect(res.statusCode).toBe(200);
          expect(res.headers["content-type"]).toContain("application/json");

          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => {
            try {
              resolve(JSON.parse(body));
            } catch (err) {
              reject(err);
            }
          });
        })
        .on("error", reject);
    });

    expect(data.status).toBe("healthy");
    expect(data.service).toBe("codesync-realtime");
  });
});
