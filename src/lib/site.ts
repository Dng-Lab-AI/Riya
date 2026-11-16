import "server-only";
import { headers } from "next/headers";

// Public address of the site, for links in e-mails and provider redirects.
export async function siteOrigin() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}

// Address of the admin site: ADMIN_URL, or the public address with "admin." in front
// (http://localhost:3000 gives http://admin.localhost:3000).
export async function adminOrigin() {
  if (process.env.ADMIN_URL) return process.env.ADMIN_URL.replace(/\/$/, "");
  const url = new URL(await siteOrigin());
  url.hostname = `admin.${url.hostname.replace(/^(www|admin)\./, "")}`;
  return url.origin;
}

// Address of the public site, also from the admin site (where the request host is admin.<domain>).
export async function publicOrigin() {
  const url = new URL(await siteOrigin());
  url.hostname = url.hostname.replace(/^admin\./, "");
  return url.origin;
}
