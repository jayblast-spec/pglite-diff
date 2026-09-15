export interface Scenario {
  /** SQL run once via exec() before any probes -- typically schema DDL plus migrations and seed data. */
  setup: string;
}

export interface QueryProbe {
  name: string;
  sql: string;
  params?: unknown[];
}

export type Row = Record<string, unknown>;

export interface RowDiff {
  index: number;
  before: Row | undefined;
  after: Row | undefined;
  changedColumns: string[];
}

export interface ProbeResult {
  name: string;
  sql: string;
  ok: boolean;
  beforeError?: string;
  afterError?: string;
  rowCountBefore?: number;
  rowCountAfter?: number;
  diffs: RowDiff[];
}

export interface DiffReport {
  ok: boolean;
  setupError?: { side: "before" | "after"; message: string };
  probes: ProbeResult[];
}
