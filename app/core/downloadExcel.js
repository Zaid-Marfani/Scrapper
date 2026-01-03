const fs = require("fs");
const https = require("https");
const os = require("os");
const path = require("path");

const TEMP = process.env.TEMP || os.tmpdir();
const FLAG = path.join(TEMP, "excel_downloaded.flag");

module.exports = function downloadExcel(url) {
  return new Promise((resolve) => {

    const target = path.join(
      TEMP,
      path.basename(decodeURIComponent(url))
    );

    console.log("Downloading to:", target);

    const file = fs.createWriteStream(target);

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

        fs.writeFileSync(
          FLAG,
          "DOWNLOADED\r\nPATH=" + target,
          "ascii"
        );

        console.log("Download complete");
        resolve();
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
