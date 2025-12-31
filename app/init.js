const fs = require("fs");
const path = require("path");
const paths = require("./core/paths");

module.exports = async function init() {
  const flag = path.join(paths.OUTPUT, ".initialized");

  if (fs.existsSync(flag)) {
    console.log("ℹ Already initialized");
    return;
  }

  // 1. Ensure DB exists (shipping_lines auto-seeded already)
    if (!fs.existsSync(paths.DB)) {
        console.log("⚠ DB missing – it will be created automatically");
    }

  console.log("🟢 Scrapper initialization started");

  // Export empty CSVs
  require("./core/export_results_csv")();
  require("./core/export_shipping_lines_csv")();

  fs.writeFileSync(flag, new Date().toISOString(), "utf8");

  console.log("✅ Scrapper initialized successfully");
};
