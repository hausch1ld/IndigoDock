// Standalone integration harness for environments whose terminal is AppContainer-sandboxed.
// Prepared by prepare-desktop-test.mjs; never included in the distributed application.
const {
  app,
  webContents,
  session,
  BaseWindow,
  BrowserWindow,
  dialog,
} = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const assert = require("node:assert/strict");
const project = fs.readFileSync(path.join(__dirname, "project.txt"), "utf8");
const results = path.join(project, "test-results", "build-1.5-sidebar-d");
fs.mkdirSync(results, { recursive: true });
const stageFile = path.join(results, "desktop-stage.json");
const stage = fs.existsSync(stageFile)
  ? JSON.parse(fs.readFileSync(stageFile, "utf8"))
  : { phase: 1 };
process.env.MULTIDOCK_TEST_DATA =
  stage.profile ?? fs.mkdtempSync(path.join(results, "desktop-profile-"));
let requests = 0;
const server = http.createServer((req, res) => {
  requests++;
  res.setHeader("Content-Type", "text/html");
  res.end(
    '<!doctype html><title>MultiDock local fixture</title><body style="background:#192d36;color:white;font:22px Segoe UI;padding:35px"><header id="fixture-header"><h1>Lokaler Integrationstest</h1></header><p>Native WebContentsView · persistentes Profil</p><script>localStorage.setItem("fixture","persisted");addEventListener("beforeunload",()=>localStorage.setItem("closedNormally","yes"));document.cookie="fixture=persisted;max-age=86400;path=/";setInterval(()=>document.title="alive-"+Date.now(),100)</script>',
  );
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn) {
  for (let i = 0; i < 200; i++) {
    const v = await fn();
    if (v) return v;
    await wait(50);
  }
  throw Error("Timeout");
}
require(path.join(project, "dist/main.cjs"));
app.whenReady().then(async () => {
  let ui;
  try {
    await new Promise((r) => server.listen(stage.port ?? 0, "127.0.0.1", r));
    const url = `http://127.0.0.1:${server.address().port}/`;
    ui = await until(() =>
      webContents
        .getAllWebContents()
        .find((w) => w.getURL().endsWith("/ui/index.html")),
    );
    ui.on("console-message", (_event, ...args) =>
      fs.appendFileSync(
        path.join(results, "desktop-console.txt"),
        JSON.stringify(args) + "\n",
      ),
    );
    await until(() =>
      ui.executeJavaScript(
        '!!window.multidock&&!!document.querySelector(".dock")',
      ),
    );
    const cmd = async (c) => {
      fs.appendFileSync(
        path.join(results, "desktop-trace.txt"),
        JSON.stringify(c) + "\n",
      );
      const result = await ui.executeJavaScript(
        `window.multidock.command(${JSON.stringify(c)}).then(()=>({ok:true})).catch(e=>({error:String(e)}))`,
      );
      if (result.error) throw Error(result.error);
    };
    const state = () => ui.executeJavaScript("window.multidock.snapshot()");
    const natives = () =>
      webContents.getAllWebContents().filter((w) => w.getURL().startsWith(url));
    const ready = async (id) =>
      until(async () => (await state()).status[id]?.state === "ready");
    if (stage.phase === 2) {
      await ready("test-a");
      const c = (await state()).config;
      assert.equal(c.sidebar.notes, "Notizen mit Umlauten: äöü\nZweite Zeile");
      assert.equal(c.sidebar.background, "#203040");
      assert.equal(c.sidebar.open, true);
      assert.equal(c.sidebar.widgets[0], "mixer");
      assert.equal(c.count, 3);
      assert.deepEqual(c.layouts[3].ratios, [0.25, 0.45, 0.3]);
      const cookies = await session
        .fromPartition("persist:multidock-fixture-a")
        .cookies.get({ name: "fixture" });
      assert.equal(cookies[0]?.value, "persisted");
      const w = natives().find(
        (w) =>
          w.session === session.fromPartition("persist:multidock-fixture-a"),
      );
      assert.equal(
        await w.executeJavaScript('localStorage.getItem("fixture")'),
        "persisted",
      );
      assert.equal(
        await w.executeJavaScript('localStorage.getItem("closedNormally")'),
        "yes",
      );
      fs.writeFileSync(
        path.join(results, "desktop-integration.json"),
        JSON.stringify(
          {
            passed: true,
            checks: [
              ...stage.checks,
              "layout restored after real process restart",
              "cookie and localStorage restored after real process restart",
            ],
            date: new Date().toISOString(),
          },
          null,
          2,
        ),
      );
      fs.writeFileSync(stageFile, JSON.stringify({ ...stage, phase: 3 }));
      app.quit();
      return;
    }
    const checks = [];
    const pass = (s) => {
      checks.push(s);
      fs.appendFileSync(
        path.join(results, "desktop-trace.txt"),
        "PASS " + s + "\n",
      );
    };
    await wait(400);
    try {
      fs.writeFileSync(
        path.join(results, "welcome.png"),
        (await ui.capturePage()).toPNG(),
      );
    } catch {}
    pass("startup and renderer");
    assert.equal(
      await ui.executeJavaScript(
        '!!document.querySelector(".services .add-service")',
      ),
      false,
    );
    await ui.executeJavaScript(
      'document.querySelector("[title=Einstellungen]").click()',
    );
    await until(() =>
      ui.executeJavaScript('!!document.querySelector(".settings-tabs")'),
    );
    await ui.executeJavaScript(
      '[...document.querySelectorAll(".settings-tabs button")].find(b=>b.textContent==="Dienste").click()',
    );
    await until(() =>
      ui.executeJavaScript('!!document.querySelector(".add-service-settings")'),
    );
    await ui.executeJavaScript(
      'document.querySelector(".add-service-settings").click()',
    );
    await until(() =>
      ui.executeJavaScript('!!document.querySelector("[role=dialog]")'),
    );
    await ui.executeJavaScript(
      'document.querySelector(".modal-heading button").click()',
    );
    pass("add dialog");
    await cmd({ type: "layout", count: 3 });
    const base = (await state()).config.services[0];
    await cmd({
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
    await cmd({ type: "assign", id: "test-a", column: 0 });
    await ready("test-a");
    const a = natives()[0];
    const firstId = a.id;
    const firstRequestCount = requests;
    for (const n of [4, 2, 1, 3, 4]) await cmd({ type: "layout", count: n });
    await cmd({ type: "assign", id: "test-a", column: 3 });
    await wait(150);
    assert.equal(natives().length, 1);
    assert.equal(natives()[0].id, firstId);
    assert.equal(requests, firstRequestCount);
    pass("single native instance and no reload across layout/moves");
    const sandbox = await a.executeJavaScript(
      "({node:typeof require,bridge:typeof window.multidock})",
    );
    assert.deepEqual(sandbox, { node: "undefined", bridge: "undefined" });
    pass("foreign content sandbox and no privileged bridge");
    await cmd({
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
    await cmd({ type: "assign", id: "test-b", column: 3 });
    await ready("test-b");
    const before = a.getTitle();
    await wait(300);
    assert.notEqual(a.getTitle(), before);
    pass("hidden service remains alive");
    await ui.executeJavaScript(
      `document.querySelector('[aria-label="Test A"]').click()`,
    );
    await until(() =>
      ui.executeJavaScript('document.querySelectorAll(".target").length===4'),
    );
    await wait(200);
    await ui.executeJavaScript(
      'document.querySelectorAll(".target")[1].click()',
    );
    await until(
      async () =>
        (await state()).config.layouts[4].columns[1].active === "test-a",
    );
    pass("click overlay assigns correct native view");
    // HTML drag events exercise the renderer drop handlers with the real native-view manager.
    await ui.executeJavaScript(
      `(()=>{const d=new DataTransfer();document.querySelector('[aria-label="Test A"]').dispatchEvent(new DragEvent("dragstart",{bubbles:true,dataTransfer:d}));})()`,
    );
    await until(() =>
      ui.executeJavaScript('document.querySelectorAll(".target").length===4'),
    );
    await wait(200);
    await ui.executeJavaScript(
      '(()=>{const d=new DataTransfer();d.setData("text/plain","test-a");document.querySelectorAll(".target")[2].dispatchEvent(new DragEvent("drop",{bubbles:true,dataTransfer:d}));})()',
    );
    await until(
      async () =>
        (await state()).config.layouts[4].columns[2].active === "test-a",
    );
    assert.equal(natives().filter((w) => w.id === firstId).length, 1);
    pass("HTML drag/drop handler assigns without duplication");
    await cmd({ type: "service", id: "test-a", action: "stop" });
    await until(() => a.isDestroyed());
    assert.equal(natives().length, 1);
    await cmd({ type: "assign", id: "test-a", column: 0 });
    assert.equal(natives().length, 1);
    pass("stop destroys webContents, selection does not restart");
    await cmd({ type: "service", id: "test-a", action: "start" });
    await ready("test-a");
    const currentA = natives().find(
      (w) => w.session === session.fromPartition("persist:multidock-fixture-a"),
    );
    await cmd({
      type: "settings",
      settings: {
        ...(await state()).config.settings,
        showColumnTabs: false,
        groupActive: true,
        hideInactive: true,
      },
    });
    await until(() =>
      ui.executeJavaScript(
        'document.querySelectorAll(".column-tabs").length===0',
      ),
    );
    const nativeView = BaseWindow.getAllWindows()[0].contentView.children.find(
      (v) => v.webContents?.id === currentA.id,
    );
    assert.equal(nativeView.getBounds().y, 40);
    pass("hidden tabs update native bounds");
    await until(() =>
      ui.executeJavaScript('!!document.querySelector(".inactive-trigger")'),
    );
    assert.equal(
      await ui.executeJavaScript(
        'document.querySelectorAll(".services .service").length',
      ),
      2,
    );
    assert.equal(
      await ui.executeJavaScript(
        'document.querySelectorAll(".services .status-dot:not(.error-dot)").length',
      ),
      0,
    );
    assert.equal(
      await ui.executeJavaScript(
        'document.querySelectorAll(".dock-separator").length',
      ),
      1,
    );
    await ui.executeJavaScript(
      'document.querySelector(".inactive-trigger").click()',
    );
    await until(() =>
      ui.executeJavaScript(
        'document.querySelectorAll(".inactive-menu button").length===11',
      ),
    );
    await ui.executeJavaScript(
      'window.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape"}))',
    );
    pass("grouped active dock and inactive menu");
    assert.equal(
      await ui.executeJavaScript(
        '!!document.querySelector(".inactive-trigger small")',
      ),
      false,
    );
    await ui.executeJavaScript('document.querySelector(".dock-right").click()');
    await until(() =>
      ui.executeJavaScript('!document.querySelector(".popover")'),
    );
    await ui.executeJavaScript('document.querySelector(".service").click()');
    await until(() =>
      ui.executeJavaScript('!!document.querySelector(".target")'),
    );
    await ui.executeJavaScript('document.querySelector(".services").click()');
    await until(() =>
      ui.executeJavaScript('!document.querySelector(".target")'),
    );
    await ui.executeJavaScript(
      'document.querySelector(".service").dispatchEvent(new MouseEvent("contextmenu", {bubbles:true,clientX:400}))',
    );
    await until(() =>
      ui.executeJavaScript('!!document.querySelector(".context-menu")'),
    );
    await ui.executeJavaScript(
      'document.querySelector(".inactive-trigger").click()',
    );
    await until(() =>
      ui.executeJavaScript(
        '!!document.querySelector(".inactive-menu") && !document.querySelector(".context-menu")',
      ),
    );
    await ui.executeJavaScript(
      'document.querySelector(".service").dispatchEvent(new MouseEvent("contextmenu", {bubbles:true,clientX:400}))',
    );
    await until(() =>
      ui.executeJavaScript(
        '!!document.querySelector(".context-menu") && !document.querySelector(".inactive-menu")',
      ),
    );
    await ui.executeJavaScript('document.querySelector(".dock").click()');
    await until(() =>
      ui.executeJavaScript('!document.querySelector(".popover")'),
    );
    pass("dock dismissal, exclusive menus and no inactive count");
    await cmd({
      type: "settings",
      settings: {
        ...(await state()).config.settings,
        groupActive: false,
        hideInactive: false,
      },
    });
    await cmd({ type: "service", id: "test-a", action: "stop" });
    await wait(100);
    await ui.executeJavaScript(
      `(()=>{const d=new DataTransfer();document.querySelector('[aria-label="Test A"]').dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:d}));})()`,
    );
    await until(() =>
      ui.executeJavaScript('document.querySelectorAll(".target").length===4'),
    );
    await ui.executeJavaScript(
      `(()=>{const d=new DataTransfer();d.setData('text/plain','test-a');document.querySelectorAll('.target')[0].dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:d}));})()`,
    );
    await ready("test-a");
    assert.equal(
      (await state()).config.services.find((s) => s.id === "test-a").running,
      true,
    );
    pass("drop starts stopped service");
    await cmd({
      type: "saveService",
      service: {
        ...base,
        id: "test-error",
        name: "Test Error",
        profile: "fixture-error",
        url: "",
        currentUrl: "",
        icon: "",
        running: false,
      },
    });
    await wait(120);
    await ui.executeJavaScript(
      `document.querySelector('[aria-label="Test Error"]').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:600}))`,
    );
    await until(() =>
      ui.executeJavaScript('!!document.querySelector(".context-menu")'),
    );
    await ui.executeJavaScript(
      '[...document.querySelectorAll(".context-menu button")].find(b=>b.textContent==="Starten").click()',
    );
    await until(() =>
      ui.executeJavaScript('!!document.querySelector(".toast")'),
    );
    await until(
      () =>
        BaseWindow.getAllWindows()[0].contentView.children.at(-1)
          ?.webContents === ui,
    );
    pass("toast is above native views");
    await ui.executeJavaScript(
      'document.querySelector(".toast button").click()',
    );
    await ui.executeJavaScript(
      'document.querySelector("[title=Einstellungen]").click()',
    );
    await until(() =>
      ui.executeJavaScript('!!document.querySelector(".settings-tabs")'),
    );
    await ui.executeJavaScript(
      '[...document.querySelectorAll(".settings-tabs button")].find(b=>b.textContent==="Dienste").click()',
    );
    await until(() =>
      ui.executeJavaScript('!!document.querySelector(".service-list")'),
    );
    await ui.executeJavaScript(
      `(()=>{const d=new DataTransfer();document.querySelectorAll('.service-list>div[draggable]')[1].dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:d}));})()`,
    );
    await wait(60);
    await ui.executeJavaScript(
      `(()=>{const d=new DataTransfer();document.querySelectorAll('.service-list>div[draggable]')[0].dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:d}));})()`,
    );
    await until(async () => (await state()).config.services[0].id === "steam");
    pass("settings drag sorting persists order");
    const dimensions = [];
    for (const tab of ["Allgemein", "Layout", "Dienste", "Erweitert"]) {
      await ui.executeJavaScript(
        `[...document.querySelectorAll('.settings-tabs button')].find(b=>b.textContent===${JSON.stringify(tab)}).click()`,
      );
      await wait(50);
      dimensions.push(
        await ui.executeJavaScript(
          `(()=>{const b=document.querySelector('.settings-modal').getBoundingClientRect();return [b.width,b.height,document.querySelector(".settings-modal > .modal-footer").getBoundingClientRect().bottom]})()`,
        ),
      );
    }
    assert.ok(
      dimensions.every(
        (d) => JSON.stringify(d) === JSON.stringify(dimensions[0]),
      ),
    );
    pass("settings size stays identical across every tab");

    await ui.executeJavaScript(
      'document.querySelector(".modal-heading button").click()',
    );
    const cookies = await session
      .fromPartition("persist:multidock-fixture-a")
      .cookies.get({ name: "fixture" });
    assert.equal(cookies[0]?.value, "persisted");
    pass("stop/start preserves persistent cookies");
    await cmd({ type: "layout", count: 3 });
    await cmd({ type: "assign", id: "test-a", column: 0 });
    await cmd({ type: "assign", id: "test-b", column: 1 });
    await cmd({ type: "ratios", ratios: [0.25, 0.45, 0.3] });
    await cmd({
      type: "saveService",
      service: {
        ...(await state()).config.services.find((s) => s.id === "test-error"),
        url,
        allowHttp: true,
      },
    });
    await cmd({ type: "assign", id: "test-error", column: 2 });
    await ui.executeJavaScript(
      'document.querySelector(".layout-trigger").click()',
    );
    await until(() =>
      ui.executeJavaScript(
        '!!document.querySelector(".save-group") && !document.querySelector(".save-group").disabled',
      ),
    );
    await ui.executeJavaScript('document.querySelector(".save-group").click()');
    await until(async () => (await state()).config.groups.length === 1);
    const savedGroup = (await state()).config.groups[0];
    assert.deepEqual(savedGroup.layout.ratios, [0.25, 0.45, 0.3]);
    await until(() =>
      ui.executeJavaScript('!!document.querySelector(".dock-group")'),
    );
    assert.equal(
      await ui.executeJavaScript(
        'document.querySelector(".dock-group").querySelectorAll(".group-service").length',
      ),
      3,
    );
    await cmd({ type: "solo", id: "test-a" });
    assert.equal((await state()).config.count, 1);
    await ui.executeJavaScript('document.querySelector(".dock-group").click()');
    await until(async () => (await state()).config.count === 3);
    assert.deepEqual(
      (await state()).config.layouts[3].ratios,
      [0.25, 0.45, 0.3],
    );
    await cmd({ type: "deleteGroup", id: savedGroup.id });
    assert.equal((await state()).config.groups.length, 0);
    assert.equal(
      (await state()).config.services.some((s) => s.id === "test-a"),
      true,
    );
    pass("saved group dock frame, widths, single view and group deletion");

    for (const dockPosition of ["left", "right", "top", "bottom"]) {
      await cmd({
        type: "settings",
        settings: { ...(await state()).config.settings, dockPosition },
      });
      await until(() =>
        ui.executeJavaScript(
          `document.querySelector('.app').classList.contains('dock-${dockPosition}')`,
        ),
      );
      assert.equal(
        await ui.executeJavaScript(
          "Math.round(document.querySelector('.titlebar').getBoundingClientRect().width) === innerWidth",
        ),
        true,
      );
      const views = BaseWindow.getAllWindows()[0].contentView.children;
      const view = views.find((v) => v.webContents?.id === natives()[0].id);
      if (dockPosition === "left") assert.ok(view.getBounds().x >= 72);
      if (dockPosition === "top") assert.ok(view.getBounds().y >= 112);
      await cmd({ type: "overlay", visible: true });
      assert.equal(view.getVisible(), true);
      assert.equal(views.includes(view), true);
      assert.equal(
        await ui.executeJavaScript(
          "getComputedStyle(document.body).backgroundColor",
        ),
        "rgba(0, 0, 0, 0)",
      );
      await cmd({ type: "overlay", visible: false });
    }
    pass("four dock positions and live transparent overlays");
    await cmd({ type: "solo", id: "test-a" });
    const fixture =
      natives().find(
        (w) =>
          w.session === session.fromPartition("persist:multidock-fixture-a"),
      ) ?? natives()[0];
    await fixture.executeJavaScriptInIsolatedWorld(1001, [
      {
        code: `const originalAttach=Element.prototype.attachShadow;Element.prototype.attachShadow=function(options){const result=originalAttach.call(this,options);globalThis.pickerRoot=result;return result;};void 0`,
      },
    ]);
    const selecting = cmd({
      type: "service",
      id: "test-a",
      action: "hideElement",
    });
    await until(() =>
      fixture.executeJavaScriptInIsolatedWorld(1001, [
        { code: "!!globalThis.pickerRoot" },
      ]),
    );
    await fixture.executeJavaScript('document.querySelector("h1").click()');
    const picker = await fixture.executeJavaScriptInIsolatedWorld(1001, [
      {
        code: `({disabled:pickerRoot.querySelector('input').disabled,max:pickerRoot.querySelector('input').max})`,
      },
    ]);
    assert.equal(picker.disabled, false);
    assert.equal(picker.max, "1");
    await fixture.executeJavaScriptInIsolatedWorld(1001, [
      {
        code: `const slider=pickerRoot.querySelector('input');slider.value='1';slider.dispatchEvent(new Event('input'));void 0`,
      },
    ]);
    await fixture.executeJavaScriptInIsolatedWorld(1001, [
      { code: `pickerRoot.querySelector('button').click()` },
    ]);
    await selecting;
    assert.equal(
      (await state()).config.services.find((s) => s.id === "test-a")
        .hiddenElements.length,
      1,
    );
    assert.equal(
      await fixture.executeJavaScript(
        'getComputedStyle(document.querySelector("#fixture-header")).display',
      ),
      "none",
    );
    await fixture.reload();
    await until(() =>
      fixture.executeJavaScript('!!document.querySelector("h1")'),
    );
    await until(
      async () =>
        (await fixture.executeJavaScript(
          'getComputedStyle(document.querySelector("#fixture-header")).display',
        )) === "none",
    );
    await cmd({
      type: "saveService",
      service: {
        ...(await state()).config.services.find((s) => s.id === "test-a"),
        hiddenElements: [],
      },
    });
    assert.notEqual(
      await fixture.executeJavaScript(
        'getComputedStyle(document.querySelector("#fixture-header")).display',
      ),
      "none",
    );
    pass("element picker saves scoped rule and removal restores element");
    await cmd({
      type: "saveService",
      service: {
        ...(await state()).config.services.find((s) => s.id === "test-a"),
        hiddenElements: [
          {
            origin: new URL(url).origin,
            selector: "#fixture-header",
            enabled: true,
          },
        ],
      },
    });
    await fixture.executeJavaScriptInIsolatedWorld(1001, [
      {
        code: `const original=Element.prototype.attachShadow;Element.prototype.attachShadow=function(o){const r=original.call(this,o);globalThis.pickerRoot=r;return r};void 0`,
      },
    ]);
    const restoring = cmd({
      type: "service",
      id: "test-a",
      action: "hideElement",
    });
    await until(() =>
      fixture.executeJavaScriptInIsolatedWorld(1001, [
        { code: "!!globalThis.pickerRoot" },
      ]),
    );
    const movable = await fixture.executeJavaScriptInIsolatedWorld(1001, [
      {
        code: `(()=>{const h=pickerRoot.querySelector('.panel p');return typeof h.onpointerdown==='function'})()`,
      },
    ]);
    assert.equal(movable, true);
    await fixture.executeJavaScriptInIsolatedWorld(1001, [
      {
        code: `[...pickerRoot.querySelectorAll('button')].find(b=>b.textContent==='Wiederherstellen').click()`,
      },
    ]);
    await restoring;
    assert.equal(
      (await state()).config.services.find((s) => s.id === "test-a")
        .hiddenElements.length,
      0,
    );
    assert.notEqual(
      await fixture.executeJavaScript(
        'getComputedStyle(document.querySelector("#fixture-header")).display',
      ),
      "none",
    );
    pass("picker restore clears all rules and drag handle is available");

    const adapterScript = require(path.join(project, "node_modules/esbuild")).transformSync(fs.readFileSync(path.join(project, "src/main/spotify-adapter.ts"), "utf8"), { loader: "ts", format: "iife", globalName: "SpotifyTest" }).code;
    await fixture.executeJavaScript(`(()=>{const slider=document.createElement('input');slider.type='range';slider.min='0';slider.max='100';slider.value='80';slider.dataset.testid='volume-bar';slider.addEventListener('input',()=>document.body.dataset.volume=slider.value);document.body.append(slider)})()`);
    const volumeResult = await fixture.executeJavaScriptInIsolatedWorld(1002, [{code: adapterScript + ';SpotifyTest.spotifyAdapter("volume", 0.37)'}]);
    assert.equal(volumeResult, true);
    assert.equal(await fixture.executeJavaScript('document.body.dataset.volume'), '37');
    const volumeRead = await fixture.executeJavaScriptInIsolatedWorld(1002, [{code: 'SpotifyTest.spotifyAdapter()'}]);
    assert.equal(volumeRead.volume, 0.37);
    pass("Spotify volume adapter updates actual slider state across isolated worlds and reads it back");

    const captureWindow = new BrowserWindow({
      width: 400,
      height: 300,
      show: true,
      webPreferences: { sandbox: true, nodeIntegration: false },
    });
    await captureWindow.loadURL(
      'data:text/html,<title>IndigoDock Capture Fixture</title><body style="background:teal;color:white;font:24px sans-serif"><h1>Lokaler Capture-Test</h1><p id="counter"></p><script>setInterval(()=>document.querySelector("p").textContent=Date.now(),100)</script>',
    );
    const originalDialog = dialog.showMessageBox;
    dialog.showMessageBox = async (...args) => {
      const opts = args.at(-1);
      return {
        response:
          opts.title === "Bildschirm teilen"
            ? opts.buttons.indexOf("IndigoDock Capture Fixture")
            : 1,
        checkboxChecked: false,
      };
    };
    try {
      const capture = await fixture.executeJavaScript(
        `(async()=>{let stream,reader;try{stream=await navigator.mediaDevices.getDisplayMedia({video:true,audio:true});const track=stream.getVideoTracks()[0];const processor=new MediaStreamTrackProcessor({track});reader=processor.readable.getReader();const {value:frame}=await Promise.race([reader.read(),new Promise((_,reject)=>setTimeout(()=>reject(Error('No frame')),12000))]);const result={width:frame.displayWidth,height:frame.displayHeight,state:track.readyState};frame.close();return result;}catch(e){return {error:e.name+': '+e.message}}finally{reader?.cancel();stream?.getTracks().forEach(t=>t.stop())}})()`,
        true,
      );
      assert.ok(capture.width > 0, JSON.stringify(capture));
      assert.equal(capture.state, "live");
      pass(
        "display capture selects local app window and receives real video frames",
      );
    } finally {
      dialog.showMessageBox = originalDialog;
      captureWindow.destroy();
    }

    const beforeWidgets = natives().length;
    const beforeCount = (await state()).config.count;
    assert.ok((await state()).catalog.every((s) => s.kind === "web"));
    await cmd({ type: "sidebar", patch: { open: true } });
    await until(() =>
      ui.executeJavaScript('!!document.querySelector(".widget-board")'),
    );
    assert.equal(natives().length, beforeWidgets);
    assert.equal((await state()).config.count, beforeCount);
    assert.equal(
      await ui.executeJavaScript(
        'document.querySelectorAll(".widget-card").length',
      ),
      5,
    );
    assert.equal(
      await ui.executeJavaScript(
        'document.querySelectorAll(".widget-card h3, .widget-board h2").length',
      ),
      0,
    );
    await cmd({
      type: "sidebar",
      patch: {
        widgets: ["mixer", "clock", "spotify", "performance", "notes"],
        background: "#203040",
        notes: "Notizen mit Umlauten: äöü\nZweite Zeile",
      },
    });
    assert.equal((await state()).config.sidebar.widgets[0], "mixer");
    for (const dockPosition of ["left", "right", "top", "bottom"]) {
      await cmd({
        type: "settings",
        settings: { ...(await state()).config.settings, dockPosition },
      });
      await wait(100);
      const edges = await ui.executeJavaScript(
        `(()=>{const side=document.querySelector('.widget-sidebar').getBoundingClientRect();return {left:side.left,top:side.top,bottom:side.bottom,columns:[...document.querySelectorAll('.column')].map(c=>c.getBoundingClientRect().right)}})()`,
      );
      assert.ok(edges.columns.every((right) => right <= edges.left));
    }
    await cmd({ type: "sidebar", patch: { open: false } });
    await cmd({ type: "sidebar", patch: { open: true } });
    await until(() =>
      ui.executeJavaScript('!!document.querySelector(".notes-widget")'),
    );
    assert.equal(
      await ui.executeJavaScript(
        'document.querySelector(".notes-widget").value',
      ),
      "Notizen mit Umlauten: äöü\nZweite Zeile",
    );
    pass(
      "persistent sidebar excludes native views for all dock positions; five widgets, notes, palette and ordering",
    );
    const metrics = await ui.executeJavaScript("window.multidock.widgets()");
    assert.ok(metrics.cpu >= 0 && metrics.cpu <= 100);
    assert.equal(metrics.mixerError, undefined, metrics.mixerError);
    assert.ok(metrics.mixer.every((s) => !s.name.includes("�")));
    if (metrics.mixer.length)
      await cmd({
        type: "mixerVolume",
        pid: metrics.mixer[0].pid,
        value: metrics.mixer[0].volume,
      });
    fs.writeFileSync(
      path.join(results, "widget-metrics.json"),
      JSON.stringify({
        cpu: metrics.cpu,
        gpu: metrics.gpu,
        gpuName: metrics.gpuName,
        mixerSessions: metrics.mixer.length,
      }),
    );
    pass("native mixer reads and writes UTF-8, GPU and CPU metrics");
    await cmd({ type: "layout", count: 3 });
    await cmd({ type: "overlay", visible: true });
    await wait(100);
    try {
      fs.writeFileSync(
        path.join(results, "three-columns.png"),
        (await ui.capturePage()).toPNG(),
      );
    } catch {}
    await cmd({ type: "overlay", visible: false });
    await cmd({
      type: "settings",
      settings: { ...(await state()).config.settings, closeToTray: false },
    });
    fs.writeFileSync(
      stageFile,
      JSON.stringify(
        {
          phase: 2,
          port: server.address().port,
          profile: process.env.MULTIDOCK_TEST_DATA,
          checks,
        },
        null,
        2,
      ),
    );
    app.quit();
  } catch (e) {
    fs.writeFileSync(
      path.join(results, "desktop-failure.txt"),
      String(e.stack ?? e),
    );
    app.exit(1);
  } finally {
    server.close();
  }
});
