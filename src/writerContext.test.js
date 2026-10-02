import {
  audienceReadPrompt,
  clientFactBlock,
  draftBrief,
  parseRating,
  platformShape,
  voiceCardPrompt,
  writingJob,
} from "./writerContext";

const client = {
  businessName: "Harbor & Co",
  industry: "Food",
  location: "Maine",
  targetAudience: "Independent cafe owners",
  mainOffer: "A weeknight dinner series",
  notes: "Do not mention discounts",
};

test("keeps the owner facts and leaves analysis to the writer", () => {
  const block = clientFactBlock({
    client,
    brief: { tone: "Warm", audience: "Independent cafe owners" },
    voice: { profile: "Short sentences. No hype." },
  });
  expect(block).toMatch(/Analyze the audience/);
  expect(block).toMatch(/Main offer: A weeknight dinner series/);
  expect(block).toMatch(/Voice profile: Short sentences/);
  expect(block).not.toMatch(/Website:/);
  expect(block).not.toMatch(/^Environment:/m);
});

test("does not ask the owner for environment, class, or history", () => {
  const block = clientFactBlock({ client: { businessName: "Harbor & Co", industry: "Food", location: "Maine" }, brief: {}, voice: {} });
  expect(block).toMatch(/Business: Harbor & Co/);
  expect(block).not.toMatch(/^Environment:/m);
  expect(block).not.toMatch(/^Class:/m);
  const empty = clientFactBlock({});
  expect(empty).toMatch(/No client facts are on file/);
});

test("tells the strategist to work out the audience before the draft", () => {
  const facts = clientFactBlock({ client, brief: { tone: "Warm" }, voice: {} });
  const read = audienceReadPrompt(facts);
  expect(read).toMatch(/Environmental factors/);
  expect(read).toMatch(/Socioeconomic factors/);
  expect(read).toMatch(/Class/);
  expect(read).toMatch(/History/);
  expect(read).toMatch(/What they want to feel/);
  expect(read).toMatch(/What they fear being seen as/);
  expect(read).toMatch(/objection already in their head/);
  expect(read).toMatch(/kind of proof they trust/);
  expect(read).toMatch(/The owner will not fill in/);
  expect(read).toMatch(/psychology/);
  expect(read).toMatch(/Do not invent a named customer/);
  expect(platformShape("LinkedIn")).toMatch(/stand alone/);
  const draft = draftBrief(facts, "Who: cafe owners\nLikely pressure: January is quiet", "Write 1 LinkedIn post.");
  expect(draft).toMatch(/AUDIENCE READ:/);
  expect(draft).toMatch(/weeknight dinner series/);
  expect(draft).toMatch(/JOB: Engagement/);
});

test("writes for one job based on the client goal", () => {
  expect(writingJob("Engagement")).toMatch(/JOB: Engagement/);
  expect(writingJob("Awareness")).toMatch(/one question only this audience can answer/);
  expect(writingJob("Community Growth")).toMatch(/Do not pitch the offer/);
  expect(writingJob("Sales")).toMatch(/state the offer once/);
  expect(writingJob("Lead Generation")).toMatch(/one next step/);
  expect(writingJob("Retention")).toMatch(/JOB: Authority/);
  expect(writingJob("Recruiting")).toMatch(/Do not hard-sell/);
  const facts = clientFactBlock({ client: { ...client, goal: "Sales" }, brief: {}, voice: {} });
  expect(draftBrief(facts, "Read", "Write a post.")).toMatch(/JOB: Leads and sales/);
});

test("prefers the voice card and reads a score", () => {
  const block = clientFactBlock({
    client: { ...client, voiceCard: "Likely value: no discounts.", refuses: "No discounts" },
    voice: { profile: "Short sentences. No hype." },
  });
  expect(block).toMatch(/Voice card: Likely value: no discounts/);
  expect(block).toMatch(/What they refuse: No discounts/);
  expect(block).not.toMatch(/Voice profile:/);
  expect(parseRating("SCORE: 62\nWHY: The hook is generic.\nFIX: Name the Tuesday slump.")).toEqual({
    score: 62,
    why: "The hook is generic.",
    fix: "Name the Tuesday slump.",
  });
  expect(parseRating("no score here").score).toBeNull();
  const card = voiceCardPrompt({ refuses: "No discounts", industryGripe: "Copied lunch specials" });
  expect(card).toMatch(/No discounts/);
  expect(card).toMatch(/Copied lunch specials/);
  expect(card).toMatch(/Mark each "Likely"/);
});
