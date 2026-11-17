import { serviceSchema, sidebarSchema, type Config } from "../shared/model";
import { emptyLayout } from "../shared/layout";
export const definitions = [
  ["discord", "Discord", "https://discord.com/app"],
  ["steam", "Steam Chat", "https://steamcommunity.com/chat/"],
  ["icloud", "iCloud", "https://www.icloud.com/"],
  ["gmail", "Gmail", "https://mail.google.com/"],
  ["spotify", "Spotify", "https://open.spotify.com/"],
  ["whatsapp", "WhatsApp", "https://web.whatsapp.com/"],
  ["homeassistant", "Home Assistant", ""],
  ["facebook", "Facebook", "https://www.facebook.com/"],
  ["instagram", "Instagram", "https://www.instagram.com/"],
  ["x", "X", "https://x.com/"],
  ["youtube", "YouTube", "https://www.youtube.com/"],
];
export function defaults(): Config {
  return {
    version: 1,
    sidebar: sidebarSchema.parse({}),
    groups: [],
    activeGroup: null,
    services: definitions.map(([id, name, url]) =>
      serviceSchema.parse({
        id,
        name,
        url,
        profile: id,
        icon: `/icons/${id}.svg`,
      }),
    ),
    count: 1,
    layouts: { 1: emptyLayout(1) },
    settings: {
      groupMode: "icon-group",
      accentColor: "#75d9c4",
      dockColor: "#101416",
      dockPosition: "bottom",
      autostart: false,
      startMinimized: false,
      minimizeToTray: false,
      closeToTray: true,
      restoreWindow: true,
      restoreSession: true,
      saveWidths: true,
      defaultColumns: 1,
      notifications: true,
      showColumnTabs: true,
      groupActive: false,
      hideInactive: false,
    },
    window: { width: 1440, height: 900, maximized: false },
  };
}
