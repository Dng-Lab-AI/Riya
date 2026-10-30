import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isClassroomOpen } from "@/lib/classroom";
import { BOARD_COLORS, REACTIONS } from "@/lib/constants";
import { getDb, ObjectId, toObjectId, type LessonDoc, type LiveQuiz } from "@/lib/db";
import { listLessonFiles } from "@/lib/documents";

// Live classroom relay. Both participants poll GET about once a second; everything
// they do goes through POST: WebRTC signals, chat, documents on stage, live notes,
// reactions, raised hands, whiteboard strokes, quizzes and the AI assistant's transcript.

const SIGNAL_TYPES = new Set(["hello", "offer", "answer", "candidate", "bye"]);
const PEER_TIMEOUT_MS = 6000;
const MAX_BODY_BYTES = 64 * 1024;
const MAX_STROKE_POINTS = 600;

async function loadRoom(ctx: RouteContext<"/api/classe/[id]">) {
  const user = await getCurrentUser();
  if (!user) return { error: Response.json({ error: "Non connecté" }, { status: 401 }) };
  const _id = toObjectId((await ctx.params).id);
  const db = await getDb();
  const lesson = _id && (await db.lessons.findOne({ _id, $or: [{ studentId: user._id }, { tutorId: user._id }] }));
  if (!lesson) return { error: Response.json({ error: "Cours introuvable" }, { status: 404 }) };
  const otherId = lesson.tutorId.equals(user._id) ? lesson.studentId : lesson.tutorId;
  return { user, lesson, otherId, db };
}

// The student only learns the right answer once they have answered (or the quiz is over).
function quizFor(quiz: LiveQuiz | null | undefined, isTutor: boolean) {
  if (!quiz) return null;
  const revealed = isTutor || quiz.answerIndex !== null || quiz.closed;
  return {
    id: quiz.id,
    question: quiz.question,
    options: quiz.options,
    answerIndex: quiz.answerIndex,
    closed: quiz.closed,
    correctIndex: revealed ? quiz.correctIndex : null,
    explanation: revealed ? quiz.explanation : "",
  };
}

const archiveQuiz = (quiz: LiveQuiz) => ({ question: quiz.question, options: quiz.options, correctIndex: quiz.correctIndex, answerIndex: quiz.answerIndex, explanation: quiz.explanation });

export async function GET(request: NextRequest, ctx: RouteContext<"/api/classe/[id]">) {
  const room = await loadRoom(ctx);
  if (room.error) return room.error;
  const { user, lesson, otherId, db } = room;
  const open = isClassroomOpen(lesson);
  const isTutor = lesson.tutorId.equals(user._id);

  const now = new Date();
  if (open) await db.lessons.updateOne({ _id: lesson._id }, { $set: { [`presence.${user.id}`]: now } });

  const param = (name: string) => toObjectId(request.nextUrl.searchParams.get(name));
  const signalAfter = param("signals");
  const chatAfter = param("chat");
  const eventsAfter = param("events");
  const transcriptAfter = param("transcript");

  // First call: start the signal stream "now" so stale offers from a previous visit are ignored.
  const signals = open && signalAfter
    ? await db.signals.find({ lessonId: lesson._id, to: user._id, _id: { $gt: signalAfter } }).sort({ _id: 1 }).limit(200).toArray()
    : [];
  const chat = await db.classChat
    .find({ lessonId: lesson._id, ...(chatAfter ? { _id: { $gt: chatAfter } } : {}) })
    .sort({ _id: 1 })
    .limit(200)
    .toArray();

  // On the first call, replay the whiteboard since its last clear; afterwards, only new events.
  let events;
  let eventsCursor: ObjectId;
  if (eventsAfter) {
    events = await db.events.find({ lessonId: lesson._id, _id: { $gt: eventsAfter } }).sort({ _id: 1 }).limit(500).toArray();
    eventsCursor = events.at(-1)?._id ?? eventsAfter;
  } else {
    const lastClear = await db.events.find({ lessonId: lesson._id, type: "clear" }).sort({ _id: -1 }).limit(1).next();
    events = await db.events
      .find({ lessonId: lesson._id, type: "stroke", ...(lastClear ? { _id: { $gt: lastClear._id } } : {}) })
      .sort({ _id: 1 })
      .limit(5000)
      .toArray();
    // Continue after the newest event of any kind, so old reactions are not replayed.
    const latest = await db.events.find({ lessonId: lesson._id }).sort({ _id: -1 }).limit(1).next();
    eventsCursor = latest?._id ?? new ObjectId();
  }

  const transcript = transcriptAfter
    ? await db.transcript.find({ lessonId: lesson._id, _id: { $gt: transcriptAfter } }).sort({ _id: 1 }).limit(100).toArray()
    : [];

  const lastSeen = lesson.presence?.[otherId.toHexString()];
  const documents = await listLessonFiles(lesson._id);
  const assistant = lesson.assistant ?? { enabled: false, consent: {} };

  return Response.json({
    open,
    status: lesson.status,
    peerOnline: !!lastSeen && now.getTime() - new Date(lastSeen).getTime() < PEER_TIMEOUT_MS,
    documents,
    presentedFileId: lesson.presentedFileId?.toHexString() ?? null,
    boardOpen: !!lesson.boardOpen,
    notes: lesson.notes ? { keyPoints: lesson.notes.keyPoints, vocabulary: lesson.notes.vocabulary, homework: lesson.notes.homework } : null,
    hands: { me: !!lesson.hands?.[user.id], other: !!lesson.hands?.[otherId.toHexString()] },
    quiz: quizFor(lesson.liveQuiz, isTutor),
    assistant: { enabled: assistant.enabled, myConsent: assistant.consent[user.id] ?? null, otherConsent: assistant.consent[otherId.toHexString()] ?? null },
    signalCursor: (signals.at(-1)?._id ?? signalAfter ?? new ObjectId()).toHexString(),
    chatCursor: (chat.at(-1)?._id ?? chatAfter)?.toHexString() ?? null,
    eventsCursor: eventsCursor.toHexString(),
    transcriptCursor: (transcript.at(-1)?._id ?? transcriptAfter ?? new ObjectId()).toHexString(),
    signals: signals.map((s) => ({ type: s.type, payload: s.payload })),
    chat: chat.map((m) => ({ id: m._id.toHexString(), author_id: m.authorId.toHexString(), body: m.body, created_at: m.createdAt.toISOString() })),
    events: events.map((e) => ({ id: e._id.toHexString(), type: e.type, author_id: e.authorId.toHexString(), payload: e.payload })),
    transcript: transcript.map((t) => ({ id: t._id.toHexString(), speaker_id: t.speakerId.toHexString(), text: t.text })),
  });
}

type Input = {
  kind?: string;
  type?: string;
  payload?: unknown;
  body?: string;
  fileId?: string | null;
  keyPoints?: string;
  vocabulary?: string;
  homework?: string;
  emoji?: string;
  raised?: boolean;
  forOther?: boolean;
  open?: boolean;
  color?: string;
  width?: number;
  points?: unknown;
  question?: string;
  options?: unknown;
  correctIndex?: number;
  explanation?: string;
  quizId?: string;
  index?: number;
  enabled?: boolean;
  accepted?: boolean;
  text?: string;
  lang?: string;
};

const clip = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

export async function POST(request: NextRequest, ctx: RouteContext<"/api/classe/[id]">) {
  const room = await loadRoom(ctx);
  if (room.error) return room.error;
  const { user, lesson, otherId, db } = room;
  if (!isClassroomOpen(lesson)) return Response.json({ error: "La salle de classe est fermée." }, { status: 403 });

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return Response.json({ error: "Message trop volumineux" }, { status: 413 });
  let input: Input;
  try {
    input = JSON.parse(raw);
  } catch {
    return Response.json({ error: "JSON invalide" }, { status: 400 });
  }

  const isTutor = lesson.tutorId.equals(user._id);
  const ok = () => Response.json({ ok: true });
  const bad = (error = "Requête invalide", status = 400) => Response.json({ error }, { status });
  const set = (fields: Partial<LessonDoc> | Record<string, unknown>) => db.lessons.updateOne({ _id: lesson._id }, { $set: fields });
  const addEvent = (type: "reaction" | "stroke" | "clear", payload: unknown) =>
    db.events.insertOne({ _id: new ObjectId(), lessonId: lesson._id, authorId: user._id, type, payload, createdAt: new Date() });

  switch (input.kind) {
    case "signal": {
      if (!input.type || !SIGNAL_TYPES.has(input.type)) return bad();
      await db.signals.insertOne({ _id: new ObjectId(), lessonId: lesson._id, from: user._id, to: otherId, type: input.type, payload: input.payload ?? null, createdAt: new Date() });
      if (input.type === "bye") await db.lessons.updateOne({ _id: lesson._id }, { $unset: { [`presence.${user.id}`]: "" } });
      return ok();
    }

    case "chat": {
      const body = clip(input.body, 2000);
      if (!body) return bad("Message vide");
      await db.classChat.insertOne({ _id: new ObjectId(), lessonId: lesson._id, authorId: user._id, body, createdAt: new Date() });
      return ok();
    }

    // The tutor puts a shared document on the main stage for both participants.
    case "present": {
      if (!isTutor) return bad("Réservé au tuteur", 403);
      const fileId = input.fileId ? toObjectId(input.fileId) : null;
      if (input.fileId && !fileId) return bad("Document invalide");
      if (fileId && !(await db.files.find({ _id: fileId, "metadata.lessonId": lesson._id }).hasNext())) return bad("Document introuvable", 404);
      await set(fileId ? { presentedFileId: fileId, boardOpen: false } : { presentedFileId: null });
      return ok();
    }

    // Live notes typed by the tutor; the student sees them update.
    case "notes": {
      if (!isTutor) return bad("Réservé au tuteur", 403);
      await set({ notes: { keyPoints: clip(input.keyPoints, 8000), vocabulary: clip(input.vocabulary, 8000), homework: clip(input.homework, 4000), updatedAt: new Date() } });
      return ok();
    }

    case "reaction": {
      if (!input.emoji || !REACTIONS.includes(input.emoji)) return bad();
      await addEvent("reaction", { emoji: input.emoji });
      return ok();
    }

    // Anyone raises or lowers their own hand; the tutor can also lower the student's.
    case "hand": {
      const target = input.forOther && isTutor ? otherId.toHexString() : user.id;
      if (input.forOther && (!isTutor || input.raised)) return bad();
      await set({ [`hands.${target}`]: !!input.raised });
      return ok();
    }

    // Whiteboard: coordinates are normalised to 0..1 so both screens line up.
    case "board": {
      if (!isTutor) return bad("Réservé au tuteur", 403);
      await set(input.open ? { boardOpen: true, presentedFileId: null } : { boardOpen: false });
      return ok();
    }
    case "stroke": {
      const points = Array.isArray(input.points) ? input.points.slice(0, MAX_STROKE_POINTS) : [];
      const valid = points.every((p) => Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === "number" && n >= 0 && n <= 1));
      const width = Number(input.width);
      if (!points.length || !valid || !BOARD_COLORS.includes(String(input.color)) || !(width >= 1 && width <= 40)) return bad();
      await addEvent("stroke", { color: input.color, width, points: points.map((p) => (p as number[]).map((n) => Math.round(n * 10000) / 10000)) });
      return ok();
    }
    case "clear": {
      if (!isTutor) return bad("Réservé au tuteur", 403);
      await addEvent("clear", null);
      return ok();
    }

    // Quick quiz: the tutor asks, the student answers, both see the result.
    case "quiz": {
      if (!isTutor) return bad("Réservé au tuteur", 403);
      const options = Array.isArray(input.options) ? input.options.map((o) => clip(o, 200)).filter(Boolean).slice(0, 4) : [];
      const question = clip(input.question, 300);
      const correctIndex = Number(input.correctIndex);
      if (!question || options.length < 2 || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
        return bad("Une question, 2 à 4 réponses et la bonne réponse sont nécessaires.");
      }
      const quiz: LiveQuiz = { id: new ObjectId().toHexString(), question, options, correctIndex, explanation: clip(input.explanation, 500), answerIndex: null, closed: false };
      const previous = lesson.liveQuiz;
      await db.lessons.updateOne({ _id: lesson._id }, { $set: { liveQuiz: quiz }, ...(previous ? { $push: { quizzes: archiveQuiz(previous) } } : {}) });
      return ok();
    }
    case "answer": {
      const quiz = lesson.liveQuiz;
      if (isTutor || !quiz || quiz.id !== input.quizId || quiz.closed) return bad("Ce quiz n'est plus actif.");
      const index = Number(input.index);
      if (!Number.isInteger(index) || index < 0 || index >= quiz.options.length) return bad();
      // Only the first answer counts; a repeat gets the result of the recorded one.
      await db.lessons.updateOne({ _id: lesson._id, "liveQuiz.id": quiz.id, "liveQuiz.answerIndex": null }, { $set: { "liveQuiz.answerIndex": index } });
      const answer = quiz.answerIndex ?? index;
      return Response.json({ answerIndex: answer, correct: answer === quiz.correctIndex, correctIndex: quiz.correctIndex, explanation: quiz.explanation });
    }
    case "quiz-close": {
      if (!isTutor) return bad("Réservé au tuteur", 403);
      const quiz = lesson.liveQuiz;
      if (quiz) await db.lessons.updateOne({ _id: lesson._id }, { $set: { liveQuiz: null }, $push: { quizzes: archiveQuiz(quiz) } });
      return ok();
    }

    // AI assistant: the tutor switches it on; each participant decides whether their own voice is transcribed.
    case "assistant": {
      if (!isTutor) return bad("Réservé au tuteur", 403);
      await set(input.enabled ? { "assistant.enabled": true, [`assistant.consent.${user.id}`]: true } : { "assistant.enabled": false });
      return ok();
    }
    case "consent": {
      await set({ [`assistant.consent.${user.id}`]: !!input.accepted });
      return ok();
    }
    case "transcript": {
      const assistant = lesson.assistant;
      if (!assistant?.enabled || !assistant.consent[user.id]) return bad("Transcription non autorisée", 403);
      const text = clip(input.text, 1000);
      if (!text) return bad();
      await db.transcript.insertOne({ _id: new ObjectId(), lessonId: lesson._id, speakerId: user._id, text, lang: clip(input.lang, 20), createdAt: new Date() });
      return ok();
    }
  }

  return bad();
}
