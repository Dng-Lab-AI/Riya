import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb, ObjectId, toObjectId } from "@/lib/db";

const VISITOR_COOKIE = "riya_vid";

// Counts a visit of a tutor's public profile (for the tutor's Insights), once per visitor and day.
// Signed-in members are counted by account, others by an anonymous cookie. The tutor's own visits don't count.
export async function POST(_request: NextRequest, ctx: RouteContext<"/api/tuteurs/[id]/vue">) {
  const tutorId = toObjectId((await ctx.params).id);
  if (!tutorId) return new Response(null, { status: 404 });
  const user = await getCurrentUser();
  if (user?._id.equals(tutorId)) return new Response(null, { status: 204 });

  const jar = await cookies();
  let visitor = user ? `u:${user.id}` : jar.get(VISITOR_COOKIE)?.value;
  if (!visitor) {
    visitor = `a:${randomUUID()}`;
    jar.set(VISITOR_COOKIE, visitor, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 365 * 24 * 60 * 60 });
  }

  const db = await getDb();
  if (!(await db.users.countDocuments({ _id: tutorId, role: "tutor" }))) return new Response(null, { status: 404 });
  const now = new Date();
  await db.profileViews
    .updateOne({ tutorId, day: now.toISOString().slice(0, 10), visitor }, { $setOnInsert: { _id: new ObjectId(), at: now } }, { upsert: true })
    .catch(() => {}); // two tabs at once: the unique index keeps a single visit
  return new Response(null, { status: 204 });
}
