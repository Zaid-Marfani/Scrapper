/**
 * Scraper: MSC
 * Version: 1.2.0
 * Last Verified: 2025-12-15
 *
 * Capabilities (knowledge-only):
 * - Multiple Containers per BL: ❌ No
 * - Trans-shipment Detection: ❌ No
 * - ETA Source: Direct XPath
 * - ETD Source: Direct XPath
 * - Empty Release: Direct XPath
 *
 * Notes:
 * - Site uses static HTML, no JS timeline
 * - BL lookup fails silently if BL is invalid
 * - Container-level info not exposed
 */

const { logDebug } = require("../core/debug");
const { safeText, safeClick, safeType, safeCheck, safeRadio, safeSelect } = require("../core/action")
const { extractEvents } = require("../core/events");
const {
  normalizeContainer,
  formatContainerSummary
} = require("../core/utils");
const { buildContainerSummary } = require("../core/containers");



async function scrape(page, url, bl) {
  try {
    logDebug("MSC → " + url);

    await page.goto(url, { timeout: 6000 });
    await page.waitForTimeout(3000);
    await safeType(page, 'xpath=//*[@id="trackingNumber"]', bl);
    await safeClick(page, '//*[@id="main"]/div[1]/div/div[1]/div/form/div/div[2]/div/button[2]');
    await page.waitForTimeout(1000);


    const rawEvents = await page.evaluate(() => {
      const events = [];

      const steps = document.querySelectorAll(
        ".msc-flow-tracking__tracking .msc-flow-tracking__step"
      );

      for (const step of steps) {
        const date =
          step.querySelector(
            ".msc-flow-tracking__cell--two .data-value"
          )?.textContent?.trim() || "";

        const text =
          step.querySelector(
            ".msc-flow-tracking__cell--four .data-value"
          )?.textContent?.trim() || "";

        if (!date || !text) continue;

        events.push({ text, date });
      }

      return events;
    });

    const { emptyRel, etd, eta } = extractEvents(rawEvents);

    let loading = await safeText(page, 'xpath=//*[@id="main"]/div[1]/div/div[3]/div/div/div/div[1]/div/div/div[2]/ul/li[3]/span[2]/span[1]');
    let destination = await safeText(page, 'xpath=//*[@id="main"]/div[1]/div/div[3]/div/div/div/div[1]/div/div/div[2]/ul/li[4]/span[2]/span[1]');
    let vessel = await safeText(page, 'xpath=//*[@id="main"]/div[1]/div/div[3]/div/div/div/div[1]/div/div/div[3]/div/div/div[2]/div[2]/div[3]/div/div[5]/div/div/div/span/span');



    const pageText = await page.textContent(".msc-flow-tracking__container");

    const cntNumbers =
      pageText
        ?.split(/\s+/)
        .filter(t => /^[A-Z]{4}\d{7}$/.test(t)) || [];

    // MSC usually doesn’t expose type clearly
    const rawTypes = [];

    const { cntNo, cntType, nosCnt } = buildContainerSummary({
      cntNumbers,
      rawTypes,
      normalizeContainer,
      formatContainerSummary
    });

    const lastEvent = null;

    logDebug(JSON.stringify({ loading, destination, emptyRel, etd, eta, lastEvent, vessel, cntNo, cntType }));


    return {
      pol: loading,
      pod: destination,
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
    logDebug("MSC Error: " + err.message);
    return {};
  }
};

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
