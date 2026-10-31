import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSession } from "@/lib/auth";
import { getDb, ObjectId, type UserDoc } from "@/lib/db";
import { GOOGLE_COOKIE, fetchGoogleProfile, type GoogleState } from "@/lib/google";
import { siteOrigin } from "@/lib/site";
import { emptyTutorProfile } from "@/lib/tutor-profile";

// Google sends the visitor back here. We sign them in, link Google to an existing
// account with the same address, or create a new account (its address is already verified).
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const store = await cookies();
  const raw = store.get(GOOGLE_COOKIE)?.value;
  store.delete(GOOGLE_COOKIE);

  let saved: GoogleState | null = null;
  try {
    saved = raw ? (JSON.parse(raw) as GoogleState) : null;
  } catch {}
  const code = params.get("code");
  if (!saved || !code || params.get("state") !== saved.state) redirect("/connexion?erreur=google-annule");

  let profile;
  try {
    profile = await fetchGoogleProfile(code, saved.verifier, `${await siteOrigin()}/api/auth/google/callback`);
  } catch (err) {
    console.error("Connexion Google", err);
    redirect("/connexion?erreur=google");
  }
  if (!profile.email || !profile.email_verified) redirect("/connexion?erreur=google-email");

  const db = await getDb();
  const email = profile.email.toLowerCase();
  let user = (await db.users.findOne({ googleId: profile.sub })) ?? (await db.users.findOne({ email }));
  let created = false;

  if (user) {
    // Google has checked this address, so it also confirms an account still waiting for verification.
    await db.users.updateOne(
      { _id: user._id },
      { $set: { googleId: profile.sub, emailVerified: true, ...(!user.avatarUrl && profile.picture ? { avatarUrl: profile.picture } : {}) } },
    );
  } else {
    const doc: UserDoc = {
      _id: new ObjectId(), name: profile.name || email.split("@")[0], email, passwordHash: "", role: saved.role, status: "active",
      country: "", avatarUrl: profile.picture ?? "", favorites: [], emailVerified: true, googleId: profile.sub, createdAt: new Date(),
      ...(saved.role === "tutor" ? { tutor: emptyTutorProfile() } : {}),
    };
    await db.users.insertOne(doc);
    user = doc;
    created = true;
  }
  if (user.status !== "active") redirect("/connexion?erreur=suspendu");

  await createSession(user._id);
  // New accounts first pick their country (payment methods) or fill in their tutor profile.
  if (created) redirect(user.role === "tutor" ? "/profil/tuteur?bienvenue=1" : "/profil?bienvenue=1");
  redirect(saved.next || "/tableau-de-bord");
}
