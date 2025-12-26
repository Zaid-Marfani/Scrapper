const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const DB_PATH = path.join(__dirname, "../../output/bl_results.db");
const MASTER_FILE = path.join(__dirname, "../../output/shipping_lines.json");

function syncShippingLines() {
  if (!fs.existsSync(MASTER_FILE)) {
    throw new Error("shipping_lines.json not found");
  }

  const json = JSON.parse(
    fs.readFileSync(MASTER_FILE, "utf8")
  );

  if (!Array.isArray(json.lines)) {
    throw new Error("shipping_lines.json → 'lines' must be an array");
  }

  const db = new Database(DB_PATH);

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
    for (const l of lines) {
      stmt.run(l);
    }
  });

  tx(json.lines);
}

syncShippingLines();

module.exports = { syncShippingLines };
