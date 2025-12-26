const path = require("path");
const { checkAndUpdate } = require("./updater");

(async () => {


  const mode = process.argv[2];
  const args = process.argv.slice(3);

  const appDir = path.join(process.cwd(), "app");

  if (mode === "single") {
    await require(path.join(appDir, "run_single"))(...args);
  } else if (mode === "multiple") {
    await require(path.join(appDir, "run_parallel"))(...args);
  } else if (mode === "update") {
    try {
      await checkAndUpdate();
    } catch (e) {
      console.log("Updater skipped:", e.message);
    }
  } else {
    console.error("Invalid mode");
  }
})();
