import "server-only";
import { headers } from "next/headers";

// Public address of the site, for links in e-mails and provider redirects.
export async function siteOrigin() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}
