import "server-only";
import type { Filter } from "mongodb";
import { getDb, toObjectId, type LanguageDoc, type LessonDoc, type LessonPayment, type ObjectId, type UserDoc } from "./db";
import { holdsSlot } from "./payments";
import { formatMoney } from "./payments/countries";
import { listLessonFiles, type LessonFile } from "./documents";

// Read-only data access used by Server Components. Everything returned here is
// plain, serialisable data (string ids, ISO dates) so it can be passed to client components.

export type Language = {
  id: string;
  slug: string;
  name: string;
  native_name: string;
  greeting: string;
  greeting_meaning: string;
  region: string;
  countries: string;
  speakers: string;
  family: string;
  description: string;
  tutor_count: number;
};

export type TutorLanguage = { slug: string; name: string; level: "native" | "fluent" };

export type TutorSummary = {
  id: string;
  name: string;
  country: string;
  avatar_url: string;
  headline: string;
  about: string;
  hourly_rate: number;
  years_experience: number;
  specialties: string[];
  availability: string[];
  speaks: string;
  approved: boolean;
  rating: number | null;
  review_count: number;
  lesson_count: number;
  languages: TutorLanguage[];
};

export type Review = { id: string; rating: number; comment: string; created_at: string; student_name: string; student_avatar: string };

export type Lesson = {
  id: string;
  starts_at: string;
  duration_minutes: number;
  price: number;
  status: LessonDoc["status"];
  message: string;
  language_name: string;
  other_id: string;
  other_name: string;
  other_avatar: string;
  review_rating: number | null;
  // What the student paid; null for lessons booked before online payment.
  payment: { status: LessonPayment["status"]; amount_label: string } | null;
};

const ACTIVE_TUTOR = { role: "tutor", status: "active", "tutor.approved": true } as const;

// ── Languages ─────────────────────────────────────────────

async function languageNames(): Promise<Map<string, string>> {
  const db = await getDb();
  const docs = await db.languages.find({}, { projection: { slug: 1, name: 1 } }).toArray();
  return new Map(docs.map((l) => [l.slug, l.name]));
}

async function tutorCountsBySlug(): Promise<Map<string, number>> {
  const db = await getDb();
  const rows = await db.users
    .aggregate<{ _id: string; n: number }>([{ $match: ACTIVE_TUTOR }, { $unwind: "$tutor.languages" }, { $group: { _id: "$tutor.languages.slug", n: { $sum: 1 } } }])
    .toArray();
  return new Map(rows.map((r) => [r._id, r.n]));
}

function toLanguage(l: LanguageDoc, count: number): Language {
  return {
    id: l._id.toHexString(), slug: l.slug, name: l.name, native_name: l.nativeName, greeting: l.greeting, greeting_meaning: l.greetingMeaning,
    region: l.region, countries: l.countries, speakers: l.speakers, family: l.family, description: l.description, tutor_count: count,
  };
}

export async function listLanguages(): Promise<Language[]> {
  const db = await getDb();
  const [docs, counts] = await Promise.all([db.languages.find().toArray(), tutorCountsBySlug()]);
  return docs
    .map((l) => toLanguage(l, counts.get(l.slug) ?? 0))
    .sort((a, b) => b.tutor_count - a.tutor_count || a.name.localeCompare(b.name, "fr"));
}

export async function getLanguage(slug: string): Promise<Language | null> {
  const db = await getDb();
  const doc = await db.languages.findOne({ slug });
  if (!doc) return null;
  return toLanguage(doc, (await tutorCountsBySlug()).get(slug) ?? 0);
}

// ── Tutors ────────────────────────────────────────────────

function toTutor(u: UserDoc, names: Map<string, string>): TutorSummary {
  const t = u.tutor!;
  return {
    id: u._id.toHexString(),
    name: u.name,
    country: u.country,
    avatar_url: u.avatarUrl,
    headline: t.headline,
    about: t.about,
    hourly_rate: t.hourlyRate,
    years_experience: t.yearsExperience,
    specialties: t.specialties,
    availability: t.availability,
    speaks: t.speaks,
    approved: t.approved,
    rating: t.ratingCount ? Math.round((t.ratingSum / t.ratingCount) * 10) / 10 : null,
    review_count: t.ratingCount,
    lesson_count: t.lessonCount,
    languages: [...t.languages]
      .sort((a, b) => (a.level === b.level ? 0 : a.level === "native" ? -1 : 1))
      .map((l) => ({ slug: l.slug, level: l.level, name: names.get(l.slug) ?? l.slug })),
  };
}

export type TutorFilters = {
  q?: string;
  langue?: string;
  prixMax?: number;
  pays?: string;
  dispo?: string;
  specialite?: string;
  tri?: string;
};

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function searchTutors(filters: TutorFilters = {}, limit = 50): Promise<TutorSummary[]> {
  const db = await getDb();
  const names = await languageNames();
  const filter: Filter<UserDoc> = { ...ACTIVE_TUTOR };

  if (filters.langue) filter["tutor.languages.slug"] = filters.langue;
  if (filters.prixMax) filter["tutor.hourlyRate"] = { $lte: filters.prixMax };
  if (filters.pays) filter.country = filters.pays;
  if (filters.dispo) filter["tutor.availability"] = filters.dispo;
  if (filters.specialite) filter["tutor.specialties"] = filters.specialite;
  if (filters.q) {
    const re = new RegExp(escapeRegex(filters.q), "i");
    const matchingSlugs = [...names].filter(([slug, name]) => re.test(name) || re.test(slug)).map(([slug]) => slug);
    filter.$or = [{ name: re }, { "tutor.headline": re }, { "tutor.about": re }, { "tutor.languages.slug": { $in: matchingSlugs } }];
  }

  const docs = await db.users.find(filter).toArray();
  const tutors = docs.map((u) => toTutor(u, names));
  const byRating = (a: TutorSummary, b: TutorSummary) => (b.rating ?? 0) - (a.rating ?? 0) || b.review_count - a.review_count;
  const sorters: Record<string, (a: TutorSummary, b: TutorSummary) => number> = {
    "prix-asc": (a, b) => a.hourly_rate - b.hourly_rate,
    "prix-desc": (a, b) => b.hourly_rate - a.hourly_rate,
    avis: (a, b) => b.review_count - a.review_count,
  };
  return tutors.sort(sorters[filters.tri ?? ""] ?? byRating).slice(0, limit);
}

export async function listTutorCountries(): Promise<string[]> {
  const db = await getDb();
  const countries = await db.users.distinct("country", ACTIVE_TUTOR);
  return countries.filter(Boolean).sort((a, b) => a.localeCompare(b, "fr"));
}

export async function getTutor(id: string): Promise<TutorSummary | null> {
  const _id = toObjectId(id);
  if (!_id) return null;
  const db = await getDb();
  const doc = await db.users.findOne({ _id, role: "tutor", tutor: { $exists: true } });
  return doc ? toTutor(doc, await languageNames()) : null;
}

async function usersById(ids: ObjectId[]): Promise<Map<string, UserDoc>> {
  const db = await getDb();
  const docs = await db.users.find({ _id: { $in: ids } }).toArray();
  return new Map(docs.map((u) => [u._id.toHexString(), u]));
}

export async function getTutorReviews(tutorId: string): Promise<Review[]> {
  const _id = toObjectId(tutorId);
  if (!_id) return [];
  const db = await getDb();
  const reviews = await db.reviews.find({ tutorId: _id }).sort({ createdAt: -1 }).limit(50).toArray();
  const students = await usersById(reviews.map((r) => r.studentId));
  return reviews.map((r) => {
    const s = students.get(r.studentId.toHexString());
    return { id: r._id.toHexString(), rating: r.rating, comment: r.comment, created_at: r.createdAt.toISOString(), student_name: s?.name ?? "Ancien membre", student_avatar: s?.avatarUrl ?? "" };
  });
}

// Start times already taken for a tutor, so the booking form can hide them.
export async function getTutorBusySlots(tutorId: string): Promise<string[]> {
  const _id = toObjectId(tutorId);
  if (!_id) return [];
  const db = await getDb();
  const lessons = await db.lessons.find({ tutorId: _id, startsAt: { $gt: new Date() }, ...holdsSlot() }).toArray();
  return lessons.map((l) => l.startsAt.toISOString());
}

// ── Lessons ───────────────────────────────────────────────

async function lessonsFor(role: "student" | "tutor", userId: ObjectId): Promise<Lesson[]> {
  const db = await getDb();
  // Tutors only see a booking once it has been paid for.
  const lessons = await db.lessons
    .find(role === "student" ? { studentId: userId } : { tutorId: userId, "payment.status": { $nin: ["pending", "failed"] } })
    .sort({ startsAt: -1 })
    .toArray();
  const otherIds = lessons.map((l) => (role === "student" ? l.tutorId : l.studentId));
  const [others, names, reviews] = await Promise.all([
    usersById(otherIds),
    languageNames(),
    db.reviews.find({ lessonId: { $in: lessons.map((l) => l._id) } }).toArray(),
  ]);
  const ratingByLesson = new Map(reviews.map((r) => [r.lessonId.toHexString(), r.rating]));

  return lessons.map((l) => {
    const otherId = role === "student" ? l.tutorId : l.studentId;
    const other = others.get(otherId.toHexString());
    return {
      id: l._id.toHexString(),
      starts_at: l.startsAt.toISOString(),
      duration_minutes: l.durationMinutes,
      price: l.price,
      status: l.status,
      message: l.message,
      language_name: names.get(l.languageSlug) ?? l.languageSlug,
      other_id: otherId.toHexString(),
      other_name: other?.name ?? "Ancien membre",
      other_avatar: other?.avatarUrl ?? "",
      review_rating: ratingByLesson.get(l._id.toHexString()) ?? null,
      payment: l.payment ? { status: l.payment.status, amount_label: formatMoney(l.payment.amount, l.payment.currency) } : null,
    };
  });
}

export const getStudentLessons = (userId: ObjectId) => lessonsFor("student", userId);
export const getTutorLessons = (userId: ObjectId) => lessonsFor("tutor", userId);

export async function getFavoriteTutors(userId: ObjectId): Promise<TutorSummary[]> {
  const db = await getDb();
  const user = await db.users.findOne({ _id: userId }, { projection: { favorites: 1 } });
  if (!user?.favorites?.length) return [];
  const [docs, names] = await Promise.all([db.users.find({ _id: { $in: user.favorites }, ...ACTIVE_TUTOR }).toArray(), languageNames()]);
  return docs.map((u) => toTutor(u, names));
}

export async function isFavorite(userId: ObjectId, tutorId: string): Promise<boolean> {
  const _id = toObjectId(tutorId);
  if (!_id) return false;
  const db = await getDb();
  return (await db.users.countDocuments({ _id: userId, favorites: _id })) > 0;
}

export type UserProfile = { id: string; name: string; email: string; role: string; country: string; avatar_url: string };

export async function getUserProfile(id: string): Promise<UserProfile | null> {
  const _id = toObjectId(id);
  if (!_id) return null;
  const db = await getDb();
  const u = await db.users.findOne({ _id });
  return u ? { id: u._id.toHexString(), name: u.name, email: u.email, role: u.role, country: u.country, avatar_url: u.avatarUrl } : null;
}

// ── Messages ──────────────────────────────────────────────

export type Conversation = { other_id: string; other_name: string; other_avatar: string; last_body: string; last_at: string; unread: number };
export type Message = { id: string; sender_id: string; body: string; created_at: string };

export async function getConversations(userId: ObjectId): Promise<Conversation[]> {
  const db = await getDb();
  const rows = await db.messages
    .aggregate<{ _id: ObjectId; last: { body: string; createdAt: Date }; unread: number }>([
      { $match: { $or: [{ senderId: userId }, { recipientId: userId }] } },
      { $sort: { _id: -1 } },
      {
        $group: {
          _id: { $cond: [{ $eq: ["$senderId", userId] }, "$recipientId", "$senderId"] },
          last: { $first: { body: "$body", createdAt: "$createdAt" } },
          unread: { $sum: { $cond: [{ $and: [{ $eq: ["$recipientId", userId] }, { $eq: ["$readAt", null] }] }, 1, 0] } },
        },
      },
      { $sort: { "last.createdAt": -1 } },
    ])
    .toArray();
  const others = await usersById(rows.map((r) => r._id));
  return rows.map((r) => {
    const o = others.get(r._id.toHexString());
    return { other_id: r._id.toHexString(), other_name: o?.name ?? "Ancien membre", other_avatar: o?.avatarUrl ?? "", last_body: r.last.body, last_at: r.last.createdAt.toISOString(), unread: r.unread };
  });
}

export async function getThread(userId: ObjectId, otherId: ObjectId): Promise<Message[]> {
  const db = await getDb();
  const docs = await db.messages
    .find({ $or: [{ senderId: userId, recipientId: otherId }, { senderId: otherId, recipientId: userId }] })
    .sort({ _id: 1 })
    .toArray();
  return docs.map((m) => ({ id: m._id.toHexString(), sender_id: m.senderId.toHexString(), body: m.body, created_at: m.createdAt.toISOString() }));
}

export async function markThreadRead(userId: ObjectId, otherId: ObjectId) {
  const db = await getDb();
  await db.messages.updateMany({ recipientId: userId, senderId: otherId, readAt: null }, { $set: { readAt: new Date() } });
}

export async function getUnreadCount(userId: ObjectId): Promise<number> {
  const db = await getDb();
  return db.messages.countDocuments({ recipientId: userId, readAt: null });
}

// ── Forum ─────────────────────────────────────────────────

export type Topic = {
  id: string;
  title: string;
  body: string;
  category: string;
  views: number;
  created_at: string;
  author_id: string;
  author_name: string;
  author_avatar: string;
  author_role: string;
  language_name: string | null;
  language_slug: string | null;
  reply_count: number;
};

export type Reply = { id: string; body: string; created_at: string; author_id: string; author_name: string; author_avatar: string; author_role: string };

async function toTopics(docs: import("./db").TopicDoc[]): Promise<Topic[]> {
  const db = await getDb();
  const [authors, names, counts] = await Promise.all([
    usersById(docs.map((t) => t.authorId)),
    languageNames(),
    db.replies.aggregate<{ _id: ObjectId; n: number }>([{ $match: { topicId: { $in: docs.map((t) => t._id) } } }, { $group: { _id: "$topicId", n: { $sum: 1 } } }]).toArray(),
  ]);
  const countByTopic = new Map(counts.map((c) => [c._id.toHexString(), c.n]));
  return docs.map((t) => {
    const a = authors.get(t.authorId.toHexString());
    return {
      id: t._id.toHexString(), title: t.title, body: t.body, category: t.category, views: t.views, created_at: t.createdAt.toISOString(),
      author_id: t.authorId.toHexString(), author_name: a?.name ?? "Ancien membre", author_avatar: a?.avatarUrl ?? "", author_role: a?.role ?? "student",
      language_slug: t.languageSlug, language_name: t.languageSlug ? (names.get(t.languageSlug) ?? null) : null,
      reply_count: countByTopic.get(t._id.toHexString()) ?? 0,
    };
  });
}

export async function listTopics(filters: { categorie?: string; langue?: string } = {}, limit = 100): Promise<Topic[]> {
  const db = await getDb();
  const filter: Filter<import("./db").TopicDoc> = {};
  if (filters.categorie) filter.category = filters.categorie;
  if (filters.langue) filter.languageSlug = filters.langue;
  return toTopics(await db.topics.find(filter).sort({ _id: -1 }).limit(limit).toArray());
}

export async function countTopicsByCategory(): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = await db.topics.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$category", n: { $sum: 1 } } }]).toArray();
  return Object.fromEntries(rows.map((r) => [r._id, r.n]));
}

export async function getTopic(id: string): Promise<Topic | null> {
  const _id = toObjectId(id);
  if (!_id) return null;
  const db = await getDb();
  const doc = await db.topics.findOne({ _id });
  return doc ? (await toTopics([doc]))[0] : null;
}

export async function incrementTopicViews(id: string) {
  const _id = toObjectId(id);
  if (_id) await (await getDb()).topics.updateOne({ _id }, { $inc: { views: 1 } });
}

export async function getReplies(topicId: string): Promise<Reply[]> {
  const _id = toObjectId(topicId);
  if (!_id) return [];
  const db = await getDb();
  const docs = await db.replies.find({ topicId: _id }).sort({ _id: 1 }).toArray();
  const authors = await usersById(docs.map((r) => r.authorId));
  return docs.map((r) => {
    const a = authors.get(r.authorId.toHexString());
    return { id: r._id.toHexString(), body: r.body, created_at: r.createdAt.toISOString(), author_id: r.authorId.toHexString(), author_name: a?.name ?? "Ancien membre", author_avatar: a?.avatarUrl ?? "", author_role: a?.role ?? "student" };
  });
}

// ── Admin ─────────────────────────────────────────────────

export async function getPlatformStats() {
  const db = await getDb();
  const [users, students, tutors, pendingTutors, lessons, revenue, topics, languages] = await Promise.all([
    db.users.countDocuments(),
    db.users.countDocuments({ role: "student" }),
    db.users.countDocuments({ role: "tutor", "tutor.approved": true }),
    db.users.countDocuments({ role: "tutor", "tutor.approved": false }),
    db.lessons.countDocuments({ status: { $in: ["confirmed", "completed"] } }),
    db.lessons.aggregate<{ total: number }>([{ $match: { status: "completed" } }, { $group: { _id: null, total: { $sum: "$price" } } }]).toArray(),
    db.topics.countDocuments(),
    db.languages.countDocuments(),
  ]);
  return { users, students, tutors, pendingTutors, lessons, revenue: revenue[0]?.total ?? 0, topics, languages };
}

export type AdminUser = { id: string; name: string; email: string; role: string; status: string; country: string; created_at: string };

export async function listUsers(q?: string): Promise<AdminUser[]> {
  const db = await getDb();
  const re = new RegExp(escapeRegex(q ?? ""), "i");
  const docs = await db.users.find({ $or: [{ name: re }, { email: re }] }).sort({ _id: -1 }).limit(200).toArray();
  return docs.map((u) => ({ id: u._id.toHexString(), name: u.name, email: u.email, role: u.role, status: u.status, country: u.country, created_at: u.createdAt.toISOString() }));
}

export async function listPendingTutors(): Promise<TutorSummary[]> {
  const db = await getDb();
  const [docs, names] = await Promise.all([db.users.find({ role: "tutor", "tutor.approved": false }).sort({ _id: -1 }).toArray(), languageNames()]);
  return docs.map((u) => toTutor(u, names));
}

// ── Classroom ─────────────────────────────────────────────

export type ClassroomLesson = {
  id: string;
  starts_at: string;
  duration_minutes: number;
  status: LessonDoc["status"];
  language_name: string;
  role: "student" | "tutor";
  me: { id: string; name: string; avatar_url: string };
  other: { id: string; name: string; avatar_url: string };
};

// Returns the lesson only if the viewer is one of its two participants.
export async function getClassroomLesson(lessonId: string, viewerId: ObjectId): Promise<ClassroomLesson | null> {
  const _id = toObjectId(lessonId);
  if (!_id) return null;
  const db = await getDb();
  const lesson = await db.lessons.findOne({ _id, $or: [{ studentId: viewerId }, { tutorId: viewerId }] });
  if (!lesson) return null;
  const role = lesson.tutorId.equals(viewerId) ? "tutor" : "student";
  const people = await usersById([lesson.studentId, lesson.tutorId]);
  const card = (id: ObjectId) => {
    const u = people.get(id.toHexString());
    return { id: id.toHexString(), name: u?.name ?? "Ancien membre", avatar_url: u?.avatarUrl ?? "" };
  };
  return {
    id: lesson._id.toHexString(),
    starts_at: lesson.startsAt.toISOString(),
    duration_minutes: lesson.durationMinutes,
    status: lesson.status,
    language_name: (await languageNames()).get(lesson.languageSlug) ?? lesson.languageSlug,
    role,
    me: card(viewerId),
    other: card(role === "tutor" ? lesson.studentId : lesson.tutorId),
  };
}

// ── Lesson recap, notes and feedback ─────────────────────

export type FeedbackView = {
  rating: number;
  clarity: number;
  interaction: number;
  content: number;
  pace: number;
  liked: string;
  improve: string;
  updated_at: string;
};

function toFeedbackView(f: import("./db").FeedbackDoc): FeedbackView {
  return { rating: f.rating, ...f.criteria, liked: f.liked, improve: f.improve, updated_at: f.updatedAt.toISOString() };
}

export async function getLessonFeedback(lessonId: ObjectId): Promise<FeedbackView | null> {
  const db = await getDb();
  const f = await db.feedback.findOne({ lessonId });
  return f ? toFeedbackView(f) : null;
}

export type LessonRecap = {
  chat: { id: string; author_name: string; mine: boolean; body: string; created_at: string }[];
  documents: LessonFile[];
  notes: { keyPoints: string; vocabulary: string; homework: string } | null;
  summary: (Omit<import("./db").LessonSummary, "generatedAt"> & { generated_at: string }) | null;
  summary_status: "pending" | "failed" | null;
  feedback: FeedbackView | null;
  transcript: { id: string; speaker_name: string; mine: boolean; text: string }[];
  quizzes: import("./db").QuizResult[];
};

export async function getLessonRecap(lesson: LessonDoc, viewerId: ObjectId): Promise<LessonRecap> {
  const db = await getDb();
  const [chat, documents, feedback, people, transcript] = await Promise.all([
    db.classChat.find({ lessonId: lesson._id }).sort({ _id: 1 }).toArray(),
    listLessonFiles(lesson._id),
    getLessonFeedback(lesson._id),
    usersById([lesson.studentId, lesson.tutorId]),
    db.transcript.find({ lessonId: lesson._id }).sort({ _id: 1 }).limit(4000).toArray(),
  ]);
  const { generatedAt, ...summary } = lesson.summary ?? ({} as import("./db").LessonSummary);
  return {
    chat: chat.map((m) => ({
      id: m._id.toHexString(),
      author_name: people.get(m.authorId.toHexString())?.name ?? "Ancien membre",
      mine: m.authorId.equals(viewerId),
      body: m.body,
      created_at: m.createdAt.toISOString(),
    })),
    documents,
    notes: lesson.notes ? { keyPoints: lesson.notes.keyPoints, vocabulary: lesson.notes.vocabulary, homework: lesson.notes.homework } : null,
    summary: lesson.summary ? { ...summary, generated_at: generatedAt.toISOString() } : null,
    summary_status: lesson.summaryStatus ?? null,
    feedback,
    transcript: transcript.map((t) => ({
      id: t._id.toHexString(),
      speaker_name: people.get(t.speakerId.toHexString())?.name ?? "Ancien membre",
      mine: t.speakerId.equals(viewerId),
      text: t.text,
    })),
    quizzes: [...(lesson.quizzes ?? []), ...(lesson.liveQuiz ? [lesson.liveQuiz] : [])].map((q) => ({
      question: q.question, options: q.options, correctIndex: q.correctIndex, answerIndex: q.answerIndex, explanation: q.explanation,
    })),
  };
}

export type TutorFeedbackOverview = {
  count: number;
  averages: { rating: number; clarity: number; interaction: number; content: number; pace: number } | null;
  recent: (FeedbackView & { lesson_id: string; student_name: string; starts_at: string })[];
};

export async function getTutorFeedbackOverview(tutorId: ObjectId): Promise<TutorFeedbackOverview> {
  const db = await getDb();
  const [all, stats] = await Promise.all([
    db.feedback.find({ tutorId }).sort({ updatedAt: -1 }).limit(10).toArray(),
    db.feedback
      .aggregate<{ count: number; rating: number; clarity: number; interaction: number; content: number; pace: number }>([
        { $match: { tutorId } },
        {
          $group: {
            _id: null, count: { $sum: 1 }, rating: { $avg: "$rating" }, clarity: { $avg: "$criteria.clarity" },
            interaction: { $avg: "$criteria.interaction" }, content: { $avg: "$criteria.content" }, pace: { $avg: "$criteria.pace" },
          },
        },
      ])
      .toArray(),
  ]);
  const [students, lessons] = await Promise.all([
    usersById(all.map((f) => f.studentId)),
    db.lessons.find({ _id: { $in: all.map((f) => f.lessonId) } }, { projection: { startsAt: 1 } }).toArray(),
  ]);
  const startByLesson = new Map(lessons.map((l) => [l._id.toHexString(), l.startsAt.toISOString()]));
  const round = (n: number) => Math.round(n * 10) / 10;
  const s = stats[0];
  return {
    count: s?.count ?? 0,
    averages: s ? { rating: round(s.rating), clarity: round(s.clarity), interaction: round(s.interaction), content: round(s.content), pace: round(s.pace) } : null,
    recent: all.map((f) => ({
      ...toFeedbackView(f),
      lesson_id: f.lessonId.toHexString(),
      student_name: students.get(f.studentId.toHexString())?.name ?? "Ancien membre",
      starts_at: startByLesson.get(f.lessonId.toHexString()) ?? f.createdAt.toISOString(),
    })),
  };
}
