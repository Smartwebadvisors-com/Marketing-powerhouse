import { useState, useEffect, useRef } from "react";

const COLORS = {
  bg: "#080E1A",
  card: "#0D1525",
  cardAlt: "#111B33",
  border: "#1B2942",
  teal: "#00D4B0",
  tealDim: "#00A88C",
  white: "#EEF4FF",
  muted: "#7B8AA8",
  danger: "#FF5C7A",
  warn: "#FFB547",
  good: "#3BE0A6",
};

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";

const SECTIONS = [
  { id: "dashboard", label: "Dashboard", icon: "▦", group: "Overview" },
  { id: "brief", label: "Content Brief", icon: "✎", group: "Plan" },
  { id: "generator", label: "Generator", icon: "✦", group: "Create" },
  { id: "bulk", label: "Bulk Generate", icon: "⎘", group: "Create" },
  { id: "campaign", label: "Campaign Builder", icon: "◈", group: "Create" },
  { id: "quality", label: "Quality Score", icon: "★", group: "Analyze" },
  { id: "predictor", label: "Performance Predictor", icon: "↗", group: "Analyze" },
  { id: "abtester", label: "A/B Tester", icon: "⇄", group: "Analyze" },
  { id: "reviewer", label: "AI Reviewer", icon: "◉", group: "Analyze" },
  { id: "repurpose", label: "Repurpose", icon: "♻", group: "Create" },
  { id: "trending", label: "Trending Topics", icon: "🔥", group: "Research" },
  { id: "competitor", label: "Competitor Analysis", icon: "⊙", group: "Research" },
  { id: "audit", label: "Content Audit", icon: "✓", group: "Research" },
  { id: "hashtag", label: "Hashtag Analyzer", icon: "#", group: "Research" },
  { id: "approval", label: "Approval Workflow", icon: "▶", group: "Manage" },
  { id: "calendar", label: "Calendar", icon: "▤", group: "Manage" },
  { id: "scheduling", label: "Scheduling", icon: "◷", group: "Manage" },
  { id: "tracker", label: "Performance Tracker", icon: "◎", group: "Manage" },
  { id: "digest", label: "Weekly Digest", icon: "✉", group: "Manage" },
  { id: "library", label: "Saved Library", icon: "❑", group: "Assets" },
  { id: "templates", label: "Templates", icon: "▢", group: "Assets" },
  { id: "voice", label: "Voice Trainer", icon: "♫", group: "Assets" },
];

const PLATFORMS = ["LinkedIn", "Twitter/X", "Instagram", "Facebook", "TikTok", "YouTube", "Threads", "Pinterest"];

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true") return resolve();
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)));
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.dataset.src = src;
    s.onload = () => { s.dataset.loaded = "true"; resolve(); };
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

async function readDocAsText(file) {
  const name = (file.name || "").toLowerCase();
  if (name.endsWith(".docx")) {
    if (!window.mammoth) {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js");
    }
    const arrayBuffer = await file.arrayBuffer();
    const result = await window.mammoth.extractRawText({ arrayBuffer });
    return result.value || "";
  }
  return await file.text();
}

function downloadCSV(filename, headers, rows) {
  const escape = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(escape).join(",")];
  for (const row of rows) lines.push(row.map(escape).join(","));
  const csv = lines.join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function callClaude(apiKey, system, userPrompt, maxTokens = 2048) {
  if (!apiKey) throw new Error("Missing API key. Open Settings (top right) and paste your Anthropic API key.");
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`API ${res.status}: ${txt}`);
  }
  const data = await res.json();
  return data.content?.map((c) => c.text).join("\n") || "";
}

function useLocalState(key, initial) {
  const [v, setV] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {}
  }, [key, v]);
  return [v, setV];
}

const styles = {
  app: {
    background: COLORS.bg,
    color: COLORS.white,
    minHeight: "100vh",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif",
    display: "flex",
  },
  sidebar: {
    width: 260,
    background: COLORS.card,
    borderRight: `1px solid ${COLORS.border}`,
    padding: "20px 0",
    overflowY: "auto",
    position: "sticky",
    top: 0,
    height: "100vh",
    flexShrink: 0,
  },
  brand: {
    padding: "0 22px 18px",
    borderBottom: `1px solid ${COLORS.border}`,
    marginBottom: 14,
  },
  brandTitle: { fontSize: 18, fontWeight: 700, color: COLORS.white, letterSpacing: 0.3 },
  brandSub: { fontSize: 11, color: COLORS.teal, marginTop: 4, textTransform: "uppercase", letterSpacing: 2 },
  groupLabel: {
    fontSize: 10,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    padding: "14px 22px 6px",
    fontWeight: 600,
  },
  navItem: (active) => ({
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 22px",
    cursor: "pointer",
    fontSize: 13.5,
    color: active ? COLORS.teal : COLORS.white,
    background: active ? "rgba(0,212,176,0.08)" : "transparent",
    borderLeft: active ? `3px solid ${COLORS.teal}` : "3px solid transparent",
    transition: "background 0.15s",
    userSelect: "none",
  }),
  navIcon: { width: 18, textAlign: "center", opacity: 0.85 },
  main: { flex: 1, padding: "28px 36px", minWidth: 0 },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 26,
    paddingBottom: 18,
    borderBottom: `1px solid ${COLORS.border}`,
  },
  h1: { fontSize: 24, fontWeight: 700, margin: 0 },
  subtitle: { fontSize: 13, color: COLORS.muted, marginTop: 4 },
  btn: {
    background: COLORS.teal,
    color: "#04141A",
    border: "none",
    padding: "10px 18px",
    borderRadius: 8,
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 13,
  },
  btnGhost: {
    background: "transparent",
    color: COLORS.white,
    border: `1px solid ${COLORS.border}`,
    padding: "9px 16px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 13,
  },
  card: {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    padding: 22,
    marginBottom: 18,
  },
  input: {
    width: "100%",
    background: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    color: COLORS.white,
    padding: "10px 12px",
    borderRadius: 8,
    fontSize: 13.5,
    boxSizing: "border-box",
    fontFamily: "inherit",
  },
  textarea: {
    width: "100%",
    background: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    color: COLORS.white,
    padding: "12px",
    borderRadius: 8,
    fontSize: 13.5,
    minHeight: 110,
    boxSizing: "border-box",
    fontFamily: "inherit",
    resize: "vertical",
  },
  label: { display: "block", fontSize: 12, color: COLORS.muted, marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 },
  pill: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 99,
    background: "rgba(0,212,176,0.12)",
    color: COLORS.teal,
    fontSize: 11,
    fontWeight: 600,
    marginRight: 6,
  },
  output: {
    background: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 10,
    padding: 18,
    whiteSpace: "pre-wrap",
    fontSize: 14,
    lineHeight: 1.6,
    fontFamily: "inherit",
    maxHeight: 600,
    overflowY: "auto",
  },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 22 },
  stat: { background: COLORS.card, border: `1px solid ${COLORS.border}`, padding: 18, borderRadius: 12 },
  statValue: { fontSize: 28, fontWeight: 700, color: COLORS.teal, marginTop: 4 },
  statLabel: { fontSize: 11, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 1 },
  spinner: {
    display: "inline-block",
    width: 14,
    height: 14,
    border: `2px solid rgba(255,255,255,0.2)`,
    borderTopColor: COLORS.teal,
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    marginRight: 8,
    verticalAlign: "middle",
  },
};

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select style={styles.input} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function Button({ children, onClick, loading, ghost, style }) {
  return (
    <button
      style={{ ...(ghost ? styles.btnGhost : styles.btn), opacity: loading ? 0.6 : 1, ...style }}
      onClick={onClick}
      disabled={loading}
    >
      {loading && <span style={styles.spinner} />}
      {children}
    </button>
  );
}

function Output({ text, loading }) {
  if (loading) {
    return (
      <div style={styles.output}>
        <span style={styles.spinner} /> Generating with Claude Sonnet 4...
      </div>
    );
  }
  if (!text) return null;
  return <div style={styles.output}>{text}</div>;
}

function DocUploader({ onText, label = "Upload Brand Doc" }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const handle = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setErr("");
    try {
      const text = await readDocAsText(file);
      if (!text.trim()) throw new Error("No readable text found in file.");
      onText(text);
    } catch (ex) {
      setErr(ex.message || "Failed to read file");
    }
    setBusy(false);
  };
  return (
    <div style={{ display: "inline-block" }}>
      <input ref={inputRef} type="file" accept=".txt,.docx" style={{ display: "none" }} onChange={handle} />
      <Button ghost loading={busy} onClick={() => inputRef.current?.click()}>{label}</Button>
      {err && <div style={{ color: COLORS.danger, marginTop: 6, fontSize: 12 }}>{err}</div>}
    </div>
  );
}

function SectionHeader({ title, subtitle, actions }) {
  return (
    <div style={styles.header}>
      <div>
        <h1 style={styles.h1}>{title}</h1>
        <div style={styles.subtitle}>{subtitle}</div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>{actions}</div>
    </div>
  );
}

// ============ SECTIONS ============

function Dashboard({ library, setActive }) {
  const totalPosts = library.length;
  const platforms = new Set(library.map((l) => l.platform)).size;
  return (
    <div>
      <SectionHeader title="Agency Dashboard" subtitle="Marketing Powerhouse · Social Studio overview" />
      <div style={styles.statGrid}>
        <div style={styles.stat}>
          <div style={styles.statLabel}>Saved Posts</div>
          <div style={styles.statValue}>{totalPosts}</div>
        </div>
        <div style={styles.stat}>
          <div style={styles.statLabel}>Platforms Active</div>
          <div style={styles.statValue}>{platforms}</div>
        </div>
        <div style={styles.stat}>
          <div style={styles.statLabel}>Tools Available</div>
          <div style={styles.statValue}>22</div>
        </div>
        <div style={styles.stat}>
          <div style={styles.statLabel}>Model</div>
          <div style={{ ...styles.statValue, fontSize: 16, marginTop: 8 }}>Sonnet 4</div>
        </div>
      </div>
      <div style={styles.card}>
        <h3 style={{ marginTop: 0 }}>Quick Start</h3>
        <p style={{ color: COLORS.muted, fontSize: 14 }}>
          Build a content brief, generate posts across platforms, score quality, schedule them, and track results.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button onClick={() => setActive("brief")}>Start a Brief →</Button>
          <Button ghost onClick={() => setActive("generator")}>
            Open Generator
          </Button>
          <Button ghost onClick={() => setActive("calendar")}>
            View Calendar
          </Button>
        </div>
      </div>
      <div style={styles.card}>
        <h3 style={{ marginTop: 0 }}>Recent Activity</h3>
        {library.length === 0 ? (
          <div style={{ color: COLORS.muted, fontSize: 13 }}>No saved content yet. Generate your first post to begin.</div>
        ) : (
          library.slice(-5).reverse().map((it, i) => (
            <div key={i} style={{ padding: "10px 0", borderBottom: `1px solid ${COLORS.border}` }}>
              <span style={styles.pill}>{it.platform}</span>
              <span style={{ fontSize: 13 }}>{(it.text || "").slice(0, 100)}...</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ContentBrief({ apiKey, brief, setBrief }) {
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const run = async () => {
    setLoading(true);
    setErr("");
    try {
      const sys = "You are a senior brand strategist at a top-tier creative agency.";
      const prompt = `Build a complete content brief.

Brand: ${brief.brand}
Audience: ${brief.audience}
Objective: ${brief.objective}
Tone: ${brief.tone}
Key Message: ${brief.keyMessage}
Constraints: ${brief.constraints}

Deliver: (1) positioning statement, (2) three message pillars, (3) tone guardrails, (4) success metrics, (5) creative angles (5 ideas).`;
      const txt = await callClaude(apiKey, sys, prompt);
      setOut(txt);
    } catch (e) {
      setErr(e.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <SectionHeader title="Content Brief" subtitle="Define the strategic foundation for every piece you generate." />
      <div style={styles.card}>
        <div style={styles.row}>
          <Field label="Brand / Client">
            <input style={styles.input} value={brief.brand} onChange={(e) => setBrief({ ...brief, brand: e.target.value })} placeholder="Acme Inc." />
          </Field>
          <Field label="Target Audience">
            <input style={styles.input} value={brief.audience} onChange={(e) => setBrief({ ...brief, audience: e.target.value })} placeholder="B2B founders, 30-50, US/EU" />
          </Field>
        </div>
        <div style={styles.row}>
          <Field label="Primary Objective">
            <Select value={brief.objective} onChange={(v) => setBrief({ ...brief, objective: v })} options={["Awareness", "Engagement", "Lead Generation", "Sales", "Retention", "Recruiting"]} />
          </Field>
          <Field label="Tone of Voice">
            <Select value={brief.tone} onChange={(v) => setBrief({ ...brief, tone: v })} options={["Professional", "Witty", "Bold", "Educational", "Inspirational", "Casual", "Authoritative"]} />
          </Field>
        </div>
        <Field label="Key Message">
          <div style={{ marginBottom: 8 }}>
            <DocUploader onText={(t) => setBrief({ ...brief, keyMessage: t })} />
          </div>
          <textarea style={styles.textarea} value={brief.keyMessage} onChange={(e) => setBrief({ ...brief, keyMessage: e.target.value })} placeholder="What's the one thing you want the audience to remember? Or upload a brand doc." />
        </Field>
        <Field label="Constraints & Guardrails">
          <textarea style={styles.textarea} value={brief.constraints} onChange={(e) => setBrief({ ...brief, constraints: e.target.value })} placeholder="Compliance, banned words, mandatories..." />
        </Field>
        <Button onClick={run} loading={loading}>Generate Strategic Brief</Button>
        {err && <div style={{ color: COLORS.danger, marginTop: 12, fontSize: 13 }}>{err}</div>}
      </div>
      <Output text={out} loading={loading} />
    </div>
  );
}

function Generator({ apiKey, brief, library, setLibrary }) {
  const [platform, setPlatform] = useState("LinkedIn");
  const [topic, setTopic] = useState("");
  const [variants, setVariants] = useState(3);
  const [cta, setCta] = useState("Learn more");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const run = async () => {
    setLoading(true);
    setErr("");
    try {
      const sys = `You are an expert social media copywriter for ${brief.brand || "a leading brand"}. Tone: ${brief.tone}. Audience: ${brief.audience}.`;
      const prompt = `Write ${variants} distinct ${platform} post variants on: "${topic}".

Each post should:
- Hook in the first line
- Match platform best practices and length
- End with this CTA: "${cta}"
- Include 3-5 relevant hashtags (for platforms that use them)

Label each variant clearly: "Variant 1", "Variant 2", etc.`;
      const txt = await callClaude(apiKey, sys, prompt, 2500);
      setOut(txt);
    } catch (e) {
      setErr(e.message);
    }
    setLoading(false);
  };

  const save = () => {
    if (!out) return;
    setLibrary([...library, { platform, text: out, topic, savedAt: new Date().toISOString() }]);
  };

  return (
    <div>
      <SectionHeader title="Generator" subtitle="Multi-variant post writer tuned to your brief." />
      <div style={styles.card}>
        <div style={styles.row}>
          <Field label="Platform"><Select value={platform} onChange={setPlatform} options={PLATFORMS} /></Field>
          <Field label="Variants">
            <Select value={String(variants)} onChange={(v) => setVariants(Number(v))} options={["1", "2", "3", "5"]} />
          </Field>
        </div>
        <Field label="Topic / Angle">
          <input style={styles.input} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. why founders should obsess over retention" />
        </Field>
        <Field label="Call to Action">
          <input style={styles.input} value={cta} onChange={(e) => setCta(e.target.value)} />
        </Field>
        <div style={{ display: "flex", gap: 10 }}>
          <Button onClick={run} loading={loading}>Generate</Button>
          {out && <Button ghost onClick={save}>Save to Library</Button>}
        </div>
        {err && <div style={{ color: COLORS.danger, marginTop: 12, fontSize: 13 }}>{err}</div>}
      </div>
      <Output text={out} loading={loading} />
    </div>
  );
}

function BulkGenerate({ apiKey, brief, library, setLibrary }) {
  const [topics, setTopics] = useState("");
  const [platform, setPlatform] = useState("LinkedIn");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const run = async () => {
    setLoading(true);
    setErr("");
    try {
      const list = topics.split("\n").filter((t) => t.trim());
      const sys = `You are a prolific ${platform} copywriter. Brand tone: ${brief.tone}.`;
      const prompt = `Write a separate ${platform} post for each topic below. Number them. Each post must be polished and ready to publish.

Topics:
${list.map((t, i) => `${i + 1}. ${t}`).join("\n")}`;
      const txt = await callClaude(apiKey, sys, prompt, 4000);
      setOut(txt);
    } catch (e) {
      setErr(e.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <SectionHeader title="Bulk Generate" subtitle="Turn a list of topics into a queue of ready-to-post content." />
      <div style={styles.card}>
        <Field label="Platform"><Select value={platform} onChange={setPlatform} options={PLATFORMS} /></Field>
        <Field label="Topics (one per line)">
          <textarea style={{ ...styles.textarea, minHeight: 180 }} value={topics} onChange={(e) => setTopics(e.target.value)} placeholder={"Why retention matters more than acquisition\nThe death of vanity metrics\n3 lessons from our worst launch"} />
        </Field>
        <Button onClick={run} loading={loading}>Generate All Posts</Button>
        {out && (
          <Button ghost style={{ marginLeft: 10 }} onClick={() => setLibrary([...library, { platform, text: out, topic: "Bulk batch", savedAt: new Date().toISOString() }])}>
            Save Batch
          </Button>
        )}
        {err && <div style={{ color: COLORS.danger, marginTop: 12, fontSize: 13 }}>{err}</div>}
      </div>
      <Output text={out} loading={loading} />
    </div>
  );
}

function CampaignBuilder({ apiKey, brief }) {
  const [theme, setTheme] = useState("");
  const [duration, setDuration] = useState("2 weeks");
  const [platforms, setPlatforms] = useState("LinkedIn, Twitter/X, Instagram");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const run = async () => {
    setLoading(true);
    setErr("");
    try {
      const sys = "You are a senior campaign strategist at a top creative agency.";
      const prompt = `Build a multi-platform campaign plan.

Brand: ${brief.brand}
Audience: ${brief.audience}
Campaign Theme: ${theme}
Duration: ${duration}
Platforms: ${platforms}

Deliver:
1. Big idea (one sentence)
2. Week-by-week content arc
3. Per-platform post breakdown with examples
4. KPIs to track
5. Risk / mitigation table`;
      const txt = await callClaude(apiKey, sys, prompt, 3000);
      setOut(txt);
    } catch (e) {
      setErr(e.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <SectionHeader title="Campaign Builder" subtitle="Orchestrate connected campaigns across platforms." />
      <div style={styles.card}>
        <Field label="Campaign Theme">
          <input style={styles.input} value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="e.g. 'The Builder's Edge' product launch" />
        </Field>
        <div style={styles.row}>
          <Field label="Duration">
            <Select value={duration} onChange={setDuration} options={["1 week", "2 weeks", "1 month", "Quarter"]} />
          </Field>
          <Field label="Platforms">
            <input style={styles.input} value={platforms} onChange={(e) => setPlatforms(e.target.value)} />
          </Field>
        </div>
        <Button onClick={run} loading={loading}>Build Campaign</Button>
        {err && <div style={{ color: COLORS.danger, marginTop: 12, fontSize: 13 }}>{err}</div>}
      </div>
      <Output text={out} loading={loading} />
    </div>
  );
}

function QualityScore({ apiKey }) {
  const [content, setContent] = useState("");
  const [platform, setPlatform] = useState("LinkedIn");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const run = async () => {
    setLoading(true);
    setErr("");
    try {
      const sys = "You are a strict content quality auditor. You score posts honestly with specific evidence.";
      const prompt = `Evaluate this ${platform} post and return scores 0-10 for each category, plus a final overall score 0-100.

Categories: Hook strength, Clarity, Relevance to audience, Emotional impact, Specificity, CTA quality, Platform fit, Brevity, Originality, Shareability.

Then list: 3 strengths, 3 weaknesses, and a rewritten "even better" version.

POST:
${content}`;
      const txt = await callClaude(apiKey, sys, prompt, 2000);
      setOut(txt);
    } catch (e) {
      setErr(e.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <SectionHeader title="Quality Score" subtitle="Honest, evidence-based scoring of any post." />
      <div style={styles.card}>
        <Field label="Platform"><Select value={platform} onChange={setPlatform} options={PLATFORMS} /></Field>
        <Field label="Paste a post to evaluate">
          <textarea style={styles.textarea} value={content} onChange={(e) => setContent(e.target.value)} />
        </Field>
        <Button onClick={run} loading={loading}>Score Post</Button>
        {err && <div style={{ color: COLORS.danger, marginTop: 12, fontSize: 13 }}>{err}</div>}
      </div>
      <Output text={out} loading={loading} />
    </div>
  );
}

function PerformancePredictor({ apiKey }) {
  const [content, setContent] = useState("");
  const [platform, setPlatform] = useState("LinkedIn");
  const [audience, setAudience] = useState("");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const run = async () => {
    setLoading(true);
    setErr("");
    try {
      const sys = "You are a social media performance analyst. Predict engagement honestly using observable signals from the copy.";
      const prompt = `Predict performance for this ${platform} post targeting: ${audience}.

Return:
1. Predicted engagement rate band (low/med/high) with reasoning
2. Expected reactions vs comments vs shares mix
3. Top 3 friction points
4. Two concrete edits that would boost performance

POST:
${content}`;
      const txt = await callClaude(apiKey, sys, prompt, 1800);
      setOut(txt);
    } catch (e) {
      setErr(e.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <SectionHeader title="Performance Predictor" subtitle="Forecast likely reach and engagement before you post." />
      <div style={styles.card}>
        <div style={styles.row}>
          <Field label="Platform"><Select value={platform} onChange={setPlatform} options={PLATFORMS} /></Field>
          <Field label="Audience"><input style={styles.input} value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. B2B founders" /></Field>
        </div>
        <Field label="Post copy">
          <textarea style={styles.textarea} value={content} onChange={(e) => setContent(e.target.value)} />
        </Field>
        <Button onClick={run} loading={loading}>Predict Performance</Button>
        {err && <div style={{ color: COLORS.danger, marginTop: 12, fontSize: 13 }}>{err}</div>}
      </div>
      <Output text={out} loading={loading} />
    </div>
  );
}

function ABTester({ apiKey }) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [platform, setPlatform] = useState("LinkedIn");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const run = async () => {
    setLoading(true);
    setErr("");
    try {
      const sys = "You are an A/B testing expert. Pick a winner and justify it with copywriting principles.";
      const prompt = `Compare these two ${platform} posts and declare a winner.

Return:
- Winner (A or B) with confidence (low/med/high)
- Reasoning: hook, clarity, CTA, platform fit
- A merged "best of both" version

VARIANT A:
${a}

VARIANT B:
${b}`;
      const txt = await callClaude(apiKey, sys, prompt, 2000);
      setOut(txt);
    } catch (e) {
      setErr(e.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <SectionHeader title="A/B Tester" subtitle="Pit two variants against each other and merge the winner." />
      <div style={styles.card}>
        <Field label="Platform"><Select value={platform} onChange={setPlatform} options={PLATFORMS} /></Field>
        <div style={styles.row}>
          <Field label="Variant A"><textarea style={styles.textarea} value={a} onChange={(e) => setA(e.target.value)} /></Field>
          <Field label="Variant B"><textarea style={styles.textarea} value={b} onChange={(e) => setB(e.target.value)} /></Field>
        </div>
        <Button onClick={run} loading={loading}>Run A/B Analysis</Button>
        {err && <div style={{ color: COLORS.danger, marginTop: 12, fontSize: 13 }}>{err}</div>}
      </div>
      <Output text={out} loading={loading} />
    </div>
  );
}

function AIReviewer({ apiKey, brief }) {
  const [content, setContent] = useState("");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const run = async () => {
    setLoading(true);
    setErr("");
    try {
      const sys = `You are a senior creative director reviewing junior work. Be candid but constructive. Brand voice: ${brief.tone}.`;
      const prompt = `Review this content as if you were a creative director at a top agency. Give:
1. First impression (one line)
2. What's working
3. What needs to change (specific)
4. Brand alignment check (Brand: ${brief.brand})
5. Sign-off decision: APPROVED / REVISIONS NEEDED / REJECTED

CONTENT:
${content}`;
      const txt = await callClaude(apiKey, sys, prompt, 1800);
      setOut(txt);
    } catch (e) {
      setErr(e.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <SectionHeader title="AI Reviewer" subtitle="Get a creative-director-level review of any draft." />
      <div style={styles.card}>
        <Field label="Content to review">
          <textarea style={styles.textarea} value={content} onChange={(e) => setContent(e.target.value)} />
        </Field>
        <Button onClick={run} loading={loading}>Get Senior Review</Button>
        {err && <div style={{ color: COLORS.danger, marginTop: 12, fontSize: 13 }}>{err}</div>}
      </div>
      <Output text={out} loading={loading} />
    </div>
  );
}

function Repurpose({ apiKey }) {
  const [source, setSource] = useState("");
  const [targets, setTargets] = useState("Twitter/X thread, Instagram carousel, LinkedIn post, YouTube short script");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const run = async () => {
    setLoading(true);
    setErr("");
    try {
      const sys = "You are an expert at content repurposing. Preserve the core idea while fitting each platform's native format.";
      const prompt = `Repurpose the source content into these formats: ${targets}.

For each, deliver platform-native output (not a summary). Label each section.

SOURCE:
${source}`;
      const txt = await callClaude(apiKey, sys, prompt, 3500);
      setOut(txt);
    } catch (e) {
      setErr(e.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <SectionHeader title="Repurpose" subtitle="One source → many platform-native formats." />
      <div style={styles.card}>
        <Field label="Source content (blog, transcript, email, etc.)">
          <textarea style={{ ...styles.textarea, minHeight: 180 }} value={source} onChange={(e) => setSource(e.target.value)} />
        </Field>
        <Field label="Target formats (comma-separated)">
          <input style={styles.input} value={targets} onChange={(e) => setTargets(e.target.value)} />
        </Field>
        <Button onClick={run} loading={loading}>Repurpose</Button>
        {err && <div style={{ color: COLORS.danger, marginTop: 12, fontSize: 13 }}>{err}</div>}
      </div>
      <Output text={out} loading={loading} />
    </div>
  );
}

function TrendingTopics({ apiKey }) {
  const [industry, setIndustry] = useState("");
  const [platform, setPlatform] = useState("LinkedIn");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const run = async () => {
    setLoading(true);
    setErr("");
    try {
      const sys = "You are a trend analyst. Surface durable themes (not fads) backed by reasoning, not links.";
      const prompt = `Identify 10 trending content angles for "${industry}" on ${platform} right now.

For each: title, why it resonates, suggested hook line, and a sample first sentence of a post.`;
      const txt = await callClaude(apiKey, sys, prompt, 2500);
      setOut(txt);
    } catch (e) {
      setErr(e.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <SectionHeader title="Trending Topics" subtitle="Find angles that are resonating right now." />
      <div style={styles.card}>
        <div style={styles.row}>
          <Field label="Industry / Niche"><input style={styles.input} value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. B2B SaaS" /></Field>
          <Field label="Platform"><Select value={platform} onChange={setPlatform} options={PLATFORMS} /></Field>
        </div>
        <Button onClick={run} loading={loading}>Find Trends</Button>
        {err && <div style={{ color: COLORS.danger, marginTop: 12, fontSize: 13 }}>{err}</div>}
      </div>
      <Output text={out} loading={loading} />
    </div>
  );
}

function CompetitorAnalysis({ apiKey }) {
  const [competitor, setCompetitor] = useState("");
  const [angle, setAngle] = useState("");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const run = async () => {
    setLoading(true);
    setErr("");
    try {
      const sys = "You are a competitive intelligence analyst for marketing teams.";
      const prompt = `Profile competitor: "${competitor}". Focus angle: "${angle || "social content strategy"}".

Deliver:
1. Likely positioning & audience
2. Content pillars they own
3. Content gaps you could exploit
4. 5 hooks they would never write — and you should
5. A 30-day differentiation plan`;
      const txt = await callClaude(apiKey, sys, prompt, 2500);
      setOut(txt);
    } catch (e) {
      setErr(e.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <SectionHeader title="Competitor Analysis" subtitle="Find the gaps competitors are leaving on the table." />
      <div style={styles.card}>
        <div style={styles.row}>
          <Field label="Competitor"><input style={styles.input} value={competitor} onChange={(e) => setCompetitor(e.target.value)} placeholder="Brand or handle" /></Field>
          <Field label="Focus angle"><input style={styles.input} value={angle} onChange={(e) => setAngle(e.target.value)} placeholder="e.g. their LinkedIn play" /></Field>
        </div>
        <Button onClick={run} loading={loading}>Analyze</Button>
        {err && <div style={{ color: COLORS.danger, marginTop: 12, fontSize: 13 }}>{err}</div>}
      </div>
      <Output text={out} loading={loading} />
    </div>
  );
}

function ContentAudit({ apiKey }) {
  const [posts, setPosts] = useState("");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const run = async () => {
    setLoading(true);
    setErr("");
    try {
      const sys = "You are an editorial auditor. Look for patterns, gaps, and pillars across a body of work.";
      const prompt = `Audit the following posts as a body of work. Identify:
1. Dominant themes (with counts)
2. Tone consistency issues
3. Missing content types
4. 3 strongest pieces and why
5. 3 weakest pieces and why
6. Strategic recommendations

POSTS (separated by ---):
${posts}`;
      const txt = await callClaude(apiKey, sys, prompt, 2500);
      setOut(txt);
    } catch (e) {
      setErr(e.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <SectionHeader title="Content Audit" subtitle="See your whole catalog with fresh, ruthless eyes." />
      <div style={styles.card}>
        <Field label="Paste posts (separate each with ---)">
          <textarea style={{ ...styles.textarea, minHeight: 220 }} value={posts} onChange={(e) => setPosts(e.target.value)} />
        </Field>
        <Button onClick={run} loading={loading}>Audit Content</Button>
        {err && <div style={{ color: COLORS.danger, marginTop: 12, fontSize: 13 }}>{err}</div>}
      </div>
      <Output text={out} loading={loading} />
    </div>
  );
}

function HashtagAnalyzer({ apiKey }) {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const run = async () => {
    setLoading(true);
    setErr("");
    try {
      const sys = "You are a hashtag strategist. Balance reach (broad), niche (intent), and brand (owned).";
      const prompt = `Recommend a hashtag set for "${topic}" on ${platform}.

Return three tiers:
- Broad reach (3-5): high volume
- Niche intent (5-8): lower volume, higher relevance
- Brand / community (2-3): owned or community

Then a single "ready to paste" line in optimal order.`;
      const txt = await callClaude(apiKey, sys, prompt, 1800);
      setOut(txt);
    } catch (e) {
      setErr(e.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <SectionHeader title="Hashtag Analyzer" subtitle="Build tiered hashtag sets that actually convert." />
      <div style={styles.card}>
        <div style={styles.row}>
          <Field label="Topic"><input style={styles.input} value={topic} onChange={(e) => setTopic(e.target.value)} /></Field>
          <Field label="Platform"><Select value={platform} onChange={setPlatform} options={PLATFORMS} /></Field>
        </div>
        <Button onClick={run} loading={loading}>Analyze Hashtags</Button>
        {err && <div style={{ color: COLORS.danger, marginTop: 12, fontSize: 13 }}>{err}</div>}
      </div>
      <Output text={out} loading={loading} />
    </div>
  );
}

function ApprovalWorkflow({ approvals, setApprovals }) {
  const [draft, setDraft] = useState("");
  const [owner, setOwner] = useState("");
  const [platform, setPlatform] = useState("LinkedIn");
  const [schedDate, setSchedDate] = useState("");
  const [schedTime, setSchedTime] = useState("");

  const submit = () => {
    if (!draft) return;
    setApprovals([...approvals, { id: Date.now(), text: draft, owner, platform, schedDate, schedTime, status: "Pending", submittedAt: new Date().toISOString() }]);
    setDraft("");
    setOwner("");
    setSchedDate("");
    setSchedTime("");
  };

  const setStatus = (id, status) => {
    setApprovals(approvals.map((a) => (a.id === id ? { ...a, status } : a)));
  };

  const statusColor = (s) =>
    s === "Approved" ? COLORS.good :
    s === "Scheduled" ? COLORS.teal :
    s === "Rejected" ? COLORS.danger :
    COLORS.warn;

  const exportable = approvals.filter((a) => a.status === "Approved" || a.status === "Scheduled");

  const exportCSV = () => {
    if (!exportable.length) return;
    const rows = exportable.map((a) => [a.text || "", a.platform || "", a.schedDate || "", a.schedTime || "", a.status]);
    downloadCSV(`ghl-approvals-${new Date().toISOString().slice(0, 10)}.csv`, ["Post Content", "Platform", "Scheduled Date", "Scheduled Time", "Status"], rows);
  };

  return (
    <div>
      <SectionHeader
        title="Approval Workflow"
        subtitle="Submit, route, and sign off on content drafts."
        actions={<Button ghost onClick={exportCSV} style={{ opacity: exportable.length ? 1 : 0.5 }}>Export to GHL CSV ({exportable.length})</Button>}
      />
      <div style={styles.card}>
        <Field label="Draft"><textarea style={styles.textarea} value={draft} onChange={(e) => setDraft(e.target.value)} /></Field>
        <div style={styles.row}>
          <Field label="Owner / Submitter"><input style={styles.input} value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Name" /></Field>
          <Field label="Platform"><Select value={platform} onChange={setPlatform} options={PLATFORMS} /></Field>
        </div>
        <div style={styles.row}>
          <Field label="Scheduled Date"><input style={styles.input} type="date" value={schedDate} onChange={(e) => setSchedDate(e.target.value)} /></Field>
          <Field label="Scheduled Time"><input style={styles.input} type="time" value={schedTime} onChange={(e) => setSchedTime(e.target.value)} /></Field>
        </div>
        <Button onClick={submit}>Submit for Approval</Button>
      </div>
      <div style={styles.card}>
        <h3 style={{ marginTop: 0 }}>Queue ({approvals.length})</h3>
        {approvals.length === 0 ? (
          <div style={{ color: COLORS.muted, fontSize: 13 }}>Queue empty.</div>
        ) : (
          approvals.map((a) => (
            <div key={a.id} style={{ borderBottom: `1px solid ${COLORS.border}`, padding: "14px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{a.owner || "Unassigned"}</span>
                  {a.platform && <span style={styles.pill}>{a.platform}</span>}
                  {(a.schedDate || a.schedTime) && (
                    <span style={{ fontSize: 12, color: COLORS.muted }}>
                      {a.schedDate}{a.schedTime ? ` · ${a.schedTime}` : ""}
                    </span>
                  )}
                </div>
                <span style={{ ...styles.pill, background: `${statusColor(a.status)}22`, color: statusColor(a.status) }}>{a.status}</span>
              </div>
              <div style={{ fontSize: 13, marginBottom: 10, color: COLORS.white, whiteSpace: "pre-wrap" }}>{a.text}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {a.status === "Pending" && (
                  <>
                    <button style={{ ...styles.btn, padding: "6px 12px", fontSize: 12 }} onClick={() => setStatus(a.id, "Approved")}>Approve</button>
                    <button style={{ ...styles.btnGhost, padding: "6px 12px", fontSize: 12 }} onClick={() => setStatus(a.id, "Rejected")}>Reject</button>
                  </>
                )}
                {a.status === "Approved" && (
                  <button style={{ ...styles.btn, padding: "6px 12px", fontSize: 12 }} onClick={() => setStatus(a.id, "Scheduled")}>Mark Scheduled</button>
                )}
                {a.status === "Scheduled" && (
                  <button style={{ ...styles.btnGhost, padding: "6px 12px", fontSize: 12 }} onClick={() => setStatus(a.id, "Approved")}>Unschedule</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CalendarView({ calendar, setCalendar }) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [platform, setPlatform] = useState("LinkedIn");
  const [text, setText] = useState("");
  const [monthFilter, setMonthFilter] = useState(() => new Date().toISOString().slice(0, 7));

  const add = () => {
    if (!date || !text) return;
    setCalendar([...calendar, { id: Date.now(), date, time, platform, text }]);
    setText("");
    setTime("");
  };

  const remove = (id) => setCalendar(calendar.filter((c) => c.id !== id));

  const visible = monthFilter ? calendar.filter((c) => (c.date || "").startsWith(monthFilter)) : calendar;

  const grouped = visible.reduce((acc, c) => {
    (acc[c.date] = acc[c.date] || []).push(c);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort();

  const exportCSV = () => {
    if (!visible.length) return;
    const rows = visible
      .slice()
      .sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.time || "").localeCompare(b.time || ""))
      .map((c) => [c.text || "", c.platform || "", c.date || "", c.time || "", "Scheduled"]);
    const tag = monthFilter || "all";
    downloadCSV(`ghl-calendar-${tag}.csv`, ["Post Content", "Platform", "Scheduled Date", "Scheduled Time", "Status"], rows);
  };

  return (
    <div>
      <SectionHeader
        title="Content Calendar"
        subtitle="Plot every piece against the dates that matter."
        actions={<Button ghost onClick={exportCSV} style={{ opacity: visible.length ? 1 : 0.5 }}>Export to GHL CSV ({visible.length})</Button>}
      />
      <div style={styles.card}>
        <div style={styles.row}>
          <Field label="Date"><input style={styles.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Time"><input style={styles.input} type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        </div>
        <Field label="Platform"><Select value={platform} onChange={setPlatform} options={PLATFORMS} /></Field>
        <Field label="Post"><textarea style={styles.textarea} value={text} onChange={(e) => setText(e.target.value)} /></Field>
        <Button onClick={add}>Add to Calendar</Button>
      </div>
      <div style={styles.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0 }}>Scheduled · {monthFilter || "All"} ({visible.length})</h3>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input style={{ ...styles.input, width: 160 }} type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} />
            {monthFilter && <button style={{ ...styles.btnGhost, padding: "6px 10px", fontSize: 11 }} onClick={() => setMonthFilter("")}>Show all</button>}
          </div>
        </div>
        {sortedDates.length === 0 ? (
          <div style={{ color: COLORS.muted, fontSize: 13 }}>No items planned for this month.</div>
        ) : (
          sortedDates.map((d) => (
            <div key={d} style={{ marginBottom: 16 }}>
              <div style={{ color: COLORS.teal, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{d}</div>
              {grouped[d].map((c) => (
                <div key={c.id} style={{ background: COLORS.cardAlt, padding: 12, borderRadius: 8, marginBottom: 8, display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <span style={styles.pill}>{c.platform}</span>
                    {c.time && <span style={{ fontSize: 12, color: COLORS.muted, marginLeft: 6 }}>{c.time}</span>}
                    <div style={{ fontSize: 13, marginTop: 6, whiteSpace: "pre-wrap" }}>{c.text}</div>
                  </div>
                  <button style={{ ...styles.btnGhost, padding: "4px 10px", fontSize: 11, height: "fit-content" }} onClick={() => remove(c.id)}>×</button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Scheduling({ apiKey }) {
  const [content, setContent] = useState("");
  const [audience, setAudience] = useState("");
  const [tz, setTz] = useState("America/New_York");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const run = async () => {
    setLoading(true);
    setErr("");
    try {
      const sys = "You are a social media scheduling expert who reasons about audience time-zones and platform behavior.";
      const prompt = `Recommend the optimal posting time for this content.

Audience: ${audience}
Time zone: ${tz}

For each of LinkedIn, Twitter/X, Instagram and TikTok return:
- Best day(s) of week
- Best window of time
- Reasoning (one line)

Then provide a 7-day rotation schedule with specific times.

CONTENT:
${content}`;
      const txt = await callClaude(apiKey, sys, prompt, 2000);
      setOut(txt);
    } catch (e) {
      setErr(e.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <SectionHeader title="Scheduling" subtitle="Recommend optimal posting times by audience." />
      <div style={styles.card}>
        <Field label="Content"><textarea style={styles.textarea} value={content} onChange={(e) => setContent(e.target.value)} /></Field>
        <div style={styles.row}>
          <Field label="Primary audience"><input style={styles.input} value={audience} onChange={(e) => setAudience(e.target.value)} /></Field>
          <Field label="Time zone"><input style={styles.input} value={tz} onChange={(e) => setTz(e.target.value)} /></Field>
        </div>
        <Button onClick={run} loading={loading}>Recommend Times</Button>
        {err && <div style={{ color: COLORS.danger, marginTop: 12, fontSize: 13 }}>{err}</div>}
      </div>
      <Output text={out} loading={loading} />
    </div>
  );
}

function PerformanceTracker({ tracking, setTracking }) {
  const [label, setLabel] = useState("");
  const [platform, setPlatform] = useState("LinkedIn");
  const [impressions, setImpressions] = useState("");
  const [eng, setEng] = useState("");

  const add = () => {
    if (!label) return;
    setTracking([...tracking, { id: Date.now(), label, platform, impressions: Number(impressions) || 0, eng: Number(eng) || 0, date: new Date().toISOString().slice(0, 10) }]);
    setLabel("");
    setImpressions("");
    setEng("");
  };

  const remove = (id) => setTracking(tracking.filter((t) => t.id !== id));

  const total = tracking.reduce((a, t) => a + t.impressions, 0);
  const engTotal = tracking.reduce((a, t) => a + t.eng, 0);
  const engRate = total ? ((engTotal / total) * 100).toFixed(2) : "0.00";

  return (
    <div>
      <SectionHeader title="Performance Tracker" subtitle="Log results and watch the engagement rate move." />
      <div style={styles.statGrid}>
        <div style={styles.stat}><div style={styles.statLabel}>Posts Tracked</div><div style={styles.statValue}>{tracking.length}</div></div>
        <div style={styles.stat}><div style={styles.statLabel}>Total Impressions</div><div style={styles.statValue}>{total.toLocaleString()}</div></div>
        <div style={styles.stat}><div style={styles.statLabel}>Total Engagements</div><div style={styles.statValue}>{engTotal.toLocaleString()}</div></div>
        <div style={styles.stat}><div style={styles.statLabel}>Engagement Rate</div><div style={styles.statValue}>{engRate}%</div></div>
      </div>
      <div style={styles.card}>
        <div style={styles.row}>
          <Field label="Post label"><input style={styles.input} value={label} onChange={(e) => setLabel(e.target.value)} /></Field>
          <Field label="Platform"><Select value={platform} onChange={setPlatform} options={PLATFORMS} /></Field>
        </div>
        <div style={styles.row}>
          <Field label="Impressions"><input style={styles.input} type="number" value={impressions} onChange={(e) => setImpressions(e.target.value)} /></Field>
          <Field label="Engagements"><input style={styles.input} type="number" value={eng} onChange={(e) => setEng(e.target.value)} /></Field>
        </div>
        <Button onClick={add}>Log Entry</Button>
      </div>
      <div style={styles.card}>
        <h3 style={{ marginTop: 0 }}>Entries</h3>
        {tracking.length === 0 ? (
          <div style={{ color: COLORS.muted, fontSize: 13 }}>No data yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: COLORS.muted }}>
                <th style={{ padding: "8px 4px" }}>Date</th>
                <th>Label</th>
                <th>Platform</th>
                <th>Impr.</th>
                <th>Eng.</th>
                <th>Rate</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tracking.map((t) => (
                <tr key={t.id} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                  <td style={{ padding: "8px 4px" }}>{t.date}</td>
                  <td>{t.label}</td>
                  <td>{t.platform}</td>
                  <td>{t.impressions.toLocaleString()}</td>
                  <td>{t.eng.toLocaleString()}</td>
                  <td>{t.impressions ? ((t.eng / t.impressions) * 100).toFixed(2) : "0.00"}%</td>
                  <td><button style={{ ...styles.btnGhost, padding: "4px 8px", fontSize: 11 }} onClick={() => remove(t.id)}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function WeeklyDigest({ apiKey, tracking }) {
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const run = async () => {
    setLoading(true);
    setErr("");
    try {
      const sys = "You are a marketing analyst writing a candid weekly digest for an agency lead.";
      const summary = tracking.length
        ? tracking.map((t) => `${t.date} · ${t.platform} · "${t.label}" — ${t.impressions} impr · ${t.eng} eng`).join("\n")
        : "No tracking data logged this week.";
      const prompt = `Write a sharp weekly performance digest.

Performance data:
${summary}

Deliver:
1. Headline takeaway (one sentence)
2. Top 3 wins
3. Top 2 misses
4. Pattern observed
5. 3 specific recommendations for next week`;
      const txt = await callClaude(apiKey, sys, prompt, 2000);
      setOut(txt);
    } catch (e) {
      setErr(e.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <SectionHeader title="Weekly Digest" subtitle="An honest weekly readout for the team." />
      <div style={styles.card}>
        <p style={{ color: COLORS.muted, fontSize: 13, marginTop: 0 }}>Generates a digest from your Performance Tracker entries.</p>
        <Button onClick={run} loading={loading}>Generate Weekly Digest</Button>
        {err && <div style={{ color: COLORS.danger, marginTop: 12, fontSize: 13 }}>{err}</div>}
      </div>
      <Output text={out} loading={loading} />
    </div>
  );
}

function SavedLibrary({ library, setLibrary }) {
  const [filter, setFilter] = useState("All");
  const filtered = filter === "All" ? library : library.filter((l) => l.platform === filter);

  return (
    <div>
      <SectionHeader title="Saved Library" subtitle="Your reusable archive of generated content." />
      <div style={styles.card}>
        <Field label="Filter by platform"><Select value={filter} onChange={setFilter} options={["All", ...PLATFORMS]} /></Field>
        {filtered.length === 0 ? (
          <div style={{ color: COLORS.muted, fontSize: 13 }}>Nothing saved yet. Generate something and click Save.</div>
        ) : (
          filtered.map((it, i) => (
            <div key={i} style={{ background: COLORS.cardAlt, padding: 14, borderRadius: 8, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div>
                  <span style={styles.pill}>{it.platform}</span>
                  <span style={{ fontSize: 12, color: COLORS.muted, marginLeft: 8 }}>{it.savedAt?.slice(0, 10)}</span>
                </div>
                <button style={{ ...styles.btnGhost, padding: "4px 10px", fontSize: 11 }} onClick={() => setLibrary(library.filter((_, idx) => library.indexOf(it) !== idx))}>Delete</button>
              </div>
              <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{it.text}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const DEFAULT_TEMPLATES = [
  { name: "Founder Insight", body: "I used to think X. Then [event] happened. Now I believe Y. Here's what changed my mind: [3 points]. Takeaway: [insight]." },
  { name: "Hot Take", body: "Unpopular opinion: [statement]. Most people [common belief]. But here's the data / story: [evidence]. The lesson: [insight]." },
  { name: "Case Study Mini", body: "How we [outcome] in [timeframe]: 1) Problem: 2) Approach: 3) Result: Lesson others can steal:" },
  { name: "Listicle Hook", body: "[N] things I wish I'd known about [topic]: 1. ... 2. ... [N]. ... Save this if you're [audience]." },
];

function Templates({ templates, setTemplates }) {
  const [name, setName] = useState("");
  const [body, setBody] = useState("");

  const add = () => {
    if (!name || !body) return;
    setTemplates([...templates, { name, body }]);
    setName("");
    setBody("");
  };
  const remove = (i) => setTemplates(templates.filter((_, idx) => idx !== i));

  return (
    <div>
      <SectionHeader title="Templates" subtitle="Reusable post skeletons you can fill in fast." />
      <div style={styles.card}>
        <Field label="Template name"><input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Body"><textarea style={styles.textarea} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
        <Button onClick={add}>Add Template</Button>
      </div>
      <div style={styles.card}>
        <h3 style={{ marginTop: 0 }}>Library</h3>
        {templates.map((t, i) => (
          <div key={i} style={{ background: COLORS.cardAlt, padding: 14, borderRadius: 8, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontWeight: 600 }}>{t.name}</div>
              <button style={{ ...styles.btnGhost, padding: "4px 10px", fontSize: 11 }} onClick={() => remove(i)}>×</button>
            </div>
            <div style={{ fontSize: 13, whiteSpace: "pre-wrap", color: COLORS.white }}>{t.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VoiceTrainer({ apiKey, voice, setVoice }) {
  const [samples, setSamples] = useState(voice.samples || "");
  const [out, setOut] = useState(voice.profile || "");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [testPrompt, setTestPrompt] = useState("");
  const [testOut, setTestOut] = useState("");

  const train = async () => {
    setLoading(true);
    setErr("");
    try {
      const sys = "You are a linguist who profiles writing voice. You produce reusable, exact voice fingerprints.";
      const prompt = `Analyze the writing samples below and produce a portable VOICE PROFILE another writer could follow.

Include:
1. Sentence rhythm and length tendencies
2. Lexical signatures (favorite words/phrases)
3. Punctuation habits
4. Argument structure
5. Energy / tone descriptors (5 adjectives)
6. Two "do" examples and two "don't" examples
7. A 200-word style guide section that could be pasted into any prompt

SAMPLES (separated by ---):
${samples}`;
      const txt = await callClaude(apiKey, sys, prompt, 3000);
      setOut(txt);
      setVoice({ samples, profile: txt });
    } catch (e) {
      setErr(e.message);
    }
    setLoading(false);
  };

  const test = async () => {
    setLoading(true);
    setErr("");
    try {
      const sys = `You write in this exact voice profile. Follow it precisely.\n\nVOICE PROFILE:\n${out}`;
      const txt = await callClaude(apiKey, sys, `Write a short social post about: ${testPrompt}`, 1500);
      setTestOut(txt);
    } catch (e) {
      setErr(e.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <SectionHeader title="Voice Trainer" subtitle="Lock in a portable voice profile from real samples." />
      <div style={styles.card}>
        <Field label="Paste 3-5 writing samples (separated with ---)">
          <div style={{ marginBottom: 8 }}>
            <DocUploader onText={(t) => setSamples(samples ? `${samples}\n---\n${t}` : t)} label="Upload Sample Doc" />
          </div>
          <textarea style={{ ...styles.textarea, minHeight: 200 }} value={samples} onChange={(e) => setSamples(e.target.value)} />
        </Field>
        <Button onClick={train} loading={loading}>Train Voice Profile</Button>
        {err && <div style={{ color: COLORS.danger, marginTop: 12, fontSize: 13 }}>{err}</div>}
      </div>
      {out && (
        <>
          <Output text={out} />
          <div style={styles.card}>
            <h3 style={{ marginTop: 0 }}>Test the Voice</h3>
            <Field label="Topic"><input style={styles.input} value={testPrompt} onChange={(e) => setTestPrompt(e.target.value)} placeholder="What to write a post about" /></Field>
            <Button onClick={test} loading={loading}>Write in This Voice</Button>
            {testOut && <div style={{ marginTop: 14 }}><Output text={testOut} /></div>}
          </div>
        </>
      )}
    </div>
  );
}

// ============ APP ============

export default function App() {
  const [active, setActive] = useLocalState("mp.active", "dashboard");
  const [apiKey, setApiKey] = useLocalState("mp.apiKey", "");
  const [showKey, setShowKey] = useState(false);
  const [brief, setBrief] = useLocalState("mp.brief", {
    brand: "",
    audience: "",
    objective: "Awareness",
    tone: "Professional",
    keyMessage: "",
    constraints: "",
  });
  const [library, setLibrary] = useLocalState("mp.library", []);
  const [approvals, setApprovals] = useLocalState("mp.approvals", []);
  const [calendar, setCalendar] = useLocalState("mp.calendar", []);
  const [tracking, setTracking] = useLocalState("mp.tracking", []);
  const [templates, setTemplates] = useLocalState("mp.templates", DEFAULT_TEMPLATES);
  const [voice, setVoice] = useLocalState("mp.voice", { samples: "", profile: "" });

  const groups = SECTIONS.reduce((acc, s) => {
    (acc[s.group] = acc[s.group] || []).push(s);
    return acc;
  }, {});

  const renderSection = () => {
    switch (active) {
      case "dashboard": return <Dashboard library={library} setActive={setActive} />;
      case "brief": return <ContentBrief apiKey={apiKey} brief={brief} setBrief={setBrief} />;
      case "generator": return <Generator apiKey={apiKey} brief={brief} library={library} setLibrary={setLibrary} />;
      case "bulk": return <BulkGenerate apiKey={apiKey} brief={brief} library={library} setLibrary={setLibrary} />;
      case "campaign": return <CampaignBuilder apiKey={apiKey} brief={brief} />;
      case "quality": return <QualityScore apiKey={apiKey} />;
      case "predictor": return <PerformancePredictor apiKey={apiKey} />;
      case "abtester": return <ABTester apiKey={apiKey} />;
      case "reviewer": return <AIReviewer apiKey={apiKey} brief={brief} />;
      case "repurpose": return <Repurpose apiKey={apiKey} />;
      case "trending": return <TrendingTopics apiKey={apiKey} />;
      case "competitor": return <CompetitorAnalysis apiKey={apiKey} />;
      case "audit": return <ContentAudit apiKey={apiKey} />;
      case "hashtag": return <HashtagAnalyzer apiKey={apiKey} />;
      case "approval": return <ApprovalWorkflow approvals={approvals} setApprovals={setApprovals} />;
      case "calendar": return <CalendarView calendar={calendar} setCalendar={setCalendar} />;
      case "scheduling": return <Scheduling apiKey={apiKey} />;
      case "tracker": return <PerformanceTracker tracking={tracking} setTracking={setTracking} />;
      case "digest": return <WeeklyDigest apiKey={apiKey} tracking={tracking} />;
      case "library": return <SavedLibrary library={library} setLibrary={setLibrary} />;
      case "templates": return <Templates templates={templates} setTemplates={setTemplates} />;
      case "voice": return <VoiceTrainer apiKey={apiKey} voice={voice} setVoice={setVoice} />;
      default: return <Dashboard library={library} setActive={setActive} />;
    }
  };

  return (
    <div style={styles.app}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        input::placeholder, textarea::placeholder { color: ${COLORS.muted}; opacity: 0.7; }
        input:focus, textarea:focus, select:focus { outline: none; border-color: ${COLORS.teal} !important; }
        button:hover:not(:disabled) { filter: brightness(1.1); }
        select option { background: ${COLORS.card}; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: ${COLORS.bg}; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: ${COLORS.tealDim}; }
      `}</style>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <div style={styles.brandTitle}>Smart Web Advisors</div>
          <div style={styles.brandSub}>Marketing Powerhouse</div>
        </div>
        {Object.entries(groups).map(([group, items]) => (
          <div key={group}>
            <div style={styles.groupLabel}>{group}</div>
            {items.map((s) => (
              <div key={s.id} style={styles.navItem(active === s.id)} onClick={() => setActive(s.id)}>
                <span style={styles.navIcon}>{s.icon}</span>
                {s.label}
              </div>
            ))}
          </div>
        ))}
      </aside>
      <main style={styles.main}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          {showKey ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                style={{ ...styles.input, width: 340 }}
                type="password"
                placeholder="sk-ant-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <Button onClick={() => setShowKey(false)}>Save</Button>
            </div>
          ) : (
            <button style={styles.btnGhost} onClick={() => setShowKey(true)}>
              {apiKey ? "● API Key Set" : "○ Set API Key"}
            </button>
          )}
        </div>
        {renderSection()}
      </main>
    </div>
  );
}
