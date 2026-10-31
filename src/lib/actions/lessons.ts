"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { requireUser } from "../auth";
import { getDb, ObjectId, toObjectId, type LessonDoc } from "../db";
import { isKnownCountry } from "../payments/countries";
import { FREE_CANCELLATION_HOURS, holdsSlot, isPaymentAvailable, isSettled, quoteLesson, refundLesson, startCheckout } from "../payments";
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
  const country = text(formData, "country", 60);

  if (Number.isNaN(startsAt.getTime())) return { error: "Choisissez une date et une heure." };
  if (startsAt.getTime() < Date.now() + 60 * 60 * 1000) return { error: "Réservez au moins une heure à l'avance." };
  if (!isKnownCountry(country)) return { error: "Indiquez le pays depuis lequel vous payez." };
  if (!isPaymentAvailable()) return { error: "Le paiement en ligne n'est pas encore disponible. Réessayez plus tard." };

  const db = await getDb();
  const tutor = await db.users.findOne({ _id: tutorOid, role: "tutor", status: "active", "tutor.approved": true, "tutor.languages.slug": languageSlug });
  if (!tutor?.tutor) return { error: "Ce tuteur n'enseigne pas cette langue." };

  const clash = await db.lessons.findOne({ tutorId: tutorOid, startsAt, ...holdsSlot() });
  if (clash) return { error: "Ce créneau vient d'être réservé. Choisissez-en un autre." };

  const lesson: LessonDoc = {
    _id: new ObjectId(), studentId: user._id, tutorId: tutorOid, languageSlug, startsAt, durationMinutes: 50,
    price: tutor.tutor.hourlyRate, status: "pending", message, createdAt: new Date(),
  };
  await db.lessons.insertOne(lesson);
  // Remember the country so the next booking offers the same payment methods.
  if (country !== user.country) await db.users.updateOne({ _id: user._id }, { $set: { country } });

  let checkoutUrl: string;
  try {
    checkoutUrl = await startCheckout(lesson, user, quoteLesson(country, lesson.price), `Cours avec ${tutor.name}`);
  } catch (err) {
    console.error("Paiement de la réservation", err);
    await db.lessons.deleteOne({ _id: lesson._id });
    return { error: "Le paiement n'a pas pu démarrer. Réessayez dans un instant." };
  }
  refreshAll();
  redirect(checkoutUrl);
}

// Lets the student pay a booking whose payment was abandoned or refused.
export async function payLesson(lessonId: string) {
  const user = await requireUser("/tableau-de-bord");
  const _id = toObjectId(lessonId);
  if (!_id) return;
  const db = await getDb();
  const lesson = await db.lessons.findOne({ _id, studentId: user._id, status: "pending", "payment.status": { $in: ["pending", "failed"] } });
  if (!lesson?.payment) return;

  const tutor = await db.users.findOne({ _id: lesson.tutorId });
  const taken = await db.lessons.findOne({ _id: { $ne: _id }, tutorId: lesson.tutorId, startsAt: lesson.startsAt, ...holdsSlot() });
  if (!tutor || taken || lesson.startsAt.getTime() < Date.now() + 60 * 60 * 1000) {
    await db.lessons.updateOne({ _id }, { $set: { status: "cancelled" } });
    refreshAll();
    redirect("/tableau-de-bord?creneau=perdu");
  }

  const checkoutUrl = await startCheckout(lesson, user, quoteLesson(lesson.payment.country, lesson.price), `Cours avec ${tutor.name}`);
  redirect(checkoutUrl);
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

  if (action === "confirm" && isTutor && isSettled(lesson)) {
    await move(["pending"], "confirmed");
  } else if (action === "decline" && isTutor) {
    const { modifiedCount } = await move(["pending"], "cancelled");
    if (modifiedCount) await refundLesson(lesson);
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
    const { modifiedCount } = await move(["pending", "confirmed"], "cancelled");
    // The tutor cancelling, or the student cancelling early enough, gets the student refunded.
    const early = lesson.startsAt.getTime() - Date.now() >= FREE_CANCELLATION_HOURS * 60 * 60 * 1000;
    if (modifiedCount && (isTutor || early)) await refundLesson(lesson);
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
