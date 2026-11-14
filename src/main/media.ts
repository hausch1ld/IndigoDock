import type { WebContents } from "electron";
// Chromium owns Media Session / Windows SMTC arbitration. No global key hooks,
// synthetic key broadcasting or JavaScript injection into third-party pages.
export class MediaController {
  audible = new Set<string>();
  lastActive: string | null = null;
  attach(id: string, wc: WebContents, changed: () => void) {
    wc.on("media-started-playing", () => {
      this.audible.add(id);
      this.lastActive = id;
      changed();
    });
    wc.on("media-paused", () => {
      this.audible.delete(id);
      changed();
    });
    wc.on("destroyed", () => this.audible.delete(id));
  }
  focus(id: string) {
    if (this.audible.has(id)) this.lastActive = id;
  }
}
