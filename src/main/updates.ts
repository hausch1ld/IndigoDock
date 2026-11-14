import { app } from "electron";
import { autoUpdater } from "electron-updater";
import type { Snapshot } from "../shared/model";
export class UpdateManager {
  state: NonNullable<Snapshot["update"]> = {
    state: "idle",
    message: "Updates werden nur auf Anfrage geprüft.",
  };
  constructor(
    private changed: () => void,
    private beforeInstall: () => void,
  ) {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.allowDowngrade = false;
    autoUpdater.setFeedURL({
      provider: "github",
      owner: "hausch1ld",
      repo: "IndigoDock",
    });
    autoUpdater.on("checking-for-update", () =>
      this.set({
        state: "checking",
        message: "GitHub Releases werden geprüft …",
      }),
    );
    autoUpdater.on("update-available", (info) =>
      this.set({
        state: "available",
        version: info.version,
        message: `Version ${info.version} ist verfügbar.`,
      }),
    );
    autoUpdater.on("update-not-available", () =>
      this.set({
        state: "current",
        message: `IndigoDock ${app.getVersion()} ist aktuell.`,
      }),
    );
    autoUpdater.on("download-progress", (p) =>
      this.set({
        state: "downloading",
        percent: p.percent,
        message: `Update wird heruntergeladen: ${Math.round(p.percent)} %`,
      }),
    );
    autoUpdater.on("update-downloaded", (info) =>
      this.set({
        state: "downloaded",
        version: info.version,
        message: `Version ${info.version} ist bereit. Anmeldedaten bleiben erhalten.`,
      }),
    );
    autoUpdater.on("error", () =>
      this.set({
        state: "error",
        message:
          "Update nicht verfügbar. Verbindung prüfen; das Repository benötigt einen veröffentlichten Windows-Release mit latest.yml.",
      }),
    );
  }
  set(state: NonNullable<Snapshot["update"]>) {
    this.state = state;
    this.changed();
  }
  async command(action: "check" | "download" | "install") {
    if (!app.isPackaged) {
      this.set({
        state: "error",
        message:
          "Updates sind in der installierten IndigoDock-Version verfügbar.",
      });
      return;
    }
    if (action === "check") {
      if (["checking", "downloading"].includes(this.state.state)) return;
      try {
        await autoUpdater.checkForUpdates();
      } catch {}
    }
    if (action === "download") {
      if (this.state.state !== "available")
        throw Error("Zuerst nach Updates suchen.");
      this.set({
        ...this.state,
        state: "downloading",
        message: "Download wird gestartet …",
      });
      try {
        await autoUpdater.downloadUpdate();
      } catch {}
    }
    if (action === "install") {
      if (this.state.state !== "downloaded")
        throw Error("Kein geprüftes Update heruntergeladen.");
      this.beforeInstall();
      autoUpdater.quitAndInstall(false, true);
    }
  }
}
