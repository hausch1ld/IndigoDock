import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assign,
  changeLayout,
  emptyLayout,
  bounds,
  resizePair,
  normalize,
} from "../src/shared/layout";
import { defaults } from "../src/main/registry";
test("4 → 2 → 4 restores tabs and ratios without mutating running state", () => {
  const c = defaults();
  c.services.forEach((s) => (s.running = true));
  changeLayout(c, 4);
  ["steam", "discord", "spotify", "youtube"].forEach((id, i) =>
    assign(c.layouts[4], id, i),
  );
  c.layouts[4].ratios = [0.2, 0.3, 0.35, 0.15];
  changeLayout(c, 2);
  assert.deepEqual(c.layouts[2].columns[1].services, [
    "discord",
    "spotify",
    "youtube",
  ]);
  changeLayout(c, 4);
  assert.deepEqual(c.layouts[4].ratios, [0.2, 0.3, 0.35, 0.15]);
  assert.equal(c.layouts[4].columns[3].active, "youtube");
  assert.ok(c.services.every((s) => s.running));
});
test("moving service maintains one assignment and reveals previous tab", () => {
  const l = emptyLayout(4);
  assign(l, "a", 0);
  assign(l, "b", 0);
  assign(l, "b", 3);
  assert.equal(l.columns[0].active, "a");
  assert.equal(l.columns[3].active, "b");
  assert.equal(
    l.columns.flatMap((c) => c.services).filter((x) => x === "b").length,
    1,
  );
});
test("stopped state survives layout changes and selection", () => {
  const c = defaults();
  assign(c.layouts[1], "discord", 0);
  changeLayout(c, 3);
  assert.equal(c.services[0].running, false);
});
test("bounds cover all pixels, preserve gaps and exclude chrome at arbitrary DPI sizes", () => {
  for (const width of [640, 801, 1440, 1921, 3840])
    for (let n = 1; n <= 4; n++) {
      const b = bounds(width, 900, Array(n).fill(1 / n));
      assert.equal(b[0].x, 0);
      assert.equal(b.at(-1)!.x + b.at(-1)!.width, width);
      assert.ok(b.every((x) => x.y === 74 && x.height === 754));
      for (let i = 1; i < n; i++)
        assert.equal(b[i].x - (b[i - 1].x + b[i - 1].width), 6);
    }
});
test("splitter respects minimums and narrow windows", () => {
  const r = resizePair([0.5, 0.5], 0, -9999, 1000);
  assert.ok(r[0] >= 220 / 994);
  assert.equal(r[0] + r[1], 1);
  assert.deepEqual(
    resizePair([0.25, 0.25, 0.25, 0.25], 0, 500, 640),
    [0.25, 0.25, 0.25, 0.25],
  );
});
test("invalid/deleted IDs and duplicate assignment are repaired", () => {
  const l = {
    ratios: [1],
    columns: [
      { services: ["a", "a", "deleted"], active: "deleted" },
      { services: ["a", "b"], active: "a" },
    ],
  };
  normalize(l, new Set(["a", "b"]));
  assert.deepEqual(l.columns, [
    { services: ["a"], active: "a" },
    { services: ["b"], active: "b" },
  ]);
  assert.deepEqual(l.ratios, [0.5, 0.5]);
});
