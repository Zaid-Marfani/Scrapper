"use strict";

const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { chromium } = require("playwright");

const router = require("./core/router");
const paths = require("./core/paths");
const { logDebug } = require("./core/debug");
const { upsertRecord } = require("./core/db");
const {
  buildRecord,
  applyCapabilities,
  recordToObject
} = require("./core/recordFactory");
const export_results_csv = require("./core/export_results_csv");

const INPUT_CSV = paths.INPUT;
const CONCURRENCY = 6;   // ✅ number of parallel tabs

// ------------------ READ input.csv ------------------
function readInputCsv() {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(INPUT_CSV)
      .pipe(csv({ mapHeaders: ({ header }) => header.trim().toLowerCase() }))
      .on("data", r => {
        if (r.bl && r.scraper) {
          rows.push({
            bl: r.bl.trim(),
            scraper: r.scraper.trim().toLowerCase()
          });
        }
      })
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

// ------------------ WORKER (TAB) ------------------
async function processTask(context, task, wid) {
  let page;
  let route;

  try {
    logDebug(`[TAB ${wid}] ${task.bl}`);

    page = await context.newPage();

    await page.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
    });

    route = router(task.scraper);
    if (!route) throw new Error("Scraper not found");

    const line = require("better-sqlite3")(paths.DB)
      .prepare(`
        SELECT url
        FROM shipping_lines
        WHERE active = 1 AND scraper_key = ?
      `)
      .get(task.scraper);

    if (!line) throw new Error("Shipping line not found");

    const scraped = await route.scrape(page, line.url, task.bl);

    let record = buildRecord(
      { bl: task.bl, status: "Success" },
      scraped || {}
    );

    record = applyCapabilities(record, route.meta);
    upsertRecord(recordToObject(record));

  } catch (err) {
    logDebug(`[TAB ${wid}] ERROR ${task.bl}: ${err.message}`);

    let record = buildRecord(
      { bl: task.bl, status: "Error" },
      { lastEvent: err.message }
    );

    record = applyCapabilities(record, route?.meta);
    upsertRecord(recordToObject(record));

  } finally {
    if (page) await page.close();
  }
}

// ------------------ PARALLEL RUNNER ------------------
async function runParallel(tasks) {
  const context = await chromium.launchPersistentContext(
    paths.EDGE_PROFILE,
    {
      headless: false,
      channel: "msedge",
      viewport: { width: 1200, height: 900 }
    }
  );

  let index = 0;

  async function worker(id) {
    while (true) {
      const i = index++;
      if (i >= tasks.length) break;
      await processTask(context, tasks[i], id);
    }
  }

  await Promise.all(
    Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1))
  );

  await context.close();
  export_results_csv();
    fs.writeFileSync(path.join(paths.OUTPUT,"scrape_done.flag"), "done");
}

// ------------------ ENTRY ------------------
module.exports = async function runMultiple() {
  logDebug("🚀 Parallel TAB runner started");

  if (!fs.existsSync(INPUT_CSV)) {
    throw new Error(`input.csv not found at ${INPUT_CSV}`);
  }

  const tasks = await readInputCsv();
  if (!tasks.length) {
    throw new Error("input.csv has no valid rows");
  }

  await runParallel(tasks);

  logDebug("✅ Parallel tab scrape completed");
};
