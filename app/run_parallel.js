const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { chromium } = require("playwright");
const Database = require("better-sqlite3");

const router = require("./core/router");
const { logDebug } = require("./core/debug");
const { upsertRecord, getAllRecords } = require("./core/db");
const db = new Database(
  path.join(__dirname, "../output/bl_results.db")
);


const {
  buildRecord,
  applyCapabilities,
  recordToRow,
  getCsvHeader
} = require("./core/recordFactory");


const INPUT_CSV = path.join(__dirname, "../output/input.csv");
const PROFILE_PATH = path.join(__dirname, "edge-profile");

const CONCURRENCY = 6;

const BROWSER_OPTIONS = {
  headless: false,
  channel: "msedge",
  viewport: { width: 1200, height: 900 },
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
};

// ------------------ read input.csv ------------------
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

// ------------------ worker task ------------------
const resultsMap = new Map();

async function processTask(context, task, wid) {
  logDebug(`[W${wid}] ${task.bl}`);

  let page = null;
  let route = null;

  try {
    page = await context.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
    });

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

    upsertRecord(record);


  } catch (err) {
    logDebug(`[W${wid}] Error ${task.bl}: ${err.message}`);

    const record = applyCapabilities(
      buildRecord(
        { bl: task.bl, status: "Error" },
        { lastEvent: err.message }
      ),
      route?.meta
    );

    upsertRecord(record);


  } finally {
    if (page) await page.close();
  }
}


// ------------------ parallel runner ------------------
async function runParallel(tasks) {
  const context = await chromium.launchPersistentContext(
    PROFILE_PATH,
    BROWSER_OPTIONS
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
}

// ------------------ MAIN ------------------
(async () => {
  try {
    if (!fs.existsSync(INPUT_CSV)) {
      logDebug("input.csv not found");
      process.exit(1);
    }

    const tasks = await readInputCsv();
    if (!tasks.length) {
      logDebug("No valid rows in input.csv");
      process.exit(1);
    }


    // 🔥 READ EVERYTHING FROM SQLITE
    const records = getAllRecords();

    await runParallel(tasks);

    logDebug("Parallel scraping completed (SQLite updated)");
    fs.writeFileSync("C:/Scripts/output/scrape_done.flag", "done");

    logDebug("Parallel scrape completed");
    fs.writeFileSync("C:/Scripts/output/scrape_done.flag", "done");

  } catch (err) {
    logDebug("Fatal parallel error: " + err.message);
    fs.writeFileSync("C:/Scripts/output/scrape_done.flag", "done");
    process.exit(1);
  }
})();

module.exports = async function runMultiple(filePath) {
  console.log("Running multiple from:", filePath);
};
