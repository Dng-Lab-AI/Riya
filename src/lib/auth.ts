import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, type ObjectId, type Role } from "./db";

const COOKIE_NAME = "riya_session";
const SESSION_DAYS = 30;

export type { Role };

export type SessionUser = {
  id: string;
  _id: ObjectId;
  name: string;
  email: string;
  role: Role;
  country: string;
  avatar_url: string;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: ObjectId) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const db = await getDb();
  await db.sessions.insertOne({ _id: hashToken(token), userId, expiresAt: expires });

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) await (await getDb()).sessions.deleteOne({ _id: hashToken(token) });
  store.delete(COOKIE_NAME);
}

// Deduplicated per request: every component asking for the user hits the DB once.
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const db = await getDb();
  const session = await db.sessions.findOne({ _id: hashToken(token), expiresAt: { $gt: new Date() } });
  if (!session) return null;
  const user = await db.users.findOne({ _id: session.userId, status: "active" });
  if (!user) return null;
  return {
    id: user._id.toHexString(),
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    country: user.country,
    avatar_url: user.avatarUrl,
  };
});

export async function requireUser(redirectTo = "/"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/connexion?suite=${encodeURIComponent(redirectTo)}`);
  return user;
}

export async function requireRole(role: Role, redirectTo = "/"): Promise<SessionUser> {
  const user = await requireUser(redirectTo);
  if (user.role !== role) redirect("/");
  return user;
}
