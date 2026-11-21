import { translate } from "../shared/i18n";
import { appPrompt } from "./prompt";
import { Weather } from "./weather";
import { sessionProfile, newInstance } from "../shared/profiles";
import { selectApps, createEmptyGroup, fillGroupSlot } from "../shared/groups";
import { Widgets } from "./widgets";
import { Catalog } from "./catalog";
import {
  app,
  BaseWindow,
  WebContentsView,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
  screen,
  shell,
  dialog,
  session,
  components,
  powerMonitor,
} from "electron";
import path from "node:path";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { Store } from "./persistence";
import { ViewManager } from "./views";
import { commandSchema, type Snapshot } from "../shared/model";
import { assign, changeLayout, emptyLayout } from "../shared/layout";
import { safeIcon, validUrl } from "../shared/security";
import { persistentDataPath } from "./data-path";
import { UpdateManager } from "./updates";
import {
  saveGroup,
  activateGroup,
  deleteGroup,
  groupIds,
} from "../shared/groups";
import { randomUUID } from "node:crypto";
app.setName("IndigoDock");
app.setPath(
  "userData",
  persistentDataPath(app.getPath("appData"), process.env.MULTIDOCK_TEST_DATA),
);
app.setAppUserModelId("de.multidock.desktop");
let win: BaseWindow,
  ui: WebContentsView,
  views: ViewManager,
  store: Store,
  tray: Tray,
  quitting = false;
let updates: UpdateManager;
let catalog: Catalog;
let widgets: Widgets;
const uiURL = pathToFileURL(path.join(__dirname, "ui/index.html")).href;
function snapshot(): Snapshot {
  return {
    config: store.config,
    catalog: catalog?.services,
    catalogError: catalog?.error,
    status: views.status,
    version: app.getVersion(),
    update: updates?.state,
    ...{ captures: views.captures, persistenceError: store.error },
  };
}
let notifyTimer: ReturnType<typeof setTimeout> | undefined;
function changed() {
  store.schedule();
  clearTimeout(notifyTimer);
  notifyTimer = setTimeout(() => {
    if (!quitting && ui?.webContents && !ui.webContents.isDestroyed())
      ui.webContents.send("state", snapshot());
  }, 25);
}
function log(message: string) {
  const file = path.join(app.getPath("userData"), "diagnostics.log");
  try {
    if (fs.existsSync(file) && fs.statSync(file).size > 1024 * 1024)
      fs.renameSync(file, file + ".old");
    fs.appendFileSync(file, `${new Date().toISOString()} ${message}\n`);
  } catch {}
}
function trusted(e: Electron.IpcMainInvokeEvent) {
  if (
    e.sender !== ui.webContents ||
    e.senderFrame !== ui.webContents.mainFrame ||
    e.senderFrame.url !== uiURL
  )
    throw Error("Unauthorized IPC sender");
}
function layout() {
  const b = win.getContentBounds();
  ui.setBounds({ x: 0, y: 0, width: b.width, height: b.height });
  views.layout();
}
function saveWindow() {
  if (!win.isDestroyed() && !win.isMinimized()) {
    const b = win.getNormalBounds();
    store.config.window = { ...b, maximized: win.isMaximized() };
    store.schedule();
  }
}
async function main() {
  store = new Store(app.getPath("userData"));
  updates = new UpdateManager(changed, () => {
    quitting = true;
    store.flush();
  });
  const c = store.config;
  if (!c.settings.restoreSession) {
    c.count = c.settings.defaultColumns;
    c.layouts[c.count] = emptyLayout(c.count);
  }
  if (!c.settings.saveWidths)
    for (const l of Object.values(c.layouts))
      l.ratios = l.ratios.map(() => 1 / l.ratios.length);
  const saved = c.settings.restoreWindow
    ? c.window
    : {
        width: 1440,
        height: 900,
        maximized: false,
        x: undefined,
        y: undefined,
      };
  const area =
    screen
      .getAllDisplays()
      .find(
        (d) =>
          saved.x !== undefined &&
          saved.y !== undefined &&
          saved.x < d.workArea.x + d.workArea.width &&
          saved.x + saved.width > d.workArea.x &&
          saved.y < d.workArea.y + d.workArea.height &&
          saved.y + saved.height > d.workArea.y,
      )?.workArea ?? screen.getPrimaryDisplay().workArea;
  const width = Math.min(saved.width, area.width),
    height = Math.min(saved.height, area.height);
  win = new BaseWindow({
    width,
    height,
    x:
      saved.x === undefined
        ? undefined
        : Math.max(area.x, Math.min(saved.x, area.x + area.width - width)),
    y:
      saved.y === undefined
        ? undefined
        : Math.max(area.y, Math.min(saved.y, area.y + area.height - height)),
    minWidth: 640,
    minHeight: 400,
    frame: false,
    show: false,
    backgroundColor: "#111316",
    title: "IndigoDock",
    icon: path.join(__dirname, "assets/icon.png"),
  });
  ui = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });
  ui.setBackgroundColor("#00000000");
  win.contentView.addChildView(ui);
  ui.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  ui.webContents.on("will-navigate", (e) => e.preventDefault());
  views = new ViewManager(win, () => store.config, changed, log, ui);
  widgets = new Widgets(views);
  const weather = new Weather();
  ipcMain.handle("weatherSearch", (e, q) => {
    trusted(e);
    return weather.search(q);
  });
  ipcMain.handle("weather", (e) => {
    trusted(e);
    return weather.read(store.config.sidebar.weatherLocation);
  });
  ipcMain.handle("widgets", (e) => {
    trusted(e);
    return widgets.read();
  });
  catalog = new Catalog(store.dir);
  ipcMain.handle("snapshot", (e) => {
    trusted(e);
    return snapshot();
  });
  ipcMain.handle("command", async (e, raw) => {
    trusted(e);
    const cmd = commandSchema.parse(raw),
      c = store.config;
    switch (cmd.type) {
      case "spotifyControl":
        await widgets.control(cmd.action, cmd.value);
        break;
      case "mixerVolume":
        await widgets.volume(cmd.pid, cmd.value);
        break;
      case "addKnown": {
        catalog.reload();
        const template = catalog.services.find((s) => s.id === cmd.id);
        if (!template) throw Error("Service not found in catalog.");
        if (c.services.length >= 100) throw Error("A maximum of 100 services is supported.");
        c.services.push(newInstance(template, randomUUID(), c.services));
        break;
      }
      case "catalog":
        catalog.reload();
        if (cmd.action === "open") await shell.openPath(catalog.file);
        break;
      case "sidebar":
        Object.assign(c.sidebar, cmd.patch);
        c.sidebar.widgets = [...new Set(c.sidebar.widgets)];
        break;

      case "selectApps": {
        const ids = [...new Set(cmd.ids)];
        for (const id of ids) {
          const s = c.services.find((s) => s.id === id);
          if (!s || !validUrl(s.url, s.allowHttp))
            throw Error("The service has no valid URL.");
        }
        selectApps(c, ids);
        for (const id of ids) {
          const s = c.services.find((s) => s.id === id)!;
          if (!s.running) views.start(s);
        }
        break;
      }
      case "createGroup":
        createEmptyGroup(c, randomUUID(), cmd.count);
        break;
      case "groupSlot": {
        const s = c.services.find((s) => s.id === cmd.id);
        if (!s || !validUrl(s.url, s.allowHttp))
          throw Error("The service has no valid URL.");
        fillGroupSlot(c, cmd.group, cmd.column, cmd.id);
        if (!s.running) views.start(s);
        break;
      }
      case "groupIcon": {
        const group = c.groups.find((g) => g.id === cmd.id);
        if (!group) throw Error("Group not found");
        group.icon = cmd.icon;
        break;
      }
      case "infoLink": {
        const links = {
          weather: "https://open-meteo.com/",
          weatherLicense: "https://creativecommons.org/licenses/by/4.0/",
          icons: "https://lucide.dev/license",
        };
        await shell.openExternal(links[cmd.page]);
        break;
      }
      case "saveGroup":
        saveGroup(c, randomUUID());
        break;
      case "activateGroup": {
        const members = c.groups.find((g) => g.id === cmd.id);
        if (!members) throw Error("Group not found");
        for (const id of groupIds(members.layout)) {
          const s = c.services.find((s) => s.id === id);
          if (!s || (s.kind !== "widgets" && !validUrl(s.url, s.allowHttp)))
            throw Error("A service in this group has no valid URL.");
        }
        for (const id of activateGroup(c, cmd.id)) {
          const s = c.services.find((s) => s.id === id)!;
          if (!s.running) views.start(s);
        }
        break;
      }
      case "deleteGroup":
        deleteGroup(c, cmd.id);
        break;
      case "solo": {
        const s = c.services.find((s) => s.id === cmd.id);
        if (!s) throw Error("Service not found");
        if (!s.running) views.start(s);
        c.count = 1;
        c.layouts[1] = {
          ratios: [1],
          columns: [{ services: [s.id], active: s.id }],
        };
        c.activeGroup = null;
        break;
      }
      case "layout":
        c.activeGroup = null;
        changeLayout(c, cmd.count);
        break;
      case "ratios":
        if (cmd.ratios.length !== c.count) throw Error("Invalid widths");
        {
          const total = cmd.ratios.reduce((a, b) => a + b, 0);
          c.layouts[c.count].ratios = cmd.ratios.map((x) => x / total);
        }
        break;
      case "assign": {
        const s = c.services.find((s) => s.id === cmd.id);
        if (!s) throw Error("Service not found");
        if (!c.layouts[c.count].columns[cmd.column])
          throw Error("Invalid column");
        if (cmd.startIfStopped && !s.running) views.start(s);
        assign(c.layouts[c.count], s.id, cmd.column);
        break;
      }
      case "overlay":
        await views.setOverlay(cmd.visible);
        break;
      case "saveService": {
        const s = cmd.service;
        if (s.url && !validUrl(s.url, s.allowHttp))
          throw Error(
            "Use HTTPS or explicitly allowed HTTP, without credentials in the URL.",
          );
        if (!safeIcon(s.icon))
          throw Error("Invalid icon. Use PNG, JPEG or WebP.");
        const old = c.services.find((x) => x.id === s.id);
        if (
          old &&
          old.globalAccess !== s.globalAccess &&
          views.views.has(old.id)
        ) {
          await views.stop(old);
        }
        if (
          old &&
          (sessionProfile(old) !== sessionProfile(s) || old.url !== s.url) &&
          views.views.has(old.id)
        )
          throw Error("Stop the service before changing its URL or profile.");
        if (!old && c.services.length >= 100)
          throw Error("A maximum of 100 services is supported.");
        // Current URL is trusted only from the existing native view, never from renderer edits.
        s.currentUrl =
          old && old.url === s.url && sessionProfile(old) === sessionProfile(s)
            ? old.currentUrl
            : "";
        if (old) Object.assign(old, s);
        else c.services.push(s);
        if (s.running && !views.views.has(s.id)) views.start(old ?? s);
        else if (!s.running && views.views.has(s.id)) await views.stop(s);
        const v = views.views.get(s.id);
        v?.webContents.setAudioMuted(s.muted);
        v?.webContents.setZoomFactor(s.zoom);
        await views.applyHidden(old ?? s);
        break;
      }
      case "service": {
        const s = c.services.find((s) => s.id === cmd.id);
        if (!s) throw Error("Service not found");
        const wc = views.views.get(s.id)?.webContents;
        if (cmd.action === "hideElement") {
          if (!s.running) throw Error("Start the service first.");
          if (!c.layouts[c.count].columns.some((col) => col.active === s.id)) {
            c.count = 1;
            c.layouts[1] = {
              ratios: [1],
              columns: [{ services: [s.id], active: s.id }],
            };
            c.activeGroup = null;
          }
          views.layout();
          changed();
          await views.pickElement(s);
        }
        if (cmd.action === "start") views.start(s);
        if (cmd.action === "stop") await views.stop(s);
        if (cmd.action === "reload" && wc) wc.reload();
        if (cmd.action === "reset") {
          s.currentUrl = "";
          if (wc) void wc.loadURL(s.url).catch(() => {});
        }
        if (cmd.action === "mute") {
          s.muted = !s.muted;
          wc?.setAudioMuted(s.muted);
        }
        if (cmd.action === "external")
          await views.external(s.currentUrl || s.url);
        if (cmd.action === "remove") {
          const r = await appPrompt(win, c, {
            type: "question",
            message: `Remove ${s.name}?`,
            detail: "The session profile will be preserved.",
            buttons: ["Cancel", "Remove"],
            cancelId: 0,
          });
          if (r.response !== 1) break;
          await views.stop(s);
          c.services = c.services.filter((x) => x.id !== s.id);
          for (const g of [...c.groups])
            if (groupIds(g.layout).includes(s.id)) deleteGroup(c, g.id);
          for (const l of Object.values(c.layouts))
            for (const col of l.columns) {
              col.services = col.services.filter((id) => id !== s.id);
              if (col.active === s.id) col.active = col.services[0] ?? null;
            }
        }
        if (cmd.action === "clearProfile") {
          const group = c.services.filter(
            (x) => sessionProfile(x) === sessionProfile(s),
          );
          const r = await appPrompt(win, c, {
            type: "warning",
            message: `Clear profile “${s.profile}” and sign out?`,
            detail: `Affected: ${group.map((s) => s.name).join(", ")}. These services will be stopped.`,
            buttons: ["Cancel", "Clear profile data"],
            defaultId: 0,
            cancelId: 0,
          });
          if (r.response !== 1) break;
          for (const s of group) {
            await views.stop(s);
            s.currentUrl = "";
          }
          const ses = session.fromPartition(
            "persist:multidock-" + sessionProfile(s),
          );
          await ses.clearStorageData();
          await ses.clearCache();
          await ses.clearAuthCache();
          await ses.closeAllConnections();
        }
        break;
      }
      case "reorder":
        if (
          cmd.ids.length !== c.services.length ||
          new Set(cmd.ids).size !== c.services.length ||
          cmd.ids.some((id) => !c.services.some((s) => s.id === id))
        )
          throw Error("Invalid order");
        c.services = cmd.ids.map((id) => c.services.find((s) => s.id === id)!);
        break;
      case "settings":
        if (app.isPackaged)
          app.setLoginItemSettings({
            openAtLogin: cmd.settings.autostart,
            args: cmd.settings.startMinimized ? ["--minimized"] : [],
          });
        c.settings = cmd.settings;
        break;
      case "window":
        if (cmd.action === "minimize") win.minimize();
        if (cmd.action === "maximize")
          win.isMaximized() ? win.unmaximize() : win.maximize();
        if (cmd.action === "close") win.close();
        if (cmd.action === "quit") {
          quitting = true;
          app.quit();
        }
        break;
      case "diagnostics":
        if (cmd.action === "logs") {
          log("Diagnostics opened");
          await shell.openPath(
            path.join(app.getPath("userData"), "diagnostics.log"),
          );
        } else await shell.openPath(app.getPath("userData"));
        break;
      case "update":
        await updates.command(cmd.action);
        break;
      case "resetLayout":
        c.layouts = { [c.count]: emptyLayout(c.count) };
        break;
    }
    if ((cmd.type === "ratios" || cmd.type === "assign") && c.activeGroup) {
      const g = c.groups.find((g) => g.id === c.activeGroup);
      if (g) g.layout = structuredClone(c.layouts[c.count]);
    }
    if (!win.isDestroyed()) layout();
    changed();
  });
  // Windows can restore a stale compositor surface without issuing resize.
  let restoreTimer: ReturnType<typeof setTimeout> | undefined;
  const refresh = () => {
    if (quitting || win.isDestroyed() || win.isMinimized()) return;
    layout();
    views.repaint();
    clearTimeout(restoreTimer);
    restoreTimer = setTimeout(() => {
      if (!quitting && !win.isDestroyed() && !win.isMinimized()) {
        layout();
        views.repaint();
      }
    }, 160);
  };
  win.on("show", refresh);
  win.on("restore", refresh);
  win.on("focus", refresh);
  win.on("unmaximize", refresh);
  const checkpoint = () => {
    if (!quitting) void views.checkpoint();
  };
  const checkpointTimer = setInterval(checkpoint, 30000);
  checkpointTimer.unref();
  win.on("blur", checkpoint);
  win.on("hide", checkpoint);
  powerMonitor.on("suspend", checkpoint);
  powerMonitor.on("resume", refresh);
  powerMonitor.on("unlock-screen", refresh);
  win.once("closed", () => {
    clearInterval(checkpointTimer);
    clearTimeout(restoreTimer);
    powerMonitor.removeListener("suspend", checkpoint);
    powerMonitor.removeListener("resume", refresh);
    powerMonitor.removeListener("unlock-screen", refresh);
  });
  win.on("resize", layout);
  win.on("resized", saveWindow);
  win.on("moved", saveWindow);
  win.on("maximize", saveWindow);
  win.on("unmaximize", saveWindow);
  win.on("minimize", () => {
    if (c.settings.minimizeToTray) win.hide();
  });
  win.on("close", (e) => {
    saveWindow();
    if (!quitting && store.config.settings.closeToTray) {
      e.preventDefault();
      win.hide();
    } else if (!quitting) {
      e.preventDefault();
      app.quit();
    }
  });
  win.on("closed", () => {
    views.close();
    ui.webContents.close();
  });
  tray = new Tray(
    nativeImage.createFromPath(path.join(__dirname, "assets/icon.png")),
  );
  tray.setToolTip("IndigoDock");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: translate("Open IndigoDock", c.settings.language),
        click: () => {
          win.show();
          win.focus();
        },
      },
      { type: "separator" },
      {
        label: translate("Quit", c.settings.language),
        click: () => {
          quitting = true;
          app.quit();
        },
      },
    ]),
  );
  tray.on("double-click", () => {
    win.show();
    win.focus();
  });
  await ui.webContents.loadURL(uiURL);
  layout();
  if (saved.maximized) win.maximize();
  if (!process.argv.includes("--minimized") && !c.settings.startMinimized)
    win.show();
  for (const s of c.services) {
    if (s.running) {
      try {
        views.start(s);
      } catch {
        views.status[s.id] = { state: "error", error: "Check the service URL." };
      }
      await new Promise((r) => setTimeout(r, 120));
    }
  }
  changed();
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => {
    win?.show();
    if (win?.isMinimized()) win.restore();
    win?.focus();
  });
  app
    .whenReady()
    .then(async () => {
      if (!process.env.MULTIDOCK_TEST_DATA) {
        try {
          await components.whenReady();
        } catch {
          log("Could not load Widevine components.");
        }
      }
      await main();
    })
    .catch((e) => {
      dialog.showErrorBox("IndigoDock could not start", String(e));
      app.exit(1);
    });
  let sessionsSaved = false;
  let savingSessions = false;
  app.on("before-quit", (event) => {
    quitting = true;
    clearTimeout(notifyTimer);
    if (store && !sessionsSaved) {
      event.preventDefault();
      if (savingSessions) return;
      savingSessions = true;
      const profiles = [
        ...new Set(store.config.services.map((s) => sessionProfile(s))),
      ];
      void views
        .close()
        .then(() =>
          Promise.allSettled(
            profiles.map(async (profile) => {
              const ses = session.fromPartition("persist:multidock-" + profile);
              ses.flushStorageData();
              await ses.cookies.flushStore();
            }),
          ),
        )
        .then((results) => {
          if (results.some((r) => r.status === "rejected"))
            log(
              "Could not fully save session data while quitting.",
            );
          sessionsSaved = true;
          app.quit();
        });
      return;
    }
    if (store) {
      saveWindow();
      try {
        store.flush();
      } catch {
        log("Could not save configuration while quitting.");
      }
    }
  });
  app.on("window-all-closed", () => app.quit());
}
