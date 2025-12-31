const https = require("https");
const Database = require("better-sqlite3");
const path = require("path");
const { logDebug } = require("./debug");
const paths = require("./paths");
const exportShippingLinesToCsv = require("./export_shipping_lines_csv");

const DB_PATH = paths.DB;

// ✅ RAW GitHub URL (AUTHORITATIVE SOURCE)
const REMOTE_URL =
  "https://raw.githubusercontent.com/Zaid-Marfani/Scrapper/refs/heads/main/config/shipping_lines.json";

/* ------------------ SEMVER ------------------ */
function compare(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

/* ------------------ FETCH REMOTE JSON ------------------ */
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, res => {
        if (res.statusCode !== 200) {
          reject(new Error("HTTP " + res.statusCode));
          return;
        }

        let data = "";
        res.on("data", d => (data += d));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error("Invalid JSON from server"));
          }
        });
      })
      .on("error", reject);
  });
}

/* ------------------ MAIN SYNC ------------------ */
async function syncShippingLines() {
  logDebug("🌐 Checking shipping lines update (online)...");

  let remote;
  try {
    remote = await fetchJson(REMOTE_URL);
  } catch (err) {
    logDebug("❌ Cannot fetch shipping lines:", err.message);
    logDebug("ℹ Using existing DB data");
    return;
  }

  if (!Array.isArray(remote.lines)) {
    throw new Error("Remote shipping_lines.json → 'lines' missing");
  }

  const db = new Database(DB_PATH);

  // ---- META TABLE (VERSION TRACKING) ----
  db.prepare(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `).run();

  const currentVersion =
    db.prepare(
      "SELECT value FROM meta WHERE key='shipping_lines_version'"
    ).get()?.value || "0.0.0";

  if (compare(remote.version, currentVersion) <= 0) {
    logDebug(`✅ Shipping lines already up to date (v${currentVersion})`);
    return;
  }

  logDebug(
    `🔄 Updating shipping lines v${currentVersion} → v${remote.version}`
  );

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

  const tx = db.transaction(lines => {
    for (const l of lines) stmt.run(l);
  });

  tx(remote.lines);

  db.prepare(`
    INSERT OR REPLACE INTO meta (key, value)
    VALUES ('shipping_lines_version', ?)
  `).run(remote.version);

  logDebug("🎉 Shipping lines updated successfully");
  logDebug("🎉 Shipping lines exporting to csv file");
  exportShippingLinesToCsv();
}

module.exports = { syncShippingLines };
