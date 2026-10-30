import { test } from "node:test";
import assert from "node:assert/strict";
import { businessValue, metrics } from "./format";
import { demoSeed } from "./demo-seed";

test("corporate rate agreement does not count as confirmed revenue", () => {
  const rate = {
    ...demoSeed().opportunities[3],
    stage: "Won" as const,
    value: 90000000,
    closeDate: "2026-10-10",
  };
  assert.equal(businessValue(rate), 0);
  assert.equal(metrics([rate], "2026-10").confirmed, 0);
});
test("closing report uses close date, excludes open deals and handles empty denominator", () => {
  const base = demoSeed().opportunities[0];
  const rows = [
    { ...base, id: "won", stage: "Won" as const, value: 100, closeDate: "2026-10-01" },
    { ...base, id: "lost", stage: "Lost" as const, value: 500, closeDate: "2026-10-02" },
    { ...base, id: "other-month", stage: "Won" as const, value: 999, closeDate: "2026-11-01" },
    base,
  ];
  const result = metrics(rows, "2026-10");
  assert.equal(result.confirmed, 100);
  assert.equal(result.conversion, 50);
  assert.equal(result.openCount, 1);
  assert.equal(metrics([], "2026-10").conversion, null);
});
