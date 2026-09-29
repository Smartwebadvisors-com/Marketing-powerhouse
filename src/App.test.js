import { render, screen } from '@testing-library/react';
import App from './App';

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
