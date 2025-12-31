const https = require("https");
const Database = require("better-sqlite3");
const paths = require("./paths");
const { logDebug } = require("./debug");

const defaultConfig = require("../../config/shipping_lines_default");
console.log("🔥🔥 syncShippingLines FILE LOADED 🔥🔥");

// FORCE table creation
require("./db");


// RAW GitHub JSON
const REMOTE_URL =
  "https://raw.githubusercontent.com/Zaid-Marfani/Scrapper/refs/heads/main/config/shipping_lines.json";

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode !== 200) {
        reject(new Error("HTTP " + res.statusCode));
        return;
      }
      let data = "";
      res.on("data", d => (data += d));
      res.on("end", () => resolve(JSON.parse(data)));
    }).on("error", reject);
  });
}

function upsertLines(db, lines) {
  const stmt = db.prepare(`
    INSERT INTO shipping_lines
      (code, display_name, scraper_key, url, active)
    VALUES
      (@code, @display_name, @scraper_key, @url, @active)
    ON CONFLICT(scraper_key) DO UPDATE SET
      display_name = excluded.display_name,
      url = excluded.url,
      active = excluded.active
  `);

  const tx = db.transaction(list => {
    for (const l of list) stmt.run(l);
  });

  tx(lines);
}

async function syncShippingLines() {

  console.log("🔥🔥 syncShippingLines FUNCTION ENTERED 🔥🔥");
  const db = new Database(paths.DB);

  // ensure meta table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `).run();

  console.log("🔥 checking shipping_lines count");

  const count = db
    .prepare("SELECT COUNT(*) AS c FROM shipping_lines")
    .get().c;

  console.log("📊 shipping_lines count =", count);

  // 🟢 FIRST INSTALL → seed from embedded config
  if (count === 0) {
    logDebug("🟢 Seeding shipping lines from embedded config");
    upsertLines(db, defaultConfig.lines);

    db.prepare(`
      INSERT OR REPLACE INTO meta (key, value)
      VALUES ('shipping_lines_version', ?)
    `).run(defaultConfig.version);

    return;
  }

  // 🌐 ONLINE UPDATE
  try {
    logDebug("🌐 Checking shipping lines update (online)");
    const remote = await fetchJson(REMOTE_URL);

    const current =
      db.prepare(
        "SELECT value FROM meta WHERE key='shipping_lines_version'"
      ).get()?.value || "0.0.0";

    if (remote.version <= current) {
      logDebug(`✅ Shipping lines already up to date (v${current})`);
      return;
    }

    upsertLines(db, remote.lines);

    db.prepare(`
      INSERT OR REPLACE INTO meta (key, value)
      VALUES ('shipping_lines_version', ?)
    `).run(remote.version);

    logDebug(`🎉 Shipping lines updated to v${remote.version}`);

  } catch (err) {
    logDebug("⚠ Online update skipped: " + err.message);
  }
}

module.exports = { syncShippingLines };
