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
  if (host !== "discord.com" && host !== "www.discord.com") return original;
  return original
    .replace(/\sElectron\/\S+/g, "")
    .replace(/\s(?:MultiDock|multidock|IndigoDock|indigodock)\/\S+/g, "");
}
