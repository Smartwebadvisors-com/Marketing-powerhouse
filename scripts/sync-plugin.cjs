// Import a reviewed local plugin checkout; never fetch or update it implicitly.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const source = path.resolve(process.argv[2] || '../swa-plugin-marketplace/plugins/marketing-powerhouse');
const manifest = JSON.parse(fs.readFileSync(path.join(source, 'plugin.json'), 'utf8'));
const documents = {};
function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(file);
    else if (entry.isFile() && /\.(md|txt|json)$/.test(entry.name)) {
      const relative = path.relative(source, file).split(path.sep).join('/');
      const text = fs.readFileSync(file, 'utf8');
      documents[relative] = { text, sha256: crypto.createHash('sha256').update(text).digest('hex') };
    }
  }
}
visit(path.join(source, 'skills'));
const workflows = Object.keys(documents).filter(p => /^skills\/[^/]+\/SKILL\.md$/.test(p)).map(file => {
  const text = documents[file].text;
  const description = text.match(/^description:\s*(.+)$/m)?.[1];
  if (!description) throw new Error(`Missing description: ${file}`);
  return { id: file.split('/')[1], description, file };
}).sort((a, b) => a.id.localeCompare(b.id));
const output = {
  source: 'Smartwebadvisors-com/swa-plugin-marketplace',
  commit: execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  version: manifest.version,
  workflows,
  documents,
};
const destination = path.resolve(__dirname, '../src/plugin-bundle.json');
fs.writeFileSync(destination, JSON.stringify(output, null, 2) + '\n');
console.log(`Imported ${workflows.length} workflows and ${Object.keys(documents).length} source documents (plugin ${manifest.version}).`);
