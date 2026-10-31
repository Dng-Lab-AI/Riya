import "server-only";
import { createHash, randomBytes } from "node:crypto";

// "Continuer avec Google" (OAuth 2.0 authorization code flow with PKCE).
// Configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (Google Cloud console > Credentials),
// with the redirect URI <SITE_URL>/api/auth/google/callback.

export function isGoogleConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export const GOOGLE_COOKIE = "riya_google";

// What we remember between leaving for Google and coming back.
export type GoogleState = { state: string; verifier: string; role: "student" | "tutor"; next: string };

export function newGoogleState(role: GoogleState["role"], next: string): GoogleState {
  return { state: randomBytes(16).toString("base64url"), verifier: randomBytes(32).toString("base64url"), role, next };
}

export function googleAuthUrl(s: GoogleState, redirectUri: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: s.state,
    code_challenge: createHash("sha256").update(s.verifier).digest("base64url"),
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export type GoogleProfile = { sub: string; email: string; email_verified: boolean; name?: string; picture?: string };

export async function fetchGoogleProfile(code: string, verifier: string, redirectUri: string): Promise<GoogleProfile> {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
    cache: "no-store",
  });
  const tokens = (await tokenRes.json()) as { access_token?: string; error?: string };
  if (!tokenRes.ok || !tokens.access_token) throw new Error(`Google token : ${tokens.error ?? tokenRes.status}`);

  const profileRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${tokens.access_token}` }, cache: "no-store" });
  if (!profileRes.ok) throw new Error(`Google userinfo : ${profileRes.status}`);
  return (await profileRes.json()) as GoogleProfile;
}

// In development the button stays visible even without keys, to show where it goes.
export function showGoogleButton() {
  return isGoogleConfigured() || process.env.NODE_ENV !== "production";
}
