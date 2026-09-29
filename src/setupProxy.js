const { mountClaude } = require("../server/claudeProxy");

module.exports = function setupProxy(app) {
  mountClaude(app);
};
