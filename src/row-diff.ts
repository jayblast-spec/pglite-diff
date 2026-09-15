import type { Row, RowDiff } from "./types.js";

function rowsEqual(a: Row | undefined, b: Row | undefined): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function changedColumns(a: Row, b: Row): string[] {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const changed: string[] = [];
  for (const key of keys) {
    if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) changed.push(key);
  }
  return changed;
}

/**
 * Compares two result sets position-by-position. Rows compare in the order
 * each query returned them -- a query without an explicit ORDER BY has no
 * guaranteed order in Postgres, and that applies here too, so probes meant
 * for this tool should always order explicitly or diffs can be noise rather
 * than signal.
 */
export function diffRows(before: Row[], after: Row[]): RowDiff[] {
  const diffs: RowDiff[] = [];
  const length = Math.max(before.length, after.length);

  for (let i = 0; i < length; i++) {
    const beforeRow = before[i];
    const afterRow = after[i];
    if (rowsEqual(beforeRow, afterRow)) continue;

    diffs.push({
      index: i,
      before: beforeRow,
      after: afterRow,
      changedColumns: beforeRow && afterRow ? changedColumns(beforeRow, afterRow) : [],
    });
  }

  return diffs;
}
