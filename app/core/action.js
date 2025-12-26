// LOG IMPORT
const { logDebug } = require("../core/debug");

// ----------------------
// TEXT SCRAPING core
// ----------------------
async function safeText(page, selectorOrXpath) {
    try {
        if (selectorOrXpath.startsWith("xpath=")) {
            const sel = selectorOrXpath.replace(/^xpath=/, "");
            const el = await page.$(`xpath=${sel}`);
            if (!el) return "";
            const t = await el.textContent();
            return (t || "").trim().replace(/\s*\n\s*/g, " ");
        } else {
            const t = await page.textContent(selectorOrXpath);
            return (t || "").trim().replace(/\s*\n\s*/g, " ");
        }
    } catch { return ""; }
}

// ----------------------
// SAFE CLICK
// ----------------------
async function safeClick(page, selectorOrXpath, tries = 3) {
    for (let i = 0; i < tries; i++) {
        try {
            const el = await getElement(page, selectorOrXpath);
            if (!el) continue;

            await el.scrollIntoViewIfNeeded();
            await el.click({ timeout: 5000 });

            logDebug("CLICK OK: " + selectorOrXpath);
            await page.waitForTimeout(500);
            return true;
        } catch (err) {
            logDebug(`CLICK FAILED (${i+1}): ${err.message}`);
            await page.waitForTimeout(500);
        }
    }
    return false;
}

// ----------------------
// SAFE TEXT INPUT
// ----------------------
async function safeType(page, selectorOrXpath, value, tries = 3) {
    for (let i = 0; i < tries; i++) {
        try {
            const el = await getElement(page, selectorOrXpath);
            if (!el) continue;

            await el.fill("");             // clear first
            await el.type(value, { delay: 50 });

            logDebug("TYPED OK (" + value + "): " + selectorOrXpath);
            return true;
        } catch (err) {
            logDebug(`TYPE FAILED (${i+1}): ${err.message}`);
            await page.waitForTimeout(500);
        }
    }
    return false;
}

// ----------------------
// SAFE CHECKBOX
// ----------------------
async function safeCheck(page, selectorOrXpath, wantsChecked = true, tries = 3) {
    for (let i = 0; i < tries; i++) {
        try {
            const el = await getElement(page, selectorOrXpath);
            if (!el) continue;

            const isChecked = await el.isChecked();

            if (wantsChecked && !isChecked) {
                await el.check({ timeout: 4000 });
            } else if (!wantsChecked && isChecked) {
                await el.uncheck({ timeout: 4000 });
            }

            logDebug("CHECKBOX SET: " + selectorOrXpath);
            return true;
        } catch (err) {
            logDebug(`CHECKBOX FAILED (${i+1}): ${err.message}`);
            await page.waitForTimeout(500);
        }
    }
    return false;
}

// ----------------------
// SAFE RADIO SELECT
// ----------------------
async function safeRadio(page, selectorOrXpath, tries = 3) {
    for (let i = 0; i < tries; i++) {
        try {
            const el = await getElement(page, selectorOrXpath);
            if (!el) continue;

            await el.check({ timeout: 4000 });

            logDebug("RADIO SELECTED: " + selectorOrXpath);
            return true;
        } catch (err) {
            logDebug(`RADIO FAILED (${i+1}): ${err.message}`);
            await page.waitForTimeout(500);
        }
    }
    return false;
}

// ----------------------
// SAFE DROPDOWN SELECT (scroll + click)
// ----------------------
async function safeSelect(page, dropdownSelector, optionText, tries = 3) {
    for (let i = 0; i < tries; i++) {
        try {
            // step 1: click dropdown to expand
            const drop = await getElement(page, dropdownSelector);
            if (!drop) continue;

            await drop.scrollIntoViewIfNeeded();
            await drop.click();
            await page.waitForTimeout(500);

            // step 2: click option
            const option = await page.$(`text="${optionText}"`);
            if (!option) throw new Error("Option not visible: " + optionText);

            await option.scrollIntoViewIfNeeded();
            await option.click();

            logDebug("DROPDOWN SELECT OK: " + optionText);
            return true;

        } catch (err) {
            logDebug(`SELECT FAILED (${i+1}): ${err.message}`);
            await page.waitForTimeout(500);
        }
    }
    return false;
}

// ----------------------
// INTERNAL: get element (CSS or XPath)
// ----------------------
async function getElement(page, selectorOrXpath) {
    try {
        if (selectorOrXpath.startsWith("xpath=")) {
            const xp = selectorOrXpath.replace(/^xpath=/, "");
            return await page.$(`xpath=${xp}`);
        }
        return await page.$(selectorOrXpath);
    } catch {
        return null;
    }
}

module.exports = {
    safeText,
    safeClick,
    safeType,
    safeCheck,
    safeRadio,
    safeSelect
};
