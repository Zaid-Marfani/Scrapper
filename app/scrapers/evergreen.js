/**
 * Scraper: EVERGREEN
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
const {
  extractContainerNumbers,
  buildContainerSummary
} = require("../core/containers");

const {
  normalizeContainer,
  formatContainerSummary
} = require("../core/utils");

const { extractEvents } = require("../core/events");


async function scrape(page, url, bl) {
  try {
    logDebug("EVERGREEN → " + url);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10000 });
    await page.waitForTimeout(3000);
    await safeRadio(page, 'xpath=//*[@id="s_bl"]');
    await safeType(page, 'xpath=//*[@id="NO"]', bl.replace("EGLV", ""));
    await safeClick(page, 'xpath=//*[@id="nav-quick"]/table/tbody/tr[1]/td/table/tbody/tr[1]/td[2]/table/tbody/tr/td/div[2]/input');
    await safeClick(page, 'xpath=/html/body/div[7]/center/table[3]/tbody/tr/td/table[8]/tbody/tr/td/a');


    const loading = (await safeText(
  page,
  "xpath=//table[contains(@class,'ec-table')]//th[normalize-space()='Port of Loading']/following-sibling::td[1]"
)) || null;


    const destination = (await safeText(
  page,
  "xpath=//table[contains(@class,'ec-table')]//th[normalize-space()='Port of Discharge']/following-sibling::td[1]"
)) || null;


    let vessel =
      await safeText(
        page,
        "xpath=//td[contains(text(),'Vessel')]/following-sibling::td[1]"
      ) ||
      await safeText(
        page,
        "xpath=//th[contains(text(),'Vessel')]/following-sibling::td[1]"
      ) ||
      null;


    const eta = await safeText(
      page,
      "xpath=//td[contains(text(),'Estimated Date of Arrival')]/font"
    );


    const etd = await safeText(
      page,
      "xpath=//th[contains(text(),'Estimated On Board Date')]/following-sibling::td"
    );

    const rawEvents = await page.evaluate(() => {
      const events = [];

      const rows = document.querySelectorAll(
        "#CtnMovesInfo table.ec-table-sm tr"
      );

      for (const row of rows) {
        const tds = row.querySelectorAll("td");
        if (tds.length !== 2) continue;

        const date = tds[0].textContent.trim();
        const text = tds[1].textContent.trim();

        if (!date || !text) continue;

        events.push({ text, date });
      }

      return events;
    });
    const { emptyRel } = extractEvents(rawEvents);

    const containers = await page.evaluate(() => {
      const list = [];

      const rows = document.querySelectorAll(
        "table.ec-table-sm tr"
      );

      for (const row of rows) {
        const tds = row.querySelectorAll("td");
        if (tds.length < 2) continue;

        const cntNo = tds[0]?.innerText?.trim();
        const type = tds[1]?.innerText?.trim();

        if (cntNo && /^[A-Z]{4}\d{7}$/.test(cntNo)) {
          list.push({ cntNo, type });
        }
      }

      return list;
    });

    const cntNumbers = containers.map(c => c.cntNo);
    const rawTypes = containers.map(c => c.type);

    const { cntNo, cntType, nosCnt } = buildContainerSummary({
      cntNumbers,
      rawTypes,
      normalizeContainer,
      formatContainerSummary
    });

    // let loading = await safeText(page, 'xpath=/html/body/div[7]/center/table[3]/tbody/tr/td/table[3]/tbody/tr[3]/td[1]');
    // let destination = await safeText(page, 'xpath=/html/body/div[7]/center/table[3]/tbody/tr/td/table[3]/tbody/tr[4]/td[1]');
    // let emptyRel = await safeText(page, 'xpath=//*[@id="CtnMovesInfo"]/table/tbody/tr[3]/td[1]');
    // let etd = await safeText(page, 'xpath=/html/body/div[7]/center/table[3]/tbody/tr/td/table[3]/tbody/tr[6]/td[2]');
    // let eta = await safeText(page, 'xpath=/html/body/div[7]/center/table[3]/tbody/tr/td/table[2]/tbody/tr/td/font');
    // let vessel = await safeText(page, 'xpath=/html/body/div[7]/center/table[3]/tbody/tr/td/table[1]/tbody/tr/td[3]');
    
    // logDebug(JSON.stringify({ loading, destination, emptyRel, etd, eta, lastEvent, vessel, cntNo, cntType, nosCnt }));
    
    let lastEvent = await safeText(page, 'xpath=/html/body/div[7]/center/table[3]/tbody/tr/td/table[4]/tbody/tr[3]/td[8]');
    
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
    logDebug("EVERGREEN Error: " + err.message);
    return {};
  }
};

module.exports = {
  scrape,
  meta: {
    supports: ["pol", "pod", "emptyRel", "etd", "eta", "lastEvent", "vessel", "nosCnt", "cntType", "cntNo"]
  }
};