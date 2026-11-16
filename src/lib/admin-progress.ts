import "server-only";
import { intlLocale, type Locale } from "@/i18n";
import { languageName } from "@/i18n/catalog";
import { getDb, REAL_LESSON, toObjectId, type LessonDoc, type ObjectId } from "./db";
import { getStudentProgress, type Point } from "./progress";

// Admin site: each tutor's students (scores, reviews), a tutor and student pair in detail, and the
// charts of the dashboard.

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKS = 12;
const MONTHS = 6;

const avg = (values: number[]) => (values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null);
const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : null);
const dayLabel = (d: Date, locale: Locale) => d.toLocaleDateString(intlLocale(locale), { day: "numeric", month: "short" });
const monthLabel = (d: Date, locale: Locale) => d.toLocaleDateString(intlLocale(locale), { month: "short", year: "2-digit" }).replace(".", "");

function quizScore(lessons: LessonDoc[]) {
  const answered = lessons.flatMap((l) => l.quizzes ?? []).filter((q) => q.answerIndex !== null);
  const correct = answered.filter((q) => q.answerIndex === q.correctIndex).length;
  return { answered: answered.length, correct, rate: pct(correct, answered.length) };
}

// Words noted for the student (AI recap and the tutor's "word = translation" notes), without duplicates.
function wordCount(lessons: LessonDoc[]) {
  const words = new Set<string>();
  for (const l of lessons) {
    for (const v of l.summary?.vocabulary ?? []) words.add(v.term.trim().toLowerCase());
    for (const line of (l.notes?.vocabulary ?? "").split("\n")) {
      const w = line.split("=")[0].trim().toLowerCase();
      if (w) words.add(w);
    }
  }
  return words.size;
}

// ── A tutor's students ───────────────────────────────────

export type TutorStudent = {
  id: string;
  name: string;
  avatar_url: string;
  completed: number;
  total: number;
  last_at: string | null;
  next_at: string | null;
  quiz_rate: number | null;
  quizzes: number;
  words: number;
  // Public review(s) the student left the tutor (1–5) and private session feedback.
  review: number | null;
  reviews: number;
  feedback: number | null;
  feedbacks: number;
};

export async function getTutorStudentsForAdmin(tutorId: ObjectId): Promise<TutorStudent[]> {
  const db = await getDb();
  const [lessons, reviews, feedback] = await Promise.all([
    db.lessons.find({ tutorId, ...REAL_LESSON }).sort({ startsAt: 1 }).toArray(),
    db.reviews.find({ tutorId }).toArray(),
    db.feedback.find({ tutorId }).toArray(),
  ]);
  const byStudent = new Map<string, LessonDoc[]>();
  for (const l of lessons) byStudent.set(l.studentId.toHexString(), [...(byStudent.get(l.studentId.toHexString()) ?? []), l]);
  const people = new Map(
    (await db.users.find({ _id: { $in: lessons.map((l) => l.studentId) } }, { projection: { name: 1, avatarUrl: 1 } }).toArray()).map((u) => [u._id.toHexString(), u]),
  );
  const now = Date.now();

  return [...byStudent.entries()]
    .map(([id, list]): TutorStudent => {
      const done = list.filter((l) => l.status === "completed");
      const quiz = quizScore(done);
      const theirReviews = reviews.filter((r) => r.studentId.toHexString() === id).map((r) => r.rating);
      const theirFeedback = feedback.filter((f) => f.studentId.toHexString() === id).map((f) => f.rating);
      const upcoming = list.filter((l) => ["pending", "confirmed"].includes(l.status) && l.startsAt.getTime() > now);
      return {
        id, name: people.get(id)?.name ?? "—", avatar_url: people.get(id)?.avatarUrl ?? "",
        completed: done.length, total: list.filter((l) => l.status !== "cancelled").length,
        last_at: done.at(-1)?.startsAt.toISOString() ?? null, next_at: upcoming[0]?.startsAt.toISOString() ?? null,
        quiz_rate: quiz.rate, quizzes: quiz.answered, words: wordCount(done),
        review: avg(theirReviews), reviews: theirReviews.length, feedback: avg(theirFeedback), feedbacks: theirFeedback.length,
      };
    })
    .sort((a, b) => b.completed - a.completed || a.name.localeCompare(b.name));
}

// ── A student's tutors ───────────────────────────────────

export type StudentTutor = { id: string; name: string; avatar_url: string; completed: number; last_at: string | null };

export async function getStudentTutorsForAdmin(studentId: ObjectId): Promise<StudentTutor[]> {
  const db = await getDb();
  const lessons = await db.lessons.find({ studentId, ...REAL_LESSON, status: { $ne: "cancelled" } }).sort({ startsAt: 1 }).toArray();
  const byTutor = new Map<string, LessonDoc[]>();
  for (const l of lessons) byTutor.set(l.tutorId.toHexString(), [...(byTutor.get(l.tutorId.toHexString()) ?? []), l]);
  const people = new Map(
    (await db.users.find({ _id: { $in: lessons.map((l) => l.tutorId) } }, { projection: { name: 1, avatarUrl: 1 } }).toArray()).map((u) => [u._id.toHexString(), u]),
  );
  return [...byTutor.entries()].map(([id, list]) => {
    const done = list.filter((l) => l.status === "completed");
    return { id, name: people.get(id)?.name ?? "—", avatar_url: people.get(id)?.avatarUrl ?? "", completed: done.length, last_at: done.at(-1)?.startsAt.toISOString() ?? null };
  });
}

// ── One tutor and one student ────────────────────────────

export async function getPairDetail(tutorIdRaw: string, studentIdRaw: string, locale: Locale) {
  const tutorId = toObjectId(tutorIdRaw);
  const studentId = toObjectId(studentIdRaw);
  if (!tutorId || !studentId) return null;
  const db = await getDb();
  const [tutor, student, lessons, reviews, feedback, progress, languages] = await Promise.all([
    db.users.findOne({ _id: tutorId }, { projection: { name: 1, avatarUrl: 1 } }),
    db.users.findOne({ _id: studentId }, { projection: { name: 1, avatarUrl: 1, email: 1 } }),
    db.lessons.find({ tutorId, studentId, ...REAL_LESSON }).sort({ startsAt: 1 }).toArray(),
    db.reviews.find({ tutorId, studentId }).sort({ createdAt: -1 }).toArray(),
    db.feedback.find({ tutorId, studentId }).sort({ createdAt: 1 }).toArray(),
    getStudentProgress(studentId, locale, tutorId),
    db.languages.find({}, { projection: { slug: 1, name: 1 } }).toArray(),
  ]);
  if (!tutor || !student || !lessons.length) return null;
  const names = new Map(languages.map((l) => [l.slug, languageName(l.slug, l.name, locale)]));
  const done = lessons.filter((l) => l.status === "completed");
  const feedbackByLesson = new Map(feedback.map((f) => [f.lessonId.toHexString(), f]));

  // Session rating and quiz result, lesson after lesson.
  const ratings: Point[] = done.map((l) => ({ label: dayLabel(l.startsAt, locale), value: feedbackByLesson.get(l._id.toHexString())?.rating ?? null }));
  const quizzes: Point[] = done.map((l) => ({ label: dayLabel(l.startsAt, locale), value: quizScore([l]).rate }));
  const criteria = (["clarity", "interaction", "content", "pace"] as const).map((key) => ({ key, value: avg(feedback.map((f) => f.criteria[key])) }));

  return {
    tutor: { id: tutorId.toHexString(), name: tutor.name, avatar_url: tutor.avatarUrl },
    student: { id: studentId.toHexString(), name: student.name, avatar_url: student.avatarUrl, email: student.email },
    progress,
    ratings: ratings.some((p) => p.value !== null) ? ratings : [],
    quizzes: quizzes.some((p) => p.value !== null) ? quizzes : [],
    criteria,
    review: avg(reviews.map((r) => r.rating)),
    feedback: avg(feedback.map((f) => f.rating)),
    reviews: reviews.map((r) => ({ id: r._id.toHexString(), rating: r.rating, comment: r.comment, at: r.createdAt.toISOString() })),
    feedbacks: [...feedback].reverse().map((f) => ({ id: f._id.toHexString(), rating: f.rating, liked: f.liked, improve: f.improve, at: f.createdAt.toISOString() })),
    lessons: [...lessons].reverse().map((l) => {
      const q = quizScore([l]);
      return {
        id: l._id.toHexString(), starts_at: l.startsAt.toISOString(), status: l.status, language: names.get(l.languageSlug) ?? l.languageSlug,
        key_points: l.notes?.keyPoints ?? "", homework: l.notes?.homework ?? "", summary: l.summary?.overview ?? "",
        quiz: q.answered ? `${q.correct}/${q.answered}` : null, rating: feedbackByLesson.get(l._id.toHexString())?.rating ?? null,
      };
    }),
  };
}

export type PairDetail = NonNullable<Awaited<ReturnType<typeof getPairDetail>>>;

// ── Dashboard charts ─────────────────────────────────────

function weekStarts(): Date[] {
  const today = new Date();
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
  return Array.from({ length: WEEKS }, (_, i) => new Date(monday.getTime() - (WEEKS - 1 - i) * 7 * DAY_MS));
}

function monthStarts(): Date[] {
  const now = new Date();
  return Array.from({ length: MONTHS }, (_, i) => new Date(now.getFullYear(), now.getMonth() - (MONTHS - 1 - i), 1));
}

function bucket<T>(starts: Date[], items: T[], at: (item: T) => Date, value: (items: T[]) => number | null, label: (d: Date) => string): Point[] {
  return starts.map((start, i) => {
    const end = starts[i + 1]?.getTime() ?? Infinity;
    const inside = items.filter((item) => at(item).getTime() >= start.getTime() && at(item).getTime() < end);
    return { label: label(start), value: value(inside) };
  });
}

export async function getAdminCharts(locale: Locale) {
  const db = await getDb();
  const weeks = weekStarts();
  const months = monthStarts();
  const [users, lessons, feedback, reviews, languages] = await Promise.all([
    db.users.find({ role: { $ne: "admin" }, createdAt: { $gte: weeks[0] } }, { projection: { role: 1, createdAt: 1 } }).toArray(),
    db.lessons.find({ ...REAL_LESSON, startsAt: { $gte: months[0] } }, { projection: { startsAt: 1, status: 1, price: 1, tutorId: 1, languageSlug: 1 } }).toArray(),
    db.feedback.find({ createdAt: { $gte: months[0] } }, { projection: { rating: 1, createdAt: 1 } }).toArray(),
    db.reviews.find({ createdAt: { $gte: months[0] } }, { projection: { rating: 1, createdAt: 1 } }).toArray(),
    db.languages.find({}, { projection: { slug: 1, name: 1 } }).toArray(),
  ]);
  const week = (d: Date) => dayLabel(d, locale);
  const month = (d: Date) => monthLabel(d, locale);
  const completed = lessons.filter((l) => l.status === "completed");
  const recentCompleted = completed.filter((l) => l.startsAt >= weeks[0]);
  const ratings = [...feedback, ...reviews];

  const languageNames = new Map(languages.map((l) => [l.slug, languageName(l.slug, l.name, locale)]));
  const count = (keyOf: (l: LessonDoc) => string) => {
    const counts = new Map<string, number>();
    for (const l of completed) counts.set(keyOf(l), (counts.get(keyOf(l)) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  };
  const topTutorIds = count((l) => l.tutorId.toHexString());
  const tutorNames = new Map(
    (await db.users.find({ _id: { $in: topTutorIds.map(([id]) => toObjectId(id)!) } }, { projection: { name: 1 } }).toArray()).map((u) => [u._id.toHexString(), u.name]),
  );

  return {
    signups: bucket(weeks, users, (u) => u.createdAt, (list) => list.length, week),
    tutorSignups: bucket(weeks, users.filter((u) => u.role === "tutor"), (u) => u.createdAt, (list) => list.length, week),
    lessons: bucket(weeks, recentCompleted, (l) => l.startsAt, (list) => list.length, week),
    volume: bucket(months, completed, (l) => l.startsAt, (list) => list.reduce((sum, l) => sum + l.price, 0), month),
    rating: bucket(months, ratings, (r) => r.createdAt, (list) => avg(list.map((r) => r.rating)), month),
    languages: count((l) => l.languageSlug).map(([slug, value]) => ({ label: languageNames.get(slug) ?? slug, value })),
    tutors: topTutorIds.map(([id, value]) => ({ label: tutorNames.get(id) ?? "—", value })),
  };
}
