import { app } from "electron";
import { autoUpdater } from "electron-updater";
import type { Snapshot } from "../shared/model";
export class UpdateManager {
  state: NonNullable<Snapshot["update"]> = {
    state: "idle",
    message: "Updates are checked only on request.",
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
        message: "Checking GitHub Releases …",
      }),
    );
    autoUpdater.on("update-available", (info) =>
      this.set({
        state: "available",
        version: info.version,
        message: `Version ${info.version} is available.`,
      }),
    );
    autoUpdater.on("update-not-available", () =>
      this.set({
        state: "current",
        message: `IndigoDock ${app.getVersion()} is up to date.`,
      }),
    );
    autoUpdater.on("download-progress", (p) =>
      this.set({
        state: "downloading",
        percent: p.percent,
        message: `Downloading update: ${Math.round(p.percent)} %`,
      }),
    );
    autoUpdater.on("update-downloaded", (info) =>
      this.set({
        state: "downloaded",
        version: info.version,
        message: `Version ${info.version} is ready. Sign-in data will be preserved.`,
      }),
    );
    autoUpdater.on("error", () =>
      this.set({
        state: "error",
        message:
          "Update unavailable. Check your connection; the repository needs a published Windows release with latest.yml.",
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
          "Updates are available in the installed version of IndigoDock.",
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
        throw Error("Check for updates first.");
      this.set({
        ...this.state,
        state: "downloading",
        message: "Starting download …",
      });
      try {
        await autoUpdater.downloadUpdate();
      } catch {}
    }
    if (action === "install") {
      if (this.state.state !== "downloaded")
        throw Error("No verified update has been downloaded.");
      this.beforeInstall();
      autoUpdater.quitAndInstall(false, true);
    }
  }
}
