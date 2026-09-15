/**
 * A migration refactor accidentally changes a computed value. This is
 * exactly the class of regression that unit tests against one database
 * rarely catch, because both "before" and "after" look correct in
 * isolation -- you only see it by comparing them. Run with:
 *   npx tsx examples/demo.ts
 */
import { diffScenarios } from "../src/index.js";

const originalMigrations = `
  create table subscriptions (id serial primary key, plan text, monthly_price numeric, annual_price numeric);
  insert into subscriptions (plan, monthly_price, annual_price) values
    ('starter', 10, 10 * 12 * 0.8),
    ('pro', 30, 30 * 12 * 0.8);
`;

// Someone "cleans up" the migration history by squashing it into one file,
// and along the way fat-fingers the annual discount from 0.8 to 0.9.
const squashedMigrations = `
  create table subscriptions (id serial primary key, plan text, monthly_price numeric, annual_price numeric);
  insert into subscriptions (plan, monthly_price, annual_price) values
    ('starter', 10, 10 * 12 * 0.9),
    ('pro', 30, 30 * 12 * 0.8);
`;

const report = await diffScenarios(
  { setup: originalMigrations },
  { setup: squashedMigrations },
  [{ name: "subscription pricing", sql: "select plan, monthly_price, annual_price from subscriptions order by id" }]
);

console.log(`Overall: ${report.ok ? "identical" : "REGRESSION DETECTED"}\n`);
for (const probe of report.probes) {
  console.log(`Probe "${probe.name}": ${probe.ok ? "ok" : "MISMATCH"}`);
  for (const diff of probe.diffs) {
    console.log(`  row ${diff.index}: changed columns [${diff.changedColumns.join(", ")}]`);
    console.log(`    before: ${JSON.stringify(diff.before)}`);
    console.log(`    after:  ${JSON.stringify(diff.after)}`);
  }
}
