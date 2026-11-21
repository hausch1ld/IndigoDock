import { spotifyAdapter } from "./spotify-adapter";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import type { WidgetData } from "../shared/model";
import type { ViewManager } from "./views";
const run = promisify(execFile);
export class Widgets {
  private previous = os.cpus();
  private pending: Promise<WidgetData> | null = null;
  constructor(private views: ViewManager) {}
  async read() {
    if (this.pending) return this.pending;
    this.pending = this.collect();
    try {
      return await this.pending;
    } finally {
      this.pending = null;
    }
  }
  private async audio(args: string[] = []) {
    const file = path
      .join(__dirname, "assets/AudioMixer.exe")
      .replace("app.asar", "app.asar.unpacked");
    const { stdout } = await run(file, args, {
      windowsHide: true,
      timeout: 5000,
      maxBuffer: 1024 * 1024,
    });
    return JSON.parse(stdout);
  }
  async volume(pid: number, value: number) {
    await this.audio([String(pid), String(value)]);
  }
  private spotify() {
    return [...this.views.views.values()].find((v) => {
      try {
        return new URL(v.webContents.getURL()).hostname === "open.spotify.com";
      } catch {
        return false;
      }
    })?.webContents;
  }
  async control(action: string, value?: number) {
    const wc = this.spotify();
    if (!wc) throw Error("Start Spotify first.");
    const result = await wc.executeJavaScriptInIsolatedWorld(1002, [
      {
        code: `(${spotifyAdapter.toString()})(${JSON.stringify(action)}, ${JSON.stringify(value ?? 1)})`,
      },
    ]);
    if (!result)
      throw Error(
        "Spotify controls are not ready. Open a track in the Spotify service first.",
      );
  }
  private async collect(): Promise<WidgetData> {
    const now = os.cpus();
    let total = 0,
      idle = 0;
    now.forEach((cpu, i) => {
      const prev = this.previous[i] ?? cpu;
      idle += cpu.times.idle - prev.times.idle;
      total +=
        Object.values(cpu.times).reduce((a, b) => a + b, 0) -
        Object.values(prev.times).reduce((a, b) => a + b, 0);
    });
    this.previous = now;
    const data: WidgetData = {
      cpu: total ? Math.round((1 - idle / total) * 100) : 0,
      memory: Math.round((1 - os.freemem() / os.totalmem()) * 100),
      mixer: [],
    };
    await Promise.allSettled([
      this.audio()
        .then((r) => {
          data.mixer = r.sessions ?? [];
          data.mixerError = r.error;
        })
        .catch(() => {
          data.mixerError = "Windows audio mixer is currently unavailable.";
        }),
      run(
        path.join(
          process.env.SystemRoot ?? "C:/Windows",
          "System32/nvidia-smi.exe",
        ),
        ["--query-gpu=name,utilization.gpu", "--format=csv,noheader,nounits"],
        { windowsHide: true, timeout: 4000 },
      ).then((r) => {
        const line = r.stdout.trim().split("\n")[0];
        const at = line.lastIndexOf(",");
        const value = Number(line.slice(at + 1).trim());
        if (Number.isFinite(value)) {
          data.gpuName = line.slice(0, at);
          data.gpu = value;
        }
      }),
      (async () => {
        const wc = this.spotify();
        if (!wc) return;
        data.spotify = await wc.executeJavaScriptInIsolatedWorld(1002, [
          {
            code: `(${spotifyAdapter.toString()})()`,
          },
        ]);
      })(),
    ]);
    return data;
  }
}
