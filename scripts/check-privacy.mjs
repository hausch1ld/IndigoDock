import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

// Report locations only, never print a potentially sensitive match.
const root = process.cwd();
const patterns = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["access token", /(?:gh[pousr]_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{30,})/],
  ["personal Windows path", /[A-Z]:[\\/]+Users[\\/]+(?!test(?:[\\/])|Public(?:[\\/])|example(?:[\\/]))[^\\/\s"'<>]+/i],
];
const prohibited = /(?:^|\/)(?:Cookies|Login Data|Local State|config\.json|diagnostics\.log|\.env(?:\..*)?|.*\.(?:pfx|pem|key))$/i;
let failed = false, count = 0;
const scan = (name, data, revision = "working tree") => {
  count++;
  if (prohibited.test(name)) { console.error(`${revision}: prohibited profile/secret file: ${name}`); failed = true; }
  if (/\.(?:png|ico|jpg|woff2?)$/i.test(name)) return;
  for (const [label, expression] of patterns) if (expression.test(data.toString("utf8"))) {
    console.error(`${revision}: ${label}: ${name}`); failed = true;
  }
};
const allowed = ["src", "tests", "scripts", "public", "native", ".github", "docs"];
const visit = (relative) => {
  for (const item of fs.readdirSync(path.join(root, relative), {withFileTypes:true})) {
    const name = path.posix.join(relative, item.name);
    if (/feedback-|NEXT-ITERATION/.test(name)) continue;
    if(item.isDirectory()) visit(name); else scan(name, fs.readFileSync(path.join(root, name)));
  }
};
for (const folder of allowed) if(fs.existsSync(folder)) visit(folder);
for(const name of ["README.md", "package.json", "package-lock.json", "THIRD-PARTY-NOTICES.md"]) scan(name, fs.readFileSync(name));
if(process.argv.includes("--history")) {
  const git = (args) => execFileSync("git", args, {encoding:"utf8",maxBuffer:80*1024*1024});
  for(const entry of git(["rev-list","--objects","--all"]).trim().split("\n")) {
    const [sha,...parts] = entry.split(" "); const name=parts.join(" ");
    if(!name || git(["cat-file","-t",sha]).trim() !== "blob") continue;
    scan(name, execFileSync("git", ["cat-file","blob",sha], {maxBuffer:80*1024*1024}),sha);
  }
}
console.log(`Privacy pattern check: ${count} files/objects checked; ${failed ? "review required" : "no matches"}.`);
console.log("Also review personal screenshots, release assets, commit metadata and unrecognized secrets manually.");
process.exitCode = failed ? 1 : 0;
