/**
 * @jest-environment node
 */
const http = require("http");
const express = require("express");
const { mountClaude } = require("../server/claudeProxy");

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function request(port, method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        method,
        path,
        headers: {
          ...(payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {}),
          ...headers,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

describe("claude proxy", () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;
  let server;

  afterEach(async () => {
    if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalKey;
    if (server) {
      await new Promise((resolve) => server.close(resolve));
      server = null;
    }
    delete global.fetch;
    jest.restoreAllMocks();
  });

  test("reports when the server key is missing", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const app = express();
    mountClaude(app);
    server = await listen(app);
    const res = await request(server.address().port, "GET", "/api/claude/status");
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ configured: false });
  });

  test("rejects generation until a key is available", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy;
    const app = express();
    mountClaude(app);
    server = await listen(app);
    const res = await request(server.address().port, "POST", "/api/claude", { messages: [] });
    expect(res.status).toBe(401);
    expect(JSON.parse(res.body).error).toMatch(/Set API Key/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("uses the server key and does not require the browser key", async () => {
    process.env.ANTHROPIC_API_KEY = "server-key";
    const fetchSpy = jest.fn().mockResolvedValue({
      status: 200,
      headers: { get: () => "application/json" },
      text: async () => JSON.stringify({ content: [{ text: "draft" }] }),
    });
    global.fetch = fetchSpy;
    const app = express();
    mountClaude(app);
    server = await listen(app);
    const res = await request(server.address().port, "POST", "/api/claude", {
      model: "claude-sonnet-4-20250514",
      messages: [{ role: "user", content: "hello" }],
    });
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body).content[0].text).toBe("draft");
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/messages",
      expect.objectContaining({
        headers: expect.objectContaining({ "x-api-key": "server-key" }),
      })
    );
  });
});
