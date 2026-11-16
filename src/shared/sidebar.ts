import type { Config, Layout } from "./model";
import { emptyLayout, normalize } from "./layout";

export function sidebarWidth(width: number, open: boolean) {
  return open ? Math.min(320, Math.floor(width * 0.4)) : 0;
}

/** Remove the old widget service without retaining an empty workspace column. */
export function migrateSidebar(config: Config, hadSidebar: boolean) {
  const legacy = config.services.filter((s) => s.kind === "widgets");
  if (!legacy.length) return config;
  const removed = new Set(legacy.map((s) => s.id));
  if (!hadSidebar) {
    config.sidebar.open = legacy.some((s) => s.running);
    config.sidebar.widgets = [
      ...new Set([...legacy[0].widgets, "notes" as const]),
    ];
  }
  config.services = config.services.filter((s) => !removed.has(s.id));
  const ids = new Set(config.services.map((s) => s.id));
  const clean = (layout: Layout) => {
    const kept = layout.columns
      .map((column, i) => ({ column, ratio: layout.ratios[i] }))
      .filter(
        ({ column }) =>
          !column.services.length ||
          column.services.some((id) => !removed.has(id)),
      );
    if (!kept.length) return emptyLayout(1);
    return normalize(
      {
        columns: kept.map(({ column }) => ({
          services: column.services.filter((id) => !removed.has(id)),
          active:
            column.active && !removed.has(column.active) ? column.active : null,
        })),
        ratios: kept.map(({ ratio }) => ratio),
      },
      ids,
    );
  };
  const selected = clean(
    config.layouts[config.count] ?? emptyLayout(config.count),
  );
  config.layouts = Object.fromEntries(
    Object.values(config.layouts).map((layout) => {
      const next = clean(layout);
      return [next.columns.length, next];
    }),
  );
  config.count = selected.columns.length;
  config.layouts[config.count] = selected;
  config.groups = config.groups
    .map((group) => ({ ...group, layout: clean(group.layout) }))
    .filter((group) =>
      group.layout.columns.some((column) => column.services.length),
    );
  return config;
}
