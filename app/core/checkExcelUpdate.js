const fs = require("fs");
const os = require("os");
const path = require("path");
const https = require("https");

const FLAG = path.join(os.tmpdir(), "excel_update.flag");
const META_URL =
  "https://raw.githubusercontent.com/Zaid-Marfani/Scrapper/main/excel/meta.json";

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode !== 200)
        return reject(new Error("HTTP " + res.statusCode));

      let data = "";
      res.on("data", d => (data += d));
      res.on("end", () => resolve(JSON.parse(data)));
    }).on("error", reject);
  });
}

module.exports = async function checkExcelUpdate(currentVersion) {
  try {
    const meta = await fetchJson(META_URL);

    if (meta.version <= currentVersion) {
      fs.writeFileSync(FLAG, "NO_UPDATE", "utf8");
      return;
    }

    const out = [
      "UPDATE_AVAILABLE",
      "VERSION=" + meta.version,
      "URL=" + meta.template_url
    ].join("\n");

    fs.writeFileSync(FLAG, out, "utf8");
  } catch (err) {
    fs.writeFileSync(
      FLAG,
      "ERROR\nMESSAGE=" + err.message,
      "utf8"
    );
  }
};
