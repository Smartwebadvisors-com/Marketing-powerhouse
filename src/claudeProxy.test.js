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
  const originalModel = process.env.ANTHROPIC_MODEL;
  let server;

  beforeEach(() => { delete process.env.ANTHROPIC_MODEL; });

  afterEach(async () => {
    if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalKey;
    if (originalModel === undefined) delete process.env.ANTHROPIC_MODEL;
    else process.env.ANTHROPIC_MODEL = originalModel;
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
    const fetchSpy = jest.fn().mockResolvedValueOnce({
      status: 200,
      text: async () => JSON.stringify({ data: [
        { id: 'claude-sonnet-new', created_at: '2026-10-01T00:00:00Z' },
        { id: 'claude-opus-newer', created_at: '2026-11-01T00:00:00Z' },
        { id: 'claude-sonnet-old', created_at: '2025-01-01T00:00:00Z' },
      ] }),
    }).mockResolvedValue({
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
    const generation = fetchSpy.mock.calls.find(([url]) => url.endsWith('/messages'));
    expect(JSON.parse(generation[1].body).model).toBe('claude-sonnet-new');
    await request(server.address().port, 'POST', '/api/claude', { messages: [] });
    expect(fetchSpy.mock.calls.filter(([url]) => url.includes('/models'))).toHaveLength(1);
  });

  test('honors a configured server model without model discovery', async () => {
    process.env.ANTHROPIC_API_KEY = 'server-key';
    process.env.ANTHROPIC_MODEL = 'account-approved-model';
    global.fetch = jest.fn().mockResolvedValue({ status: 200, headers: { get: () => 'application/json' }, text: async () => '{}' });
    const app = express(); mountClaude(app); server = await listen(app);
    const res = await request(server.address().port, 'POST', '/api/claude', { model: 'obsolete-browser-model', messages: [] });
    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(global.fetch.mock.calls[0][1].body).model).toBe('account-approved-model');
  });

  test('reports a rejected model-list request without attempting generation', async () => {
    process.env.ANTHROPIC_API_KEY = 'server-key';
    global.fetch = jest.fn().mockResolvedValue({ status: 401, text: async () => JSON.stringify({ error: { message: 'Invalid API key' } }) });
    const app = express(); mountClaude(app); server = await listen(app);
    const res = await request(server.address().port, 'POST', '/api/claude', { messages: [] });
    expect(res.status).toBe(401);
    expect(JSON.parse(res.body).error).toBe('Invalid API key');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('does not silently substitute another model family when Sonnet is unavailable', async () => {
    process.env.ANTHROPIC_API_KEY = 'server-key';
    global.fetch = jest.fn().mockResolvedValue({ status: 200, text: async () => JSON.stringify({ data: [{ id: 'claude-opus-example' }] }) });
    const app = express(); mountClaude(app); server = await listen(app);
    const res = await request(server.address().port, 'POST', '/api/claude', { messages: [] });
    expect(res.status).toBe(503);
    expect(JSON.parse(res.body).error).toContain('ANTHROPIC_MODEL');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
