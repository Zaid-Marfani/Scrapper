"use strict";

const { app } = require("electron");
const path = require("path");
const fs = require("fs");
const PATHS = require("../app/core/paths");

app.on("ready", async () => {
  try {
    const ROOT = PATHS.ROOT;
    const OUTPUT = PATHS.OUTPUT;
    const INIT_FLAG = path.join(OUTPUT, ".initialized");

    // 🟡 First run → run init INLINE (NO SPAWN)
    if (!fs.existsSync(INIT_FLAG)) {
      console.log("🟡 First run detected → initializing");
      const init = require("../app/init");
      await init();
    }

    const mode = app.commandLine.getSwitchValue("mode");
    process.argv = [
      process.execPath,
      path.join(__dirname, "..", "index.js"),
      ...(mode ? [mode] : [])
    ];


    // Continue normal flow
    require("../index");

  } catch (err) {
    console.error("ELECTRON BOOT FAILURE");
    console.error(err.stack || err.message);
    app.exit(1);
  }
});


app.on("window-all-closed", () => app.quit());