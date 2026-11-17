import fs from "node:fs/promises";
import path from "node:path";
const project = process.cwd(),
  target = path.resolve("../../work/IndigoDock-test-runner");
await fs.mkdir(target, { recursive: true });
await fs.cp("node_modules/electron/dist", target, { recursive: true });
await fs.rename(
  path.join(target, "electron.exe"),
  path.join(target, "IndigoDock-Test.exe"),
);
const resources = path.join(target, "resources/app");
await fs.mkdir(resources, { recursive: true });
await fs.writeFile(
  path.join(resources, "package.json"),
  JSON.stringify({
    name: "indigodock-test",
    version: "1.1.0",
    main: "desktop-harness.cjs",
  }),
);
await fs.copyFile(
  process.argv.includes("--legacy") ? "scripts/desktop-harness.cjs" : "scripts/workspace-harness.cjs",
  path.join(resources, "desktop-harness.cjs"),
);
await fs.writeFile(path.join(resources, "project.txt"), project);
console.log(path.join(target, "IndigoDock-Test.exe"));
