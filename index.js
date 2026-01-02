"use strict";

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

// Normalize mode from either:
//   Scrapper.exe init
//   Scrapper.exe --mode=init
//   Scrapper.exe --mode init   (future-safe)
let mode = null;

for (let i = 0; i < args.length; i++) {
  const a = args[i];

  if (!a) continue;

  // --mode=init
  if (a.startsWith("--mode=")) {
    mode = a.split("=")[1];
    break;
  }

  // --mode init
  if (a === "--mode" && args[i + 1]) {
    mode = args[i + 1];
    break;
  }

  // plain: init / single / check-excel-update
  if (!a.startsWith("-")) {
    mode = a;
    break;
  }
}

console.log("PARSED MODE:", mode || "(none)");


// --------------------
// VALIDATE MODE
// --------------------
if (!mode || !["single", "multiple", "update", "init", "flushedmultiple", "version", "check-excel-update", "download-excel"].includes(mode)) {
  console.error(`
Usage:
  Scrapper.exe init
  Scrapper.exe single
  Scrapper.exe multiple
  Scrapper.exe update
  Scrapper.exe flushedmultiple
  Scrapper.exe version
  Scrapper.exe check-excel-update
  Scrapper.exe download-excel
`);
  process.exit(1);
}

function getFirstNonFlagArg(afterMode = true) {
  const clean = args.filter(a => a && !a.startsWith("-"));
  return afterMode ? clean[1] : clean[0];
}


// --------------------
// ROUTING
// --------------------
(async () => {
  try {

    if (mode === "version") {
      console.log("Installed Version: V" + pkg.version);
    }

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
    if (mode === "check-excel-update") {
      const currentVersion = getFirstNonFlagArg(true) || "0.0.0";
      await require("./app/core/checkExcelUpdate")(currentVersion);
    }

    if (mode === "download-excel") {
      const url = getFirstNonFlagArg(true);
      if (!url) throw new Error("Missing URL");
      await require("./app/core/downloadExcel")(url);
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

