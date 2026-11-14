import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Store } from "../src/main/persistence";
import { changeLayout, assign } from "../src/shared/layout";
test("atomic roundtrip restores 25/45/30 and all desired states", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "multidock-test-"));
  try {
    const s = new Store(dir);
    changeLayout(s.config, 3);
    ["steam", "discord", "spotify"].forEach((id, i) =>
      assign(s.config.layouts[3], id, i),
    );
    s.config.layouts[3].ratios = [0.25, 0.45, 0.3];
    s.config.services[0].running = true;
    s.flush();
    const restored = new Store(dir);
    assert.deepEqual(restored.config, s.config);
    assert.equal(fs.existsSync(s.file + ".tmp"), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
test("corrupt config recovers last valid backup and preserves it", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "multidock-test-"));
  try {
    const s = new Store(dir);
    s.flush();
    s.config.count = 2;
    s.config.layouts[2] = {
      columns: [
        { services: [], active: null },
        { services: [], active: null },
      ],
      ratios: [0.5, 0.5],
    };
    s.flush();
    fs.writeFileSync(s.file, "{broken");
    const recovered = new Store(dir);
    assert.equal(recovered.config.count, 1);
    assert.ok(recovered.error);
    recovered.flush();
    assert.doesNotThrow(() =>
      JSON.parse(fs.readFileSync(s.file + ".bak", "utf8")),
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
