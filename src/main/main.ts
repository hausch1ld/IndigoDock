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
const uiURL = pathToFileURL(path.join(__dirname, "ui/index.html")).href;
function snapshot(): Snapshot {
  return {
    config: store.config,
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
    if (!quitting && ui?.webContents && !ui.webContents.isDestroyed()) ui.webContents.send("state", snapshot());
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
    throw Error("Nicht autorisierter IPC-Absender");
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
  win.contentView.addChildView(ui);
  ui.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  ui.webContents.on("will-navigate", (e) => e.preventDefault());
  views = new ViewManager(win, () => store.config, changed, log);
  ipcMain.handle("snapshot", (e) => {
    trusted(e);
    return snapshot();
  });
  ipcMain.handle("command", async (e, raw) => {
    trusted(e);
    const cmd = commandSchema.parse(raw),
      c = store.config;
    switch (cmd.type) {
      case "layout":
        changeLayout(c, cmd.count);
        break;
      case "ratios":
        if (cmd.ratios.length !== c.count) throw Error("Ungültige Breiten");
        {
          const total = cmd.ratios.reduce((a, b) => a + b, 0);
          c.layouts[c.count].ratios = cmd.ratios.map((x) => x / total);
        }
        break;
      case "assign": {
        const s = c.services.find((s) => s.id === cmd.id);
        if (!s) throw Error("Dienst fehlt");
        if (!c.layouts[c.count].columns[cmd.column])
          throw Error("Ungültige Spalte");
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
            "Nur HTTPS oder ausdrücklich erlaubtes HTTP, ohne Zugangsdaten in der URL.",
          );
        if (!safeIcon(s.icon))
          throw Error("Ungültiges Icon. PNG, JPEG oder WebP verwenden.");
        const old = c.services.find((x) => x.id === s.id);
        if (
          old &&
          (old.profile !== s.profile || old.url !== s.url) &&
          views.views.has(old.id)
        )
          throw Error("Dienst vor URL- oder Profilwechsel stoppen.");
        if (!old && c.services.length >= 100)
          throw Error("Maximal 100 Dienste.");
        // Current URL is trusted only from the existing native view, never from renderer edits.
        s.currentUrl =
          old && old.url === s.url && old.profile === s.profile
            ? old.currentUrl
            : "";
        if (old) Object.assign(old, s);
        else c.services.push(s);
        if (s.running && !views.views.has(s.id)) views.start(old ?? s);
        else if (!s.running && views.views.has(s.id)) views.stop(s);
        const v = views.views.get(s.id);
        v?.webContents.setAudioMuted(s.muted);
        v?.webContents.setZoomFactor(s.zoom);
        break;
      }
      case "service": {
        const s = c.services.find((s) => s.id === cmd.id);
        if (!s) throw Error("Dienst fehlt");
        const wc = views.views.get(s.id)?.webContents;
        if (cmd.action === "start") views.start(s);
        if (cmd.action === "stop") views.stop(s);
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
          const r = await dialog.showMessageBox(win, {
            type: "question",
            message: `${s.name} entfernen?`,
            detail: "Das Session-Profil bleibt gespeichert.",
            buttons: ["Abbrechen", "Entfernen"],
            cancelId: 0,
          });
          if (r.response !== 1) break;
          views.stop(s);
          c.services = c.services.filter((x) => x.id !== s.id);
          for (const l of Object.values(c.layouts))
            for (const col of l.columns) {
              col.services = col.services.filter((id) => id !== s.id);
              if (col.active === s.id) col.active = col.services[0] ?? null;
            }
        }
        if (cmd.action === "clearProfile") {
          const group = c.services.filter((x) => x.profile === s.profile);
          const r = await dialog.showMessageBox(win, {
            type: "warning",
            message: `Profil „${s.profile}“ löschen und abmelden?`,
            detail: `Betroffen: ${group.map((s) => s.name).join(", ")}. Die Dienste werden gestoppt.`,
            buttons: ["Abbrechen", "Profildaten löschen"],
            defaultId: 0,
            cancelId: 0,
          });
          if (r.response !== 1) break;
          group.forEach((s) => {
            views.stop(s);
            s.currentUrl = "";
          });
          const ses = session.fromPartition("persist:multidock-" + s.profile);
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
          throw Error("Ungültige Reihenfolge");
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
          log("Diagnose geöffnet");
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
    if (!win.isDestroyed()) layout();
    changed();
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
        label: "IndigoDock öffnen",
        click: () => {
          win.show();
          win.focus();
        },
      },
      { type: "separator" },
      {
        label: "Beenden",
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
        views.status[s.id] = { state: "error", error: "Dienst-URL prüfen." };
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
    .then(main)
    .catch((e) => {
      dialog.showErrorBox("IndigoDock konnte nicht starten", String(e));
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
        ...new Set(store.config.services.map((s) => s.profile)),
      ];
      void Promise.allSettled(
        profiles.map(async (profile) => {
          const ses = session.fromPartition("persist:multidock-" + profile);
          ses.flushStorageData();
          await ses.cookies.flushStore();
        }),
      ).then((results) => {
        if (results.some((r) => r.status === "rejected"))
          log(
            "Session konnte beim Beenden nicht vollständig geschrieben werden.",
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
        log("Konfiguration konnte beim Beenden nicht gespeichert werden.");
      }
    }
  });
  app.on("window-all-closed", () => app.quit());
}

