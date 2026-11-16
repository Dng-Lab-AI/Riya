"use server";

import { after } from "next/server";
import { defineMessages } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { requireUser } from "../auth";
import { getParticipantLesson, sessionHappened } from "../classroom";
import { getDb, ObjectId } from "../db";
import { generateLessonSummary, isSummaryAvailable } from "../summary";
import { int, refreshAll, text, type FormState } from "./shared";

const M = defineMessages({
  en: {
    tutorNotes: "Only the tutor can edit the lesson notes.", saved: "Notes saved.", studentOnly: "Only the student of this lesson can rate it.",
    notYet: "You'll be able to rate the session once it has taken place.", every: "Give each criterion a rating from 1 to 5.",
    thanks: "Thank you! Your feedback has been sent to your tutor.",
  },
  fr: {
    tutorNotes: "Seul le tuteur peut modifier les notes du cours.", saved: "Notes enregistrées.", studentOnly: "Seul l'élève de ce cours peut le noter.",
    notYet: "Vous pourrez noter la séance une fois qu'elle aura eu lieu.", every: "Donnez une note de 1 à 5 à chaque critère.",
    thanks: "Merci ! Votre retour a été transmis à votre tuteur.",
  },
});

export async function saveLessonNotes(lessonId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser(`/cours/${lessonId}`);
  const room = await getParticipantLesson(lessonId, user._id);
  const t = M[await getLocale()];
  if (!room || room.role !== "tutor") return { error: t.tutorNotes };

  const notes = {
    keyPoints: text(formData, "keyPoints", 8000),
    vocabulary: text(formData, "vocabulary", 8000),
    homework: text(formData, "homework", 4000),
    updatedAt: new Date(),
  };
  await (await getDb()).lessons.updateOne({ _id: room.lesson._id }, { $set: { notes } });
  refreshAll();
  return { success: t.saved };
}

const score = (formData: FormData, key: string) => {
  const n = int(formData, key);
  return n >= 1 && n <= 5 ? n : null;
};

export async function submitFeedback(lessonId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser(`/cours/${lessonId}`);
  const room = await getParticipantLesson(lessonId, user._id);
  const t = M[await getLocale()];
  if (!room || room.role !== "student") return { error: t.studentOnly };
  if (!sessionHappened(room.lesson)) return { error: t.notYet };

  const rating = score(formData, "rating");
  const criteria = {
    clarity: score(formData, "clarity"),
    interaction: score(formData, "interaction"),
    content: score(formData, "content"),
    pace: score(formData, "pace"),
  };
  if (!rating || Object.values(criteria).some((v) => v === null)) return { error: t.every };

  const now = new Date();
  await (await getDb()).feedback.updateOne(
    { lessonId: room.lesson._id },
    {
      $set: { rating, criteria: criteria as Record<keyof typeof criteria, number>, liked: text(formData, "liked", 2000), improve: text(formData, "improve", 2000), updatedAt: now },
      $setOnInsert: { _id: new ObjectId(), studentId: user._id, tutorId: room.lesson.tutorId, createdAt: now },
    },
    { upsert: true },
  );
  refreshAll();
  return { success: t.thanks };
}

// Starts (or restarts) the AI recap; it runs after the response so the page stays fast.
export async function requestSummary(lessonId: string) {
  const user = await requireUser(`/cours/${lessonId}`);
  const room = await getParticipantLesson(lessonId, user._id);
  if (!room || !sessionHappened(room.lesson) || !isSummaryAvailable()) return;
  if (room.lesson.summary && room.role !== "tutor") return; // only the tutor can regenerate
  await (await getDb()).lessons.updateOne({ _id: room.lesson._id }, { $set: { summaryStatus: "pending" } });
  after(() => generateLessonSummary(lessonId));
  refreshAll();
}

// Either participant can erase the AI transcript of their lesson.
export async function deleteTranscript(lessonId: string) {
  const user = await requireUser(`/cours/${lessonId}`);
  const room = await getParticipantLesson(lessonId, user._id);
  if (!room) return;
  await (await getDb()).transcript.deleteMany({ lessonId: room.lesson._id });
  refreshAll();
}
