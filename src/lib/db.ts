import "server-only";
import { GridFSBucket, MongoClient, ObjectId, type Binary, type Collection, type Db } from "mongodb";
import { seed } from "./seed";

// ── Document shapes ───────────────────────────────────────

export type Role = "student" | "tutor" | "admin";
export type LessonStatus = "pending" | "confirmed" | "completed" | "cancelled";

export type TutorProfile = {
  headline: string;
  about: string;
  hourlyRate: number;
  yearsExperience: number;
  specialties: string[];
  availability: string[];
  speaks: string;
  approved: boolean;
  languages: { slug: string; level: "native" | "fluent" }[];
  // Denormalised counters, updated when a review is left or a lesson completed.
  ratingSum: number;
  ratingCount: number;
  lessonCount: number;
  // Fixed weekly availability set in the calendar. Absent on older profiles: derived from `availability`.
  schedule?: WeeklySchedule;
  // Short presentation video shown on the public profile: a file uploaded to Riya, or a YouTube video.
  video?: TutorVideo;
};

export type TutorVideo = { kind: "upload"; fileId: ObjectId; contentType: string } | { kind: "youtube"; youtubeId: string };

// Hours a tutor can be booked every week, on the clock of their own time zone.
// day: 0 = Monday … 6 = Sunday; start / end: minutes after midnight (end may be 1440).
export type WeeklyRange = { day: number; start: number; end: number };
export type WeeklySchedule = { timeZone: string; ranges: WeeklyRange[]; updatedAt: Date };

// One-off changes to the weekly schedule: time off (not bookable) or extra slots (bookable).
export type CalendarBlockDoc = {
  _id: ObjectId;
  tutorId: ObjectId;
  kind: "time_off" | "extra";
  startsAt: Date;
  endsAt: Date;
  note: string;
  createdAt: Date;
};

export type UserDoc = {
  _id: ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  status: "active" | "suspended";
  country: string;
  avatarUrl: string;
  favorites: ObjectId[];
  // Conversations moved to the "Archivés" tab of the messages (by the other member's id).
  archivedChats?: ObjectId[];
  tutor?: TutorProfile;
  // false until the owner clicks the link sent by e-mail; absent on older accounts (treated as verified).
  emailVerified?: boolean;
  // Set when the account signs in with Google ("sub" claim).
  googleId?: string;
  // Interface language last chosen with the EN / FR switch (used for e-mails and lesson summaries).
  locale?: "en" | "fr";
  createdAt: Date;
};

// Single-use links sent by e-mail. Only a hash of the token is stored.
export type AuthTokenDoc = {
  _id: string;
  userId: ObjectId;
  kind: "verify-email" | "reset-password";
  // Where to send the user once the link is used.
  next?: string;
  createdAt: Date;
  expiresAt: Date;
};

export type SessionDoc = { _id: string; userId: ObjectId; expiresAt: Date };

export type LanguageDoc = {
  _id: ObjectId;
  slug: string;
  name: string;
  nativeName: string;
  greeting: string;
  greetingMeaning: string;
  region: string;
  countries: string;
  speakers: string;
  family: string;
  description: string;
};

export type LessonDoc = {
  _id: ObjectId;
  studentId: ObjectId;
  tutorId: ObjectId;
  languageSlug: string;
  startsAt: Date;
  durationMinutes: number;
  price: number;
  status: LessonStatus;
  message: string;
  // Last time each participant was seen in the classroom, keyed by user id.
  presence?: Record<string, Date>;
  // Written by the tutor during or after the class.
  notes?: LessonNotes;
  // Shared document currently shown full screen in the classroom.
  presentedFileId?: ObjectId | null;
  summary?: LessonSummary;
  summaryStatus?: "pending" | "failed";
  // Live classroom state.
  boardOpen?: boolean;
  hands?: Record<string, boolean>;
  liveQuiz?: LiveQuiz | null;
  quizzes?: QuizResult[];
  // AI assistant: transcribes each participant who agreed, for captions and the recap.
  assistant?: { enabled: boolean; consent: Record<string, boolean> };
  // Absent on lessons booked before online payment existed (treated as settled).
  payment?: LessonPayment;
  // Set when the tutor scheduled the lesson from the calendar: the student accepts (and pays) it.
  proposedBy?: "tutor";
  // Shared by the lessons of a weekly series.
  seriesId?: ObjectId;
  // When the tutor was told that the student left this booking unpaid.
  abandonNotifiedAt?: Date;
  // Practice classroom of a tutor (fictional student): never listed, counted or billed.
  demo?: true;
  // Minutes the tutor added at the end of the lesson from the classroom (MAX_EXTRA_MINUTES at most).
  extraMinutes?: number;
  createdAt: Date;
};

// Add to lesson queries so practice classrooms never show up as real lessons.
export const REAL_LESSON = { demo: { $exists: false } } as const;

// What the student paid for a lesson, in their own currency (the price stays in euros).
export type LessonPayment = {
  provider: "flutterwave" | "demo";
  reference: string;
  status: "pending" | "paid" | "failed" | "refunded" | "refund_failed";
  amount: number;
  currency: string;
  country: string;
  method?: string;
  providerTxId?: string;
  createdAt: Date;
  paidAt?: Date;
  refundedAt?: Date;
};

export type LiveQuiz = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  answerIndex: number | null;
  closed: boolean;
};

export type QuizResult = { question: string; options: string[]; correctIndex: number; answerIndex: number | null; explanation: string };

// Short-lived classroom events delivered to both sides through the sync poll:
// reactions and whiteboard strokes / clears.
export type ClassEventDoc = { _id: ObjectId; lessonId: ObjectId; authorId: ObjectId; type: "reaction" | "stroke" | "clear"; payload: unknown; createdAt: Date };

// One finished sentence recognised from a participant's microphone.
export type TranscriptDoc = { _id: ObjectId; lessonId: ObjectId; speakerId: ObjectId; text: string; lang: string; createdAt: Date };

export type LessonNotes = { keyPoints: string; vocabulary: string; homework: string; updatedAt: Date };

// AI-written recap of a lesson, for the student to revise from.
export type LessonSummary = {
  overview: string;
  keyPoints: string[];
  vocabulary: { term: string; translation: string; example: string }[];
  grammar: string[];
  practice: string[];
  homework: string;
  // Added once the AI assistant transcribes the class; absent on older summaries.
  interaction?: string;
  corrections?: { said: string; correct: string; explanation: string }[];
  explanations?: string[];
  generatedAt: Date;
  model: string;
};

// Private feedback a student gives after a session, to help the tutor improve.
export type FeedbackDoc = {
  _id: ObjectId;
  lessonId: ObjectId;
  studentId: ObjectId;
  tutorId: ObjectId;
  rating: number;
  criteria: { clarity: number; interaction: number; content: number; pace: number };
  liked: string;
  improve: string;
  createdAt: Date;
  updatedAt: Date;
};

// Metadata stored with each GridFS file shared in a lesson.
export type LessonFileMeta = { lessonId: ObjectId; uploaderId: ObjectId; contentType: string };

// A profile photo uploaded from the device, already resized by the browser (one per user, _id = user id).
export type AvatarDoc = { _id: ObjectId; data: Binary; contentType: string; updatedAt: Date };

export type ReviewDoc = { _id: ObjectId; lessonId: ObjectId; studentId: ObjectId; tutorId: ObjectId; rating: number; comment: string; createdAt: Date };
export type MessageDoc = {
  _id: ObjectId;
  senderId: ObjectId;
  recipientId: ObjectId;
  body: string;
  readAt: Date | null;
  createdAt: Date;
  // Set on automatic notifications about the sender, shown only to the recipient (the tutor):
  // the student showed interest in the profile, or started a booking without finishing it.
  kind?: NotificationKind;
};
export type NotificationKind = "interest" | "booking_abandoned";

// A student started booking a tutor (picked a time slot). Used to remind the tutor
// when the booking is not finished.
export type BookingIntentDoc = {
  _id: ObjectId;
  studentId: ObjectId;
  tutorId: ObjectId;
  startedAt: Date;
  lastActivityAt: Date;
  // The student went on to the payment page.
  completedAt: Date | null;
  notifiedAt: Date | null;
};
export type TopicDoc = { _id: ObjectId; authorId: ObjectId; category: string; languageSlug: string | null; title: string; body: string; views: number; createdAt: Date };
export type ReplyDoc = { _id: ObjectId; topicId: ObjectId; authorId: ObjectId; body: string; createdAt: Date };

// WebRTC signalling and in-class chat for the virtual classroom.
export type SignalDoc = { _id: ObjectId; lessonId: ObjectId; from: ObjectId; to: ObjectId; type: string; payload: unknown; createdAt: Date };
export type ClassChatDoc = { _id: ObjectId; lessonId: ObjectId; authorId: ObjectId; body: string; createdAt: Date };

export type Collections = {
  users: Collection<UserDoc>;
  sessions: Collection<SessionDoc>;
  authTokens: Collection<AuthTokenDoc>;
  languages: Collection<LanguageDoc>;
  lessons: Collection<LessonDoc>;
  reviews: Collection<ReviewDoc>;
  messages: Collection<MessageDoc>;
  topics: Collection<TopicDoc>;
  replies: Collection<ReplyDoc>;
  signals: Collection<SignalDoc>;
  classChat: Collection<ClassChatDoc>;
  feedback: Collection<FeedbackDoc>;
  events: Collection<ClassEventDoc>;
  transcript: Collection<TranscriptDoc>;
  avatars: Collection<AvatarDoc>;
  calendarBlocks: Collection<CalendarBlockDoc>;
  bookingIntents: Collection<BookingIntentDoc>;
  files: GridFSBucket;
  // Tutors' presentation videos (metadata: { tutorId, contentType }).
  videos: GridFSBucket;
  meta: Collection<{ _id: string; at: Date }>;
};

// ── Connection ────────────────────────────────────────────

function collectionsOf(db: Db): Collections {
  return {
    users: db.collection("users"),
    sessions: db.collection("sessions"),
    authTokens: db.collection("auth_tokens"),
    languages: db.collection("languages"),
    lessons: db.collection("lessons"),
    reviews: db.collection("reviews"),
    messages: db.collection("messages"),
    topics: db.collection("forum_topics"),
    replies: db.collection("forum_replies"),
    signals: db.collection("classroom_signals"),
    classChat: db.collection("classroom_chat"),
    feedback: db.collection("lesson_feedback"),
    events: db.collection("classroom_events"),
    transcript: db.collection("classroom_transcript"),
    avatars: db.collection("avatars"),
    calendarBlocks: db.collection("calendar_blocks"),
    bookingIntents: db.collection("booking_intents"),
    files: new GridFSBucket(db, { bucketName: "lesson_files" }),
    videos: new GridFSBucket(db, { bucketName: "tutor_videos" }),
    meta: db.collection("meta"),
  };
}

async function init(): Promise<Collections> {
  // No silent fallback: every signup, login and write goes to the configured database.
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set. Add the address of your MongoDB database to .env.local, then restart the server.");
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
  } catch (err) {
    throw new Error(
      `Cannot reach MongoDB (${uri.replace(/\/\/[^@/]*@/, "//***@")}). ` +
        "Check MONGODB_URI in .env.local and, on Atlas, that your IP address is allowed (Network Access).",
      { cause: err },
    );
  }
  const c = collectionsOf(client.db());

  await Promise.all([
    c.users.createIndex({ email: 1 }, { unique: true }),
    c.users.createIndex({ role: 1, "tutor.approved": 1 }),
    c.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    c.authTokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    c.authTokens.createIndex({ userId: 1, kind: 1, createdAt: -1 }),
    c.users.createIndex({ googleId: 1 }, { unique: true, partialFilterExpression: { googleId: { $exists: true } } }),
    c.languages.createIndex({ slug: 1 }, { unique: true }),
    c.lessons.createIndex({ tutorId: 1, startsAt: 1 }),
    c.lessons.createIndex({ studentId: 1, startsAt: 1 }),
    c.lessons.createIndex({ "payment.reference": 1 }, { unique: true, partialFilterExpression: { "payment.reference": { $exists: true } } }),
    c.reviews.createIndex({ lessonId: 1 }, { unique: true }),
    c.reviews.createIndex({ tutorId: 1, createdAt: -1 }),
    c.messages.createIndex({ senderId: 1, recipientId: 1, _id: 1 }),
    c.messages.createIndex({ recipientId: 1, readAt: 1 }),
    c.replies.createIndex({ topicId: 1, _id: 1 }),
    c.signals.createIndex({ lessonId: 1, to: 1, _id: 1 }),
    c.signals.createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 }),
    c.classChat.createIndex({ lessonId: 1, _id: 1 }),
    c.feedback.createIndex({ lessonId: 1 }, { unique: true }),
    c.events.createIndex({ lessonId: 1, _id: 1 }),
    c.transcript.createIndex({ lessonId: 1, _id: 1 }),
    c.feedback.createIndex({ tutorId: 1, createdAt: -1 }),
    c.calendarBlocks.createIndex({ tutorId: 1, startsAt: 1 }),
    c.messages.createIndex({ kind: 1, senderId: 1, recipientId: 1, createdAt: -1 }, { partialFilterExpression: { kind: { $exists: true } } }),
    c.bookingIntents.createIndex({ studentId: 1, tutorId: 1, completedAt: 1, notifiedAt: 1 }),
    c.bookingIntents.createIndex({ completedAt: 1, notifiedAt: 1, lastActivityAt: 1 }),
    // Old intents are only history: drop them after 60 days.
    c.bookingIntents.createIndex({ startedAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 }),
    client.db().collection("lesson_files.files").createIndex({ "metadata.lessonId": 1, uploadDate: 1 }),
  ]);

  // The unique "seed" marker makes sure only one process ever seeds.
  const claimed = await c.meta.insertOne({ _id: "seed", at: new Date() }).then(() => true, () => false);
  if (claimed) await seed(c);
  return c;
}

const globalForDb = globalThis as unknown as { riyaDb?: Promise<Collections> };

export function getDb(): Promise<Collections> {
  globalForDb.riyaDb ??= init().catch((err) => {
    globalForDb.riyaDb = undefined; // retry on the next request
    throw err;
  });
  return globalForDb.riyaDb;
}

// Parses an id coming from a URL or a form; null when malformed.
export function toObjectId(value: unknown): ObjectId | null {
  return typeof value === "string" && ObjectId.isValid(value) && value.length === 24 ? new ObjectId(value) : null;
}

export { ObjectId };
