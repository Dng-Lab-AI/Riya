import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { safeRedirectPath } from "@/lib/actions/shared";
import { GOOGLE_COOKIE, googleAuthUrl, isGoogleConfigured, newGoogleState } from "@/lib/google";
import { siteOrigin } from "@/lib/site";

// Sends the visitor to Google's account chooser.
export async function GET(request: Request) {
  if (!isGoogleConfigured()) redirect("/connexion?erreur=google-indisponible");
  const params = new URL(request.url).searchParams;
  const state = newGoogleState(params.get("role") === "tutor" ? "tutor" : "student", safeRedirectPath(params.get("suite"), ""));

  (await cookies()).set(GOOGLE_COOKIE, JSON.stringify(state), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 10 * 60,
  });
  redirect(googleAuthUrl(state, `${await siteOrigin()}/api/auth/google/callback`));
}
