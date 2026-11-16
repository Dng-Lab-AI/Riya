import "server-only";
import { getDb, REAL_LESSON, type LessonDoc, type ObjectId, type ReportDoc } from "./db";
import { commissionRate } from "./payments";

// Admin site: reports from members, money owed to tutors, refunds to finish by hand, announcements.

// ── Reports ──────────────────────────────────────────────

export type ReportView = {
  id: string; reason: ReportDoc["reason"]; details: string; status: ReportDoc["status"]; created_at: string;
  reporter: { id: string; name: string }; target: { id: string; name: string; role: string; status: string };
  resolution: string; resolved_at: string | null; resolved_by: string | null;
};

async function viewReports(docs: ReportDoc[]): Promise<ReportView[]> {
  const db = await getDb();
  const ids = docs.flatMap((r) => [r.reporterId, r.targetId, ...(r.resolvedBy ? [r.resolvedBy] : [])]);
  const people = new Map((await db.users.find({ _id: { $in: ids } }, { projection: { name: 1, role: 1, status: 1 } }).toArray()).map((u) => [u._id.toHexString(), u]));
  const person = (id: ObjectId) => people.get(id.toHexString());
  return docs.map((r) => ({
    id: r._id.toHexString(), reason: r.reason, details: r.details, status: r.status, created_at: r.createdAt.toISOString(),
    reporter: { id: r.reporterId.toHexString(), name: person(r.reporterId)?.name ?? "—" },
    target: { id: r.targetId.toHexString(), name: person(r.targetId)?.name ?? "—", role: person(r.targetId)?.role ?? "", status: person(r.targetId)?.status ?? "" },
    resolution: r.resolution ?? "", resolved_at: r.resolvedAt?.toISOString() ?? null, resolved_by: r.resolvedBy ? (person(r.resolvedBy)?.name ?? "—") : null,
  }));
}

export async function listReports() {
  const db = await getDb();
  const [open, resolved] = await Promise.all([
    db.reports.find({ status: "open" }).sort({ createdAt: 1 }).toArray(),
    db.reports.find({ status: "resolved" }).sort({ resolvedAt: -1 }).limit(20).toArray(),
  ]);
  return { open: await viewReports(open), resolved: await viewReports(resolved) };
}

export async function countOpenReports() {
  return (await getDb()).reports.countDocuments({ status: "open" });
}

export async function reportsAbout(userId: ObjectId) {
  const db = await getDb();
  return viewReports(await db.reports.find({ targetId: userId }).sort({ createdAt: -1 }).limit(10).toArray());
}

// ── Payouts ──────────────────────────────────────────────

// Completed, paid (or free) lessons whose tutor share has not been paid out yet.
export const OWED: object = {
  ...REAL_LESSON, status: "completed", payoutId: { $exists: false },
  $or: [{ payment: { $exists: false } }, { "payment.status": "paid" }],
};

export const tutorShare = (lessons: Pick<LessonDoc, "price">[]) => Math.round(lessons.reduce((sum, l) => sum + l.price * (1 - commissionRate()), 0) * 100) / 100;

export async function getPayoutsOverview() {
  const db = await getDb();
  const [owedLessons, payouts, failedRefunds] = await Promise.all([
    db.lessons.find(OWED, { projection: { tutorId: 1, price: 1, startsAt: 1 } }).toArray(),
    db.payouts.find({}).sort({ at: -1 }).limit(20).toArray(),
    db.lessons.find({ "payment.status": "refund_failed" }).sort({ startsAt: -1 }).toArray(),
  ]);
  const byTutor = new Map<string, typeof owedLessons>();
  for (const l of owedLessons) byTutor.set(l.tutorId.toHexString(), [...(byTutor.get(l.tutorId.toHexString()) ?? []), l]);
  const ids = [...owedLessons.map((l) => l.tutorId), ...payouts.map((p) => p.tutorId), ...payouts.map((p) => p.adminId), ...failedRefunds.flatMap((l) => [l.studentId, l.tutorId])];
  const people = new Map((await db.users.find({ _id: { $in: ids } }, { projection: { name: 1, email: 1, country: 1 } }).toArray()).map((u) => [u._id.toHexString(), u]));
  const name = (id: ObjectId) => people.get(id.toHexString())?.name ?? "—";

  return {
    commission: commissionRate(),
    owed: [...byTutor.entries()]
      .map(([id, lessons]) => ({
        tutor_id: id, name: people.get(id)?.name ?? "—", email: people.get(id)?.email ?? "", country: people.get(id)?.country ?? "",
        lessons: lessons.length, gross: lessons.reduce((sum, l) => sum + l.price, 0), net: tutorShare(lessons),
        oldest: lessons.reduce((min, l) => (l.startsAt < min ? l.startsAt : min), lessons[0].startsAt).toISOString(),
      }))
      .sort((a, b) => b.net - a.net),
    payouts: payouts.map((p) => ({
      id: p._id.toHexString(), tutor_id: p.tutorId.toHexString(), tutor: name(p.tutorId), amount: p.amount, lessons: p.lessonIds.length,
      reference: p.reference, admin: name(p.adminId), at: p.at.toISOString(),
    })),
    failedRefunds: failedRefunds.map((l) => ({
      lesson_id: l._id.toHexString(), student_id: l.studentId.toHexString(), student: name(l.studentId), tutor: name(l.tutorId),
      amount: l.payment?.amount ?? 0, currency: l.payment?.currency ?? "", reference: l.payment?.reference ?? "", provider_tx: l.payment?.providerTxId ?? "",
      starts_at: l.startsAt.toISOString(),
    })),
  };
}

// ── Announcements ────────────────────────────────────────

export async function listAnnouncements() {
  const db = await getDb();
  const docs = await db.announcements.find({}).sort({ at: -1 }).limit(20).toArray();
  const admins = new Map((await db.users.find({ _id: { $in: docs.map((d) => d.adminId) } }, { projection: { name: 1 } }).toArray()).map((u) => [u._id.toHexString(), u.name]));
  return docs.map((d) => ({
    id: d._id.toHexString(), audience: d.audience, body: d.body, recipients: d.recipients, emailed: d.emailed,
    admin: admins.get(d.adminId.toHexString()) ?? "—", at: d.at.toISOString(),
  }));
}
