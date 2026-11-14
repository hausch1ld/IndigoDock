import { test } from "node:test";
import assert from "node:assert/strict";
import { serviceStartUrl } from "../src/shared/compatibility";
test("Discord restores channels but not transient authentication routes", () => {
  const start = "https://discord.com/app";
  for (const path of ["/login", "/logout", "/register", "/verify"]) {
    assert.equal(serviceStartUrl(start, "https://discord.com" + path), start);
  }
  const channel = "https://discord.com/channels/123/456";
  assert.equal(serviceStartUrl(start, channel), channel);
  assert.equal(serviceStartUrl(start, "https://example.com/login"), start);
  assert.equal(
    serviceStartUrl("https://example.com/", "https://example.com/dashboard"),
    "https://example.com/dashboard",
  );
});
