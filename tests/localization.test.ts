import { test } from "node:test";
import assert from "node:assert/strict";
import { configSchema, settingsSchema } from "../src/shared/model";
import { defaults } from "../src/main/registry";
import { translate, setLanguage, locale, t } from "../src/shared/i18n";

test("legacy settings default to English and preserve existing profiles", () => {
  const original = defaults();
  const raw = JSON.parse(JSON.stringify(original));
  delete raw.settings.language; delete raw.settings.fontSize;
  const restored = configSchema.parse(raw);
  assert.equal(restored.settings.language, "en");
  assert.equal(restored.settings.fontSize, 16);
  assert.deepEqual(restored.services, original.services);
  assert.equal(settingsSchema.safeParse({...original.settings, fontSize: 100}).success, false);
  assert.equal(settingsSchema.safeParse({...original.settings, language: "unknown"}).success, false);
});
test("translations switch labels, dates and dynamic messages without altering custom text", () => {
  assert.equal(translate("Settings", "de"), "Einstellungen");
  assert.equal(translate("Column 2", "de"), "Spalte 2");
  assert.equal(translate("Remove Example?", "de"), "Example entfernen?");
  assert.equal(translate("Version 1.8.0 is available.", "de"), "Version 1.8.0 ist verfügbar.");
  assert.equal(translate("A custom service", "de"), "A custom service");
  setLanguage("de"); assert.equal(locale(), "de-DE"); assert.equal(t("Apply"), "Übernehmen");
  setLanguage("en"); assert.equal(locale(), "en-GB"); assert.equal(t("Apply"), "Apply");
});
