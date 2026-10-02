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

const FACT_RULE = "These are the facts the owner supplied. Analyze the audience from them. Do not invent a named customer, a statistic, or a quote.";
const PASS_SCORE = 75;

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
  add("What they do", c.whatTheyDo);
  add("Who it is for", c.whoItsFor);
  add("What they refuse", c.refuses);
  add("Industry gripe", c.industryGripe);
  add("Customer story", c.customerStory);
  add("Words they use", c.messySample);
  add("Main offer", c.mainOffer);
  const keyMessage = clean(b.keyMessage);
  if (keyMessage && keyMessage !== clean(c.mainOffer)) add("Key message", keyMessage);
  add("Goal", b.objective || c.goal);
  add("Tone", b.tone || c.brandVoice);
  add("Brand colors", c.brandColors);
  add("Guardrails", b.constraints || c.notes);
  if (clean(c.voiceCard)) add("Voice card", c.voiceCard);
  else add("Voice profile", voice && voice.profile);

  if (!lines.length) {
    return "No client facts are on file. Ask for a business and an audience before writing. Do not invent a client.";
  }
  return [FACT_RULE, ...lines].join("\n");
}

const AUDIENCE_READ_SYSTEM = "You are the strategist for one client. The owner describes the business. You work out the audience, then a copywriter follows your read.";

function audienceReadPrompt(facts) {
  return `The owner will not fill in environment, money, class, history, or psychology. You work those out from the business, industry, location, audience, and offer.

Write a short audience read the writer will follow:
1. Who this is for
2. Environmental factors around that audience: place, season, industry pressure, local conditions
3. Socioeconomic factors: income, costs, time, and what they can afford
4. Class: how they see their place, and who they do not want to sound like
5. History that shapes how this audience hears a message
6. The pressure they are under
7. The one belief to challenge
8. Proof the writer may use. Use only proof the owner supplied. If none was supplied, write "No supplied proof."
9. What they want to feel
10. What they fear being seen as
11. The objection already in their head
12. The kind of proof they trust

Mark each inference with "Likely" so the writer can tell analysis from a fact the owner typed. Do not invent a named customer, a statistic, or a quote.

CLIENT FACTS:
${facts}`;
}

function writingJob(goal) {
  const name = clean(goal);
  if (name === "Lead Generation" || name === "Sales") {
    return "JOB: Leads and sales. Make one sharp point, state the offer once, and give one next step. Do not also ask for a comment or try to sound like a thought leader in the same piece.";
  }
  if (name === "Retention" || name === "Recruiting") {
    return "JOB: Authority. State a point of view and one reason to believe it, taken from the facts. Do not hard-sell and do not ask for a sale.";
  }
  return "JOB: Engagement. Make one sharp point, then ask one question only this audience can answer. Do not pitch the offer.";
}

function goalFromFacts(facts) {
  const match = String(facts || "").match(/^Goal:\s*(.+)$/m);
  return match ? match[1].trim() : "";
}

function platformShape(platform) {
  return PLATFORM_SHAPE[platform] || "Open with a hook that fits this platform. Keep the length normal for it. End with the call to action.";
}

const DRAFT_SYSTEM = "You write for one client. Follow the audience read, including its analysis of environment, socioeconomic pressure, class, history, and psychology. Do the one job you are given. When a voice card is on file, carry one of its values. Do not invent a named customer, a statistic, or a quote.";

function draftBrief(facts, read, task, goal) {
  const job = writingJob(goal || goalFromFacts(facts));
  return `${task}

AUDIENCE READ:
${read}

CLIENT FACTS:
${facts}

${job}
Carry one value from the voice card when one is on file. Do not invent a named customer, a statistic, or a quote.`;
}

const RATING_SYSTEM = "You score one draft for a specific audience. Be strict. Do not invent a named customer, a statistic, or a quote.";

function ratingPrompt({ facts, read, draft, goal }) {
  return `${writingJob(goal || goalFromFacts(facts))}

Score this draft from 0 to 100. Judge only these:
- Hook: does the first line earn the next line
- Audience fit: does it sound like it was written for the people in the audience read
- Emotion: does it meet what they want to feel, and the fear of being seen a certain way
- Specificity: does it use owner facts instead of generic claims
- Job: does it do the one job above, and not engagement, authority, and a sales ask in the same piece

Reply in exactly this shape:
SCORE: <number 0-100>
WHY: <one sentence>
FIX: <the single change that would raise the score, or None if it already passes>

DRAFT:
${draft}

AUDIENCE READ:
${read}

CLIENT FACTS:
${facts}`;
}

function parseRating(text) {
  const raw = String(text || "");
  const scoreMatch = raw.match(/SCORE:\s*(\d{1,3})/i);
  let score = scoreMatch ? Number(scoreMatch[1]) : null;
  if (score != null && Number.isNaN(score)) score = null;
  if (score != null && score > 100) score = 100;
  const whyMatch = raw.match(/WHY:\s*([^\n]+)/i);
  const fixMatch = raw.match(/FIX:\s*([^\n]+)/i);
  return {
    score,
    why: whyMatch ? whyMatch[1].trim() : "",
    fix: fixMatch ? fixMatch[1].trim() : "",
  };
}

function rewritePrompt({ facts, read, draft, rating, goal }) {
  const note = rating || {};
  const fix = clean(note.fix) && !/^none$/i.test(clean(note.fix))
    ? note.fix
    : "Make it more specific to this audience and to the one job.";
  const shown = note.score == null ? "unknown" : String(note.score);
  return `${writingJob(goal || goalFromFacts(facts))}

Rewrite the draft once. Keep the same structure, labels, and tagged blocks the draft already uses.
Apply this fix: ${fix}
The score was ${shown}. A passing score is ${PASS_SCORE}.
Do not invent a named customer, a statistic, or a quote.
Return only the stronger draft.

DRAFT:
${draft}

AUDIENCE READ:
${read}

CLIENT FACTS:
${facts}`;
}

const VOICE_CARD_SYSTEM = "You write a voice card for one business. The owner does not know their own voice. You infer values from plain answers. Mark each inference with Likely. Do not invent a named customer, a statistic, or a quote.";

function voiceCardPrompt(client) {
  const c = client || {};
  const given = (value) => clean(value) || "(not given)";
  return `The owner answered in their own words. They may be messy. Build a voice card they can correct in one line.

Cover:
1. Three core values. Mark each "Likely" unless the owner stated it outright.
2. How each value should sound to their audience.
3. Phrases they would say.
4. Phrases they would never say.
5. The one value every piece of content should carry.

Do not invent a named customer, a statistic, or a quote. If the customer story has no name, do not add one.

WHAT THEY DO:
${given(c.whatTheyDo)}

WHO IT IS FOR:
${given(c.whoItsFor || c.targetAudience)}

WHAT THEY REFUSE TO DO:
${given(c.refuses)}

WHAT BOTHERS THEM ABOUT THE INDUSTRY:
${given(c.industryGripe)}

A CUSTOMER STORY IN THEIR WORDS:
${given(c.customerStory)}

MESSY PAGE OR EMAIL:
${given(c.messySample)}

BUSINESS: ${given(c.businessName)}
INDUSTRY: ${given(c.industry)}
LOCATION: ${given(c.location)}
OFFER: ${given(c.mainOffer)}`;
}

export {
  PASS_SCORE,
  clientFactBlock,
  audienceReadPrompt,
  writingJob,
  goalFromFacts,
  platformShape,
  draftBrief,
  ratingPrompt,
  parseRating,
  rewritePrompt,
  voiceCardPrompt,
  AUDIENCE_READ_SYSTEM,
  DRAFT_SYSTEM,
  RATING_SYSTEM,
  VOICE_CARD_SYSTEM,
};
