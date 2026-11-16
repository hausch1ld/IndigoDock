import { test } from "node:test";
import assert from "node:assert/strict";
import { defaults } from "../src/main/registry";
import { serviceSchema, configSchema, commandSchema } from "../src/shared/model";
import { migrateSidebar, sidebarWidth } from "../src/shared/sidebar";
import { bounds } from "../src/shared/layout";
import { serviceUserAgent } from "../src/shared/compatibility";

test("legacy widget column becomes independent sidebar and preserves web sessions and width proportions", () => {
  const c = defaults();
  c.services.push(
    serviceSchema.parse({
      id: "widgets",
      profile: "widgets",
      name: "Widgets",
      url: "",
      kind: "widgets",
      running: true,
    }),
  );
  c.count = 3;
  c.layouts[3] = {
    ratios: [0.2, 0.5, 0.3],
    columns: ["steam", "discord", "widgets"].map((id) => ({
      services: [id],
      active: id,
    })),
  };
  c.groups = [
    { id: "group", name: "Old", layout: structuredClone(c.layouts[3]) },
  ];
  const before = structuredClone(c.services.slice(0, -1));
  migrateSidebar(c, false);
  assert.deepEqual(c.services, before);
  assert.equal(c.count, 2);
  assert.deepEqual(
    c.layouts[2].columns.map((col) => col.active),
    ["steam", "discord"],
  );
  assert.ok(Math.abs(c.layouts[2].ratios[0] - 2 / 7) < 1e-10);
  assert.equal(c.groups[0].layout.columns.length, 2);
  assert.equal(c.sidebar.open, true);
  assert.ok(c.sidebar.widgets.includes("notes"));
  assert.deepEqual(configSchema.parse(c), c);
});

test("existing sidebar preferences survive legacy migration and bounds reserve its width", () => {
  const c = defaults();
  c.sidebar.notes = "äöü\nNotiz";
  c.sidebar.background = "#123456";
  c.services.push(
    serviceSchema.parse({
      id: "widgets",
      profile: "widgets",
      name: "Widgets",
      url: "",
      kind: "widgets",
      running: true,
    }),
  );
  migrateSidebar(c, true);
  assert.equal(c.sidebar.open, false);
  assert.equal(c.sidebar.notes, "äöü\nNotiz");
  for (const dock of ["left", "right", "top", "bottom"] as const) {
    const views = bounds(
      1440,
      900,
      [0.4, 0.6],
      false,
      dock,
      sidebarWidth(1440, true),
    );
    assert.equal(
      views.at(-1)!.x + views.at(-1)!.width,
      1440 - 320 - (dock === "right" ? 72 : 0),
    );
  }
});

test("WhatsApp receives real Chromium version without Electron application markers", () => {
  const original =
    "Mozilla/5.0 Chrome/154.0.0.0 Safari/537.36 Electron/45.2.1 IndigoDock/1.5.0";
  assert.equal(
    serviceUserAgent(original, "https://web.whatsapp.com/"),
    "Mozilla/5.0 Chrome/154.0.0.0 Safari/537.36",
  );
  assert.equal(
    serviceUserAgent(original, "https://accounts.google.com/"),
    original,
  );
});

test("partial sidebar commands do not reset other preferences", () => {
  assert.deepEqual(commandSchema.parse({type: "sidebar", patch: { notes: "Test" }}), {type: "sidebar", patch: { notes: "Test" }});
});
