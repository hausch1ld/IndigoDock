export function origin(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}
export function validUrl(value: string, allowHttp = false) {
  try {
    const u = new URL(value);
    return (
      !u.username &&
      !u.password &&
      (u.protocol === "https:" || (allowHttp && u.protocol === "http:")) &&
      !!u.hostname
    );
  } catch {
    return false;
  }
}
export function safeIcon(value: string) {
  return (
    !value ||
    /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value) ||
    /^\/icons\/[a-z0-9-]+\.svg$/.test(value)
  );
}
// OAuth codes, query tokens and fragments must not land in the configuration.
export function restoreUrl(value: string) {
  try {
    const u = new URL(value);
    u.search = "";
    u.hash = "";
    u.username = "";
    u.password = "";
    return u.href;
  } catch {
    return "";
  }
}
