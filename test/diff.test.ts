import { describe, expect, it } from "vitest";
import { diffScenarios } from "../src/diff.js";

describe("diffScenarios", () => {
  it("reports ok with no diffs when both scenarios are identical", async () => {
    const setup = `
      create table products (id serial primary key, name text, price numeric);
      insert into products (name, price) values ('widget', 10), ('gadget', 20);
    `;
    const report = await diffScenarios(
      { setup },
      { setup },
      [{ name: "all products", sql: "select id, name, price from products order by id" }]
    );

    expect(report.ok).toBe(true);
    expect(report.probes[0]!.diffs).toEqual([]);
  });

  it("catches a real migration regression: a rewritten migration that changes a computed value", async () => {
    const beforeSetup = `
      create table orders (id serial primary key, subtotal numeric, tax numeric);
      insert into orders (subtotal, tax) values (100, 100 * 0.08);
    `;
    // The "after" migration recomputes tax with a different (wrong) rate --
    // exactly the kind of regression a migration refactor could introduce.
    const afterSetup = `
      create table orders (id serial primary key, subtotal numeric, tax numeric);
      insert into orders (subtotal, tax) values (100, 100 * 0.07);
    `;

    const report = await diffScenarios(
      { setup: beforeSetup },
      { setup: afterSetup },
      [{ name: "order tax", sql: "select id, subtotal, tax from orders order by id" }]
    );

    expect(report.ok).toBe(false);
    const probe = report.probes[0]!;
    expect(probe.ok).toBe(false);
    expect(probe.diffs).toHaveLength(1);
    expect(probe.diffs[0]!.changedColumns).toEqual(["tax"]);
  });

  it("reports a probe as failed (not silently skipped) when a migration breaks a queried column", async () => {
    const beforeSetup = `create table users (id serial primary key, email text);`;
    const afterSetup = `create table users (id serial primary key, email_address text);`; // renamed

    const report = await diffScenarios(
      { setup: beforeSetup },
      { setup: afterSetup },
      [{ name: "user emails", sql: "select id, email from users" }]
    );

    expect(report.ok).toBe(false);
    const probe = report.probes[0]!;
    expect(probe.ok).toBe(false);
    expect(probe.beforeError).toBeUndefined();
    expect(probe.afterError).toContain("email");
  });

  it("reports a setup failure distinctly from a probe failure, naming which side failed", async () => {
    const report = await diffScenarios(
      { setup: "create table valid (id int);" },
      { setup: "this is not valid sql;" },
      [{ name: "noop", sql: "select 1" }]
    );

    expect(report.ok).toBe(false);
    expect(report.setupError?.side).toBe("after");
    expect(report.probes).toEqual([]);
  });

  it("runs multiple probes independently -- one failing doesn't stop the others from reporting", async () => {
    const setup = `create table t (id serial primary key, v int); insert into t (v) values (1), (2);`;
    const report = await diffScenarios({ setup }, { setup }, [
      { name: "good", sql: "select v from t order by id" },
      { name: "bad sql", sql: "select nonexistent_column from t" },
    ]);

    expect(report.ok).toBe(false);
    expect(report.probes[0]!.ok).toBe(true);
    expect(report.probes[1]!.ok).toBe(false);
  });
});
