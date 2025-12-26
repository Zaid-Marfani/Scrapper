const { syncShippingLines } = require("./app/core/syncShippingLines");
const { runUpdater } = require("./updater");
const { logDebug } = require("./app/core/debug");

const cmd = process.argv[2];

(async () => {
  try {
    switch (cmd) {
     case "update":
        logDebug("🔄 Updating app + shipping lines...");
        syncShippingLines();
        runUpdater();
        break;

      case "single":
        require("./app/run_single");
        break;

      case "multiple":
        require("./app/run_parallel");
        break;

      default:
        logDebug(`
Usage:
  node index.js single
  node index.js multiple
  node index.js update:lines
  node index.js update:app
  node index.js update:all
        `);
    }
  } catch (err) {
    logDebug("❌ Error:", err.message);
    process.exit(1);
  }
})();
