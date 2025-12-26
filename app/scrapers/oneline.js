/**
 * Scraper: ONE LINE
 * Version: 2.0.0
 * Last Verified: 2025-12-20
 *
 * Capabilities:
 * - Multiple Containers per BL: ✅ Yes
 * - Virtualized UI handling: ✅ Yes
 * - Container normalization: ✅ Yes
 */

const { logDebug } = require("../core/debug");
const { safeText, safeClick } = require("../core/action");
const {
  normalizeContainer,
  formatContainerSummary
} = require("../core/utils");

const { extractEvents } = require("../core/events");


async function scrape(page, url, bl) {
  url = url + (bl.replace("ONEY", "") || "");
  logDebug("oneline: opening page for " + url);

  try {
    /* ---------------- Page load & expand ---------------- */
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 6000 });
    await page.waitForTimeout(3000);

    // Expand container details
    await safeClick(
      page,
      'xpath=//*[@id="table-wrap"]/div[2]/div[1]/div/div[1]/div/div/div[2]'
    );

    /* ---------------- Containers (semantic extraction) ---------------- */
    const containers = await page.evaluate(() => {
      const text = Array.from(
        document.querySelectorAll('div[role="rowgroup"].Table_body__JrCVh')
      )
        .map(el => el.textContent)
        .join(" ")
        .replace(/\s+/g, " ");

      const results = [];
      const seen = new Set();

      // ISO container + type (e.g. ONEU7302360 20'OPENTOP)
      const regex = /([A-Z]{4}\d{7})\s+(20|40)'?\s*([A-Z]+)/g;

      let m;
      while ((m = regex.exec(text)) !== null) {
        const cntNo = m[1];
        const cntType = `${m[2]}'${m[3]}`;

        if (seen.has(cntNo)) continue;
        seen.add(cntNo);

        results.push({ cntNo, cntType });
      }

      return results;
    });

    const cntNo = containers.map(c => c.cntNo).join(" ");
    const nosCnt = containers.length;

    const normalizedContainers = containers
      .map(c => normalizeContainer(c.cntType))
      .filter(Boolean);

    if (!normalizedContainers.length && containers.length) {
      logDebug("WARN: Containers found but normalization failed");
    }

    const cntType = formatContainerSummary(normalizedContainers);

    /* ---------------- POL / POD ---------------- */
    const pol = await safeText(
      page,
      'xpath=//*[text()="Place of Receipt"]/following::div[1]'
    );

    const pod = await safeText(
      page,
      'xpath=//*[text()="Place of Delivery"]/following::div[1]'
    );

    /* ---------------- Vessel ---------------- */
    const vessel = await safeText(
      page,
      'xpath=//*[contains(text(),"Vessel")]/following::a[1]'
    );

    /* ---------------- Events (ETD / ETA / Empty / LastEvent) ---------------- */
    const rawEvents = await page.evaluate(() => {
      const lines = document.body.innerText
        .split("\n")
        .map(l => l.trim())
        .filter(Boolean);

      const events = [];
      let current = null;

      for (const line of lines) {
        // If line looks like an event label (not a date/time)
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(line) &&
          !/^\d{2}:\d{2}$/.test(line)
        ) {
          if (current) events.push(current);
          current = { text: line, date: "" };
          continue;
        }

        // Date line
        if (/^\d{4}-\d{2}-\d{2}$/.test(line) && current) {
          current.date = line;
          continue;
        }

        // Time line (append)
        if (/^\d{2}:\d{2}$/.test(line) && current && current.date) {
          current.date += " " + line;
        }
      }

      if (current) events.push(current);
      return events;
    });

    const { emptyRel, etd, eta } = extractEvents(rawEvents);

    const lastEvent = null;


    /* ---------------- Final result ---------------- */
    return {
      pol,
      pod,
      emptyRel,
      etd,
      eta,
      lastEvent,
      vessel,
      cntType,
      nosCnt,
      cntNo
    };

  } catch (err) {
    logDebug("oneline error: " + err.message);
    return {};
  }
}

module.exports = {
  scrape,
  meta: {
    supports: [
      "pol",
      "pod",
      "emptyRel",
      "etd",
      "eta",
      "lastEvent",
      "vessel",
      "cntType",
      "nosCnt",
      "cntNo"
    ]
  }
};
