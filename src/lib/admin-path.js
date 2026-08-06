/** Public admin URL — bookmark this; never linked in the storefront chrome. */
export function adminPath() {
  const p = (process.env.NEXT_PUBLIC_ADMIN_PATH || "/admin").trim();
  if (!p || p === "/") return "/admin";
  return p.startsWith("/") ? p.replace(/\/$/, "") : `/${p.replace(/\/$/, "")}`;
}
