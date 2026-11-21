import type { Config, Layout } from "./model";
export const TOP = 40,
  TABS = 34,
  BOTTOM = 72,
  GAP = 6;
export function emptyLayout(count: number): Layout {
  return {
    ratios: Array(count).fill(1 / count),
    columns: Array.from({ length: count }, () => ({
      services: [],
      active: null,
    })),
  };
}
export function normalize(layout: Layout, ids: Set<string>): Layout {
  const seen = new Set<string>();
  for (const col of layout.columns) {
    col.services = col.services.filter(
      (id) => ids.has(id) && !seen.has(id) && !!seen.add(id),
    );
    if (!col.active || !col.services.includes(col.active))
      col.active = col.services[0] ?? null;
  }
  if (layout.ratios.length !== layout.columns.length)
    layout.ratios = Array(layout.columns.length).fill(
      1 / layout.columns.length,
    );
  const sum = layout.ratios.reduce((a, b) => a + b, 0);
  layout.ratios = layout.ratios.map((x) => x / sum);
  return layout;
}
export function changeLayout(config: Config, count: number) {
  const old = config.layouts[config.count];
  if (!config.layouts[count]) {
    const next = emptyLayout(count);
    old.columns.forEach((c, i) => {
      const target = next.columns[Math.min(i, count - 1)];
      target.services.push(...c.services);
      target.active ??= c.active;
    });
    config.layouts[count] = next;
  }
  config.count = count;
  normalize(config.layouts[count], new Set(config.services.map((s) => s.id)));
}
export function assign(layout: Layout, id: string, column: number) {
  if (!layout.columns[column]) throw Error("Invalid column");
  for (const c of layout.columns) {
    c.services = c.services.filter((x) => x !== id);
    if (c.active === id) c.active = c.services.at(-1) ?? null;
  }
  const dest = layout.columns[column];
  dest.services.push(id);
  dest.active = id;
}
export function bounds(
  width: number,
  height: number,
  ratios: number[],
  showColumnTabs = true,
  dockPosition: Config["settings"]["dockPosition"] = "bottom",
  sidebar = 0,
) {
  width -= sidebar;
  const tabs = showColumnTabs ? TABS : 0;
  const left = dockPosition === "left" ? BOTTOM : 0;
  const top = TOP + (dockPosition === "top" ? BOTTOM : 0);
  const bottom = dockPosition === "bottom" ? BOTTOM : 0;
  if (dockPosition === "left" || dockPosition === "right") width -= BOTTOM;
  const available = Math.max(0, width - GAP * (ratios.length - 1));
  let x = 0;
  return ratios.map((r, i) => {
    const end =
      i === ratios.length - 1
        ? width
        : Math.round(
            available * ratios.slice(0, i + 1).reduce((a, b) => a + b, 0),
          ) +
          GAP * i;
    const b = {
      x: x + left,
      y: top + tabs,
      width: Math.max(0, end - x),
      height: Math.max(0, height - top - tabs - bottom),
    };
    x = end + GAP;
    return b;
  });
}
export function resizePair(
  ratios: number[],
  index: number,
  delta: number,
  width: number,
) {
  const out = [...ratios],
    total = out[index] + out[index + 1],
    min = Math.min(
      220 / Math.max(1, width - GAP * (out.length - 1)),
      total / 2,
    );
  out[index] = Math.max(
    min,
    Math.min(
      total - min,
      out[index] + delta / Math.max(1, width - GAP * (out.length - 1)),
    ),
  );
  out[index + 1] = total - out[index];
  return out;
}
