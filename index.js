"use strict";

const path = require("path");
const fs = require("fs");
const PATHS = require("./app/core/paths");
const { runSetupUpdater } = require("./updater");
const pkg = require("./package.json");

// --------------------
// DEBUG BOOTSTRAP
// --------------------
function logStartup() {
  try {
    console.log("DEBUG START");
    console.log("cwd:", process.cwd());
    console.log("__dirname:", __dirname);
    console.log("RAW ARGV:", process.argv.slice(2).join(" "));
  } catch (e) {
    console.error("Startup log failed:", e.message);
  }
}

logStartup();

// --------------------
// ARG PARSING
// --------------------
const args = process.argv.slice(2);
const mode = args[0]; // "init"


console.log("PARSED ARGS:", mode || "(none)");

// --------------------
// VALIDATE MODE
// --------------------
if (!mode || !["single", "multiple", "update", "init", "flushedmultiple","version"].includes(mode)) {
  console.error(`
Usage:
  Scrapper.exe init
  Scrapper.exe single
  Scrapper.exe multiple
  Scrapper.exe update
  Scrapper.exe flushedmultiple
  Scrapper.exe version
`);
  process.exit(1);
}

// --------------------
// ROUTING
// --------------------
(async () => {
  try {
    if (mode === "init") {
      const init = require("./app/init");
      await init();
    }

    if (mode === "single") {
      await require("./app/core/export_shipping_lines_csv")();
      await require("./app/run_single")();
      await require("./app/core/export_results_csv")();
    }

    if (mode === "flushedmultiple") {
      const { resetResults } = require("./app/core/db");
      await resetResults();
      await require("./app/run_parallel")();
      await require("./app/core/export_results_csv")();
    }

    if (mode === "multiple") {
      await require("./app/core/export_shipping_lines_csv")();
      await require("./app/run_parallel")();
      await require("./app/core/export_results_csv")();
    }

    if (mode === "update") {
      const { syncShippingLines } = require("./app/core/syncShippingLines");
      await syncShippingLines();
      await runSetupUpdater(pkg.version);
    }

    if (mode === "version") {
      console.log("Installed Version is V" + pkg.version);
    }

    console.log("✔ Task completed");
    process.exit(0);

  } catch (err) {
    console.error("≡ ELECTRON FATAL ERROR");
    console.error("Message:", err.message);
    console.error("Stack:", err.stack);
    process.exit(1);
  }
})();

