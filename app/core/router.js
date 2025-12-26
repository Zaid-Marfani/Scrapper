const path = require("path");
const Database = require("better-sqlite3");

const db = new Database(
  path.join(__dirname, "../../output/bl_results.db")
);

module.exports = function router(scraperKey = "") {
  if (!scraperKey) return null;

  const key = scraperKey.toLowerCase().trim();

  const row = db.prepare(`
    SELECT scraper_key
    FROM shipping_lines
    WHERE active = 1
      AND scraper_key = ?
  `).get(key);

  if (!row) return null;

  try {
    return require(
      path.join(__dirname, "..", "scrapers", row.scraper_key)
    );
  } catch {
    return null;
  }
};
  