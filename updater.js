/**
 * ZIP-based App Updater (GitHub Releases)
 * Safe for production
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const os = require("os");
const { spawn } = require("child_process");

const TMP_DIR = path.join(os.tmpdir(), "scrapper_update");
const SETUP_PATH = path.join(TMP_DIR, "Scrapper-Setup.exe");

const pkg = require("./package.json");

const META_URL =
  "https://raw.githubusercontent.com/Zaid-Marfani/Scrapper/refs/heads/main/config/version.json";

/* ---------------- FETCH JSON ---------------- */

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = "";
      res.on("data", d => (data += d));
      res.on("end", () => resolve(JSON.parse(data)));
    }).on("error", reject);
  });
}

/* ---------------- DOWNLOAD ---------------- */

function download(url, dest) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });

    https.get(url, res => {
      if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location) {
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }

      if (res.statusCode !== 200) {
        return reject(new Error("HTTP " + res.statusCode));
      }

      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on("finish", () => file.close(resolve));
    }).on("error", reject);
  });
}

/* ---------------- MAIN ---------------- */

async function runSetupUpdater(currentVersion) {
  const meta = await fetchJson(META_URL);

  if (meta.version === currentVersion) {
    console.log("✅ App already up to date");
    return;
  }

  console.log(`⬆ Updating ${currentVersion} → ${meta.version}`);
  meta.notes?.forEach(n => console.log(" •", n));

  console.log("⬇ Downloading setup...");
  await download(meta.setup_url, SETUP_PATH);

  console.log("🚀 Launching installer...");

  spawn(SETUP_PATH, ["/S"], {
    detached: true,
    stdio: "ignore"
  }).unref();

  process.exit(0);
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });

    https.get(url, res => {
      // handle redirect (GitHub does this)
      if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location) {
        return downloadFile(res.headers.location, dest)
          .then(resolve)
          .catch(reject);
      }

      if (res.statusCode !== 200) {
        return reject(new Error("HTTP " + res.statusCode));
      }

      const file = fs.createWriteStream(dest);
      res.pipe(file);

      file.on("finish", () => file.close(resolve));
      file.on("error", reject);
    }).on("error", reject);
  });
}


module.exports = { runSetupUpdater, downloadFile };
