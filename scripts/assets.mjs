import * as icons from "simple-icons";
import fs from "node:fs/promises";
const mapping = {
  discord: "siDiscord",
  steam: "siSteam",
  icloud: "siIcloud",
  gmail: "siGmail",
  spotify: "siSpotify",
  whatsapp: "siWhatsapp",
  homeassistant: "siHomeassistant",
  facebook: "siFacebook",
  instagram: "siInstagram",
  x: "siX",
  youtube: "siYoutube",
};
await fs.mkdir("public/icons", { recursive: true });
for (const [id, key] of Object.entries(mapping)) {
  const icon = icons[key];
  if (!icon) throw Error(key);
  await fs.writeFile(
    `public/icons/${id}.svg`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#${id === "x" || id === "steam" ? "EEEEEE" : icon.hex}" d="${icon.path}"/></svg>`,
  );
}
