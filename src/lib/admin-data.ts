import "server-only";
import type { Filter } from "mongodb";
import { getDb, REAL_LESSON, toObjectId, type AdminLogAction, type LessonDoc, type Role, type UserDoc } from "./db";
import { commissionRate } from "./payments";
import { countTutorsToReview } from "./tutor-review";

// Data of the admin site (admin.<domain>): platform figures, the member list and each member's activity.

const DAY_MS = 24 * 60 * 60 * 1000;
export const MEMBERS_PER_PAGE = 50;

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function getAdminStats() {
  const db = await getDb();
  const weekAgo = new Date(Date.now() - 7 * DAY_MS);
  const [members, students, tutors, approvedTutors, toReview, suspended, blocked, newThisWeek, activeThisWeek, lessons, paid] = await Promise.all([
    db.users.countDocuments({ role: { $ne: "admin" } }),
    db.users.countDocuments({ role: "student" }),
    db.users.countDocuments({ role: "tutor" }),
    db.users.countDocuments({ role: "tutor", status: "active", "tutor.approved": true }),
    countTutorsToReview(),
    db.users.countDocuments({ status: "suspended" }),
    db.users.countDocuments({ status: "blocked" }),
    db.users.countDocuments({ role: { $ne: "admin" }, createdAt: { $gte: weekAgo } }),
    db.users.countDocuments({ role: { $ne: "admin" }, lastSeenAt: { $gte: weekAgo } }),
    db.lessons.countDocuments({ ...REAL_LESSON, status: { $in: ["confirmed", "completed"] } }),
    db.lessons.aggregate<{ total: number }>([{ $match: { ...REAL_LESSON, status: "completed" } }, { $group: { _id: null, total: { $sum: "$price" } } }]).toArray(),
  ]);
  return { members, students, tutors, approvedTutors, toReview, suspended, blocked, newThisWeek, activeThisWeek, lessons, volume: paid[0]?.total ?? 0 };
}

export type MemberRow = {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
  role: Role;
  status: UserDoc["status"];
  country: string;
  joined_at: string;
  last_seen_at: string | null;
  lessons: number;
  // Tutors only: visible in the search.
  approved: boolean | null;
};

export type MemberFilters = { q?: string; role?: string; status?: string; page?: number; sort?: string };

export async function listMembers(filters: MemberFilters): Promise<{ rows: MemberRow[]; total: number }> {
  const db = await getDb();
  const filter: Filter<UserDoc> = {};
  if (filters.q) {
    const re = new RegExp(escapeRegex(filters.q), "i");
    filter.$or = [{ name: re }, { email: re }];
  }
  if (filters.role === "student" || filters.role === "tutor" || filters.role === "admin") filter.role = filters.role;
  if (filters.status === "active" || filters.status === "suspended" || filters.status === "blocked") filter.status = filters.status;
  if (filters.status === "pending") Object.assign(filter, { role: "tutor", "tutor.approved": { $ne: true } });
  const sort: Record<string, 1 | -1> = filters.sort === "activite" ? { lastSeenAt: -1 } : filters.sort === "nom" ? { name: 1 } : { _id: -1 };
  const page = Math.max(1, filters.page ?? 1);

  const [docs, total] = await Promise.all([
    db.users.find(filter, { projection: { passwordHash: 0, favorites: 0, archivedChats: 0 } }).sort(sort).skip((page - 1) * MEMBERS_PER_PAGE).limit(MEMBERS_PER_PAGE).toArray(),
    db.users.countDocuments(filter),
  ]);
  const ids = docs.map((u) => u._id);
  const counts = await db.lessons
    .aggregate<{ _id: string; n: number }>([
      { $match: { ...REAL_LESSON, status: { $ne: "cancelled" }, $or: [{ studentId: { $in: ids } }, { tutorId: { $in: ids } }] } },
      { $project: { people: ["$studentId", "$tutorId"] } },
      { $unwind: "$people" },
      { $match: { people: { $in: ids } } },
      { $group: { _id: { $toString: "$people" }, n: { $sum: 1 } } },
    ])
    .toArray();
  const lessonsBy = new Map(counts.map((c) => [c._id, c.n]));
  return {
    total,
    rows: docs.map((u) => ({
      id: u._id.toHexString(), name: u.name, email: u.email, avatar_url: u.avatarUrl, role: u.role, status: u.status, country: u.country,
      joined_at: u.createdAt.toISOString(), last_seen_at: u.lastSeenAt?.toISOString() ?? null, lessons: lessonsBy.get(u._id.toHexString()) ?? 0,
      approved: u.role === "tutor" ? !!u.tutor?.approved : null,
    })),
  };
}

type LessonCounts = { total: number; completed: number; upcoming: number; cancelled: number };

function countLessons(lessons: LessonDoc[]): LessonCounts {
  const now = Date.now();
  return {
    total: lessons.filter((l) => l.status !== "cancelled").length,
    completed: lessons.filter((l) => l.status === "completed").length,
    upcoming: lessons.filter((l) => ["pending", "confirmed"].includes(l.status) && l.startsAt.getTime() > now).length,
    cancelled: lessons.filter((l) => l.status === "cancelled").length,
  };
}

export type MemberLesson = { id: string; as: "student" | "tutor"; other_name: string; starts_at: string; status: LessonDoc["status"]; price: number; payment: string | null };
export type MemberLog = { id: string; action: AdminLogAction; note: string; admin_name: string; at: string };

export async function getMemberDetail(id: string) {
  const _id = toObjectId(id);
  if (!_id) return null;
  const db = await getDb();
  const user = await db.users.findOne({ _id }, { projection: { passwordHash: 0 } });
  if (!user) return null;

  const [asStudent, asTutor, messagesSent, messagesReceived, reviewsGiven, topics, replies, sessions, logs] = await Promise.all([
    db.lessons.find({ studentId: _id, ...REAL_LESSON }).sort({ startsAt: -1 }).toArray(),
    db.lessons.find({ tutorId: _id, ...REAL_LESSON }).sort({ startsAt: -1 }).toArray(),
    db.messages.countDocuments({ senderId: _id, kind: { $exists: false } }),
    db.messages.countDocuments({ recipientId: _id, kind: { $exists: false } }),
    db.reviews.countDocuments({ studentId: _id }),
    db.topics.countDocuments({ authorId: _id }),
    db.replies.countDocuments({ authorId: _id }),
    db.sessions.countDocuments({ userId: _id, expiresAt: { $gt: new Date() } }),
    db.adminLogs.find({ userId: _id }).sort({ at: -1 }).limit(30).toArray(),
  ]);

  const recent = [...asStudent.map((l) => ({ l, as: "student" as const })), ...asTutor.map((l) => ({ l, as: "tutor" as const }))]
    .sort((a, b) => b.l.startsAt.getTime() - a.l.startsAt.getTime())
    .slice(0, 15);
  const peopleIds = [...recent.map(({ l, as }) => (as === "student" ? l.tutorId : l.studentId)), ...logs.map((g) => g.adminId)];
  const people = new Map((await db.users.find({ _id: { $in: peopleIds } }, { projection: { name: 1 } }).toArray()).map((p) => [p._id.toHexString(), p.name]));
  const spent = asStudent.filter((l) => l.payment?.status === "paid").reduce((sum, l) => sum + l.price, 0);
  const earned = asTutor.filter((l) => l.status === "completed").reduce((sum, l) => sum + l.price * (1 - commissionRate()), 0);
  const reviewsReceived = user.tutor?.ratingCount ?? 0;

  return {
    user: {
      id: user._id.toHexString(), name: user.name, email: user.email, avatar_url: user.avatarUrl, role: user.role, status: user.status,
      country: user.country, locale: user.locale ?? null, joined_at: user.createdAt.toISOString(), last_seen_at: user.lastSeenAt?.toISOString() ?? null,
      email_verified: user.emailVerified !== false, google: !!user.googleId, suspended_until: user.suspendedUntil?.toISOString() ?? null,
      moderation: user.moderation ? { reason: user.moderation.reason, at: user.moderation.at.toISOString() } : null,
      tutor: user.tutor
        ? {
            approved: user.tutor.approved, headline: user.tutor.headline, hourly_rate: user.tutor.hourlyRate, review: user.tutor.review?.note ?? null,
            rating: user.tutor.ratingCount ? Math.round((user.tutor.ratingSum / user.tutor.ratingCount) * 10) / 10 : null,
          }
        : null,
    },
    activity: {
      asStudent: countLessons(asStudent), asTutor: countLessons(asTutor), spent, earned: Math.round(earned * 100) / 100,
      messagesSent, messagesReceived, reviewsGiven, reviewsReceived, topics, replies, sessions, favorites: user.favorites?.length ?? 0,
    },
    lessons: recent.map(({ l, as }): MemberLesson => ({
      id: l._id.toHexString(), as, other_name: people.get((as === "student" ? l.tutorId : l.studentId).toHexString()) ?? "—",
      starts_at: l.startsAt.toISOString(), status: l.status, price: l.price, payment: l.payment?.status ?? null,
    })),
    logs: logs.map((g): MemberLog => ({ id: g._id.toHexString(), action: g.action, note: g.note, admin_name: people.get(g.adminId.toHexString()) ?? "—", at: g.at.toISOString() })),
  };
}

export type MemberDetail = NonNullable<Awaited<ReturnType<typeof getMemberDetail>>>;

// Latest sign-ups and the latest actions of the team, for the dashboard.
export async function getRecentActivity() {
  const db = await getDb();
  const [signups, logs] = await Promise.all([
    db.users.find({ role: { $ne: "admin" } }, { projection: { name: 1, email: 1, role: 1, avatarUrl: 1, createdAt: 1 } }).sort({ _id: -1 }).limit(8).toArray(),
    db.adminLogs.find({}).sort({ at: -1 }).limit(8).toArray(),
  ]);
  const admins = new Map((await db.users.find({ _id: { $in: logs.map((g) => g.adminId) } }, { projection: { name: 1 } }).toArray()).map((a) => [a._id.toHexString(), a.name]));
  return {
    signups: signups.map((u) => ({ id: u._id.toHexString(), name: u.name, email: u.email, role: u.role, avatar_url: u.avatarUrl, joined_at: u.createdAt.toISOString() })),
    logs: logs.map((g) => ({
      id: g._id.toHexString(), user_id: g.userId.toHexString(), user_name: g.userName, action: g.action, note: g.note,
      admin_name: admins.get(g.adminId.toHexString()) ?? "—", at: g.at.toISOString(),
    })),
  };
}
