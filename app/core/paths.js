"use strict";

const path = require("path");
const fs = require("fs");

// ----------------------------
// Resolve ROOT safely
// ----------------------------
let ROOT;

// 1️⃣ Electron main process
if (process.versions.electron && process.env.ELECTRON_RUN_AS_NODE !== "1") {
  try {
    const { app } = require("electron");
    ROOT = app.getPath("userData");
  } catch {
    ROOT = null;
  }
}

// 2️⃣ Forked Node worker OR fallback
if (!ROOT) {
  ROOT = process.env.SCRAPPER_ROOT
    || path.join(process.cwd(), "userdata");
}

// ----------------------------
// Paths
// ----------------------------
const PATHS = {
  ROOT,
  OUTPUT: path.join(ROOT, "output"),
  LOGS: path.join(ROOT, "logs"),
  EDGE_PROFILE: path.join(ROOT, "edge-profile"),
  REQUEST_SINGLE: path.join(ROOT, "output", "request_single.csv"),
  INPUT: path.join(ROOT, "output", "input.csv"),
  DB: path.join(ROOT, "output", "bl_results.db")
};

// ----------------------------
// Ensure directories exist
// ----------------------------
for (const p of Object.values(PATHS)) {
  if (!p.includes(".")) {
    try { fs.mkdirSync(p, { recursive: true }); } catch {}
  }
}

module.exports = PATHS;
