import { audienceReadPrompt, clientFactBlock, draftBrief, platformShape } from "./writerContext";

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
  expect(read).toMatch(/The owner will not fill in/);
  expect(read).toMatch(/Do not invent a named customer/);
  expect(platformShape("LinkedIn")).toMatch(/stand alone/);
  const draft = draftBrief(facts, "Who: cafe owners\nLikely pressure: January is quiet", "Write 1 LinkedIn post.");
  expect(draft).toMatch(/AUDIENCE READ:/);
  expect(draft).toMatch(/weeknight dinner series/);
});
