import {
  BaseWindow,
  WebContentsView,
  shell,
  dialog,
  type WebContents,
} from "electron";
import { bounds } from "../shared/layout";
import type { Config, Service, Status } from "../shared/model";
import { validUrl, origin, restoreUrl } from "../shared/security";
import { PermissionManager } from "./permissions";
import { MediaController } from "./media";
import { serviceUserAgent, serviceStartUrl } from "../shared/compatibility";
export class ViewManager {
  views = new Map<string, WebContentsView>();
  status: Record<string, Status> = {};
  overlay = false;
  captures: Record<string, string> = {};
  permissions: PermissionManager;
  media = new MediaController();
  focusId: string | null = null;
  constructor(
    private window: BaseWindow,
    private config: () => Config,
    private changed: () => void,
    private log: (s: string) => void,
  ) {
    this.permissions = new PermissionManager(
      config,
      (wc) => this.serviceFor(wc),
      changed,
      window,
    );
  }
  serviceFor(wc: WebContents) {
    for (const [id, v] of this.views)
      if (v.webContents === wc)
        return this.config().services.find((s) => s.id === id);
  }
  async external(url: string) {
    if (!validUrl(url, true)) return;
    const r = await dialog.showMessageBox(this.window, {
      type: "question",
      title: "Link extern öffnen",
      message: `Im Standardbrowser öffnen?`,
      detail: origin(url),
      buttons: ["Abbrechen", "Öffnen"],
      defaultId: 0,
      cancelId: 0,
    });
    if (r.response === 1) await shell.openExternal(url);
  }
  start(s: Service) {
    if (this.views.has(s.id)) return;
    if (!validUrl(s.url, s.allowHttp))
      throw Error("Bitte zuerst eine gültige Dienst-URL konfigurieren.");
    const v = new WebContentsView({
      webPreferences: {
        session: this.permissions.get(s.profile),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
        backgroundThrottling: false,
        spellcheck: true,
      },
    });
    this.views.set(s.id, v);
    this.window.contentView.addChildView(v);
    v.setVisible(false);
    v.setBackgroundColor("#191c21");
    const wc = v.webContents;
    const originalAgent = wc.getUserAgent();
    const setAgent = (url: string) =>
      wc.setUserAgent(serviceUserAgent(originalAgent, url));
    wc.setAudioMuted(s.muted);
    wc.setZoomFactor(s.zoom);
    s.running = true;
    this.status[s.id] = { state: "loading" };
    const status = (state: Status["state"], error?: string) => {
      this.status[s.id] = { state, error, audible: wc.isCurrentlyAudible() };
      this.layout();
      this.changed();
    };
    wc.on("did-start-loading", () => status("loading"));
    wc.on("did-stop-loading", () => {
      if (this.status[s.id]?.state !== "error") status("ready");
    });
    wc.on("did-fail-load", (_e, code, _description, _url, main) => {
      if (main && code !== -3) {
        status(
          "error",
          `Netzwerkfehler ${code}. Verbindung prüfen und erneut laden.`,
        );
        this.log(`${s.id}: load ${code}`);
      }
    });
    wc.on("render-process-gone", (_e, details) => {
      status(
        "error",
        `Dienstprozess beendet: ${details.reason}. Bitte neu laden.`,
      );
      this.log(`${s.id}: renderer ${details.reason}`);
    });
    wc.on("did-navigate", (_e, url) => {
      if (validUrl(url, s.allowHttp)) {
        s.currentUrl = restoreUrl(url);
        this.changed();
      }
    });
    wc.on("did-navigate-in-page", (_e, url, main) => {
      if (main && validUrl(url, s.allowHttp)) {
        s.currentUrl = restoreUrl(url);
        this.changed();
      }
    });
    const navigate = (event: Electron.Event, url: string) => {
      setAgent(url);
      if (!validUrl(url, s.allowHttp)) {
        event.preventDefault();
        return;
      }
      // HTTPS redirects are necessary for identity providers. HTTP never expands beyond configured origin.
      if (new URL(url).protocol === "http:" && origin(url) !== origin(s.url)) {
        event.preventDefault();
        void this.external(url);
      }
    };
    wc.on("will-navigate", navigate);
    wc.on("will-redirect", navigate);
    wc.setWindowOpenHandler(({ url }) => {
      void this.external(url);
      return { action: "deny" };
    });
    wc.on("focus", () => {
      this.focusId = s.id;
      this.media.focus(s.id);
    });
    wc.on("before-input-event", (e, input) => {
      if (
        input.type !== "keyDown" ||
        !input.control ||
        input.alt ||
        input.shift
      )
        return;
      if (input.key.toLowerCase() === "r") {
        e.preventDefault();
        wc.reload();
      }
      if (["+", "=", "-", "0"].includes(input.key)) {
        e.preventDefault();
        s.zoom =
          input.key === "0"
            ? 1
            : Math.max(
                0.5,
                Math.min(2, s.zoom + (input.key === "-" ? -0.1 : 0.1)),
              );
        wc.setZoomFactor(s.zoom);
        this.changed();
      }
    });
    this.media.attach(s.id, wc, () => {
      if (this.status[s.id])
        this.status[s.id].audible = wc.isCurrentlyAudible();
      this.changed();
    });
    const target = serviceStartUrl(
      s.url,
      validUrl(s.currentUrl, s.allowHttp) ? s.currentUrl : s.url,
    );
    setAgent(target);
    void wc.loadURL(target).catch(() => {});
    this.layout();
    this.changed();
  }
  stop(s: Service) {
    const v = this.views.get(s.id);
    if (v) {
      v.webContents.session.flushStorageData();
      void v.webContents.session.cookies
        .flushStore()
        .catch(() =>
          this.log(
            "Session konnte beim Stoppen nicht vollständig geschrieben werden.",
          ),
        );
      this.window.contentView.removeChildView(v);
      this.views.delete(s.id);
      v.webContents.close({ waitForBeforeUnload: false });
    }
    s.running = false;
    this.status[s.id] = { state: "stopped" };
    this.changed();
  }
  layout() {
    const c = this.config(),
      b = this.window.getContentBounds(),
      rects = bounds(
        b.width,
        b.height,
        c.layouts[c.count].ratios,
        c.settings.showColumnTabs,
      );
    const visible = new Set<string>();
    c.layouts[c.count].columns.forEach((col, i) => {
      if (!col.active) return;
      const v = this.views.get(col.active);
      if (v) {
        v.setBounds(rects[i]);
        visible.add(col.active);
      }
    });
    for (const [id, v] of this.views)
      v.setVisible(
        !this.overlay && visible.has(id) && this.status[id]?.state !== "error",
      );
  }
  async setOverlay(visible: boolean) {
    if (visible && !this.overlay) {
      this.captures = {};
      await Promise.all(
        this.config().layouts[this.config().count].columns.map(async (c) => {
          const v = c.active ? this.views.get(c.active) : undefined;
          if (v && c.active) {
            try {
              this.captures[c.active] = (
                await v.webContents.capturePage()
              ).toDataURL();
            } catch {}
          }
        }),
      );
    }
    this.overlay = visible;
    if (!visible) this.captures = {};
    this.layout();
  }
  close() {
    for (const v of this.views.values())
      v.webContents.close({ waitForBeforeUnload: false });
    this.views.clear();
  }
}

