import { test } from "node:test";
import assert from "node:assert/strict";
import { defaults } from "../src/main/registry";
import { configSchema, commandSchema } from "../src/shared/model";
import { dockGroups, reordered } from "../src/shared/dock";
import { bounds } from "../src/shared/layout";
import { persistentDataPath } from "../src/main/data-path";
import { serviceUserAgent } from "../src/shared/compatibility";
test("old configuration migrates new settings without losing profile or running state", () => {
  const c = defaults();
  c.services[0].running = true;
  const raw = JSON.parse(JSON.stringify(c));
  delete raw.settings.showColumnTabs;
  delete raw.settings.groupActive;
  delete raw.settings.hideInactive;
  const restored = configSchema.parse(raw);
  assert.equal(restored.settings.showColumnTabs, true);
  assert.equal(restored.settings.groupActive, false);
  assert.deepEqual(restored.services, c.services);
});
test("grouping is stable and never changes stored order", () => {
  const c = defaults();
  c.services[1].running = true;
  c.services[4].running = true;
  const original = c.services.map((s) => s.id);
  const g = dockGroups(c.services, { groupActive: true, hideInactive: false });
  assert.deepEqual(
    g.primary.map((s) => s.id),
    ["steam", "spotify"],
  );
  assert.equal(g.secondary[0].id, "discord");
  assert.equal(g.separator, true);
  assert.deepEqual(
    c.services.map((s) => s.id),
    original,
  );
});
test("hidden inactive apps stay accessible in launcher, empty active group works", () => {
  const c = defaults();
  let g = dockGroups(c.services, { groupActive: true, hideInactive: true });
  assert.equal(g.primary.length, 0);
  assert.equal(g.inactive.length, 11);
  assert.equal(g.separator, false);
  c.services[0].running = true;
  g = dockGroups(c.services, { groupActive: true, hideInactive: true });
  assert.equal(g.primary.length, 1);
  assert.equal(g.secondary.length, 0);
  assert.equal(g.inactive.length, 10);
  assert.equal(g.separator, true);
});
test("reordering works in both directions and preserves all IDs", () => {
  assert.deepEqual(reordered(["a", "b", "c"], "a", "c"), ["b", "a", "c"]);
  assert.deepEqual(reordered(["a", "b", "c"], "c", "a"), ["c", "a", "b"]);
  assert.deepEqual(reordered(["a", "b"], "x", "a"), ["a", "b"]);
});
test("hiding tabs adds exactly 34 DIP without resizing dock", () => {
  const a = bounds(1440, 900, [0.25, 0.45, 0.3]),
    b = bounds(1440, 900, [0.25, 0.45, 0.3], false);
  assert.equal(b[0].y, 40);
  assert.equal(b[0].height - a[0].height, 34);
  assert.deepEqual(
    a.map((x) => x.width),
    b.map((x) => x.width),
  );
  assert.equal(a[0].y + a[0].height, b[0].y + b[0].height);
});
test("only explicit drop starts a stopped service", () => {
  const selected = commandSchema.parse({ type: "assign", id: "a", column: 0 }),
    dropped = commandSchema.parse({
      type: "assign",
      id: "a",
      column: 0,
      startIfStopped: true,
    });
  assert.equal(selected.type === "assign" && selected.startIfStopped, false);
  assert.equal(dropped.type === "assign" && dropped.startIfStopped, true);
});
test("renaming uses legacy data directory and respects isolated tests", () => {
  assert.ok(
    persistentDataPath("C:/Users/test/AppData/Roaming").endsWith("multidock"),
  );
  assert.equal(persistentDataPath("ignored", "test-profile"), "test-profile");
});
test("Discord browser path retains actual Chromium and does not affect identity providers or Spotify", () => {
  const ua =
    "Mozilla/5.0 Chrome/156.0.0.0 Electron/45.3.2 IndigoDock/1.1.0 Safari/537.36";
  assert.equal(
    serviceUserAgent(ua, "https://discord.com/app"),
    "Mozilla/5.0 Chrome/156.0.0.0 Safari/537.36",
  );
  for (const url of [
    "https://accounts.google.com",
    "https://appleid.apple.com",
    "https://open.spotify.com",
    "https://discord.com.evil.test",
  ])
    assert.equal(serviceUserAgent(ua, url), ua);
});
