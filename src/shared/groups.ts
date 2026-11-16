import type { Config, Layout } from "./model";
export function groupIds(layout: Layout): string[] {
  return [
    ...new Set(layout.columns.flatMap((c) => (c.active ? [c.active] : []))),
  ];
}
export function saveGroup(c: Config, id: string) {
  const layout = structuredClone(c.layouts[c.count]);
  if (layout.columns.some((col) => !col.active))
    throw Error("Bitte jeder Spalte zuerst einen Dienst zuweisen.");
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
  if (!group) throw Error("Gruppe nicht gefunden.");
  c.count = group.layout.columns.length;
  c.layouts[c.count] = structuredClone(group.layout);
  c.activeGroup = id;
  return groupIds(group.layout);
}
export function deleteGroup(c: Config, id: string) {
  c.groups = c.groups.filter((g) => g.id !== id);
  if (c.activeGroup === id) c.activeGroup = null;
}
