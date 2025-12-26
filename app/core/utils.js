const { parse, format } = require('date-fns');

const DATE_FORMATS = [
    // --- Numeric formats ---
    "dd-MM-yyyy",
    "d-M-yyyy",
    "dd-M-yyyy",
    "d-MM-yyyy",

    "dd/MM/yyyy",
    "d/M/yyyy",
    "dd/M/yyyy",
    "d/MM/yyyy",

    "dd.MM.yyyy",
    "d.M.yyyy",
    "dd.M.yyyy",
    "d.MM.yyyy",

    "yyyy-MM-dd",
    "yyyy/MM/dd",
    "yyyy.MM.dd",

    "MM-dd-yyyy",
    "M-d-yyyy",
    "MM-d-yyyy",
    "M-dd-yyyy",

    "MM/dd/yyyy",
    "M/d/yyyy",
    "MM/d/yyyy",
    "M/dd/yyyy",

    // --- With 2-digit year ---
    "dd-MM-yy",
    "dd/MM/yy",
    "dd.MM.yy",
    "MM-dd-yy",
    "MM/dd/yy",
    "yy-MM-dd",
    "yy/MM/dd",

    // --- Month names (long) ---
    "d MMMM yyyy",
    "dd MMMM yyyy",
    "MMMM d yyyy",
    "MMMM dd yyyy",
    "MMMM d, yyyy",
    "d MMMM, yyyy",

    // --- Month names (short) ---
    "d MMM yyyy",
    "dd MMM yyyy",
    "MMM d yyyy",
    "MMM dd yyyy",
    "MMM d, yyyy",
    "d MMM, yyyy",

    // --- Mixed ambiguous ---
    "yyyy MMM d",
    "yyyy MMM dd",
    "yyyy MMMM d",
    "yyyy MMMM dd",

    // --- International messy formats ---
    "d 'of' MMMM yyyy",    // like "5 of March 2025"
    "EEEE, d MMMM yyyy",   // Monday, 5 December 2025
    "EEEE, d MMM yyyy",    // Monday, 5 Dec 2025

    // ISO / API formats
    "yyyy-MM-dd'T'HH:mm:ss.SSSX",
    "yyyy-MM-dd'T'HH:mm:ssX",
    "yyyy-MM-dd'T'HH:mmX",
    "yyyy-MM-dd'T'HH:mm",

    // --- With weekday names + optional time ---
    "yyyy-MM-dd EEE HH:mm",
    "yyyy-MM-dd EEE",
    "yyyy-MM-dd EEEE HH:mm",
    "yyyy-MM-dd EEEE",
];

function convertDate(input) {
    if (!input) return null;

    let cleaned = input.trim();

    // Remove all line breaks and collapse multiple spaces
    cleaned = cleaned.replace(/\s+/g, " ").trim();

    // Remove ordinal suffixes: 1st → 1, 2nd → 2, 3rd → 3, 4th → 4
    cleaned = cleaned.replace(/\b(\d+)(st|nd|rd|th)\b/gi, "$1");

    // Remove stray commas
    cleaned = cleaned.replace(/,/g, "");
    cleaned = cleaned.replace(
        /\b(MON|TUE|WED|THU|FRI|SAT|SUN)\b/g,
        m => m.charAt(0) + m.slice(1).toLowerCase());

    for (const f of DATE_FORMATS) {
        try {
            const parsed = parse(cleaned, f, new Date());
            if (!isNaN(parsed)) {
                return format(parsed, "dd-MM-yyyy");
            }
        } catch { }
    }

    // Fallback to native Date
    const d = new Date(cleaned);
    if (!isNaN(d)) {
        return format(d, "dd-MM-yyyy");
    }

    return null;
}

function normalizeContainer(raw) {
    if (!raw) return null;

    const t = raw.toUpperCase();

    let size = "";
    let type = "";

    // ---- SIZE (STRICT + SINOKOR SAFE) ----
    // 20, 20', 20FT
    if (/\b20\b|\b20'|\b20FT/.test(t)) {
        size = "20";
    }
    // 22GP → treat as 20 (SINOKOR equipment code)
    else if (/\b22GP\b/.test(t)) {
        size = "20";
    }
    // 40, 40', 40FT
    else if (/\b40\b|\b40'|\b40FT/.test(t)) {
        size = "40";
    }

    // ---- TYPE (STRICT) ----
    if (t.includes("OPEN") || t.includes("OT")) {
        type = "OT";
    }
    else if (t.includes("REFR") || t.includes("REEFER")) {
        type = "R";
    }
    else if (
        t.includes("DRY") ||
        t.includes("DV") ||
        t.includes("GP") ||
        t.includes("SD")
    ) {
        type = "D"; // DRY / GP / SD → D
    }

    if (!size || !type) return null;

    return { size, type };
}

function normalizeBL(carrier, bl = "") {
  const b = bl.trim();

  switch (carrier) {
    case "EVERGREEN":
      return b.replace(/^EGLV/i, "");
    case "KMTC":
      return b.replace(/^KMTC/i, "");
    case "ONE":
      return b.replace(/^ONEY/i, "");
    default:
      return b;
  }
}




function formatContainerSummary(containers) {
    const map = {};

    for (const c of containers) {
        const key = `${c.size} ${c.type}`;
        map[key] = (map[key] || 0) + 1;
    }

    return Object.entries(map)
        .map(([k, v]) => `${v} x ${k}`)
        .join(" & ");
}

module.exports = { convertDate, normalizeContainer, formatContainerSummary, normalizeBL };
