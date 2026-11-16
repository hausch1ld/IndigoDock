import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { serviceSchema, type Service } from "../shared/model";
import { defaults } from "./registry";
import { validUrl, safeIcon } from "../shared/security";
export class Catalog {
  file: string;
  services: Service[] = [];
  error = "";
  constructor(dir: string) {
    this.file = path.join(dir, "known-services.json");
    if (!fs.existsSync(this.file))
      fs.writeFileSync(this.file, JSON.stringify(defaults().services, null, 2));
    this.reload();
  }
  reload() {
    try {
      const items = z
        .array(serviceSchema)
        .max(200)
        .parse(JSON.parse(fs.readFileSync(this.file, "utf8")));
      if (new Set(items.map((s) => s.id)).size !== items.length) throw Error();
      if (
        items.some(
          (s) => !safeIcon(s.icon) || (s.url && !validUrl(s.url, s.allowHttp)),
        )
      )
        throw Error();
      this.services = items.filter((s) => s.kind === "web");
      this.error = "";
    } catch {
      this.error =
        "Dienstkatalog ungültig. JSON, eindeutige IDs und URLs prüfen.";
    }
  }
}
