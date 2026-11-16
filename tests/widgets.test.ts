import { test } from "node:test";
import assert from "node:assert/strict";
import { insertAt } from "../src/shared/dock";
import { Catalog } from "../src/main/catalog";
import { commandSchema } from "../src/shared/model";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
test("drop boundaries match insertion marker in both directions", () => {
  assert.deepEqual(insertAt(["a", "b", "c", "d"], "a", 3), [
    "b",
    "c",
    "a",
    "d",
  ]);
  assert.deepEqual(insertAt(["a", "b", "c"], "c", 0), ["c", "a", "b"]);
  assert.deepEqual(insertAt(["a", "b", "c"], "b", 2), ["a", "b", "c"]);
  assert.deepEqual(insertAt(["a", "b", "c"], "a", 3), ["b", "c", "a"]);
});
test("catalog is extensible without a build and retains last valid version on error", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "indigo-catalog-"));
  try {
    const catalog = new Catalog(dir);
    assert.ok(catalog.services.every((s) => s.kind === "web"));
    const items = [
      ...catalog.services,
      {
        id: "example",
        profile: "example",
        name: "Example",
        url: "https://example.com",
      },
    ];
    fs.writeFileSync(catalog.file, JSON.stringify(items));
    catalog.reload();
    assert.equal(catalog.services.at(-1)?.id, "example");
    fs.writeFileSync(catalog.file, "invalid");
    catalog.reload();
    assert.ok(catalog.error);
    assert.equal(catalog.services.at(-1)?.id, "example");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
test("widget commands reject unsafe volumes and arbitrary widget names", () => {
  assert.equal(
    commandSchema.safeParse({ type: "mixerVolume", pid: 1, value: 2 }).success,
    false,
  );
  assert.equal(
    commandSchema.safeParse({
      type: "sidebar",
      patch: { widgets: ["shell"] },
    }).success,
    false,
  );
});
