const schema = require("./schema");
const { convertDate } = require("../core/utils");

/**
 * Create empty record
 */
function createEmptyRecord() {
  const obj = {};
  for (const col of schema) {
    obj[col.key] = null;
  }
  return obj;
}

/**
 * Normalize value based on schema type
 */
function normalizeValue(value, type) {
  if (value === undefined || value === null || value === "") return null;

  switch (type) {
    case "date":
      return convertDate(value);   // centralized date logic
    case "number":
      return isNaN(value) ? null : Number(value);
    case "text":
    default:
      return String(value).trim();
  }
}

/**
 * Build final record
 */
function buildRecord({ bl, status }, scraped = {}) {
  const record = createEmptyRecord();

  record.bl = bl;
  record.status = status;

  for (const col of schema) {
    if (scraped[col.key] !== undefined) {
      record[col.key] = normalizeValue(scraped[col.key], col.type);
    }
  }

  return record;
}

function applyCapabilities(record, meta) {
  if (!meta || !Array.isArray(meta.supports)) return record;

  for (const col of schema) {
    if (
      col.key !== "bl" &&
      col.key !== "status" &&
      !meta.supports.includes(col.key)
    ) {
      record[col.key] = null;
    }
  }
  return record;
}


function recordToRow(record) {
  return schema.map(col => record[col.key] ?? "");
}

function getCsvHeader() {
  return schema.map(col => col.header);
}

function recordToObject(record) {
  return { ...record };
}



module.exports = {
  createEmptyRecord,
  buildRecord,
  applyCapabilities,
  recordToRow,
  recordToObject,
  getCsvHeader
};

