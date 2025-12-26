const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { chromium } = require("playwright");
const Database = require("better-sqlite3");

const router = require("./core/router");
const { logDebug } = require("./core/debug");
const { upsertRecord } = require("./core/db");
const { recordToObject } = require("./core/recordFactory");
const {
  buildRecord,
  applyCapabilities,
  recordToRow,
  getCsvHeader
} = require("./core/recordFactory");
const db = new Database(
  path.join(__dirname, "../output/bl_results.db")
);



const REQUEST = path.join(__dirname, "../output/request_single.csv");
const BL_RESULTS = path.join(__dirname, "../output/bl_results.csv");
const PROFILE_PATH = path.join(__dirname, "edge-profile");

const OPTIONS = {
  headless: false,
  channel: "msedge",
  viewport: { width: 1200, height: 900 },
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
};

// ------------------ read request_single.csv ------------------
async function readRequest() {
  return new Promise((resolve, reject) => {
    let row = null;
    if (!fs.existsSync(REQUEST)) return resolve(null);

    fs.createReadStream(REQUEST)
      .pipe(csv({ mapHeaders: ({ header }) => header.trim().toLowerCase() }))
      .on("data", r => {
        if (r.bl && r.scraper) {
          row = {
            bl: r.bl.trim(),
            scraper: r.scraper.trim().toLowerCase()
          };
        }

      })
      .on("end", () => resolve(row))
      .on("error", reject);
  });
}

// ------------------ MAIN ------------------
(async () => {
  try {
    const task = await readRequest();
    if (!task) {
      logDebug("No valid request_single.csv");
      process.exit(1);
    }

    logDebug(`Single scrape → ${task.bl}`);

    const context = await chromium.launchPersistentContext(
      PROFILE_PATH,
      OPTIONS
    );
    const page = await context.newPage();

    await page.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
    });

    let route = null;

    try {
      route = router(task.scraper);
      if (!route || typeof route.scrape !== "function") {
        throw new Error("Scraper not found");
      }

      const line = db.prepare(`
  SELECT url
  FROM shipping_lines
  WHERE active = 1
    AND scraper_key = ?
`).get(task.scraper);

if (!line) {
  throw new Error("Shipping line disabled or not found");
}


      const scraped = await route.scrape(page, line.url, task.bl);


      let record = buildRecord(
        { bl: task.bl, status: "Success" },
        scraped || {}
      );

      record = applyCapabilities(record, route.meta);

      upsertRecord(recordToObject(record));


    } catch (err) {
      logDebug("Single scrape error: " + err.message);

      let record = buildRecord(
        { bl: task.bl, status: "Error" },
        { lastEvent: err.message }
      );

      record = applyCapabilities(record, route?.meta);

      upsertRecord(recordToObject(record));

    }


    await page.close();
    await context.close();
    fs.writeFileSync("C:/Scripts/output/scrape_done.flag", "done");

  } catch (err) {
    logDebug("Fatal single error: " + err.message);
    fs.writeFileSync("C:/Scripts/output/scrape_done.flag", "done");
    process.exit(1);
  }
})();

module.exports = async function runSingle(blNo) {
  console.log("Running single BL:", blNo);
};