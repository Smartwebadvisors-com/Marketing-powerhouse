# Marketing Powerhouse Web Studio

A React studio for client profiles, content, campaigns, blogs, calendars, and
reporting, with Marketing Powerhouse plugin workflows integrated into the same app.

## Develop and validate

Use Node.js 22 and npm with the committed lockfile:

```sh
npm ci
npm start
```

Production and checks:

```sh
CI=true npm test -- --watchAll=false --runInBand
npm run build
node server.js
```

The Express server serves `build/` on `PORT` (default 3001). `npm start` runs the
React development server on port 3000. GitHub Actions runs tests and a production
build and retains the build artifact. Deployment to the existing domain remains
managed by its hosting provider; no hosting credentials or deployment changes
are included here.

## Integrated plugin workflows

Choose a client, then open **Powerhouse Workflows**. Select brand profiles,
strategy, content, creative direction, launches, local services, source
intelligence, prospecting, analytics, quality review, campaign planning, or
self-audit planning. Enter a task and paste relevant source excerpts or evidence.
The request uses only the selected client’s brand fields and a matching brief.
Changing clients clears the workspace and discards pending responses. Click
**Save to Library** to retain a reviewed draft in this browser, tagged with its
client ID, workflow, and plugin version. A generated draft is not client approval.

All existing AI tools also receive the plugin’s shared brand, editorial, and
quality guidance. The integration preserves the live studio's audience writer,
voice cards, draft ratings, private login, saved records, and image-studio handoff.
AI requests use the same-origin `/api/claude` backend. Configure
`ANTHROPIC_API_KEY` on the server or use the existing personal key control.
Requests incur provider usage charges. No paid calls are made by automated tests.

Set `STUDIO_PASSWORD` on the server for the existing studio login. Records retain
the browser copy and sync through `/api/studio` to `STUDIO_DATA_PATH` (default
`data/studio.json`). Back up this file before deployment. The shared studio
password is not separate per-user authentication or tenant isolation. Personal
keys entered in the browser retain the app's local storage behavior. Never put
a server provider secret in a React environment variable.

On the current Hostinger VPS, the app runs from
`/var/www/Marketing-powerhouse` under PM2 process `marketing-studio`, behind
Nginx on port 3003. Keep its existing PM2 environment, data directory and Nginx
configuration when updating. Build successfully before restarting this process.

### Capabilities and limits

The integration imports plugin instructions and reference documents. The current
model connection generates text; it does not browse URLs, verify prospects,
generate images, run the plugin’s Python campaign validator, schedule or publish
posts, send outreach, or connect to a CRM. Supply source excerpts for analysis.
Creative workflows produce briefs/prompts. Campaign workflows produce drafts;
AI-generated CSV is not a substitute for the plugin’s structural export validator.
Self-audit outputs are plans or self-assessments, not independent certification.
The plugin’s Python utilities remain in the marketplace repository and are not
executed by this web app.

## Updating the imported plugin

`src/plugin-bundle.json` contains versioned source text, per-document SHA-256
hashes, and the marketplace commit. The web app builds independently of the
marketplace checkout. To refresh from a reviewed local copy:

```sh
npm run sync:plugin -- /path/to/swa-plugin-marketplace/plugins/marketing-powerhouse
```

The default source is the sibling `../swa-plugin-marketplace` checkout. Inspect
the generated diff, run tests and the production build, and commit the bundle.
The importer includes all 13 skill documents (the router plus 12 specialist
workflows) and their Markdown, text, and JSON supporting documents. Selected
workflow instructions and relevant references are included in model requests;
reference file paths do not grant filesystem access. Original plugin packages
and installed ChatGPT plugins are unchanged. Importing these private materials
does not grant redistribution rights.
