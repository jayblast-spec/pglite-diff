const setupBefore = `
  create table subscriptions (id serial primary key, plan text, annual_price numeric);
  insert into subscriptions (plan, annual_price) values ('starter', 10 * 12 * 0.8);
`;

const setupAfter = `
  create table subscriptions (id serial primary key, plan text, annual_price numeric);
  insert into subscriptions (plan, annual_price) values ('starter', 10 * 12 * 0.9);
`;

export default {
  before: { setup: setupBefore },
  after: { setup: setupAfter },
  probes: [{ name: "pricing", sql: "select plan, annual_price from subscriptions order by id" }],
};
