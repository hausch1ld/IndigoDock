/** Discord must select its browser capture path, not its native Electron-client
 * integration (which expects DiscordNative). Keep the real Chromium/OS version;
 * never apply this compatibility hint to Google/Apple or other identity providers. */
export function serviceUserAgent(original: string, url: string) {
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    return original;
  }
  if (
    ![
      "discord.com",
      "www.discord.com",
      "open.spotify.com",
      "web.whatsapp.com",
    ].includes(host)
  )
    return original;
  return original
    .replace(/\sElectron\/\S+/g, "")
    .replace(/\s(?:MultiDock|multidock|IndigoDock|indigodock)\/\S+/g, "");
}

// Authentication routes are transient, not a useful workspace to restore.
export function serviceStartUrl(configured: string, restored: string) {
  try {
    const base = new URL(configured);
    const saved = new URL(restored);
    if (
      base.hostname === "discord.com" &&
      (saved.origin !== base.origin ||
        !/^\/channels(?:\/|$)/.test(saved.pathname))
    ) {
      return configured;
    }
    return restored;
  } catch {
    return configured;
  }
}
