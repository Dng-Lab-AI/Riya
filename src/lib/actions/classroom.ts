"use server";

import { after } from "next/server";
import { requireUser } from "../auth";
import { getParticipantLesson, sessionHappened } from "../classroom";
import { getDb, ObjectId } from "../db";
import { generateLessonSummary, isSummaryAvailable } from "../summary";
import { int, refreshAll, text, type FormState } from "./shared";

export async function saveLessonNotes(lessonId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser(`/cours/${lessonId}`);
  const room = await getParticipantLesson(lessonId, user._id);
  if (!room || room.role !== "tutor") return { error: "Seul le tuteur peut modifier les notes du cours." };

  const notes = {
    keyPoints: text(formData, "keyPoints", 8000),
    vocabulary: text(formData, "vocabulary", 8000),
    homework: text(formData, "homework", 4000),
    updatedAt: new Date(),
  };
  await (await getDb()).lessons.updateOne({ _id: room.lesson._id }, { $set: { notes } });
  refreshAll();
  return { success: "Notes enregistrées." };
}

const score = (formData: FormData, key: string) => {
  const n = int(formData, key);
  return n >= 1 && n <= 5 ? n : null;
};

export async function submitFeedback(lessonId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser(`/cours/${lessonId}`);
  const room = await getParticipantLesson(lessonId, user._id);
  if (!room || room.role !== "student") return { error: "Seul l'élève de ce cours peut le noter." };
  if (!sessionHappened(room.lesson)) return { error: "Vous pourrez noter la séance une fois qu'elle aura eu lieu." };

  const rating = score(formData, "rating");
  const criteria = {
    clarity: score(formData, "clarity"),
    interaction: score(formData, "interaction"),
    content: score(formData, "content"),
    pace: score(formData, "pace"),
  };
  if (!rating || Object.values(criteria).some((v) => v === null)) return { error: "Donnez une note de 1 à 5 à chaque critère." };

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
  return { success: "Merci ! Votre retour a été transmis à votre tuteur." };
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
