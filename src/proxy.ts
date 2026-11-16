import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_HEADER } from "./lib/admin-host";

// The admin site lives on its own host: admin.<domain> (admin.localhost:3000 in development).
// Its pages are in src/app/gestion and are served there as if they were at the root:
// admin.riya.africa/utilisateurs shows src/app/gestion/utilisateurs/page.tsx.
// On the public site, /gestion does not exist and /admin leads to the admin host.
//
// ADMIN_URL gives the admin site another address, for hosts where admin.<domain> cannot exist:
// on Vercel, admin.riya-fawn.vercel.app has no HTTPS certificate, but riya-admin.vercel.app,
// added to the same project, works (ADMIN_URL=https://riya-admin.vercel.app).

const ADMIN_PREFIX = "/gestion";

function configuredAdminUrl() {
  try {
    return process.env.ADMIN_URL ? new URL(process.env.ADMIN_URL) : null;
  } catch {
    return null;
  }
}

function isAdminHost(host: string) {
  return host.startsWith("admin.") || host === configuredAdminUrl()?.host;
}

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const { pathname, search } = request.nextUrl;
  const headers = new Headers(request.headers);
  headers.delete(ADMIN_HEADER);

  if (isAdminHost(host)) {
    // API routes (messages, avatars…) are shared by both sites.
    if (pathname.startsWith("/api/")) return NextResponse.next({ request: { headers } });
    headers.set(ADMIN_HEADER, "1");
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? ADMIN_PREFIX : `${ADMIN_PREFIX}${pathname}`;
    return NextResponse.rewrite(url, { request: { headers } });
  }

  if (pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`)) {
    return new NextResponse(null, { status: 404 });
  }
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const configured = configuredAdminUrl();
    if (configured) return NextResponse.redirect(`${configured.origin}/${search}`);
    const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
    const bare = host.replace(/^www\./, "");
    return NextResponse.redirect(`${proto}://admin.${bare}/${search}`);
  }
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Everything except Next.js internals and files with an extension (images, icons, fonts…).
  matcher: ["/((?!_next/|.*\\.[a-zA-Z0-9]+$).*)"],
};
