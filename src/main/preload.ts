import { contextBridge, ipcRenderer } from "electron";
import type { Bridge, Snapshot } from "../shared/model";
const bridge: Bridge = {
  widgets:()=>ipcRenderer.invoke("widgets"),
  snapshot: () => ipcRenderer.invoke("snapshot"),
  command: (c) => ipcRenderer.invoke("command", c),
  subscribe: (fn) => {
    const listener = (_e: unknown, s: Snapshot) => fn(s);
    ipcRenderer.on("state", listener);
    return () => ipcRenderer.removeListener("state", listener);
  },
};
contextBridge.exposeInMainWorld("multidock", bridge);
