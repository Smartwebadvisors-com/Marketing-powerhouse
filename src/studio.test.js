/**
 * @jest-environment node
 */
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const express = require("express");
const { mountStudio } = require("../server/studio");
const { mountClaude } = require("../server/claudeProxy");

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function request(port, method, urlPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        method,
        path: urlPath,
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
        res.on("end", () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function cookiePair(res) {
  const raw = res.headers["set-cookie"];
  const line = Array.isArray(raw) ? raw[0] : raw;
  return line ? line.split(";")[0] : "";
}

function buildApp() {
  const app = express();
  mountStudio(app);
  mountClaude(app);
  app.get("/", (req, res) => {
    res.type("html").send('<div id="root">Marketing Powerhouse</div>');
  });
  return app;
}

describe("studio login and saved records", () => {
  const originalPassword = process.env.STUDIO_PASSWORD;
  const originalData = process.env.STUDIO_DATA_PATH;
  const originalImage = process.env.IMAGE_STUDIO_URL;
  let server;
  let dataFile;

  beforeEach(() => {
    dataFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "mp-studio-")), "studio.json");
    process.env.STUDIO_DATA_PATH = dataFile;
    delete process.env.STUDIO_PASSWORD;
    delete process.env.IMAGE_STUDIO_URL;
  });

  afterEach(async () => {
    if (originalPassword === undefined) delete process.env.STUDIO_PASSWORD;
    else process.env.STUDIO_PASSWORD = originalPassword;
    if (originalData === undefined) delete process.env.STUDIO_DATA_PATH;
    else process.env.STUDIO_DATA_PATH = originalData;
    if (originalImage === undefined) delete process.env.IMAGE_STUDIO_URL;
    else process.env.IMAGE_STUDIO_URL = originalImage;
    if (server) {
      await new Promise((resolve) => server.close(resolve));
      server = null;
    }
  });

  test("shows the password page and refuses studio data until the password is set", async () => {
    server = await listen(buildApp());
    const port = server.address().port;
    const page = await request(port, "GET", "/", null, { Accept: "text/html" });
    expect(page.status).toBe(200);
    expect(page.body).toMatch(/server password is not configured/i);
    expect(page.body).not.toMatch(/id="root"/);

    const login = await request(port, "POST", "/api/login", { password: "anything" });
    expect(login.status).toBe(503);
    expect(JSON.parse(login.body).error).toMatch(/not configured/i);

    const studio = await request(port, "GET", "/api/studio");
    expect(studio.status).toBe(401);
  });

  test("accepts one password, saves the studio, and keeps the API key out of the file", async () => {
    process.env.STUDIO_PASSWORD = "studio-pass";
    process.env.IMAGE_STUDIO_URL = "http://127.0.0.1:3999";
    server = await listen(buildApp());
    const port = server.address().port;

    const wrong = await request(port, "POST", "/api/login", { password: "nope" });
    expect(wrong.status).toBe(401);
    expect(wrong.headers["set-cookie"]).toBeUndefined();

    const login = await request(port, "POST", "/api/login", { password: "studio-pass" }, {
      "x-forwarded-proto": "https",
    });
    expect(login.status).toBe(200);
    const cookie = cookiePair(login);
    expect(cookie).toMatch(/^mp_session=/);
    expect(login.headers["set-cookie"][0]).toMatch(/HttpOnly/);
    expect(login.headers["set-cookie"][0]).toMatch(/Secure/);

    const locked = await request(port, "GET", "/api/claude/status");
    expect(locked.status).toBe(401);

    const headers = { Cookie: cookie, Accept: "text/html" };
    const home = await request(port, "GET", "/", null, headers);
    expect(home.body).toMatch(/id="root"/);

    const config = await request(port, "GET", "/api/config", null, headers);
    expect(JSON.parse(config.body)).toEqual({ imageStudioUrl: "http://127.0.0.1:3999" });

    const saved = await request(port, "PUT", "/api/studio", {
      clients: [{ id: "c1", businessName: "Northwind Studio" }],
      activeClientId: "c1",
      library: [{ platform: "LinkedIn", text: "Launch day", clientId: "c1" }],
      apiKey: "sk-ant-secret",
    }, headers);
    expect(saved.status).toBe(200);
    const body = JSON.parse(saved.body);
    expect(body.clients[0].businessName).toBe("Northwind Studio");
    expect(body.apiKey).toBeUndefined();
    expect(fs.readFileSync(dataFile, "utf8")).not.toMatch(/sk-ant-secret/);

    const again = await request(port, "GET", "/api/studio", null, headers);
    expect(JSON.parse(again.body).library[0].text).toBe("Launch day");

    const loggedOut = await request(port, "POST", "/api/logout", null, headers);
    expect(loggedOut.headers["set-cookie"][0]).toMatch(/Max-Age=0/);
    const after = await request(port, "GET", "/api/studio", null, { Cookie: cookiePair(loggedOut) });
    expect(after.status).toBe(401);
  });
});
