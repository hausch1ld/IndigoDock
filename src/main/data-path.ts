import path from "node:path";
// Deliberately retain both the legacy profile directory and partition prefix.
// Branding, executable version and install location must never change logins.
export function persistentDataPath(appData: string, testPath?: string) {
  return testPath || path.join(appData, "multidock");
}
