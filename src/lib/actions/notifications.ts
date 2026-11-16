"use server";

import { defineMessages } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { getCurrentUser, requireUser } from "../auth";
import { getDb, toObjectId } from "../db";
import { notifyInterest, recordBookingStarted } from "../notifications";
import { refreshAll, type FormState } from "./shared";

const M = defineMessages({
  en: {
    notFound: "Tutor not found.",
    studentsOnly: "Only students can tell a tutor they're interested.",
    done: "Noted! The tutor knows you're interested and should write to you soon.",
  },
  fr: {
    notFound: "Tuteur introuvable.",
    studentsOnly: "Seuls les élèves peuvent signaler leur intérêt à un tuteur.",
    done: "C'est noté ! Le tuteur est prévenu de votre intérêt et devrait vous écrire bientôt.",
  },
});

// "I'm interested": the tutor gets a notification inviting them to contact the student.
export async function expressInterest(tutorId: string): Promise<FormState> {
  const user = await requireUser(`/tuteurs/${tutorId}`);
  const t = M[await getLocale()];
  const _id = toObjectId(tutorId);
  if (!_id || _id.equals(user._id)) return { error: t.notFound };
  // Students, and tutors looking for a tutor of their own (not the team).
  if (user.role === "admin") return { error: t.studentsOnly };

  const db = await getDb();
  if (!(await db.users.countDocuments({ _id, role: "tutor", status: "active" }))) return { error: t.notFound };
  await notifyInterest(user, _id);
  refreshAll();
  return { success: t.done };
}

// Called by the booking form when the student picks a time slot.
export async function bookingStarted(tutorId: string) {
  const user = await getCurrentUser();
  const _id = toObjectId(tutorId);
  if (!user || !_id || _id.equals(user._id)) return;
  await recordBookingStarted(user._id, _id);
}
