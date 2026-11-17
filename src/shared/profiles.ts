import type { Service } from "./model";
export function sessionProfile(s: Service) {
  return s.globalAccess ? "shared-global" : s.profile;
}
export function newInstance(
  template: Service,
  id: string,
  services: Service[],
): Service {
  const n = services.filter((s) => s.url === template.url).length;
  return {
    ...structuredClone(template),
    id,
    profile: id,
    globalAccess: false,
    name: n ? `${template.name} ${n + 1}`.slice(0, 60) : template.name,
    running: false,
    currentUrl: "",
    hiddenElements: [],
  };
}
