import { appPrompt } from "./prompt";
import { sessionProfile } from "../shared/profiles";
import {
  session,
  dialog,
  desktopCapturer,
  webContents,
  type WebContents,
  type Session,
  type BaseWindow,
} from "electron";

import type { Service, Permission, Config } from "../shared/model";

import { origin } from "../shared/security";

export class PermissionManager {
  installed = new Set<string>();

  busy = new Set<string>();

  constructor(
    private config: () => Config,

    private lookup: (wc: WebContents) => Service | undefined,

    private changed: () => void,

    private window: BaseWindow,

    private log: (message: string) => void,
  ) {}

  get(profile: string): Session {
    const ses = session.fromPartition("persist:multidock-" + profile);

    if (this.installed.has(profile)) return ses;

    this.installed.add(profile);
    // Persist cookie mutations promptly without reading or copying credential values.
    let flushTimer: ReturnType<typeof setTimeout> | undefined;
    ses.cookies.on("changed", () => {
      if (flushTimer) return;
      flushTimer = setTimeout(() => {
        flushTimer = undefined;
        ses.flushStorageData();
        void ses.cookies
          .flushStore()
          .catch(() => this.log("Cookie checkpoint failed."));
      }, 2000);
      flushTimer.unref();
    });

    const resolve = (wc: WebContents | null, url: string) => {
      const s = wc
        ? this.lookup(wc)
        : this.config().services.find(
            (s) =>
              sessionProfile(s) === profile && origin(s.url) === origin(url),
          );

      return s && sessionProfile(s) === profile && origin(url) === origin(s.url)
        ? s
        : undefined;
    };

    const keys = (permission: string, types?: string[]): Permission[] =>
      permission === "media"
        ? types?.length
          ? types.map((t) => (t === "audio" ? "microphone" : "camera"))
          : ["microphone", "camera"]
        : permission === "notifications"
          ? ["notifications"]
          : permission === "display-capture"
            ? ["screen"]
            : [];

    ses.setPermissionCheckHandler((wc, permission, url, details) => {
      const s = resolve(wc, url);

      if (!s) return false;

      if (
        permission === "notifications" &&
        !this.config().settings.notifications
      )
        return false;

      const type = (details as { mediaType?: string }).mediaType;

      const k = keys(permission, type ? [type] : undefined);

      if (permission === "display-capture") return s.permissions.screen !== "deny";
      return !!k.length && k.every((k) => s.permissions[k] === "allow");
    });

    ses.setPermissionRequestHandler((wc, permission, callback, details) => {
      const s = resolve(wc, details.requestingUrl);

      const k = keys(
        permission,

        (details as { mediaTypes?: string[] }).mediaTypes,
      );

      if (
        !s ||
        !k.length ||
        (permission === "notifications" &&
          !this.config().settings.notifications) ||
        k.some((k) => s.permissions[k] === "deny")
      )
        return callback(false);

      if (permission === "display-capture") return callback(true); // Explicit source selection follows.
      if (k.every((k) => s.permissions[k] === "allow")) return callback(true);

      const requestKey = s.id + permission;

      if (this.busy.has(requestKey)) return callback(false);

      this.busy.add(requestKey);

      appPrompt(this.window, this.config(), {
          type: "question",

          title: "IndigoDock · Permission",

          message: `Allow ${k.join(", ")} for ${s.name}?`,

          detail: `Only for ${origin(s.url)}. You can change this decision in service settings.`,

          buttons: ["Deny", "Allow"],

          defaultId: 0,

          cancelId: 0,
        })

        .then(({ response }) => {
          const allowed =
            response === 1 &&
            !wc.isDestroyed() &&
            origin(wc.getURL()) === origin(s.url);

          for (const key of k) s.permissions[key] = allowed ? "allow" : "deny";

          this.changed();

          callback(allowed);
        })

        .catch(() => callback(false))

        .finally(() => this.busy.delete(requestKey));
    });

    ses.setDisplayMediaRequestHandler(async (request, callback) => {
      try {
        const wc = request.frame ? webContents.fromFrame(request.frame) : null;

        const s = resolve(wc ?? null, request.securityOrigin);

        if (!s || s.permissions.screen === "deny")
          return callback({});

        const sources = await desktopCapturer.getSources({
          types: ["screen", "window"],

          thumbnailSize: { width: 320, height: 180 },
        });

        const result = await appPrompt(this.window, this.config(), {
          type: "question",

          title: "Share screen",

          message: `${s.name} · Select a source`,

          detail:
            "Only the selected source will be shared. Enable system audio below to also share all Windows audio.",

          buttons: ["Cancel", ...sources.map((x) => x.name)],

          defaultId: 0,

          cancelId: 0,

          noLink: true,
          sources: sources.map(x => ({name: x.name, image: x.thumbnail.toDataURL()})),
          audio: request.audioRequested,
        });

        if (
          result.response < 1 ||
          !wc ||
          wc.isDestroyed() ||
          origin(wc.getURL()) !== origin(request.securityOrigin)
        )
          return callback({});

        const selected = sources[result.response - 1];

        if (!selected) return callback({});

        this.log(
          `Screen source selected (${selected.id.startsWith("screen:") ? "screen" : "window"}), audio ${request.audioRequested && result.audio}`,
        );

        callback({
          video: selected,

          ...(request.audioRequested && result.audio ? { audio: "loopback" } : {}),
        });
      } catch (error) {
        this.log(
          `Screen sharing failed: ${error instanceof Error ? error.name : "unknown"}`,
        );

        callback({});
      }
    });

    // Chromium's normal Save As dialog is retained. Never auto-open downloaded files.

    ses.on("will-download", (_e, item) => {
      item.setSaveDialogOptions({ title: "IndigoDock · Datei speichern" });
    });

    return ses;
  }
}
