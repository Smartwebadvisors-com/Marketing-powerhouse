const PLATFORM_SHAPE = {
  LinkedIn: "First line must stand alone in the feed. Then one story or proof point taken from the facts. Then a question or the offer. About 150-220 words. Up to 3 hashtags.",
  Instagram: "First line is a spoken hook. Then the point in short lines. One next step. Put 3-5 hashtags at the end.",
  Facebook: "Conversational hook, one clear point, one next step. Short paragraphs.",
  TikTok: "The first sentence is the spoken hook. Then three short beats. End with the line that should appear on screen.",
  "YouTube Shorts": "Hook in the first sentence, then a 30-45 second spoken script with on-screen text cues.",
  "X/Twitter": "One claim, then the turn. Use a thread of up to 5 posts only if the point needs room. Each post stays under 280 characters.",
  Threads: "One claim, then the turn. End with a question. Stay under 500 characters.",
  Pinterest: "A search-friendly description using the audience's words and the offer. Do not invent results.",
};

const FACT_RULE = "Use only the facts below. If a fact is missing, leave it out. Do not invent environment, socioeconomic details, class, history, fears, wants, customers, or proof.";

function clean(value) {
  return String(value || "").trim();
}

function clientFactBlock({ client, brief, voice } = {}) {
  const c = client || {};
  const b = brief || {};
  const lines = [];
  const add = (label, value) => {
    const text = clean(value);
    if (text) lines.push(`${label}: ${text}`);
  };

  add("Business", b.brand || c.businessName);
  add("Industry", c.industry);
  add("Location", c.location);
  add("Website", c.website);
  add("Audience", b.audience || c.targetAudience);
  add("Environment", c.environment);
  add("Socioeconomic situation", c.socioeconomic);
  add("Class", c.socialClass);
  add("History", c.history);
  add("What they want", c.wants);
  add("What they fear", c.fears);
  add("Proof we may use", c.proof);
  add("Main offer", c.mainOffer);
  const keyMessage = clean(b.keyMessage);
  if (keyMessage && keyMessage !== clean(c.mainOffer)) add("Key message", keyMessage);
  add("Goal", b.objective || c.goal);
  add("Tone", b.tone || c.brandVoice);
  add("Brand colors", c.brandColors);
  add("Guardrails", b.constraints || c.notes);
  add("Voice profile", voice && voice.profile);

  if (!lines.length) {
    return "No client facts are on file. Do not invent an audience, environment, class, history, offer, or proof.";
  }
  return [FACT_RULE, ...lines].join("\n");
}

const AUDIENCE_READ_SYSTEM = "You prepare a tight audience read for a copywriter. You never invent facts that were not supplied.";

function audienceReadPrompt(facts) {
  return `From the client facts, write a short audience read the writer will follow.

Cover only what the facts support:
1. Who this is for
2. The pressure they are under
3. The one belief to challenge
4. The proof we may use

If a section has no fact behind it, write "Not on file." Do not guess.

CLIENT FACTS:
${facts}`;
}

function platformShape(platform) {
  return PLATFORM_SHAPE[platform] || "Open with a hook that fits this platform. Keep the length normal for it. End with the call to action.";
}

const DRAFT_SYSTEM = "You write for one client. Follow the audience read and the client facts. Do not invent proof, customers, places, or history.";

function draftBrief(facts, read, task) {
  return `${task}

AUDIENCE READ:
${read}

CLIENT FACTS:
${facts}`;
}

export {
  clientFactBlock,
  audienceReadPrompt,
  platformShape,
  draftBrief,
  AUDIENCE_READ_SYSTEM,
  DRAFT_SYSTEM,
};
