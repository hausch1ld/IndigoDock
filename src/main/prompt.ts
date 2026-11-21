import { translate } from "../shared/i18n";
import { BrowserWindow, ipcMain, type BaseWindow } from "electron";
import path from "node:path";
import type { Config } from "../shared/model";

export type PromptOptions = {
  title?: string; message: string; detail?: string; buttons: string[];
  type?: string; defaultId?: number; cancelId?: number; noLink?: boolean;
  sources?: { name: string; image: string }[];
  audio?: boolean;
};
export async function appPrompt(parent: BaseWindow, config: Config, options: PromptOptions): Promise<{response: number; audio: boolean}> {
  return new Promise((resolve) => {
    const win = new BrowserWindow({parent, modal: true, show: false, frame: false,
      width: options.sources ? 760 : 520, height: options.sources ? 620 : 310,
      resizable: true, minWidth: 420, minHeight: 270,
      backgroundColor: config.settings.dockColor,
      webPreferences: { preload: path.join(__dirname, "prompt-preload.cjs"), sandbox: true, contextIsolation: true, nodeIntegration: false },
    });
    let settled = false;
    const finish = (response: number, audio = false) => {
      if (settled) return;
      settled = true;
      ipcMain.removeListener("prompt-answer", answer);
      resolve({response, audio});
      if (!win.isDestroyed()) win.close();
    };
    const answer = (e: Electron.IpcMainEvent, value: unknown) => {
      if (e.sender !== win.webContents || e.senderFrame !== win.webContents.mainFrame) return;
      const v = value as {response?: unknown; audio?: unknown};
      if (!Number.isInteger(v?.response) || Number(v.response) < 0 || Number(v.response) >= options.buttons.length) return;
      finish(Number(v.response), options.audio === true && v.audio === true);
    };
    ipcMain.on("prompt-answer", answer);
    win.on("closed", () => finish(options.cancelId ?? 0));
    win.webContents.setWindowOpenHandler(() => ({action: "deny"}));
    win.webContents.on("will-navigate", e => e.preventDefault());
    win.webContents.once("did-finish-load", () => {
      win.webContents.send("prompt-data", {...options,
        title: translate(options.title || "IndigoDock", config.settings.language),
        message: translate(options.message, config.settings.language),
        detail: translate(options.detail || "", config.settings.language),
        buttons: options.buttons.map(b => translate(b, config.settings.language)),
        settings: config.settings});
      win.show();
    });
    void win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent('<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data:; style-src \'unsafe-inline\'"></head><body></body></html>')).catch(() => finish(options.cancelId ?? 0));
  });
}
