import { imageStudioLink, studioSnapshot, studioSyncPlan } from "./studioSync";

test("keeps a browser copy until the server has real records", () => {
  const local = { clients: [{ id: "c1", businessName: "Northwind Studio" }], templates: [{ name: "Hot Take" }] };
  expect(studioSyncPlan({ clients: [], templates: [{ name: "Hot Take" }] }, local)).toBe("upload");
  expect(studioSyncPlan({ clients: [{ id: "server" }] }, local)).toBe("adopt");
  expect(studioSyncPlan({ configured: false }, local)).toBe("offline");
  expect(studioSyncPlan({ clients: [] }, { clients: [], templates: [{ name: "Hot Take" }] })).toBe("ready");
});

test("builds an image studio link without storing the API key", () => {
  const snap = studioSnapshot({
    clients: [],
    library: [],
    apiKey: "sk-ant-secret",
  });
  expect(snap.apiKey).toBeUndefined();
  const href = imageStudioLink(
    "http://images.example/",
    { text: "Launch day post" },
    { businessName: "Northwind Studio", brandVoice: "Bold", colors: "navy #001122" }
  );
  const url = new URL(href);
  expect(url.origin).toBe("http://images.example");
  expect(url.searchParams.get("prompt")).toBe("Launch day post");
  expect(url.searchParams.get("client")).toBe("Northwind Studio");
  expect(url.searchParams.get("style")).toBe("Bold");
  expect(url.searchParams.get("colors")).toBe("navy #001122");
  expect(imageStudioLink("", { text: "Hi" }, null)).toBe("");
});
