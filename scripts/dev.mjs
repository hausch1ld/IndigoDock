import { spawn } from "node:child_process";
import electron from "electron";
import "./build.mjs";
// File-based renderer uses the same CSP and sender validation as the release.
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(electron, ["."], { stdio: "inherit", env });
child.on("exit", (code) => process.exit(code ?? 0));
