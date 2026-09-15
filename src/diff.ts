import { PGlite } from "@electric-sql/pglite";
import { diffRows } from "./row-diff.js";
import type { DiffReport, ProbeResult, QueryProbe, Row, Scenario } from "./types.js";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Runs `before` and `after` scenarios against two isolated, in-memory
 * PGlite instances (real Postgres compiled to WASM -- no Docker, no
 * external service), then runs every probe query against both and reports
 * exactly what differs. Built for the case an existing SQL migration
 * toolchain doesn't cover: verifying that a migration refactor (squashing,
 * reordering, rewriting) produces the same query-visible results as what it
 * replaced, before either one ever touches a real database.
 */
export async function diffScenarios(before: Scenario, after: Scenario, probes: QueryProbe[]): Promise<DiffReport> {
  const beforeDb = new PGlite();
  const afterDb = new PGlite();

  try {
    try {
      await beforeDb.exec(before.setup);
    } catch (err) {
      return { ok: false, setupError: { side: "before", message: errorMessage(err) }, probes: [] };
    }
    try {
      await afterDb.exec(after.setup);
    } catch (err) {
      return { ok: false, setupError: { side: "after", message: errorMessage(err) }, probes: [] };
    }

    const results: ProbeResult[] = [];
    for (const probe of probes) {
      results.push(await runProbe(beforeDb, afterDb, probe));
    }

    return { ok: results.every((r) => r.ok), probes: results };
  } finally {
    await beforeDb.close();
    await afterDb.close();
  }
}

async function runProbe(beforeDb: PGlite, afterDb: PGlite, probe: QueryProbe): Promise<ProbeResult> {
  let beforeRows: Row[] | undefined;
  let afterRows: Row[] | undefined;
  let beforeError: string | undefined;
  let afterError: string | undefined;

  try {
    beforeRows = (await beforeDb.query<Row>(probe.sql, probe.params)).rows;
  } catch (err) {
    beforeError = errorMessage(err);
  }
  try {
    afterRows = (await afterDb.query<Row>(probe.sql, probe.params)).rows;
  } catch (err) {
    afterError = errorMessage(err);
  }

  if (beforeError || afterError) {
    return { name: probe.name, sql: probe.sql, ok: false, beforeError, afterError, diffs: [] };
  }

  const diffs = diffRows(beforeRows!, afterRows!);
  return {
    name: probe.name,
    sql: probe.sql,
    ok: diffs.length === 0,
    rowCountBefore: beforeRows!.length,
    rowCountAfter: afterRows!.length,
    diffs,
  };
}
