import type { Service, Config } from "./model";
export function dockGroups(
  services: Service[],
  settings: Pick<Config["settings"], "groupActive" | "hideInactive">,
) {
  const enabled = services.filter((s) => s.enabled),
    active = enabled.filter((s) => s.running),
    inactive = enabled.filter((s) => !s.running);
  return {
    primary: settings.groupActive || settings.hideInactive ? active : enabled,
    secondary: settings.groupActive && !settings.hideInactive ? inactive : [],
    inactive,
    separator: settings.groupActive && active.length > 0 && inactive.length > 0,
  };
}
export function reordered(ids: string[], source: string, target: string) {
  if (source === target || !ids.includes(source) || !ids.includes(target))
    return ids;
  const next = ids.filter((id) => id !== source);
  next.splice(next.indexOf(target), 0, source);
  return next;
}

export function insertAt(ids: string[], source: string, boundary: number) {
  const old = ids.indexOf(source);
  if (old < 0) return ids;
  const next = ids.filter((id) => id !== source);
  const target = Math.max(0, Math.min(ids.length, boundary));
  next.splice(target - (old < target ? 1 : 0), 0, source);
  return next;
}
