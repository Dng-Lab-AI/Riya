import "server-only";
import type { ObjectId } from "mongodb";
import { getDb, type LessonDoc } from "./db";

// Learning and teaching progress, computed from what already happens on Riya:
// lessons, the AI recap, the tutor's notes, quizzes, the class transcript and feedback.

// value is null where there is nothing to show (e.g. a month without any rating).
export type Point = { label: string; value: number | null; hint?: string };
export type Domain = { key: string; label: string; score: number | null; detail: string; how: string };

const WEEKS = 12;
const MONTHS = 6;
const DAY = 24 * 60 * 60 * 1000;

function startOfWeek(d: Date) {
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7)); // Monday
  return day;
}

function lastWeeks(): Date[] {
  const current = startOfWeek(new Date());
  return Array.from({ length: WEEKS }, (_, i) => new Date(current.getTime() - (WEEKS - 1 - i) * 7 * DAY));
}

function lastMonths(): Date[] {
  const now = new Date();
  return Array.from({ length: MONTHS }, (_, i) => new Date(now.getFullYear(), now.getMonth() - (MONTHS - 1 - i), 1));
}

const weekLabel = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
const monthLabel = (d: Date) => d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "");

function perWeek(lessons: LessonDoc[], value: (l: LessonDoc) => number = () => 1): Point[] {
  const weeks = lastWeeks();
  return weeks.map((start, i) => {
    const end = weeks[i + 1]?.getTime() ?? start.getTime() + 7 * DAY;
    const inWeek = lessons.filter((l) => l.startsAt.getTime() >= start.getTime() && l.startsAt.getTime() < end);
    return { label: weekLabel(start), value: inWeek.reduce((sum, l) => sum + value(l), 0), hint: i === weeks.length - 1 ? "Cette semaine" : `Semaine du ${weekLabel(start)}` };
  });
}

// Consecutive weeks, up to this one (or the last one), with at least one lesson.
function streak(points: Point[]) {
  let count = 0;
  for (let i = points.length - 1; i >= 0; i--) {
    if ((points[i].value ?? 0) > 0) count++;
    else if (i < points.length - 1) break; // an empty current week does not break the streak yet
  }
  return count;
}

// Words from the AI recap and from the tutor's "mot = traduction" notes, without duplicates.
function lessonWords(lesson: LessonDoc): string[] {
  const fromSummary = lesson.summary?.vocabulary.map((v) => v.term) ?? [];
  const fromNotes = (lesson.notes?.vocabulary ?? "").split("\n").map((line) => line.split("=")[0]);
  return [...fromSummary, ...fromNotes].map((w) => w.trim()).filter((w) => w.length > 0 && w.length < 60);
}

async function languageNames() {
  const db = await getDb();
  return new Map((await db.languages.find({}, { projection: { slug: 1, name: 1 } }).toArray()).map((l) => [l.slug, l.name]));
}

function byLanguage(lessons: LessonDoc[], names: Map<string, string>): Point[] {
  const counts = new Map<string, number>();
  for (const l of lessons) counts.set(l.languageSlug, (counts.get(l.languageSlug) ?? 0) + 1);
  return [...counts.entries()]
    .map(([slug, value]) => ({ label: names.get(slug) ?? slug, value, hint: `${value} cours` }))
    .sort((a, b) => b.value - a.value);
}

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : null);
const capped = (value: number, target: number) => Math.min(100, Math.round((value / target) * 100));

// ── Student ───────────────────────────────────────────────

export type StudentProgress = {
  lessons: number;
  hours: number;
  streakWeeks: number;
  words: number;
  quiz: { answered: number; correct: number; rate: number | null };
  weekly: Point[];
  vocabulary: Point[];
  languages: Point[];
  domains: Domain[];
  recentWords: string[];
};

export async function getStudentProgress(studentId: ObjectId): Promise<StudentProgress> {
  const db = await getDb();
  const [lessons, sentences, names] = await Promise.all([
    db.lessons.find({ studentId, status: "completed" }).sort({ startsAt: 1 }).toArray(),
    db.transcript.countDocuments({ speakerId: studentId }),
    languageNames(),
  ]);

  // Vocabulary grows lesson after lesson: one point per completed lesson.
  const seen = new Set<string>();
  const recent: string[] = [];
  const vocabulary: Point[] = lessons.map((l) => {
    for (const word of lessonWords(l)) {
      const key = word.toLowerCase();
      if (!seen.has(key)) { seen.add(key); recent.push(word); }
    }
    return { label: weekLabel(l.startsAt), value: seen.size, hint: `Après le cours du ${weekLabel(l.startsAt)}` };
  });

  const quizzes = lessons.flatMap((l) => l.quizzes ?? []).filter((q) => q.answerIndex !== null);
  const correct = quizzes.filter((q) => q.answerIndex === q.correctIndex).length;
  const grammar = lessons.reduce((sum, l) => sum + (l.summary?.grammar.length ?? 0), 0);
  const weekly = perWeek(lessons);
  const activeWeeks = weekly.slice(-8).filter((w) => (w.value ?? 0) > 0).length;
  const minutes = lessons.reduce((sum, l) => sum + l.durationMinutes, 0);

  return {
    lessons: lessons.length,
    hours: Math.round((minutes / 60) * 10) / 10,
    streakWeeks: streak(weekly),
    words: seen.size,
    quiz: { answered: quizzes.length, correct, rate: pct(correct, quizzes.length) },
    weekly,
    vocabulary,
    languages: byLanguage(lessons, names),
    recentWords: recent.slice(-10).reverse(),
    domains: [
      { key: "vocabulaire", label: "Vocabulaire", score: lessons.length ? capped(seen.size, 50) : null, detail: `${seen.size} mot${seen.size > 1 ? "s" : ""} appris`, how: "Mots notés par le tuteur ou relevés dans le résumé du cours. 50 mots = 100 %." },
      { key: "grammaire", label: "Grammaire", score: lessons.length ? capped(grammar, 10) : null, detail: `${grammar} notion${grammar > 1 ? "s" : ""} étudiée${grammar > 1 ? "s" : ""}`, how: "Points de grammaire listés dans vos résumés de cours. 10 notions = 100 %." },
      { key: "comprehension", label: "Compréhension", score: pct(correct, quizzes.length), detail: quizzes.length ? `${correct} bonne${correct > 1 ? "s" : ""} réponse${correct > 1 ? "s" : ""} sur ${quizzes.length}` : "Aucun quiz pour l'instant", how: "Part de bonnes réponses aux quiz éclair posés en classe." },
      { key: "oral", label: "Expression orale", score: sentences ? capped(sentences, 100) : null, detail: sentences ? `${sentences} phrase${sentences > 1 ? "s" : ""} prononcée${sentences > 1 ? "s" : ""} en classe` : "Activez l'assistant IA en classe pour suivre l'oral", how: "Phrases que vous avez dites pendant les cours où l'assistant IA était accepté. 100 phrases = 100 %." },
      { key: "regularite", label: "Régularité", score: lessons.length ? capped(activeWeeks, 8) : null, detail: `${activeWeeks} semaine${activeWeeks > 1 ? "s" : ""} avec cours sur les 8 dernières`, how: "Nombre de semaines avec au moins un cours terminé, sur les 8 dernières." },
    ],
  };
}

// ── Tutor ─────────────────────────────────────────────────

export type TutorProgress = {
  lessons: number;
  hours: number;
  students: number;
  returning: number;
  rating: number | null;
  ratingCount: number;
  acceptance: number | null;
  weekly: Point[];
  earnings: Point[];
  ratings: Point[];
  languages: Point[];
  criteria: Domain[];
};

export async function getTutorProgress(tutorId: ObjectId, commission: number): Promise<TutorProgress> {
  const db = await getDb();
  const [all, reviews, feedback, names] = await Promise.all([
    db.lessons.find({ tutorId, "payment.status": { $nin: ["pending", "failed"] } }).toArray(),
    db.reviews.find({ tutorId }).toArray(),
    db.feedback.find({ tutorId }).toArray(),
    languageNames(),
  ]);
  const completed = all.filter((l) => l.status === "completed");

  const perStudent = new Map<string, number>();
  for (const l of completed) perStudent.set(l.studentId.toHexString(), (perStudent.get(l.studentId.toHexString()) ?? 0) + 1);

  // Answered requests: accepted (then confirmed or completed) versus declined or cancelled.
  const decided = all.filter((l) => l.status !== "pending");
  const accepted = decided.filter((l) => l.status !== "cancelled").length;

  const months = lastMonths();
  const inMonth = (date: Date, i: number) => date >= months[i] && (i === months.length - 1 || date < months[i + 1]);
  const earnings = months.map((start, i) => {
    const value = completed.filter((l) => inMonth(l.startsAt, i)).reduce((sum, l) => sum + l.price * (1 - commission), 0);
    return { label: monthLabel(start), value: Math.round(value * 100) / 100, hint: start.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) };
  });
  // Public reviews and private session ratings both say how lessons went.
  const scores = [...reviews.map((r) => ({ at: r.createdAt, rating: r.rating })), ...feedback.map((f) => ({ at: f.createdAt, rating: f.rating }))];
  const ratings = months.map((start, i) => {
    const inThisMonth = scores.filter((s) => inMonth(s.at, i));
    const avg = inThisMonth.length ? Math.round((inThisMonth.reduce((sum, s) => sum + s.rating, 0) / inThisMonth.length) * 10) / 10 : null;
    return { label: monthLabel(start), value: avg, hint: `${inThisMonth.length} note${inThisMonth.length > 1 ? "s" : ""}` };
  });

  const criterion = (key: "clarity" | "interaction" | "content" | "pace", label: string, how: string): Domain => {
    const avg = feedback.length ? feedback.reduce((sum, f) => sum + f.criteria[key], 0) / feedback.length : null;
    return { key, label, score: avg === null ? null : Math.round((avg / 5) * 100), detail: avg === null ? "Pas encore de retour" : `${avg.toFixed(1)} / 5`, how };
  };
  const minutes = completed.reduce((sum, l) => sum + l.durationMinutes, 0);

  return {
    lessons: completed.length,
    hours: Math.round((minutes / 60) * 10) / 10,
    students: perStudent.size,
    returning: [...perStudent.values()].filter((n) => n >= 2).length,
    rating: scores.length ? Math.round((scores.reduce((sum, s) => sum + s.rating, 0) / scores.length) * 10) / 10 : null,
    ratingCount: scores.length,
    acceptance: pct(accepted, decided.length),
    weekly: perWeek(completed),
    earnings,
    ratings,
    languages: byLanguage(completed, names),
    criteria: [
      criterion("clarity", "Clarté", "Les explications étaient-elles faciles à suivre ?"),
      criterion("interaction", "Interaction", "L'élève a-t-il pu parler et participer ?"),
      criterion("content", "Contenu", "Le contenu correspondait-il à ses objectifs ?"),
      criterion("pace", "Rythme", "Le rythme était-il adapté ?"),
    ],
  };
}
