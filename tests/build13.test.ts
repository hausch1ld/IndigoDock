import { test } from "node:test";
import assert from "node:assert/strict";
import { defaults } from "../src/main/registry";
import { bounds, emptyLayout, assign } from "../src/shared/layout";
import { saveGroup, groupIds } from "../src/shared/groups";
import { configSchema } from "../src/shared/model";
test("two visible columns exclude hidden third service from saved group", () => {
  const c = defaults();
  c.count = 2;
  c.layouts[2] = emptyLayout(2);
  assign(c.layouts[2], "spotify", 0);
  assign(c.layouts[2], "steam", 0);
  assign(c.layouts[2], "discord", 1);
  saveGroup(c, "pair");
  assert.deepEqual(groupIds(c.groups[0].layout), ["steam", "discord"]);
  assert.deepEqual(
    c.groups[0].layout.columns.map((x) => x.services),
    [["steam"], ["discord"]],
  );
  assert.equal(c.layouts[2].columns[0].services.includes("spotify"), true);
});
test("every dock edge is excluded from native views, with and without tabs", () => {
  for (const position of ["bottom", "left", "right", "top"] as const)
    for (const tabs of [false, true]) {
      const b = bounds(1000, 700, [0.2, 0.5, 0.3], tabs, position);
      assert.equal(b[0].x, position === "left" ? 72 : 0);
      assert.equal(
        b[0].y,
        40 + (tabs ? 34 : 0) + (position === "top" ? 72 : 0),
      );
      assert.equal(b[2].x + b[2].width, position === "right" ? 928 : 1000);
      assert.equal(b[0].y + b[0].height, position === "bottom" ? 628 : 700);
    }
});
test("old profiles acquire dock position and empty cosmetic rules without losing sessions", () => {
  const raw = JSON.parse(JSON.stringify(defaults()));
  delete raw.settings.dockPosition;
  delete raw.services[0].hiddenElements;
  const c = configSchema.parse(raw);
  assert.equal(c.settings.dockPosition, "bottom");
  assert.deepEqual(c.services[0].hiddenElements, []);
  assert.equal(c.services[0].profile, raw.services[0].profile);
});
