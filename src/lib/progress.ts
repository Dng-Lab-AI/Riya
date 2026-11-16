import "server-only";
import type { ObjectId } from "mongodb";
import { defineMessages, intlLocale, type Locale } from "@/i18n";
import { LANGUAGE_EN } from "@/i18n/catalog";
import { getDb, REAL_LESSON, type LessonDoc } from "./db";

// Learning and teaching progress, computed from what already happens on Riya:
// lessons, the AI recap, the tutor's notes, quizzes, the class transcript and feedback.

// value is null where there is nothing to show (e.g. a month without any rating).
export type Point = { label: string; value: number | null; hint?: string };
export type Domain = { key: string; label: string; score: number | null; detail: string; how: string };

const WEEKS = 12;
const MONTHS = 6;
const DAY = 24 * 60 * 60 * 1000;

const s = (n: number) => (n > 1 ? "s" : "");

const M = defineMessages({
  en: {
    thisWeek: "This week", weekOf: (d: string) => `Week of ${d}`, lessons: (n: number) => `${n} lesson${n === 1 ? "" : "s"}`,
    afterLesson: (d: string) => `After the lesson of ${d}`,
    vocabulary: "Vocabulary", words: (n: number) => `${n} word${s(n)} learnt`, wordsHow: "Words noted by the tutor or picked up in the lesson summary. 50 words = 100%.",
    grammar: "Grammar", notions: (n: number) => `${n} topic${s(n)} studied`, grammarHow: "Grammar points listed in your lesson summaries. 10 topics = 100%.",
    comprehension: "Comprehension", answers: (c: number, n: number) => `${c} correct answer${s(c)} out of ${n}`, noQuiz: "No quizzes yet",
    comprehensionHow: "Share of correct answers to the quick quizzes asked in class.",
    speaking: "Speaking", sentences: (n: number) => `${n} sentence${s(n)} spoken in class`, enableAi: "Turn on the AI assistant in class to track speaking",
    speakingHow: "Sentences you said during lessons where the AI assistant was accepted. 100 sentences = 100%.",
    regularity: "Regularity", weeks: (n: number) => `${n} week${s(n)} with lessons out of the last 8`, regularityHow: "Number of weeks with at least one completed lesson, out of the last 8.",
    ratings: (n: number) => `${n} rating${s(n)}`, noFeedback: "No feedback yet",
    clarity: "Clarity", clarityHow: "Were the explanations easy to follow?", interaction: "Interaction", interactionHow: "Could the student speak and take part?",
    content: "Content", contentHow: "Did the content match their goals?", pace: "Pace", paceHow: "Was the pace right?",
  },
  fr: {
    thisWeek: "Cette semaine", weekOf: (d: string) => `Semaine du ${d}`, lessons: (n: number) => `${n} cours`,
    afterLesson: (d: string) => `Après le cours du ${d}`,
    vocabulary: "Vocabulaire", words: (n: number) => `${n} mot${s(n)} appris`, wordsHow: "Mots notés par le tuteur ou relevés dans le résumé du cours. 50 mots = 100 %.",
    grammar: "Grammaire", notions: (n: number) => `${n} notion${s(n)} étudiée${s(n)}`, grammarHow: "Points de grammaire listés dans vos résumés de cours. 10 notions = 100 %.",
    comprehension: "Compréhension", answers: (c: number, n: number) => `${c} bonne${s(c)} réponse${s(c)} sur ${n}`, noQuiz: "Aucun quiz pour l'instant",
    comprehensionHow: "Part de bonnes réponses aux quiz éclair posés en classe.",
    speaking: "Expression orale", sentences: (n: number) => `${n} phrase${s(n)} prononcée${s(n)} en classe`, enableAi: "Activez l'assistant IA en classe pour suivre l'oral",
    speakingHow: "Phrases que vous avez dites pendant les cours où l'assistant IA était accepté. 100 phrases = 100 %.",
    regularity: "Régularité", weeks: (n: number) => `${n} semaine${s(n)} avec cours sur les 8 dernières`, regularityHow: "Nombre de semaines avec au moins un cours terminé, sur les 8 dernières.",
    ratings: (n: number) => `${n} note${s(n)}`, noFeedback: "Pas encore de retour",
    clarity: "Clarté", clarityHow: "Les explications étaient-elles faciles à suivre ?", interaction: "Interaction", interactionHow: "L'élève a-t-il pu parler et participer ?",
    content: "Contenu", contentHow: "Le contenu correspondait-il à ses objectifs ?", pace: "Rythme", paceHow: "Le rythme était-il adapté ?",
  },
});

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

const weekLabel = (d: Date, locale: Locale) => d.toLocaleDateString(intlLocale(locale), { day: "numeric", month: "short" });
const monthLabel = (d: Date, locale: Locale) => d.toLocaleDateString(intlLocale(locale), { month: "short" }).replace(".", "");

function perWeek(lessons: LessonDoc[], locale: Locale, value: (l: LessonDoc) => number = () => 1): Point[] {
  const t = M[locale];
  const weeks = lastWeeks();
  return weeks.map((start, i) => {
    const end = weeks[i + 1]?.getTime() ?? start.getTime() + 7 * DAY;
    const inWeek = lessons.filter((l) => l.startsAt.getTime() >= start.getTime() && l.startsAt.getTime() < end);
    return { label: weekLabel(start, locale), value: inWeek.reduce((sum, l) => sum + value(l), 0), hint: i === weeks.length - 1 ? t.thisWeek : t.weekOf(weekLabel(start, locale)) };
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

// Words from the AI recap and from the tutor's "word = translation" notes, without duplicates.
function lessonWords(lesson: LessonDoc): string[] {
  const fromSummary = lesson.summary?.vocabulary.map((v) => v.term) ?? [];
  const fromNotes = (lesson.notes?.vocabulary ?? "").split("\n").map((line) => line.split("=")[0]);
  return [...fromSummary, ...fromNotes].map((w) => w.trim()).filter((w) => w.length > 0 && w.length < 60);
}

async function languageNames(locale: Locale) {
  const db = await getDb();
  const docs = await db.languages.find({}, { projection: { slug: 1, name: 1 } }).toArray();
  return new Map(docs.map((l) => [l.slug, (locale === "en" ? LANGUAGE_EN[l.slug]?.name : undefined) ?? l.name]));
}

function byLanguage(lessons: LessonDoc[], names: Map<string, string>, locale: Locale): Point[] {
  const counts = new Map<string, number>();
  for (const l of lessons) counts.set(l.languageSlug, (counts.get(l.languageSlug) ?? 0) + 1);
  return [...counts.entries()]
    .map(([slug, value]) => ({ label: names.get(slug) ?? slug, value, hint: M[locale].lessons(value) }))
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

export async function getStudentProgress(studentId: ObjectId, locale: Locale): Promise<StudentProgress> {
  const t = M[locale];
  const db = await getDb();
  const [lessons, sentences, names] = await Promise.all([
    db.lessons.find({ studentId, status: "completed" }).sort({ startsAt: 1 }).toArray(),
    db.transcript.countDocuments({ speakerId: studentId }),
    languageNames(locale),
  ]);

  // Vocabulary grows lesson after lesson: one point per completed lesson.
  const seen = new Set<string>();
  const recent: string[] = [];
  const vocabulary: Point[] = lessons.map((l) => {
    for (const word of lessonWords(l)) {
      const key = word.toLowerCase();
      if (!seen.has(key)) { seen.add(key); recent.push(word); }
    }
    return { label: weekLabel(l.startsAt, locale), value: seen.size, hint: t.afterLesson(weekLabel(l.startsAt, locale)) };
  });

  const quizzes = lessons.flatMap((l) => l.quizzes ?? []).filter((q) => q.answerIndex !== null);
  const correct = quizzes.filter((q) => q.answerIndex === q.correctIndex).length;
  const grammar = lessons.reduce((sum, l) => sum + (l.summary?.grammar.length ?? 0), 0);
  const weekly = perWeek(lessons, locale);
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
    languages: byLanguage(lessons, names, locale),
    recentWords: recent.slice(-10).reverse(),
    domains: [
      { key: "vocabulaire", label: t.vocabulary, score: lessons.length ? capped(seen.size, 50) : null, detail: t.words(seen.size), how: t.wordsHow },
      { key: "grammaire", label: t.grammar, score: lessons.length ? capped(grammar, 10) : null, detail: t.notions(grammar), how: t.grammarHow },
      { key: "comprehension", label: t.comprehension, score: pct(correct, quizzes.length), detail: quizzes.length ? t.answers(correct, quizzes.length) : t.noQuiz, how: t.comprehensionHow },
      { key: "oral", label: t.speaking, score: sentences ? capped(sentences, 100) : null, detail: sentences ? t.sentences(sentences) : t.enableAi, how: t.speakingHow },
      { key: "regularite", label: t.regularity, score: lessons.length ? capped(activeWeeks, 8) : null, detail: t.weeks(activeWeeks), how: t.regularityHow },
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

export async function getTutorProgress(tutorId: ObjectId, commission: number, locale: Locale): Promise<TutorProgress> {
  const t = M[locale];
  const db = await getDb();
  const [all, reviews, feedback, names] = await Promise.all([
    db.lessons.find({ tutorId, ...REAL_LESSON, "payment.status": { $nin: ["pending", "failed"] } }).toArray(),
    db.reviews.find({ tutorId }).toArray(),
    db.feedback.find({ tutorId }).toArray(),
    languageNames(locale),
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
    return { label: monthLabel(start, locale), value: Math.round(value * 100) / 100, hint: start.toLocaleDateString(intlLocale(locale), { month: "long", year: "numeric" }) };
  });
  // Public reviews and private session ratings both say how lessons went.
  const scores = [...reviews.map((r) => ({ at: r.createdAt, rating: r.rating })), ...feedback.map((f) => ({ at: f.createdAt, rating: f.rating }))];
  const ratings = months.map((start, i) => {
    const inThisMonth = scores.filter((sc) => inMonth(sc.at, i));
    const avg = inThisMonth.length ? Math.round((inThisMonth.reduce((sum, sc) => sum + sc.rating, 0) / inThisMonth.length) * 10) / 10 : null;
    return { label: monthLabel(start, locale), value: avg, hint: t.ratings(inThisMonth.length) };
  });

  const criterion = (key: "clarity" | "interaction" | "content" | "pace", label: string, how: string): Domain => {
    const avg = feedback.length ? feedback.reduce((sum, f) => sum + f.criteria[key], 0) / feedback.length : null;
    return { key, label, score: avg === null ? null : Math.round((avg / 5) * 100), detail: avg === null ? t.noFeedback : `${avg.toFixed(1)} / 5`, how };
  };
  const minutes = completed.reduce((sum, l) => sum + l.durationMinutes, 0);

  return {
    lessons: completed.length,
    hours: Math.round((minutes / 60) * 10) / 10,
    students: perStudent.size,
    returning: [...perStudent.values()].filter((n) => n >= 2).length,
    rating: scores.length ? Math.round((scores.reduce((sum, sc) => sum + sc.rating, 0) / scores.length) * 10) / 10 : null,
    ratingCount: scores.length,
    acceptance: pct(accepted, decided.length),
    weekly: perWeek(completed, locale),
    earnings,
    ratings,
    languages: byLanguage(completed, names, locale),
    criteria: [
      criterion("clarity", t.clarity, t.clarityHow),
      criterion("interaction", t.interaction, t.interactionHow),
      criterion("content", t.content, t.contentHow),
      criterion("pace", t.pace, t.paceHow),
    ],
  };
}
