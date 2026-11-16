import "server-only";
import { intlLocale, type Locale } from "@/i18n";
import { languageName } from "@/i18n/catalog";
import { busyIntervals, openIntervals } from "./availability";
import { getDb, REAL_LESSON, type LessonDoc, type ObjectId, type UserDoc } from "./db";
import { commissionRate } from "./payments";
import type { Point } from "./progress";
import { searchTutors } from "./queries";

// Tutor "Insights": the business at a glance, the habits that make students stay,
// and how profile visits turn into trial lessons and regular students.

export const PERIODS = [30, 90, 180] as const;
export type Period = (typeof PERIODS)[number];
export const EARNINGS_PERIODS = [30, 90] as const;
export type EarningsPeriod = (typeof EARNINGS_PERIODS)[number];

export function periodFrom(value: string, allowed: readonly number[], fallback: number) {
  const n = Number(value);
  return allowed.includes(n) ? n : fallback;
}

const DAY = 24 * 60 * 60 * 1000;

// A value over the chosen period and the same value over the period just before.
export type Compared = { value: number; previous: number };
// A metric with the level to aim for; null when there is nothing to measure yet.
export type Goal = { value: number | null; target: number; better: "lower" | "higher" };

export type TutorInsights = {
  overview: { earnings: Compared; lessons: Compared; activeStudents: Compared; newStudents: Compared };
  keys: { cancelled: Goal; missed: Goal; weekly: Goal; replies: Goal; followUps: Goal; notes: Goal };
  live: { bookableHours: Goal; rating: Goal & { count: number }; profileScore: Goal & { missing: string[] }; price: number };
  funnel: { views: Compared; trials: Compared; subscriptions: Compared; position: number | null; tutorCount: number };
  range: { from: string; to: string; previousFrom: string };
};

// Lessons that really happened or will happen (an unpaid booking is not a lesson yet).
const SETTLED = { ...REAL_LESSON, "payment.status": { $nin: ["pending", "failed"] } } as const;

const net = (lessons: LessonDoc[], commission: number) => Math.round(lessons.reduce((sum, l) => sum + l.price * (1 - commission), 0) * 100) / 100;
const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : null);
const within = (date: Date, from: number, to: number) => date.getTime() >= from && date.getTime() < to;
const hasNotes = (l: LessonDoc) => !!(l.notes && (l.notes.keyPoints.trim() || l.notes.vocabulary.trim() || l.notes.homework.trim()));

// Each student's first lesson with the tutor: on Riya, that is the trial lesson.
function firstLessons(lessons: LessonDoc[]) {
  const first = new Map<string, LessonDoc>();
  for (const l of [...lessons].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())) {
    if (l.status === "cancelled") continue;
    const key = l.studentId.toHexString();
    if (!first.has(key)) first.set(key, l);
  }
  return first;
}

// Share of student messages answered by the tutor within 24 hours (one per stretch of student messages).
async function replyRate(tutorId: ObjectId, from: number, to: number) {
  const db = await getDb();
  const messages = await db.messages
    .find({ $or: [{ recipientId: tutorId }, { senderId: tutorId }], kind: { $exists: false }, createdAt: { $gte: new Date(from - 30 * DAY), $lt: new Date(Math.min(to + DAY, Date.now())) } })
    .sort({ createdAt: 1 })
    .toArray();
  const byStudent = new Map<string, typeof messages>();
  for (const m of messages) {
    const other = (m.senderId.equals(tutorId) ? m.recipientId : m.senderId).toHexString();
    byStudent.set(other, [...(byStudent.get(other) ?? []), m]);
  }
  let asked = 0;
  let answered = 0;
  for (const thread of byStudent.values()) {
    thread.forEach((m, i) => {
      const fromStudent = !m.senderId.equals(tutorId);
      const opensTurn = fromStudent && (i === 0 || thread[i - 1].senderId.equals(tutorId));
      if (!opensTurn || !within(m.createdAt, from, to)) return;
      // Too recent to judge yet.
      if (Date.now() - m.createdAt.getTime() < DAY && !thread.slice(i + 1).some((r) => r.senderId.equals(tutorId))) return;
      asked++;
      const reply = thread.slice(i + 1).find((r) => r.senderId.equals(tutorId));
      if (reply && reply.createdAt.getTime() - m.createdAt.getTime() <= DAY) answered++;
    });
  }
  return pct(answered, asked);
}

// How complete the public profile is, with what is still missing.
function profileScore(user: UserDoc, locale: Locale) {
  const tutor = user.tutor!;
  const fr = locale === "fr";
  const checks: [boolean, string][] = [
    [tutor.headline.trim().length >= 10, fr ? "une accroche" : "a headline"],
    [tutor.about.trim().length >= 50, fr ? "une présentation" : "an introduction"],
    [tutor.languages.length > 0, fr ? "une langue enseignée" : "a language taught"],
    [tutor.availability.length > 0 || !!tutor.schedule?.ranges.length, fr ? "des disponibilités" : "availability"],
    [tutor.specialties.length > 0, fr ? "une spécialité" : "a specialty"],
    [!!user.avatarUrl, fr ? "une photo" : "a photo"],
  ];
  return { value: Math.round((checks.filter(([ok]) => ok).length / checks.length) * 100), missing: checks.filter(([ok]) => !ok).map(([, label]) => label) };
}

export async function getTutorInsights(tutorId: ObjectId, period: Period, locale: Locale): Promise<TutorInsights> {
  const db = await getDb();
  const commission = commissionRate();
  const now = Date.now();
  const from = now - period * DAY;
  const previousFrom = from - period * DAY;

  const [user, all, views, previousViews, tutors] = await Promise.all([
    db.users.findOne({ _id: tutorId }),
    db.lessons.find({ tutorId, ...SETTLED }).toArray(),
    db.profileViews.countDocuments({ tutorId, at: { $gte: new Date(from) } }),
    db.profileViews.countDocuments({ tutorId, at: { $gte: new Date(previousFrom), $lt: new Date(from) } }),
    searchTutors({}, 1000),
  ]);
  if (!user?.tutor) throw new Error("Tutor profile not found.");

  const completedIn = (a: number, b: number) => all.filter((l) => l.status === "completed" && within(l.startsAt, a, b));
  const students = (lessons: LessonDoc[]) => new Set(lessons.map((l) => l.studentId.toHexString())).size;
  const firsts = firstLessons(all);
  const newIn = (a: number, b: number) => [...firsts.values()].filter((l) => within(l.startsAt, a, Math.min(b, now))).length;

  // Trial lessons booked during a period, and how many of those students came back for more.
  const lessonsPerStudent = new Map<string, number>();
  for (const l of all) if (l.status !== "cancelled") lessonsPerStudent.set(l.studentId.toHexString(), (lessonsPerStudent.get(l.studentId.toHexString()) ?? 0) + 1);
  const trialsIn = (a: number, b: number) => [...firsts.values()].filter((l) => within(l.createdAt, a, b));
  const subscribed = (trials: LessonDoc[]) => trials.filter((l) => (lessonsPerStudent.get(l.studentId.toHexString()) ?? 0) >= 2).length;

  // Keys to success, over the chosen period.
  const current = completedIn(from, now);
  const planned = all.filter((l) => within(l.startsAt, from, now) && l.status !== "pending");
  const tutorCancelled = planned.filter((l) => l.status === "cancelled" && l.cancelledBy === "tutor").length;
  const tutorKey = tutorId.toHexString();
  // The student came to the classroom, the tutor never did.
  const missed = planned.filter((l) => l.status !== "cancelled" && l.joinedAt && Object.keys(l.joinedAt).some((id) => id !== tutorKey) && !l.joinedAt[tutorKey]).length;
  const trialsDone = [...firsts.values()].filter((l) => l.status === "completed" && within(l.startsAt, from, now));
  const followed = trialsDone.filter((l) => (lessonsPerStudent.get(l.studentId.toHexString()) ?? 0) >= 2).length;

  // Live metrics: what students see today.
  const week = { from: new Date(now), to: new Date(now + 7 * DAY) };
  const [{ open }, busy] = await Promise.all([openIntervals(user, week.from, week.to), busyIntervals({ tutorId }, week.from, week.to)]);
  const openMs = open.reduce((sum, [s, e]) => sum + (e - s), 0);
  const busyMs = busy.reduce((sum, [s, e]) => sum + Math.max(0, Math.min(e, week.to.getTime()) - Math.max(s, week.from.getTime())), 0);
  const ratingCount = user.tutor.ratingCount ?? 0;
  const position = tutors.findIndex((t) => t.id === tutorKey);

  return {
    overview: {
      earnings: { value: net(current, commission), previous: net(completedIn(previousFrom, from), commission) },
      lessons: { value: current.length, previous: completedIn(previousFrom, from).length },
      activeStudents: { value: students(current), previous: students(completedIn(previousFrom, from)) },
      newStudents: { value: newIn(from, now), previous: newIn(previousFrom, from) },
    },
    keys: {
      cancelled: { value: pct(tutorCancelled, planned.length), target: 5, better: "lower" },
      missed: { value: planned.length ? missed : null, target: 0, better: "lower" },
      weekly: { value: pct(current.filter((l) => l.seriesId).length, current.length), target: 75, better: "higher" },
      replies: { value: await replyRate(tutorId, from, now), target: 90, better: "higher" },
      followUps: { value: pct(followed, trialsDone.length), target: 90, better: "higher" },
      notes: { value: pct(current.filter(hasNotes).length, current.length), target: 90, better: "higher" },
    },
    live: {
      bookableHours: { value: Math.round(Math.max(0, openMs - busyMs) / (60 * 60 * 1000)), target: 15, better: "higher" },
      rating: { value: ratingCount ? Math.round(((user.tutor.ratingSum ?? 0) / ratingCount) * 10) / 10 : null, target: 4.8, better: "higher", count: ratingCount },
      profileScore: { ...profileScore(user, locale), target: 90, better: "higher" },
      price: user.tutor.hourlyRate,
    },
    funnel: {
      views: { value: views, previous: previousViews },
      trials: { value: trialsIn(from, now).length, previous: trialsIn(previousFrom, from).length },
      subscriptions: { value: subscribed(trialsIn(from, now)), previous: subscribed(trialsIn(previousFrom, from)) },
      position: position >= 0 ? position + 1 : null,
      tutorCount: tutors.length,
    },
    range: { from: new Date(from).toISOString(), to: new Date(now).toISOString(), previousFrom: new Date(previousFrom).toISOString() },
  };
}

// Net earnings day by day (or week by week over 90 days). "Estimated" also counts the
// confirmed lessons not closed yet, at their date.
export async function getEarningsSeries(tutorId: ObjectId, days: EarningsPeriod, estimated: boolean, locale: Locale): Promise<{ total: number; points: Point[] }> {
  const db = await getDb();
  const commission = commissionRate();
  const step = days > 30 ? 7 : 1;
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).getTime();
  const start = end - days * DAY;
  const lessons = await db.lessons
    .find({ tutorId, ...SETTLED, status: { $in: estimated ? ["completed", "confirmed"] : ["completed"] }, startsAt: { $gte: new Date(start), $lt: new Date(end) } })
    .toArray();
  const lang = intlLocale(locale);
  const points: Point[] = [];
  for (let s = start; s < end; s += step * DAY) {
    const e = Math.min(s + step * DAY, end);
    const value = net(lessons.filter((l) => within(l.startsAt, s, e)), commission);
    const label = new Date(s).toLocaleDateString(lang, { day: "numeric", month: "short" });
    points.push({ label, value, hint: step > 1 ? `${label} – ${new Date(e - DAY).toLocaleDateString(lang, { day: "numeric", month: "short" })}` : label });
  }
  return { total: net(lessons, commission), points };
}

// Everything done since joining Riya.
export async function getTutorJourney(tutorId: ObjectId) {
  const db = await getDb();
  const [user, completed, reviews] = await Promise.all([
    db.users.findOne({ _id: tutorId }, { projection: { createdAt: 1 } }),
    db.lessons.find({ tutorId, ...SETTLED, status: "completed" }, { projection: { studentId: 1, durationMinutes: 1, extraMinutes: 1 } }).toArray(),
    db.reviews.countDocuments({ tutorId }),
  ]);
  return {
    since: (user?.createdAt ?? new Date()).toISOString(),
    lessons: completed.length,
    hours: Math.round((completed.reduce((sum, l) => sum + l.durationMinutes + (l.extraMinutes ?? 0), 0) / 60) * 10) / 10,
    students: new Set(completed.map((l) => l.studentId.toHexString())).size,
    reviews,
  };
}

// Completed lessons of a period, for the CSV export of earnings.
export async function earningsRows(tutorId: ObjectId, days: number, locale: Locale) {
  const db = await getDb();
  const commission = commissionRate();
  const lessons = await db.lessons
    .find({ tutorId, ...SETTLED, status: "completed", startsAt: { $gte: new Date(Date.now() - days * DAY) } })
    .sort({ startsAt: 1 })
    .toArray();
  const people = await db.users.find({ _id: { $in: lessons.map((l) => l.studentId) } }, { projection: { name: 1 } }).toArray();
  const names = new Map(people.map((p) => [p._id.toHexString(), p.name]));
  const languages = new Map((await db.languages.find({}, { projection: { slug: 1, name: 1 } }).toArray()).map((l) => [l.slug, languageName(l.slug, l.name, locale)]));
  return lessons.map((l) => ({
    date: l.startsAt.toISOString(),
    student: names.get(l.studentId.toHexString()) ?? "",
    language: languages.get(l.languageSlug) ?? l.languageSlug,
    minutes: l.durationMinutes + (l.extraMinutes ?? 0),
    price: l.price,
    net: Math.round(l.price * (1 - commission) * 100) / 100,
  }));
}
