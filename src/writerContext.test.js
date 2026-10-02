import { audienceReadPrompt, clientFactBlock, draftBrief, platformShape } from "./writerContext";

const client = {
  businessName: "Harbor & Co",
  targetAudience: "Independent cafe owners",
  environment: "Coastal towns with a short summer season",
  socioeconomic: "Thin margins and rising rent",
  socialClass: "Working owners, not corporate buyers",
  history: "Most have run the shop for 10 years or more",
  wants: "A full room on weeknights",
  fears: "A quiet January",
  proof: "One shop filled Tuesdays after a 4-week dinner series",
  mainOffer: "A weeknight dinner series",
  notes: "Do not mention discounts",
};

test("builds a client fact block and leaves out empty facts", () => {
  const block = clientFactBlock({
    client,
    brief: { tone: "Warm", audience: "Independent cafe owners" },
    voice: { profile: "Short sentences. No hype." },
  });
  expect(block).toMatch(/Do not invent/);
  expect(block).toMatch(/Environment: Coastal towns/);
  expect(block).toMatch(/Class: Working owners/);
  expect(block).toMatch(/Main offer: A weeknight dinner series/);
  expect(block).toMatch(/Voice profile: Short sentences/);
  expect(block).not.toMatch(/Website:/);
  expect(block).not.toMatch(/Brand colors:/);
});

test("does not invent a life story when the sheet is empty", () => {
  const block = clientFactBlock({ client: { businessName: "Harbor & Co" }, brief: {}, voice: {} });
  expect(block).toMatch(/Business: Harbor & Co/);
  expect(block).not.toMatch(/Environment:/);
  expect(block).not.toMatch(/History:/);
  const empty = clientFactBlock({});
  expect(empty).toMatch(/No client facts are on file/);
});

test("asks for an audience read and a platform shape before the draft", () => {
  const facts = clientFactBlock({ client, brief: { tone: "Warm" }, voice: {} });
  expect(audienceReadPrompt(facts)).toMatch(/Not on file/);
  expect(audienceReadPrompt(facts)).toMatch(/belief to challenge/);
  expect(platformShape("LinkedIn")).toMatch(/stand alone/);
  const draft = draftBrief(facts, "Who: cafe owners\nPressure: January is quiet", "Write 1 LinkedIn post.");
  expect(draft).toMatch(/AUDIENCE READ:/);
  expect(draft).toMatch(/weeknight dinner series/);
});
