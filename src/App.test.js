import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

test('opens the plugin workspace from the studio navigation', () => {
  render(<App />);
  fireEvent.click(screen.getByText('Powerhouse Workflows'));
  expect(screen.getByRole('heading', { name: 'Powerhouse Workflows' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Run workflow' })).toBeDisabled();
});
