"use strict";

const fs = require("fs");
const path = require("path");   // ✅ MISSING LINE (FIX)
const os = require("os");

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
if (
  !mode ||
  ![
    "single",
    "multiple",
    "update",
    "init",
    "flushedmultiple",
    "version",
    "check-excel-update",
    "download-excel",
    "replace-excel"   // ✅ ADD THIS
  ].includes(mode)
) {

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

    switch (mode) {

      case "version":
        console.log("Installed Version: V" + pkg.version);
        break;

      case "init":
        await require("./app/init")();
        break;

      case "single":
        await require("./app/core/export_shipping_lines_csv")();
        await require("./app/run_single")();
        await require("./app/core/export_results_csv")();
        break;

      case "multiple":
        await require("./app/core/export_shipping_lines_csv")();
        await require("./app/run_parallel")();
        await require("./app/core/export_results_csv")();
        break;

      case "flushedmultiple":
        const { resetResults } = require("./app/core/db");
        await resetResults();
        await require("./app/run_parallel")();
        await require("./app/core/export_results_csv")();
        break;

      case "update":
        const { syncShippingLines } = require("./app/core/syncShippingLines");
        await syncShippingLines();
        await runSetupUpdater(pkg.version);
        break;

      case "check-excel-update": {
        await require("./app/core/checkExcelUpdate")();
        break;
      }

      case "download-excel": {


        const TEMP = process.env.TEMP || os.tmpdir();
        const FLAG = path.join(TEMP, "excel_downloaded.flag");
        const REQ = path.join(TEMP, "excel_download_request.txt");

        try {
          if (!fs.existsSync(REQ)) {
            fs.writeFileSync(
              FLAG,
              "ERROR\r\nMESSAGE=Request file missing",
              "ascii"
            );
            break;
          }

          const url = fs.readFileSync(REQ, "utf8").trim();
          if (!url) {
            fs.writeFileSync(
              FLAG,
              "ERROR\r\nMESSAGE=URL empty",
              "ascii"
            );
            break;
          }

          console.log("download-excel →", url);

          await require("./app/core/downloadExcel")(url);

        } catch (e) {
          fs.writeFileSync(
            FLAG,
            "ERROR\r\nMESSAGE=" + e.message,
            "ascii"
          );
        }

        break;
      }
      case "replace-excel":
        await require("./app/core/replaceExcel")();
        break;

      default:
        throw new Error("Unknown mode: " + mode);
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


