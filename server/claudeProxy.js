const express = require("express");

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

function serverApiKey() {
  return (process.env.ANTHROPIC_API_KEY || "").trim();
}

function requestApiKey(req) {
  const header = req.headers["x-api-key"];
  const fromHeader = (Array.isArray(header) ? header[0] : header || "").trim();
  return fromHeader || serverApiKey();
}

function mountClaude(app) {
  app.get("/api/claude/status", (req, res) => {
    res.json({ configured: Boolean(serverApiKey()) });
  });

  app.post("/api/claude", express.json({ limit: "2mb" }), async (req, res) => {
    const apiKey = requestApiKey(req);
    if (!apiKey) {
      res.status(401).json({
        error: "Missing API key. Use Set API Key at the top right, or add ANTHROPIC_API_KEY to the environment.",
      });
      return;
    }

    try {
      const upstream = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(req.body),
      });
      const text = await upstream.text();
      res.status(upstream.status).type(upstream.headers.get("content-type") || "application/json").send(text);
    } catch (err) {
      res.status(502).json({ error: err.message || "Could not reach the Anthropic API." });
    }
  });
}

module.exports = { mountClaude, serverApiKey };
