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
  expect(screen.queryByText('Environment')).not.toBeInTheDocument();
  expect(screen.queryByText('Socioeconomic situation')).not.toBeInTheDocument();
  expect(screen.queryByText('Class')).not.toBeInTheDocument();
  expect(screen.queryByText(/^History$/)).not.toBeInTheDocument();
});
