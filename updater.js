/**
 * ZIP-based App Updater (GitHub Releases)
 * Safe for production
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const os = require("os");
const { execFileSync } = require("child_process");

const paths = require("./paths");
const { logDebug } = require("./app/core/debug");

const ROOT = paths.LOGS;
const PKG_PATH = path.join(ROOT, "config","version.json");

const META_URL =
  "https://raw.githubusercontent.com/Zaid-Marfani/Scrapper/refs/heads/main/config/version.json";

const TMP_DIR = path.join(os.tmpdir(), "scrapper_update");
const ZIP_PATH = path.join(TMP_DIR, "update.zip");
const BACKUP_DIR = path.join(ROOT, "_backup");

/* ------------------ UTIL ------------------ */

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function semver(a, b) {
  const pa = String(a).split(".").map(Number);
  const pb = String(b).split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, res => {
      if (res.statusCode !== 200) {
        reject(new Error("HTTP " + res.statusCode));
        return;
      }
      res.pipe(file);
      file.on("finish", () => file.close(resolve));
    }).on("error", reject);
  });
}

function copy(src, dest) {
  if (!fs.existsSync(src)) return;
  if (fs.statSync(src).isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const f of fs.readdirSync(src)) {
      copy(path.join(src, f), path.join(dest, f));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

/* ------------------ FETCH META ------------------ */

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = "";
      res.on("data", d => (data += d));
      res.on("end", () => resolve(JSON.parse(data)));
    }).on("error", reject);
  });
}

function download(url, dest, depth = 0) {
  return new Promise((resolve, reject) => {
    if (depth > 10) return reject(new Error("Too many redirects"));

    fs.mkdirSync(path.dirname(dest), { recursive: true });

    https.get(url, res => {
      if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        return download(res.headers.location, dest, depth + 1)
          .then(resolve)
          .catch(reject);
      }

      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error("HTTP " + res.statusCode));
      }

      const file = fs.createWriteStream(dest);
      res.pipe(file);

      file.on("finish", () => {
        file.close(() => {
          logDebug("ZIP WRITTEN:", dest);
          resolve();
        });
      });

      file.on("error", reject);
    }).on("error", reject);
  });
}


/* ------------------ MAIN ------------------ */

async function runUpdater() {
  logDebug("🔄 Checking for app updates...");

  const local = readJson(PKG_PATH);
  const remote = await fetchJson(META_URL);

  logDebug(`📦 Installed: v${local.version}`);
  logDebug(`🌐 Available: v${remote.version}`);

  if (semver(remote.version, local.version) <= 0) {
    logDebug("✅ App already up to date");
    return;
  }

  logDebug("📝 Release notes:");
  remote.notes?.forEach(n => logDebug("  •", n));

  // Prepare temp
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
  fs.mkdirSync(TMP_DIR, { recursive: true });

  logDebug("⬇ Downloading ZIP from GitHub Release...");
  logDebug("DEBUG ZIP URL:", remote.zip);
 await download(remote.zip, ZIP_PATH);



  if (!fs.existsSync(ZIP_PATH)) {
    throw new Error("Downloaded ZIP file not found: " + ZIP_PATH);
  }


  logDebug("📦 Extracting ZIP...");
  execFileSync("powershell", [
    "-Command",
    `Expand-Archive -Force "${ZIP_PATH}" "${TMP_DIR}"`
  ]);

  // Backup current app
  logDebug("🛡 Backing up current version...");
  fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
  fs.mkdirSync(BACKUP_DIR);

  copy(path.join(ROOT, "app"), path.join(BACKUP_DIR, "app"));
  copy(path.join(ROOT, "index.js"), path.join(BACKUP_DIR, "index.js"));
  copy(PKG_PATH, path.join(BACKUP_DIR, "package.json"));

  // Apply update
  logDebug("🚀 Applying update...");
  const files = Array.isArray(remote.files)
  ? remote.files
  : ["app/", "index.js", "package.json"];

for (const f of files) {

    copy(
      path.join(TMP_DIR, f),
      path.join(ROOT, f)
    );
  }

  // Update local version
  local.version = remote.version;
  fs.writeFileSync(PKG_PATH, JSON.stringify(local, null, 2));

  logDebug("🎉 App update completed successfully");
}

/* ------------------ ROLLBACK ------------------ */

function rollback() {
  if (!fs.existsSync(BACKUP_DIR)) return;
  logDebug("↩ Rolling back...");
  copy(path.join(BACKUP_DIR, "app"), path.join(ROOT, "app"));
  copy(path.join(BACKUP_DIR, "index.js"), path.join(ROOT, "index.js"));
  copy(path.join(BACKUP_DIR, "package.json"), PKG_PATH);
  logDebug("✅ Rollback completed");
}

/* ------------------ EXPORT ------------------ */

module.exports = { runUpdater };

if (require.main === module) {
  runUpdater().catch(err => {
    console.error("❌ Update failed:", err.message);
    rollback();
    process.exit(1);
  });
}
