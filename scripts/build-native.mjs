import { execFileSync } from "node:child_process";
import path from "node:path";
if (process.platform === "win32")
  execFileSync(
    path.join(
      process.env.SystemRoot ?? "C:/Windows",
      "Microsoft.NET/Framework64/v4.0.30319/csc.exe",
    ),
    [
      "/nologo",
      "/target:exe",
      "/out:" + path.resolve("assets/AudioMixer.exe"),
      "/reference:System.Web.Extensions.dll",
      path.resolve("native/AudioMixer.cs"),
    ],
    { windowsHide: true, stdio: "inherit" },
  );
