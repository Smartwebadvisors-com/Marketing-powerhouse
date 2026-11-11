import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PowerhouseWorkspace from './PowerhouseWorkspace';
import { clientContext, coreInstructions, plugin, workflowDocuments, workflows } from './powerhouse';

const client = { id: 'client-a', businessName: 'Example Bakery', targetAudience: 'Local families', mainOffer: 'Bread subscriptions' };

test('imports all specialist workflows and includes provenance and shared rules', () => {
  expect(workflows).toHaveLength(12);
  expect(plugin.version).toBe('0.9.19');
  expect(plugin.commit).toMatch(/^[a-f0-9]{40}$/);
  for (const workflow of workflows) {
    expect(workflowDocuments(workflow.id).some(doc => doc.file === workflow.file)).toBe(true);
  }
  expect(coreInstructions()).toContain('Do not fabricate testimonials');
  expect(coreInstructions()).toContain('text generation only');
  expect(workflowDocuments('content').some(doc => doc.file.endsWith('content-intelligence.md'))).toBe(true);
});

test('excludes another brand brief and unapproved client fields from context', () => {
  const context = clientContext({ ...client, otherClients: ['Private Brand'] }, { brand: 'Other Brand', constraints: 'Private' });
  expect(context.brief).toBeNull();
  expect(JSON.stringify(context)).not.toContain('Private');
  expect(() => clientContext(null, {})).toThrow('Select a client');
});

test('uses the selected workflow, client and source evidence and explicitly saves the result', async () => {
  const generate = jest.fn().mockResolvedValue('Prioritize subscription signups.');
  const onSave = jest.fn();
  render(<PowerhouseWorkspace client={client} generate={generate} onSave={onSave} />);
  fireEvent.change(screen.getByLabelText('Workflow'), { target: { value: 'multi-industry-prospecting' } });
  fireEvent.change(screen.getByLabelText('What do you want to create?'), { target: { value: 'Plan outreach in Boston' } });
  fireEvent.change(screen.getByLabelText('Source excerpts and evidence (optional)'), { target: { value: 'Approved territory: Boston' } });
  fireEvent.click(screen.getByRole('button', { name: 'Run workflow' }));
  await screen.findByText('Prioritize subscription signups.');
  expect(generate.mock.calls[0][0]).toContain('Do not invent a business');
  expect(generate.mock.calls[0][1]).toContain('Example Bakery');
  expect(generate.mock.calls[0][1]).toContain('Approved territory: Boston');
  expect(onSave).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Save to Library' }));
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ clientId: 'client-a', workflow: 'multi-industry-prospecting', text: 'Prioritize subscription signups.' }));
  expect(screen.getByRole('button', { name: 'Saved to Library' })).toBeDisabled();
});

test('shows provider errors and lets the user retry', async () => {
  const generate = jest.fn().mockRejectedValue(new Error('Provider unavailable'));
  render(<PowerhouseWorkspace client={client} generate={generate} onSave={jest.fn()} />);
  fireEvent.change(screen.getByLabelText('What do you want to create?'), { target: { value: 'Plan a launch' } });
  fireEvent.click(screen.getByRole('button', { name: 'Run workflow' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Provider unavailable');
  expect(screen.getByRole('button', { name: 'Run workflow' })).toBeEnabled();
});

test('discards an in-flight result when the selected client changes', async () => {
  let resolve;
  const generate = jest.fn().mockReturnValue(new Promise(done => { resolve = done; }));
  const onSave = jest.fn();
  const { rerender } = render(<PowerhouseWorkspace key="a" client={client} generate={generate} onSave={onSave} />);
  fireEvent.change(screen.getByLabelText('What do you want to create?'), { target: { value: 'Brand A plan' } });
  fireEvent.click(screen.getByRole('button', { name: 'Run workflow' }));
  rerender(<PowerhouseWorkspace key="b" client={{ id: 'b', businessName: 'Brand B' }} generate={generate} onSave={onSave} />);
  resolve('Private Brand A result');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Run workflow' })).toBeDisabled());
  expect(screen.queryByText('Private Brand A result')).not.toBeInTheDocument();
  expect(onSave).not.toHaveBeenCalled();
});
