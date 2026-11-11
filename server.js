const express = require('express');
const path = require('path');
const { mountClaude } = require('./server/claudeProxy');
const { mountStudio } = require('./server/studio');
const app = express();
const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1);
mountStudio(app);
mountClaude(app);

app.use(express.static(path.join(__dirname, 'build')));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Marketing Powerhouse running on port ${PORT}`);
});
