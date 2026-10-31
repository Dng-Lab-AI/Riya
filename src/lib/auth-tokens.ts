import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { ObjectId } from "mongodb";
import { getDb, type AuthTokenDoc } from "./db";

const LIFETIME = { "verify-email": 48 * 60 * 60 * 1000, "reset-password": 60 * 60 * 1000 } as const;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

// Returns the raw token to put in the link; earlier links of the same kind stop working.
export async function issueToken(userId: ObjectId, kind: AuthTokenDoc["kind"], next?: string) {
  const db = await getDb();
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  await db.authTokens.deleteMany({ userId, kind });
  await db.authTokens.insertOne({ _id: hash(token), userId, kind, next, createdAt: now, expiresAt: new Date(now.getTime() + LIFETIME[kind]) });
  return token;
}

// Single use: the token is deleted as it is read.
export async function consumeToken(token: string, kind: AuthTokenDoc["kind"]) {
  if (!token) return null;
  const db = await getDb();
  const doc = await db.authTokens.findOneAndDelete({ _id: hash(token), kind });
  return doc && doc.expiresAt > new Date() ? doc : null;
}

// Whether a link of this kind was sent less than `seconds` ago (to avoid flooding an inbox).
export async function sentRecently(userId: ObjectId, kind: AuthTokenDoc["kind"], seconds = 60) {
  const db = await getDb();
  return (await db.authTokens.countDocuments({ userId, kind, createdAt: { $gt: new Date(Date.now() - seconds * 1000) } })) > 0;
}
