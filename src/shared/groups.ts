import type { Config, Layout } from "./model";
import { emptyLayout, assign } from "./layout";
export function selectApps(c: Config, ids: string[]) {
  if (
    !ids.length ||
    ids.length > 4 ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !c.services.some((s) => s.id === id))
  )
    throw Error("Invalid selection");
  c.count = ids.length;
  c.activeGroup = null;
  c.layouts[c.count] = {
    ratios: ids.map(() => 1 / ids.length),
    columns: ids.map((id) => ({ services: [id], active: id })),
  };
}
export function createEmptyGroup(c: Config, id: string, count: number) {
  if (c.groups.length >= 100) throw Error("A maximum of 100 groups is supported.");
  const layout = emptyLayout(count);
  c.groups.push({
    id,
    icon: "columns",
    name: `Workspace mit ${count} ${count === 1 ? "Column" : "Columns"}`,
    layout,
  });
  activateGroup(c, id);
}
export function fillGroupSlot(
  c: Config,
  group: string,
  column: number,
  id: string,
) {
  const g = c.groups.find((g) => g.id === group);
  if (!g || !g.layout.columns[column] || !c.services.some((s) => s.id === id))
    throw Error("Invalid group slot");
  // Move the instance out of other groups, keeping their empty slots available.
  for (const other of c.groups)
    for (const col of other.layout.columns) {
      col.services = col.services.filter((x) => x !== id);
      if (col.active === id) col.active = null;
    }
  assign(g.layout, id, column);
  g.layout.columns[column].services = [id];
  activateGroup(c, group);
}
export function groupIds(layout: Layout): string[] {
  return [
    ...new Set(layout.columns.flatMap((c) => (c.active ? [c.active] : []))),
  ];
}
export function saveGroup(c: Config, id: string) {
  const layout = structuredClone(c.layouts[c.count]);
  if (layout.columns.some((col) => !col.active))
    throw Error("Assign a service to every column first.");
  for (const col of layout.columns)
    col.services = col.active ? [col.active] : [];
  const members = groupIds(layout);
  const existing = c.groups.filter((g) =>
    groupIds(g.layout).some((x) => members.includes(x)),
  );
  // A service has one dock position: regrouping replaces overlapping groups.
  c.groups = c.groups.filter((g) => !existing.includes(g));
  c.groups.push({
    id,
    icon: "columns",
    name: members
      .map((id) => c.services.find((s) => s.id === id)?.name ?? id)
      .join(" + ")
      .slice(0, 120),
    layout,
  });
  c.activeGroup = id;
}
export function activateGroup(c: Config, id: string) {
  const group = c.groups.find((g) => g.id === id);
  if (!group) throw Error("Group not found.");
  c.count = group.layout.columns.length;
  c.layouts[c.count] = structuredClone(group.layout);
  c.activeGroup = id;
  return groupIds(group.layout);
}
export function deleteGroup(c: Config, id: string) {
  c.groups = c.groups.filter((g) => g.id !== id);
  if (c.activeGroup === id) c.activeGroup = null;
}
