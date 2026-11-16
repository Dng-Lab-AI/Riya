"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { defineMessages } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { requireUser } from "../auth";
import { busyIntervals, isSlotBookable, lessonInterval, MIN_NOTICE_MS } from "../availability";
import { getDb, ObjectId, toObjectId, type LessonDoc } from "../db";
import { notifyInterest, recordBookingSubmitted } from "../notifications";
import { LAUNCH_COUNTRY, isKnownCountry } from "../payments/countries";
import { FREE_CANCELLATION_HOURS, isPaymentAvailable, isSettled, quoteLesson, refundLesson, startCheckout } from "../payments";
import { overlaps } from "../timezone";
import { generateLessonSummary, isSummaryAvailable } from "../summary";
import { int, refreshAll, text, type FormState } from "./shared";

const M = defineMessages({
  en: {
    notFound: "Tutor not found.", yourself: "You can't book a lesson with yourself.", when: "Choose a date and a time.",
    notice: "Book at least one hour in advance.", country: "Enter the country you're paying from.",
    noPayment: "Online payment isn't available yet. Please try again later.", language: "This tutor doesn't teach this language.",
    taken: "This slot is no longer available. Choose another one.", busy: "You already have a lesson at that time. Choose another slot.", failed: "The payment couldn't start. Please try again in a moment.",
    rating: "Choose a rating from 1 to 5.", completedOnly: "You can only review your completed lessons.", already: "You've already reviewed this lesson.",
    thanks: "Thank you for your review!", description: (name: string) => `Lesson with ${name}`,
  },
  fr: {
    notFound: "Tuteur introuvable.", yourself: "Vous ne pouvez pas réserver un cours avec vous-même.", when: "Choisissez une date et une heure.",
    notice: "Réservez au moins une heure à l'avance.", country: "Indiquez le pays depuis lequel vous payez.",
    noPayment: "Le paiement en ligne n'est pas encore disponible. Réessayez plus tard.", language: "Ce tuteur n'enseigne pas cette langue.",
    taken: "Ce créneau n'est plus disponible. Choisissez-en un autre.", busy: "Vous avez déjà un cours à cette heure-là. Choisissez un autre créneau.", failed: "Le paiement n'a pas pu démarrer. Réessayez dans un instant.",
    rating: "Choisissez une note de 1 à 5.", completedOnly: "Vous ne pouvez évaluer que vos cours terminés.", already: "Vous avez déjà évalué ce cours.",
    thanks: "Merci pour votre avis !", description: (name: string) => `Cours avec ${name}`,
  },
});

export async function bookLesson(tutorId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser(`/tuteurs/${tutorId}`);
  const t = M[await getLocale()];
  const tutorOid = toObjectId(tutorId);
  if (!tutorOid) return { error: t.notFound };
  if (user._id.equals(tutorOid)) return { error: t.yourself };

  const startsAt = new Date(text(formData, "starts_at", 40));
  const languageSlug = text(formData, "language", 40);
  const message = text(formData, "message", 1000);
  const country = text(formData, "country", 60);

  if (Number.isNaN(startsAt.getTime())) return { error: t.when };
  if (startsAt.getTime() < Date.now() + 60 * 60 * 1000) return { error: t.notice };
  if (!isKnownCountry(country)) return { error: t.country };
  if (!isPaymentAvailable()) return { error: t.noPayment };

  const db = await getDb();
  const tutor = await db.users.findOne({ _id: tutorOid, role: "tutor", status: "active", "tutor.approved": true, "tutor.languages.slug": languageSlug });
  if (!tutor?.tutor) return { error: t.language };

  // The slot must be within the tutor's availability and not overlap another lesson.
  if (!(await isSlotBookable(tutor, startsAt))) return { error: t.taken };
  // The one booking may be a tutor too, with their own lessons to give at that time.
  const slot: [number, number] = [startsAt.getTime(), startsAt.getTime() + 50 * 60 * 1000];
  if ((await busyIntervals({ studentId: user._id }, startsAt, new Date(slot[1]))).some((b) => overlaps(slot, b))) return { error: t.busy };

  const lesson: LessonDoc = {
    _id: new ObjectId(), studentId: user._id, tutorId: tutorOid, languageSlug, startsAt, durationMinutes: 50,
    price: tutor.tutor.hourlyRate, status: "pending", message, createdAt: new Date(),
  };
  await db.lessons.insertOne(lesson);
  // The booking reached the payment step: no "unfinished booking" reminder for the time slot picked.
  await recordBookingSubmitted(user._id, tutorOid);
  // Remember the country so the next booking offers the same payment methods.
  if (country !== user.country) await db.users.updateOne({ _id: user._id }, { $set: { country } });

  let checkoutUrl: string;
  try {
    checkoutUrl = await startCheckout(lesson, user, quoteLesson(country, lesson.price), t.description(tutor.name));
  } catch (err) {
    console.error("Booking payment", err);
    await db.lessons.deleteOne({ _id: lesson._id });
    return { error: t.failed };
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
  if (!tutor || (await slotTaken(lesson))) {
    await db.lessons.updateOne({ _id }, { $set: { status: "cancelled" } });
    refreshAll();
    redirect("/tableau-de-bord?creneau=perdu");
  }

  const checkoutUrl = await startCheckout(lesson, user, quoteLesson(lesson.payment.country, lesson.price), M[await getLocale()].description(tutor.name));
  redirect(checkoutUrl);
}

// Too late to book, or another lesson of the tutor now overlaps it.
async function slotTaken(lesson: LessonDoc) {
  if (lesson.startsAt.getTime() < Date.now() + MIN_NOTICE_MS) return true;
  const [start, end] = lessonInterval(lesson);
  const busy = await busyIntervals({ tutorId: lesson.tutorId }, new Date(start), new Date(end), lesson._id);
  return busy.some((b) => overlaps([start, end], b));
}

// The student accepts a lesson the tutor scheduled for them, and pays for it.
export async function acceptProposal(lessonId: string) {
  const user = await requireUser("/tableau-de-bord");
  const _id = toObjectId(lessonId);
  if (!_id) return;
  const db = await getDb();
  const lesson = await db.lessons.findOne({ _id, studentId: user._id, proposedBy: "tutor", status: "pending" });
  if (!lesson || lesson.payment?.status === "paid") return;

  const tutor = await db.users.findOne({ _id: lesson.tutorId, status: "active" });
  if (!tutor || (await slotTaken(lesson))) {
    await db.lessons.updateOne({ _id }, { $set: { status: "cancelled" } });
    refreshAll();
    redirect("/tableau-de-bord?creneau=perdu");
  }

  const country = lesson.payment?.country ?? (isKnownCountry(user.country) ? user.country : LAUNCH_COUNTRY);
  const checkoutUrl = await startCheckout(lesson, user, quoteLesson(country, lesson.price), M[await getLocale()].description(tutor.name));
  redirect(checkoutUrl);
}

type LessonAction = "confirm" | "decline" | "complete" | "cancel";

export async function updateLesson(lessonId: string, action: LessonAction) {
  const user = await requireUser("/tableau-de-bord");
  const _id = toObjectId(lessonId);
  if (!_id) return;
  const db = await getDb();
  const lesson = await db.lessons.findOne({ _id });
  // A practice classroom is never accepted, closed or cancelled like a real lesson.
  if (!lesson || lesson.demo) return;

  const isTutor = lesson.tutorId.equals(user._id);
  const isStudent = lesson.studentId.equals(user._id);
  const started = lesson.startsAt.getTime() <= Date.now();
  // The status in the filter guards against two clicks racing each other.
  const move = (from: string[], to: typeof lesson.status) => db.lessons.updateOne({ _id, status: { $in: from as (typeof lesson.status)[] } }, { $set: { status: to } });

  // A lesson the tutor proposed is confirmed by the student's payment, not by the tutor.
  const proposal = lesson.proposedBy === "tutor";

  if (action === "confirm" && isTutor && !proposal && isSettled(lesson)) {
    await move(["pending"], "confirmed");
  } else if (action === "decline" && (isTutor || (isStudent && proposal))) {
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
    if (modifiedCount) await db.lessons.updateOne({ _id }, { $set: { cancelledBy: isTutor ? "tutor" : "student" } });
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
  const t = M[await getLocale()];
  if (!(rating >= 1 && rating <= 5)) return { error: t.rating };

  const _id = toObjectId(lessonId);
  const db = await getDb();
  const lesson = _id && (await db.lessons.findOne({ _id, studentId: user._id, status: "completed" }));
  if (!lesson) return { error: t.completedOnly };

  try {
    await db.reviews.insertOne({ _id: new ObjectId(), lessonId: lesson._id, studentId: user._id, tutorId: lesson.tutorId, rating, comment, createdAt: new Date() });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return { error: t.already };
    throw err;
  }
  await db.users.updateOne({ _id: lesson.tutorId }, { $inc: { "tutor.ratingSum": rating, "tutor.ratingCount": 1 } });
  refreshAll();
  return { success: t.thanks };
}

export async function toggleFavorite(tutorId: string) {
  const user = await requireUser(`/tuteurs/${tutorId}`);
  const _id = toObjectId(tutorId);
  if (!_id || _id.equals(user._id)) return;
  const db = await getDb();
  const removed = await db.users.updateOne({ _id: user._id, favorites: _id }, { $pull: { favorites: _id } });
  if (!removed.modifiedCount && (await db.users.countDocuments({ _id, role: "tutor" }))) {
    await db.users.updateOne({ _id: user._id }, { $addToSet: { favorites: _id } });
    // Liking a profile tells the tutor this student is interested (at most once a month).
    if (user.role !== "admin") await notifyInterest(user, _id);
  }
  refreshAll();
}
