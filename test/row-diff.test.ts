import { describe, expect, it } from "vitest";
import { diffRows } from "../src/row-diff.js";

describe("diffRows", () => {
  it("reports no diffs for identical row sets", () => {
    const rows = [{ id: 1, name: "a" }, { id: 2, name: "b" }];
    expect(diffRows(rows, rows)).toEqual([]);
  });

  it("reports a diff with the specific changed column when a value differs", () => {
    const before = [{ id: 1, price: 10 }];
    const after = [{ id: 1, price: 15 }];
    const diffs = diffRows(before, after);
    expect(diffs).toHaveLength(1);
    expect(diffs[0]).toEqual({ index: 0, before: before[0], after: after[0], changedColumns: ["price"] });
  });

  it("reports every changed column, not just the first", () => {
    const before = [{ id: 1, price: 10, name: "a" }];
    const after = [{ id: 1, price: 15, name: "b" }];
    const diffs = diffRows(before, after);
    expect(diffs[0]!.changedColumns.sort()).toEqual(["name", "price"]);
  });

  it("treats an extra row in `after` as a diff at that position with before undefined", () => {
    const before = [{ id: 1 }];
    const after = [{ id: 1 }, { id: 2 }];
    const diffs = diffRows(before, after);
    expect(diffs).toEqual([{ index: 1, before: undefined, after: { id: 2 }, changedColumns: [] }]);
  });

  it("treats a missing row in `after` as a diff at that position with after undefined", () => {
    const before = [{ id: 1 }, { id: 2 }];
    const after = [{ id: 1 }];
    const diffs = diffRows(before, after);
    expect(diffs).toEqual([{ index: 1, before: { id: 2 }, after: undefined, changedColumns: [] }]);
  });

  it("handles two empty row sets as no diff", () => {
    expect(diffRows([], [])).toEqual([]);
  });
});
