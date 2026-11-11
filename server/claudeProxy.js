const express = require("express");
const { createHash } = require("node:crypto");

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
  const modelCache = new Map();
  async function availableModel(apiKey) {
    const configured = (process.env.ANTHROPIC_MODEL || "").trim();
    if (configured) return configured;
    const cacheKey = createHash('sha256').update(apiKey).digest('hex');
    const cached = modelCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) return cached.model;
    const response = await fetch('https://api.anthropic.com/v1/models?limit=100', {
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = null; }
    if (response.status >= 400) {
      const error = new Error(data?.error?.message || 'Could not list models available to this API key.');
      error.status = response.status;
      throw error;
    }
    const models = (Array.isArray(data?.data) ? data.data : [])
      .filter(item => typeof item.id === 'string' && /sonnet/i.test(item.id))
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
    if (!models.length) {
      const error = new Error('No Sonnet model is available to this API key. Set ANTHROPIC_MODEL on the server to a model your account can access.');
      error.status = 503;
      throw error;
    }
    if (modelCache.size >= 20) modelCache.delete(modelCache.keys().next().value);
    modelCache.set(cacheKey, { model: models[0].id, expires: Date.now() + 5 * 60 * 1000 });
    return models[0].id;
  }

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
      const model = await availableModel(apiKey);
      const upstream = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({ ...req.body, model }),
      });
      if (upstream.status === 404) modelCache.delete(createHash('sha256').update(apiKey).digest('hex'));
      const text = await upstream.text();
      res.status(upstream.status).type(upstream.headers.get("content-type") || "application/json").send(text);
    } catch (err) {
      res.status(err.status || 502).json({ error: err.message || "Could not reach the Anthropic API." });
    }
  });
}

module.exports = { mountClaude, serverApiKey };
