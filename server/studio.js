const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const express = require("express");

const COOKIE = "mp_session";
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

function studioPassword() {
  return (process.env.STUDIO_PASSWORD || "").trim();
}

function dataPath() {
  return process.env.STUDIO_DATA_PATH || path.join(__dirname, "..", "data", "studio.json");
}

function emptyStudio() {
  return {
    clients: [],
    activeClientId: "",
    brief: {
      brand: "",
      audience: "",
      objective: "Awareness",
      tone: "Professional",
      keyMessage: "",
      constraints: "",
    },
    library: [],
    approvals: [],
    calendar: [],
    tracking: [],
    templates: [],
    voice: { samples: "", profile: "" },
    blogs: [],
    blogCalendar: [],
  };
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asString(value) {
  return typeof value === "string" ? value : "";
}

function sanitizeStudio(input) {
  const base = emptyStudio();
  const src = input && typeof input === "object" ? input : {};
  const brief = src.brief && typeof src.brief === "object" ? src.brief : {};
  const voice = src.voice && typeof src.voice === "object" ? src.voice : {};
  return {
    clients: asArray(src.clients),
    activeClientId: asString(src.activeClientId),
    brief: {
      brand: asString(brief.brand),
      audience: asString(brief.audience),
      objective: asString(brief.objective) || base.brief.objective,
      tone: asString(brief.tone) || base.brief.tone,
      keyMessage: asString(brief.keyMessage),
      constraints: asString(brief.constraints),
    },
    library: asArray(src.library),
    approvals: asArray(src.approvals),
    calendar: asArray(src.calendar),
    tracking: asArray(src.tracking),
    templates: asArray(src.templates),
    voice: {
      samples: asString(voice.samples),
      profile: asString(voice.profile),
    },
    blogs: asArray(src.blogs),
    blogCalendar: asArray(src.blogCalendar),
  };
}

function readStudio() {
  try {
    return sanitizeStudio(JSON.parse(fs.readFileSync(dataPath(), "utf8")));
  } catch {
    return emptyStudio();
  }
}

function writeStudio(data) {
  const file = dataPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const clean = sanitizeStudio(data);
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(clean, null, 2));
  fs.renameSync(tmp, file);
  return clean;
}

function signingKey() {
  return crypto.createHash("sha256").update(`mp-studio-v1:${studioPassword()}`).digest();
}

function signSession() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + SESSION_MS })).toString("base64url");
  const sig = crypto.createHmac("sha256", signingKey()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function verifySession(token) {
  if (!studioPassword() || !token || !String(token).includes(".")) return false;
  const parts = String(token).split(".");
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expected = crypto.createHmac("sha256", signingKey()).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}

function readCookie(req, name) {
  const header = req.headers.cookie || "";
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    if (trimmed.slice(0, eq) === name) return decodeURIComponent(trimmed.slice(eq + 1));
  }
  return "";
}

function cookieHeader(req, value, maxAge) {
  const forwarded = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const secure = Boolean(req.secure) || forwarded === "https";
  const bits = [
    `${COOKIE}=${encodeURIComponent(value)}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${maxAge}`,
  ];
  if (secure) bits.push("Secure");
  return bits.join("; ");
}

function passwordsMatch(input) {
  const expected = studioPassword();
  const given = String(input || "");
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (!expected || a.length !== b.length) {
    crypto.timingSafeEqual(Buffer.alloc(32, 1), Buffer.alloc(32, 1));
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

function loginPage({ configured }) {
  const notice = configured
    ? "This studio is private. Enter the password to continue."
    : "The server password is not configured. Add STUDIO_PASSWORD on the server, then try again.";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Marketing Studio</title>
  <style>
    body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #080E1A; color: #EEF4FF; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    form { width: min(420px, calc(100% - 32px)); background: #0D1525; border: 1px solid #1B2942; border-radius: 12px; padding: 28px; }
    h1 { font-size: 22px; margin: 0 0 8px; }
    p { color: #7B8AA8; font-size: 14px; line-height: 1.5; }
    label { display: block; font-size: 12px; margin-bottom: 6px; color: #EEF4FF; letter-spacing: 0.4px; }
    input { width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 8px; border: 1px solid #1B2942; background: #080E1A; color: #fff; font-size: 15px; }
    button { margin-top: 16px; width: 100%; padding: 10px 12px; border: 0; border-radius: 8px; background: #00D4B0; color: #04141A; font-weight: 700; cursor: pointer; }
    button:disabled { opacity: 0.6; cursor: default; }
    .err { color: #FF5C7A; font-size: 13px; min-height: 18px; margin-top: 10px; }
  </style>
</head>
<body>
  <form id="login">
    <h1>Marketing Studio</h1>
    <p>${notice}</p>
    <label for="password">Password</label>
    <input id="password" name="password" type="password" autocomplete="current-password" ${configured ? "" : "disabled"} />
    <div class="err" id="err"></div>
    <button type="submit" ${configured ? "" : "disabled"}>Sign in</button>
  </form>
  <script>
    document.getElementById("login").addEventListener("submit", async (event) => {
      event.preventDefault();
      const err = document.getElementById("err");
      err.textContent = "";
      const password = document.getElementById("password").value;
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      if (res.ok) { location.reload(); return; }
      const data = await res.json().catch(() => ({}));
      err.textContent = data.error || "Sign in failed.";
    });
  </script>
</body>
</html>`;
}

function wantsHtml(req) {
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  return String(req.headers.accept || "").includes("text/html");
}

function mountStudio(app) {
  app.use((req, res, next) => {
    const authed = verifySession(readCookie(req, COOKIE));
    if (req.path === "/api/login" && req.method === "POST") return next();
    if (req.path === "/api/logout" && req.method === "POST") return next();
    if (req.path.startsWith("/api/")) {
      if (!authed) {
        res.status(401).json({ error: "Sign in required." });
        return;
      }
      return next();
    }
    if (wantsHtml(req) && !authed) {
      res.status(200).type("html").send(loginPage({ configured: Boolean(studioPassword()) }));
      return;
    }
    next();
  });

  app.post("/api/login", express.json({ limit: "32kb" }), (req, res) => {
    if (!studioPassword()) {
      res.status(503).json({ error: "The server password is not configured." });
      return;
    }
    if (!passwordsMatch(req.body && req.body.password)) {
      res.status(401).json({ error: "Wrong password." });
      return;
    }
    res.setHeader("Set-Cookie", cookieHeader(req, signSession(), Math.floor(SESSION_MS / 1000)));
    res.json({ ok: true });
  });

  app.post("/api/logout", (req, res) => {
    res.setHeader("Set-Cookie", cookieHeader(req, "", 0));
    res.json({ ok: true });
  });

  app.get("/api/config", (req, res) => {
    res.json({ imageStudioUrl: (process.env.IMAGE_STUDIO_URL || "").trim() });
  });

  app.get("/api/studio", (req, res) => {
    res.json(readStudio());
  });

  app.put("/api/studio", express.json({ limit: "8mb" }), (req, res) => {
    res.json(writeStudio(req.body));
  });
}

module.exports = {
  mountStudio,
  emptyStudio,
  sanitizeStudio,
  verifySession,
  signSession,
  COOKIE,
};
