"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { requireUser } from "../auth";
import { getDb, ObjectId, toObjectId } from "../db";
import { generateLessonSummary, isSummaryAvailable } from "../summary";
import { int, refreshAll, text, type FormState } from "./shared";

export async function bookLesson(tutorId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser(`/tuteurs/${tutorId}`);
  const tutorOid = toObjectId(tutorId);
  if (!tutorOid) return { error: "Tuteur introuvable." };
  if (user._id.equals(tutorOid)) return { error: "Vous ne pouvez pas réserver un cours avec vous-même." };

  const startsAt = new Date(text(formData, "starts_at", 40));
  const languageSlug = text(formData, "language", 40);
  const message = text(formData, "message", 1000);

  if (Number.isNaN(startsAt.getTime())) return { error: "Choisissez une date et une heure." };
  if (startsAt.getTime() < Date.now() + 60 * 60 * 1000) return { error: "Réservez au moins une heure à l'avance." };

  const db = await getDb();
  const tutor = await db.users.findOne({ _id: tutorOid, role: "tutor", status: "active", "tutor.approved": true, "tutor.languages.slug": languageSlug });
  if (!tutor?.tutor) return { error: "Ce tuteur n'enseigne pas cette langue." };

  const clash = await db.lessons.findOne({ tutorId: tutorOid, startsAt, status: { $in: ["pending", "confirmed"] } });
  if (clash) return { error: "Ce créneau vient d'être réservé. Choisissez-en un autre." };

  await db.lessons.insertOne({
    _id: new ObjectId(), studentId: user._id, tutorId: tutorOid, languageSlug, startsAt, durationMinutes: 50,
    price: tutor.tutor.hourlyRate, status: "pending", message, createdAt: new Date(),
  });

  refreshAll();
  redirect("/tableau-de-bord?reserve=1");
}

type LessonAction = "confirm" | "decline" | "complete" | "cancel";

export async function updateLesson(lessonId: string, action: LessonAction) {
  const user = await requireUser("/tableau-de-bord");
  const _id = toObjectId(lessonId);
  if (!_id) return;
  const db = await getDb();
  const lesson = await db.lessons.findOne({ _id });
  if (!lesson) return;

  const isTutor = lesson.tutorId.equals(user._id);
  const isStudent = lesson.studentId.equals(user._id);
  const started = lesson.startsAt.getTime() <= Date.now();
  // The status in the filter guards against two clicks racing each other.
  const move = (from: string[], to: typeof lesson.status) => db.lessons.updateOne({ _id, status: { $in: from as (typeof lesson.status)[] } }, { $set: { status: to } });

  if (action === "confirm" && isTutor) {
    await move(["pending"], "confirmed");
  } else if (action === "decline" && isTutor) {
    await move(["pending"], "cancelled");
  } else if (action === "complete" && isTutor && started) {
    const { modifiedCount } = await move(["confirmed"], "completed");
    if (modifiedCount) {
      await db.users.updateOne({ _id: lesson.tutorId }, { $inc: { "tutor.lessonCount": 1 } });
      // Prepare the student's revision sheet as soon as the lesson is closed.
      if (isSummaryAvailable() && !lesson.summary) {
        await db.lessons.updateOne({ _id }, { $set: { summaryStatus: "pending" } });
        after(() => generateLessonSummary(lessonId));
      }
    }
  } else if (action === "cancel" && (isStudent || isTutor) && !started) {
    await move(["pending", "confirmed"], "cancelled");
  }
  refreshAll();
}

export async function leaveReview(lessonId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/tableau-de-bord");
  const rating = int(formData, "rating");
  const comment = text(formData, "comment", 1000);
  if (!(rating >= 1 && rating <= 5)) return { error: "Choisissez une note de 1 à 5." };

  const _id = toObjectId(lessonId);
  const db = await getDb();
  const lesson = _id && (await db.lessons.findOne({ _id, studentId: user._id, status: "completed" }));
  if (!lesson) return { error: "Vous ne pouvez évaluer que vos cours terminés." };

  try {
    await db.reviews.insertOne({ _id: new ObjectId(), lessonId: lesson._id, studentId: user._id, tutorId: lesson.tutorId, rating, comment, createdAt: new Date() });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return { error: "Vous avez déjà évalué ce cours." };
    throw err;
  }
  await db.users.updateOne({ _id: lesson.tutorId }, { $inc: { "tutor.ratingSum": rating, "tutor.ratingCount": 1 } });
  refreshAll();
  return { success: "Merci pour votre avis !" };
}

export async function toggleFavorite(tutorId: string) {
  const user = await requireUser(`/tuteurs/${tutorId}`);
  const _id = toObjectId(tutorId);
  if (!_id) return;
  const db = await getDb();
  const removed = await db.users.updateOne({ _id: user._id, favorites: _id }, { $pull: { favorites: _id } });
  if (!removed.modifiedCount && (await db.users.countDocuments({ _id, role: "tutor" }))) {
    await db.users.updateOne({ _id: user._id }, { $addToSet: { favorites: _id } });
  }
  refreshAll();
}
