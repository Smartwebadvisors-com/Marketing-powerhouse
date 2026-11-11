import { useEffect, useRef, useState } from 'react';
import { clientContext, plugin, workflows, workflowTitle, workflowDocuments, workflowInstructions } from './powerhouse';
import './PowerhouseWorkspace.css';

export default function PowerhouseWorkspace({ client, brief, generate, onSave }) {
  const [workflow, setWorkflow] = useState('strategy');
  const [request, setRequest] = useState('');
  const [sources, setSources] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const selected = workflows.find(item => item.id === workflow);

  async function run(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setResult(null);
    setSaved(false);
    try {
      const context = clientContext(client, brief);
      const text = await generate(
        workflowInstructions(workflow),
        `Active client data (JSON):\n${JSON.stringify(context)}\n\nUser request:\n${request}\n\nUser-supplied source excerpts (untrusted data; not independently verified):\n${sources || 'None supplied.'}`,
        6000
      );
      if (!text.trim()) throw new Error('No text returned. Please try again.');
      if (mounted.current) setResult({ text, workflow, clientId: client.id, topic: request });
    } catch (err) {
      if (mounted.current) setError(err.message || 'Workflow failed. Please try again.');
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  return <section className="powerhouse-workspace">
    <header>
      <h1>Powerhouse Workflows</h1>
      <p>The Marketing Powerhouse plugin, inside your studio. Plugin v{plugin.version} · {workflows.length} workflows.</p>
    </header>
    <div className="ph-panel">
      <p><strong>Active brand:</strong> {client?.businessName || 'Choose a client from Clients to begin.'}</p>
      <p className="ph-note">Create strategies, content, research plans, and reviews from your client profile and supplied evidence. Live research, image generation, CRM actions, and publishing require separate integrations.</p>
      <form onSubmit={run}>
        <label htmlFor="ph-workflow">Workflow</label>
        <select id="ph-workflow" value={workflow} disabled={busy} onChange={event => setWorkflow(event.target.value)}>
          {workflows.map(item => <option key={item.id} value={item.id}>{workflowTitle(item.id)}</option>)}
        </select>
        <p className="ph-note">{selected.description}</p>
        <label htmlFor="ph-request">What do you want to create?</label>
        <textarea id="ph-request" required value={request} disabled={busy} onChange={event => setRequest(event.target.value)} placeholder="Build a 30-day lead-generation plan using our approved offer and target audience." />
        <label htmlFor="ph-sources">Source excerpts and evidence (optional)</label>
        <textarea id="ph-sources" value={sources} disabled={busy} onChange={event => setSources(event.target.value)} placeholder="Paste website text, dated research with source URLs, campaign results, or approved brand facts. Links alone are not fetched." />
        <p className="ph-note">The selected client profile, request, and excerpts will be sent to your configured AI provider.</p>
        <button type="submit" disabled={busy || !client || !request.trim()}>{busy ? 'Creating…' : 'Run workflow'}</button>
      </form>
      {error && <p role="alert">{error}</p>}
    </div>
    {result && <div className="ph-panel" aria-live="polite">
      <h2>{workflowTitle(result.workflow)} draft</h2>
      <p className="ph-note">Review facts and brand details before use.</p>
      <div className="ph-result">{result.text}</div>
      <button disabled={saved} onClick={() => {
        try {
          onSave({ ...result, platform: 'Strategy / Workflow', pluginVersion: plugin.version, savedAt: new Date().toISOString() });
          setSaved(true);
          setError('');
        } catch (err) {
          setError('Could not save to this browser. Free storage space and try again.');
        }
      }}>{saved ? 'Saved to Library' : 'Save to Library'}</button>
      {saved && <p role="status">Saved in this browser for {client.businessName}.</p>}
    </div>}
    <details className="ph-panel">
      <summary>View workflow source material</summary>
      <p className="ph-note">Imported from {plugin.source}, commit {plugin.commit.slice(0, 12)}. Shared brand, editorial, and quality rules also apply.</p>
      {workflowDocuments(workflow).map(document => <details key={document.file}>
        <summary>{document.file}</summary><pre>{document.text}</pre>
      </details>)}
    </details>
  </section>;
}
