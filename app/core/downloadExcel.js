"use strict";

const fs = require("fs");
const https = require("https");
const os = require("os");
const path = require("path");

const TEMP = process.env.TEMP || os.tmpdir();
const FLAG = path.join(TEMP, "excel_downloaded.flag");

module.exports = function downloadExcel(url) {
  return new Promise((resolve) => {

    // -----------------------------------------
    // ORIGINAL TARGET (based on URL filename)
    // -----------------------------------------
    const originalTarget = path.join(
      TEMP,
      path.basename(decodeURIComponent(url))
    );

    console.log("Downloading to:", originalTarget);

    const file = fs.createWriteStream(originalTarget);

    https.get(url, res => {

      console.log("HTTP STATUS:", res.statusCode);

      if (res.statusCode !== 200) {
        fs.writeFileSync(
          FLAG,
          "ERROR\r\nMESSAGE=HTTP " + res.statusCode,
          "ascii"
        );
        return resolve();
      }

      res.pipe(file);

      file.on("finish", () => {
        file.close();

        // -----------------------------------------
        // NEW: RENAME TO UNIQUE TEMP NAME
        // -----------------------------------------
        try {
          const timestamp = new Date()
            .toISOString()
            .replace(/[-:T.Z]/g, "")
            .slice(0, 14);

          const ext = path.extname(originalTarget) || ".xlsm";

          const renamedTarget = path.join(
            TEMP,
            `scrapper_template_${timestamp}${ext}`
          );

          fs.renameSync(originalTarget, renamedTarget);

          // -----------------------------------------
          // WRITE FLAG WITH RENAMED PATH
          // -----------------------------------------
          fs.writeFileSync(
            FLAG,
            "DOWNLOADED\r\nPATH=" + renamedTarget,
            "ascii"
          );

          console.log("Download complete, renamed to:", renamedTarget);
          return resolve();

        } catch (err) {
          fs.writeFileSync(
            FLAG,
            "ERROR\r\nMESSAGE=Rename failed: " + err.message,
            "ascii"
          );
          return resolve();
        }
      });

    }).on("error", err => {
      fs.writeFileSync(
        FLAG,
        "ERROR\r\nMESSAGE=" + err.message,
        "ascii"
      );
      resolve();
    });
  });
};
