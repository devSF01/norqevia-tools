/**
 * Compares two already-parsed CSV header arrays without changing their values.
 * CSV parsing and validation belong to shared/csv-columns-core.js.
 */

function summarizeHeaders(headers) {
  const counts = new Map();
  const firstAppearanceOrder = [];

  for (const name of headers) {
    if (!counts.has(name)) {
      counts.set(name, 0);
      firstAppearanceOrder.push(name);
    }
    counts.set(name, counts.get(name) + 1);
  }

  return { counts, firstAppearanceOrder };
}

function haveSameCounts(countsA, countsB) {
  if (countsA.size !== countsB.size) return false;
  for (const [name, countA] of countsA) {
    if (countsB.get(name) !== countA) return false;
  }
  return true;
}

function buildDifference(order, ownCounts, otherCounts) {
  return order.flatMap((name) => {
    const difference = ownCounts.get(name) - (otherCounts.get(name) ?? 0);
    return difference > 0 ? [{ name, count: difference }] : [];
  });
}

function buildCommon(order, countsA, countsB) {
  return order.flatMap((name) => {
    const countB = countsB.get(name);
    if (countB === undefined) return [];
    return [{ name, count: Math.min(countsA.get(name), countB) }];
  });
}

export function compareHeaders(headersA, headersB) {
  const summaryA = summarizeHeaders(headersA);
  const summaryB = summarizeHeaders(headersB);
  const sameColumnMultiset = haveSameCounts(summaryA.counts, summaryB.counts);
  const sameOrder = headersA.length === headersB.length
    && headersA.every((name, index) => name === headersB[index]);
  const positions = [];
  const maxColumnCount = Math.max(headersA.length, headersB.length);

  for (let index = 0; index < maxColumnCount; index += 1) {
    const hasA = index < headersA.length;
    const hasB = index < headersB.length;
    const a = hasA ? headersA[index] : null;
    const b = hasB ? headersB[index] : null;
    positions.push({ index: index + 1, a, b, same: hasA && hasB && a === b });
  }

  return {
    matchesExactly: sameColumnMultiset && sameOrder,
    sameColumnMultiset,
    sameOrder,
    columnCountA: headersA.length,
    columnCountB: headersB.length,
    onlyA: buildDifference(summaryA.firstAppearanceOrder, summaryA.counts, summaryB.counts),
    onlyB: buildDifference(summaryB.firstAppearanceOrder, summaryB.counts, summaryA.counts),
    common: buildCommon(summaryA.firstAppearanceOrder, summaryA.counts, summaryB.counts),
    positions
  };
}
