"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const https = require("https");

const TEMP = process.env.TEMP || os.tmpdir();

const FLAG = path.join(TEMP, "excel_update.flag");
const LOCAL_VERSION_FILE = path.join(TEMP, "excel_local_version.txt");

const META_URL =
  "https://raw.githubusercontent.com/Zaid-Marfani/Scrapper/refs/heads/main/config/excel_version.json";

/* ---------------------------------------------
   Fetch remote JSON safely
--------------------------------------------- */
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode !== 200) {
        return reject(new Error("HTTP " + res.statusCode));
      }

      let data = "";
      res.on("data", d => (data += d));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error("Invalid JSON"));
        }
      });
    }).on("error", reject);
  });
}

/* ---------------------------------------------
   Semantic version compare
   returns: 1 (a>b), -1 (a<b), 0 (equal)
--------------------------------------------- */
function compareVersions(a, b) {
  const pa = String(a).split(".").map(Number);
  const pb = String(b).split(".").map(Number);

  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

/* ---------------------------------------------
   Read local Excel version from file
--------------------------------------------- */
function readLocalExcelVersion() {
  if (!fs.existsSync(LOCAL_VERSION_FILE)) {
    return "0.0.0";
  }

  const txt = fs.readFileSync(LOCAL_VERSION_FILE, "utf8");
  const line = txt.split(/\r?\n/).find(l => l.startsWith("VERSION="));

  return line ? line.slice(8).trim() : "0.0.0";
}

/* ---------------------------------------------
   MAIN
--------------------------------------------- */
module.exports = async function checkExcelUpdate() {
  try {
    const meta = await fetchJson(META_URL);

    const localVersion = readLocalExcelVersion();
    const remoteVersion = meta.version;

    const cmp = compareVersions(remoteVersion, localVersion);

    // -----------------------------
    // Already up to date
    // -----------------------------
    if (cmp <= 0) {
      fs.writeFileSync(FLAG, "NO_UPDATE", "utf8");
      return;
    }

    // -----------------------------
    // Update available
    // -----------------------------
    const EOL = "\r\n";
    const out =
      "UPDATE_AVAILABLE" + EOL +
      "VERSION=" + remoteVersion + EOL +
      "URL=" + meta.template_url;

    fs.writeFileSync(FLAG, out, "utf8");

  } catch (err) {
    fs.writeFileSync(
      FLAG,
      "ERROR\r\nMESSAGE=" + err.message,
      "utf8"
    );
  }
};
