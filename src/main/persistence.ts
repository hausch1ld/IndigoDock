import { migrateSidebar } from "../shared/sidebar";
import fs from "node:fs";
import path from "node:path";
import { configSchema, type Config } from "../shared/model";
import { defaults } from "./registry";
import { normalize, emptyLayout } from "../shared/layout";
export class Store {
  config: Config;
  file: string;
  timer: ReturnType<typeof setTimeout> | undefined;
  error = "";
  constructor(public dir: string) {
    fs.mkdirSync(dir, { recursive: true });
    this.file = path.join(dir, "config.json");
    this.config = this.read();
  }
  read() {
    for (const file of [this.file, this.file + ".bak"]) {
      try {
        const raw = JSON.parse(fs.readFileSync(file, "utf8"));
        const config = migrateSidebar(configSchema.parse(raw), !!raw.sidebar);
        const ids = new Set(config.services.map((s) => s.id));
        if (ids.size !== config.services.length) throw Error("Doppelte IDs");
        for (const [key, l] of Object.entries(config.layouts)) {
          if (l.columns.length !== Number(key)) delete config.layouts[key];
          else normalize(l, ids);
        }
        config.layouts[config.count] ??= emptyLayout(config.count);
        config.groups = config.groups.filter((g) =>
          g.layout.columns.every((col) =>
            col.services.every((id) => ids.has(id)),
          ),
        );
        for (const g of config.groups) {
          normalize(g.layout, ids);
          for (const col of g.layout.columns)
            col.services = col.active ? [col.active] : [];
          g.name = g.layout.columns
            .map(
              (col) =>
                config.services.find((s) => s.id === col.active)?.name ?? "",
            )
            .join(" + ")
            .slice(0, 120);
        }
        if (!config.groups.some((g) => g.id === config.activeGroup))
          config.activeGroup = null;
        return config;
      } catch {
        if (fs.existsSync(file))
          this.error =
            "Beschädigte Konfiguration: Sicherung oder Standardwerte wiederhergestellt.";
      }
    }
    return defaults();
  }
  schedule() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      try {
        this.flush();
      } catch {
        this.error = "Konfiguration konnte nicht gespeichert werden.";
      }
    }, 250);
  }
  flush() {
    clearTimeout(this.timer);
    const temp = this.file + ".tmp";
    const fd = fs.openSync(temp, "w", 0o600);
    try {
      fs.writeFileSync(fd, JSON.stringify(this.config, null, 2));
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    if (fs.existsSync(this.file)) {
      try {
        configSchema.parse(JSON.parse(fs.readFileSync(this.file, "utf8")));
        fs.copyFileSync(this.file, this.file + ".bak");
      } catch {}
    }
    fs.renameSync(temp, this.file);
  }
}
