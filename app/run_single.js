const export_results_csv = require("./core/export_results_csv");
const PATHS = require("./core/paths");
const path = require("path");

module.exports = async function runSingle() {
  const fs = require("fs");
  const csv = require("csv-parser");
  const { chromium } = require("playwright");
  const router = require("./core/router");
  const { logDebug } = require("./core/debug");
  const { upsertRecord } = require("./core/db");
  const paths = require("./core/paths");
  const {
    buildRecord,
    applyCapabilities,
    recordToObject
  } = require("./core/recordFactory");

  logDebug("🚀 Single runner started");
  logDebug("EDGE_PROFILE =", paths.EDGE_PROFILE);

  if (!fs.existsSync(paths.REQUEST_SINGLE)) {
    throw new Error(`request_single.csv not found at ${paths.REQUEST_SINGLE}`);
  }

  // --- read CSV ---
  const task = await new Promise((resolve, reject) => {
    let row = null;
    fs.createReadStream(paths.REQUEST_SINGLE)
      .pipe(csv({ mapHeaders: ({ header }) => header.trim().toLowerCase() }))
      .on("data", r => {
        if (r.bl && r.scraper) {
          row = { bl: r.bl.trim(), scraper: r.scraper.trim().toLowerCase() };
        }
      })
      .on("end", () => resolve(row))
      .on("error", reject);
  });

  if (!task) throw new Error("No valid row in request_single.csv");

  logDebug(`🔍 Single scrape → ${task.bl}`);

  const context = await chromium.launchPersistentContext(
    paths.EDGE_PROFILE,
    { headless: false, channel: "msedge" }
  );

  const page = await context.newPage();

  const route = router(task.scraper);
  if (!route) throw new Error("Scraper not found");

  const line = require("better-sqlite3")(paths.DB)
    .prepare(`SELECT url FROM shipping_lines WHERE scraper_key=?`)
    .get(task.scraper);

  const scraped = await route.scrape(page, line.url, task.bl);

  let record = buildRecord({ bl: task.bl, status: "Success" }, scraped);
  record = applyCapabilities(record, route.meta);

  upsertRecord(recordToObject(record));
  export_results_csv();
  fs.writeFileSync(path.join(PATHS.OUTPUT,"scrape_done.flag"), "done");

  await context.close();
  logDebug("✅ Single scrape completed");
};
