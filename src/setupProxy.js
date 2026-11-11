const { mountClaude } = require("../server/claudeProxy");
const { mountStudio } = require("../server/studio");

module.exports = function setupProxy(app) {
  app.set("trust proxy", 1);
  mountStudio(app);
  mountClaude(app);
};
