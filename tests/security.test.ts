import { test } from "node:test";
import assert from "node:assert/strict";
import { validUrl, safeIcon, origin } from "../src/shared/security";
import { commandSchema } from "../src/shared/model";
test("URL policy blocks executable schemes, embedded credentials and implicit HTTP", () => {
  for (const url of [
    "file:///C:/Windows/a",
    "javascript:alert(1)",
    "data:text/html,test",
    "https://user:secret@example.com",
    "http://homeassistant.local:8123",
  ])
    assert.equal(validUrl(url), false);
  assert.equal(validUrl("http://homeassistant.local:8123", true), true);
  assert.equal(validUrl("https://discord.com/app"), true);
});
test("icons cannot introduce SVG scripts or file access", () => {
  assert.equal(safeIcon("data:image/svg+xml;base64,AAAA"), false);
  assert.equal(safeIcon("file:///a.png"), false);
  assert.equal(safeIcon("/icons/../../evil.svg"), false);
  assert.equal(safeIcon("/icons/discord.svg"), true);
});
test("IPC rejects malformed commands and nonfinite values", () => {
  for (const cmd of [
    { type: "execute", code: "x" },
    { type: "layout", count: 5 },
    { type: "ratios", ratios: [NaN] },
    { type: "assign", id: "x", column: -1 },
  ])
    assert.equal(commandSchema.safeParse(cmd).success, false);
});
test("origins compare ports and schemes", () => {
  assert.notEqual(
    origin("https://example.com"),
    origin("https://example.com:8443"),
  );
  assert.equal(
    origin("https://example.com/a"),
    origin("https://example.com/b"),
  );
});
