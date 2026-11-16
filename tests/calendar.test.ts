import { test } from "node:test";
import assert from "node:assert/strict";
import { monthDays } from "../src/shared/calendar";
test("calendar uses Monday-first weeks and leap years", () => {
  const feb = monthDays(2024, 1);
  assert.deepEqual(feb.slice(0, 4), [null, null, null, 1]);
  assert.equal(feb.filter(Boolean).length, 29);
  assert.equal(monthDays(2025, 1).filter(Boolean).length, 28);
  assert.equal(monthDays(2026, 10)[6], 1);
  assert.equal(monthDays(2026, 10).length, 42);
});
test("month navigation crosses year boundaries", () => {
  assert.deepEqual(monthDays(2026, 12), monthDays(2027, 0));
  assert.deepEqual(monthDays(2026, -1), monthDays(2025, 11));
});
