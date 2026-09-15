import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { diffScenarios } from "./diff.js";
import type { QueryProbe, Scenario } from "./types.js";

interface ConfigModule {
  before: Scenario;
  after: Scenario;
  probes: QueryProbe[];
}

async function main() {
  const configPath = process.argv[2];
  if (!configPath) {
    console.error("Usage: pglite-diff <config.mjs>");
    console.error("\nThe config file must default-export { before: Scenario, after: Scenario, probes: QueryProbe[] }.");
    console.error("See README.md for the exact shape.");
    process.exit(2);
  }

  const mod = (await import(pathToFileURL(resolve(configPath)).href)) as { default: ConfigModule };
  const { before, after, probes } = mod.default;

  const report = await diffScenarios(before, after, probes);

  if (report.setupError) {
    console.error(`Setup failed on the "${report.setupError.side}" side: ${report.setupError.message}`);
    process.exit(1);
  }

  for (const probe of report.probes) {
    console.log(`${probe.ok ? "PASS" : "FAIL"}  ${probe.name}`);
    if (probe.beforeError) console.log(`      before error: ${probe.beforeError}`);
    if (probe.afterError) console.log(`      after error:  ${probe.afterError}`);
    for (const diff of probe.diffs) {
      console.log(`      row ${diff.index}: changed [${diff.changedColumns.join(", ")}]`);
      console.log(`        before: ${JSON.stringify(diff.before)}`);
      console.log(`        after:  ${JSON.stringify(diff.after)}`);
    }
  }

  console.log(`\n${report.probes.filter((p) => p.ok).length}/${report.probes.length} probes matched.`);
  process.exit(report.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
