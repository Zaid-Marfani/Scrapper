/**
 * Unified Container core
 * --------------------------
 * - Deduplicates container numbers
 * - Normalizes container types
 * - Applies default type if missing
 */

function buildContainerSummary({
  cntNumbers = [],
  rawTypes = [],
  normalizeContainer,
  formatContainerSummary
}) {
  if (!Array.isArray(cntNumbers) || cntNumbers.length === 0) {
    return {
      cntNo: null,
      cntType: null,
      nosCnt: null
    };
  }

  // Deduplicate container numbers
  const uniqueCnt = Array.from(
    new Set(cntNumbers.filter(Boolean))
  );

  const nosCnt = uniqueCnt.length;

  const normalizedTypes = rawTypes
    .map(t => normalizeContainer(t))
    .filter(Boolean);

  let cntType = null;

  if (normalizedTypes.length) {
    cntType = formatContainerSummary(normalizedTypes);
  } else {
    // ✅ DEFAULT when type is not exposed by carrier (e.g. MSC)
    cntType = `${nosCnt} x 20'/40'`;
  }

  return {
    cntNo: uniqueCnt.join(" "),
    nosCnt,
    cntType
  };
}

module.exports = {
  buildContainerSummary
};
