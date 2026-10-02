import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

function jsonResponse(body) {
  return Promise.resolve({
    ok: true,
    json: async () => body,
  });
}

beforeEach(() => {
  localStorage.clear();
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    json: async () => ({ configured: false }),
  }));
});

test('renders the marketing studio', () => {
  render(<App />);
  expect(screen.getByText(/marketing powerhouse/i)).toBeInTheDocument();
  expect(screen.getByText(/no clients yet/i)).toBeInTheDocument();
  expect(screen.queryByText(/learn react/i)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /set api key/i })).toBeInTheDocument();
});

test('shows the api key as set when the server has one', async () => {
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    json: async () => ({ configured: true }),
  }));
  render(<App />);
  expect(await screen.findByRole('button', { name: /api key set/i })).toBeInTheDocument();
});

test('loads clients saved on the server', async () => {
  global.fetch = jest.fn((url) => {
    if (String(url).includes("/api/studio")) {
      return jsonResponse({
        clients: [{ id: "c1", businessName: "Northwind Studio", brandVoice: "Bold" }],
        activeClientId: "c1",
        brief: { brand: "Northwind Studio", audience: "", objective: "Awareness", tone: "Bold", keyMessage: "", constraints: "" },
        library: [],
        approvals: [],
        calendar: [],
        tracking: [],
        templates: [],
        voice: { samples: "", profile: "" },
        blogs: [],
        blogCalendar: [],
      });
    }
    return jsonResponse({ configured: false, imageStudioUrl: "" });
  });
  render(<App />);
  expect((await screen.findAllByText("Northwind Studio")).length).toBeGreaterThan(0);
});

test('links a saved post to image studio', async () => {
  localStorage.setItem("mp.active", JSON.stringify("library"));
  localStorage.setItem("mp.clients", JSON.stringify([{ id: "c1", businessName: "Northwind Studio", brandVoice: "Bold" }]));
  localStorage.setItem("mp.library", JSON.stringify([
    { platform: "LinkedIn", text: "Launch day post", savedAt: "2026-09-30T00:00:00.000Z", clientId: "c1" },
  ]));
  global.fetch = jest.fn((url) => {
    if (String(url).includes("/api/config")) return jsonResponse({ imageStudioUrl: "http://images.example" });
    if (String(url).includes("/api/studio")) return jsonResponse({ clients: [] });
    return jsonResponse({ configured: false });
  });
  render(<App />);
  const link = await screen.findByRole("link", { name: /make the image/i });
  const href = new URL(link.getAttribute("href"));
  expect(href.origin).toBe("http://images.example");
  expect(href.searchParams.get("prompt")).toBe("Launch day post");
  expect(href.searchParams.get("client")).toBe("Northwind Studio");
  expect(href.searchParams.get("style")).toBe("Bold");
});

test('the client form asks who they sell to', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /add new client/i }));
  expect(screen.getByText('Target Audience')).toBeInTheDocument();
  expect(screen.getByText('What do you refuse to do?')).toBeInTheDocument();
  expect(screen.getByText('What bothers you about your industry?')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /build voice card/i })).toBeInTheDocument();
  expect(screen.queryByText('Environment')).not.toBeInTheDocument();
  expect(screen.queryByText('Socioeconomic situation')).not.toBeInTheDocument();
  expect(screen.queryByText('Class')).not.toBeInTheDocument();
  expect(screen.queryByText(/^History$/)).not.toBeInTheDocument();
  expect(screen.queryByText('What they want to feel')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /build voice card/i }));
  expect(screen.getByText(/Answer at least one question in plain words first/i)).toBeInTheDocument();
});

function claudeResponse(text) {
  const body = JSON.stringify({ content: [{ text }] });
  return Promise.resolve({
    ok: true,
    text: async () => body,
    json: async () => JSON.parse(body),
  });
}

test('rewrites a weak draft once and shows the score', async () => {
  localStorage.setItem('mp.active', JSON.stringify('generator'));
  localStorage.setItem('mp.activeClientId', JSON.stringify('c1'));
  localStorage.setItem('mp.clients', JSON.stringify([{
    id: 'c1',
    businessName: 'Harbor & Co',
    goal: 'Engagement',
    targetAudience: 'Independent cafe owners',
    mainOffer: 'Weeknight dinner series',
  }]));
  const replies = [
    'Who: cafe owners\nWhat they want to feel: respected',
    'Variant 1\nGeneric post about food.',
    'SCORE: 61\nWHY: The hook is generic.\nFIX: Name the quiet Tuesday.',
    'Variant 1\nTuesday is quiet. What do you cook when the room is empty?',
  ];
  global.fetch = jest.fn((url) => {
    const path = String(url);
    if (path.includes('/api/claude') && !path.includes('status')) return claudeResponse(replies.shift());
    if (path.includes('/api/studio')) return jsonResponse({ clients: [] });
    return jsonResponse({ configured: false, imageStudioUrl: '' });
  });
  render(<App />);
  expect(await screen.findByText(/including psychology/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^generate$/i }));
  expect(await screen.findByText(/Score 61 out of 100/i)).toBeInTheDocument();
  expect(screen.getByText(/rewritten once/i)).toBeInTheDocument();
  expect(screen.getByText(/Tuesday is quiet/i)).toBeInTheDocument();
  expect(replies).toHaveLength(0);
});

test('keeps a draft that already scores 75 or higher', async () => {
  localStorage.setItem('mp.active', JSON.stringify('generator'));
  localStorage.setItem('mp.activeClientId', JSON.stringify('c1'));
  localStorage.setItem('mp.clients', JSON.stringify([{
    id: 'c1',
    businessName: 'Harbor & Co',
    goal: 'Sales',
    targetAudience: 'Independent cafe owners',
    mainOffer: 'Weeknight dinner series',
  }]));
  const replies = [
    'Who: cafe owners',
    'Variant 1\nThe dinner series is on Thursday. Reserve a seat.',
    'SCORE: 88\nWHY: It states the offer once and gives one next step.\nFIX: None',
  ];
  global.fetch = jest.fn((url) => {
    const path = String(url);
    if (path.includes('/api/claude') && !path.includes('status')) return claudeResponse(replies.shift());
    if (path.includes('/api/studio')) return jsonResponse({ clients: [] });
    return jsonResponse({ configured: false, imageStudioUrl: '' });
  });
  render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: /^generate$/i }));
  expect(await screen.findByText(/Score 88 out of 100/i)).toBeInTheDocument();
  expect(screen.getByText(/strong enough to keep/i)).toBeInTheDocument();
  expect(screen.queryByText(/rewritten once/i)).not.toBeInTheDocument();
  expect(replies).toHaveLength(0);
});
