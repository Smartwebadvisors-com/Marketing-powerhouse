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
quality guidance. The current integration uses the app’s existing direct
Anthropic connection and model; configure your own API key through the existing
key control. Requests incur provider usage charges. No paid calls are made by
the automated tests.

Client profiles, library items, and the API key use the app’s existing browser
local storage. This is a browser workspace, not a shared authenticated client
database. Before a multi-user production rollout, replace browser-held keys with
an authenticated backend and add appropriate server-side storage and access
controls. Do not place a shared provider secret in a React environment variable.

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
