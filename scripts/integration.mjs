import { _electron as electron } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
const testDir = path.resolve("test-results");
await fs.mkdir(testDir, { recursive: true });
const data = await fs.mkdtemp(path.join(testDir, "profile-"));
let requests = 0;
const server = http.createServer((req, res) => {
  if (req.url === "/") {
    requests++;
    res.setHeader("Content-Type", "text/html");
    res.end(
      '<!doctype html><title>Local test service</title><style>body{background:#182a35;color:white;font:24px sans-serif;padding:50px}</style><h1>MultiDock Integration</h1><p>Native WebContentsView · local fixture</p><script>localStorage.setItem("persistent","yes");document.cookie="session=persisted;max-age=86400;path=/";setInterval(()=>{document.title="alive-"+Date.now()},200)</script>',
    );
  } else {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/`;
let app, page;
const errors = [];
async function launch() {
  const env = { ...process.env, MULTIDOCK_TEST_DATA: data };
  delete env.ELECTRON_RUN_AS_NODE;
  app = await electron.launch({ args: ["."], env, timeout: 30000 });
  app.process().stderr.on("data", (d) => errors.push(String(d)));
  page = await app.firstWindow();
  await page.waitForFunction(() => !!window.multidock);
  await page.locator(".dock").waitFor();
  page.on("pageerror", (e) => errors.push(String(e)));
}
async function command(cmd) {
  await page.evaluate((cmd) => window.multidock.command(cmd), cmd);
}
async function state() {
  return page.evaluate(() => window.multidock.snapshot());
}
async function services() {
  return app.evaluate(({ webContents }) =>
    webContents
      .getAllWebContents()
      .filter((w) => w.getURL().startsWith("http://127.0.0.1:"))
      .map((w) => ({ id: w.id, url: w.getURL(), title: w.getTitle() })),
  );
}
async function quit() {
  await command({ type: "window", action: "quit" }).catch(() => {});
  await new Promise((r) =>
    app.process().exitCode !== null ? r() : app.process().once("exit", r),
  );
}
try {
  await launch();
  await page.screenshot({ path: path.join(testDir, "01-welcome.png") });
  await page.getByTitle("Einstellungen", { exact: true }).click();
  await page
    .locator(".settings-tabs")
    .getByRole("button", { name: "Dienste", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Dienst hinzufügen", exact: true })
    .click();
  await page.getByRole("dialog").waitFor();
  await page.getByRole("button", { name: "Abbrechen", exact: true }).click();
  await page.getByTitle("Spaltenlayout", { exact: true }).click();
  await page.getByRole("button", { name: "3 Spalten", exact: true }).click();
  assert.equal((await state()).config.count, 3);
  const base = (await state()).config.services[0];
  await command({
    type: "saveService",
    service: {
      ...base,
      id: "test-a",
      name: "Test A",
      profile: "fixture-a",
      url,
      currentUrl: "",
      icon: "",
      running: true,
      allowHttp: true,
    },
  });
  await command({ type: "assign", id: "test-a", column: 0 });
  await page.waitForFunction(
    async () =>
      (await window.multidock.snapshot()).status["test-a"]?.state === "ready",
  );
  const first = (await services())[0];
  assert.ok(first);
  await command({
    type: "saveService",
    service: {
      ...base,
      id: "test-b",
      name: "Test B",
      profile: "fixture-b",
      url,
      currentUrl: "",
      icon: "",
      running: true,
      allowHttp: true,
    },
  });
  await command({ type: "assign", id: "test-b", column: 1 });
  await page.waitForFunction(
    async () =>
      (await window.multidock.snapshot()).status["test-b"]?.state === "ready",
  );
  const count = requests;
  await command({ type: "assign", id: "test-a", column: 2 });
  await command({ type: "layout", count: 4 });
  await command({ type: "assign", id: "test-a", column: 3 });
  await command({ type: "layout", count: 2 });
  await command({ type: "layout", count: 4 });
  assert.equal((await services()).find((w) => w.id === first.id)?.id, first.id);
  assert.equal((await services()).length, 2);
  assert.equal(requests, count);
  // DOM overlay sits over snapshots, while underlying WebContents keep running.
  await page.getByRole("button", { name: "Test A", exact: true }).click();
  await page.locator(".target").first().waitFor();
  await page.locator(".target").nth(1).click();
  assert.equal((await state()).config.layouts[4].columns[1].active, "test-a");
  await command({ type: "layout", count: 3 });
  await command({ type: "assign", id: "test-a", column: 0 });
  await command({ type: "assign", id: "test-b", column: 1 });
  await command({ type: "ratios", ratios: [0.25, 0.45, 0.3] });
  await page.getByTitle("Spaltenlayout", { exact: true }).click();
  await page.screenshot({ path: path.join(testDir, "02-layout.png") });
  await page.keyboard.press("Escape");
  // Foreign contents have no privileged bridge; hidden page remains alive.
  const sandbox = await app.evaluate(async ({ webContents }, id) => {
    const w = webContents.fromId(id);
    return w.executeJavaScript(
      '({node:typeof require,bridge:typeof window.multidock,stored:localStorage.getItem("persistent")})',
    );
  }, first.id);
  assert.deepEqual(sandbox, {
    node: "undefined",
    bridge: "undefined",
    stored: "yes",
  });
  await command({ type: "service", id: "test-a", action: "stop" });
  assert.equal((await services()).length, 1);
  await command({ type: "assign", id: "test-a", column: 2 });
  assert.equal((await services()).length, 1);
  await command({ type: "service", id: "test-a", action: "start" });
  await page.waitForFunction(
    async () =>
      (await window.multidock.snapshot()).status["test-a"]?.state === "ready",
  );
  const cookies = await app.evaluate(async ({ session }) =>
    session
      .fromPartition("persist:multidock-fixture-a")
      .cookies.get({ name: "session" }),
  );
  assert.equal(cookies[0]?.value, "persisted");
  await command({
    type: "settings",
    settings: { ...(await state()).config.settings, closeToTray: false },
  });
  await quit();
  await launch();
  const restored = await state();
  assert.equal(restored.config.count, 3);
  assert.deepEqual(restored.config.layouts[3].ratios, [0.25, 0.45, 0.3]);
  const persisted = await app.evaluate(async ({ session }) =>
    session
      .fromPartition("persist:multidock-fixture-a")
      .cookies.get({ name: "session" }),
  );
  assert.equal(persisted[0]?.value, "persisted");
  await page.screenshot({ path: path.join(testDir, "03-restored.png") });
  await quit();
  await fs.writeFile(
    path.join(testDir, "integration.json"),
    JSON.stringify(
      {
        passed: true,
        requests,
        checks: [
          "real Electron startup",
          "add dialog",
          "layout menu",
          "single native instance",
          "no reload on move/layout",
          "overlay selection",
          "sandbox isolation",
          "stop/start",
          "no implicit restart",
          "persistent cookie across process restart",
          "25/45/30 restoration",
        ],
        stderr: errors,
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS: Electron integration, persistent sessions, lifecycle, native views, layout and sandbox.",
  );
} catch (e) {
  await fs.writeFile(
    path.join(testDir, "failure.txt"),
    String(e) + "\n" + errors.join(""),
  );
  throw e;
} finally {
  if (app && app.process().exitCode === null) await app.close().catch(() => {});
  server.close();
}
