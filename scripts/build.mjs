import "./build-native.mjs";
import { build } from "esbuild";
import { build as vite } from "vite";
import { mkdir, copyFile } from "node:fs/promises";
await vite({ base: "./", build: { outDir: "dist/ui", emptyOutDir: true } });
await build({
  entryPoints: ["src/main/main.ts"],
  outfile: "dist/main.cjs",
  bundle: true,
  platform: "node",
  format: "cjs",
  external: ["electron", "electron-updater"],
  target: "node22",
});
await build({
  entryPoints: ["src/main/preload.ts"],
  outfile: "dist/preload.cjs",
  bundle: true,
  platform: "node",
  format: "cjs",
  external: ["electron"],
  target: "node22",
});
await mkdir("dist/assets", { recursive: true });
await copyFile("assets/icon.png", "dist/assets/icon.png");

await copyFile("assets/AudioMixer.exe", "dist/assets/AudioMixer.exe");

await build({entryPoints:["src/main/prompt-preload.ts"],outfile:"dist/prompt-preload.cjs",bundle:true,platform:"node",format:"cjs",external:["electron"],target:"node22"});
