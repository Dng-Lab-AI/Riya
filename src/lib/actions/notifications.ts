"use server";

import { getCurrentUser, requireUser } from "../auth";
import { getDb, toObjectId } from "../db";
import { notifyInterest, recordBookingStarted } from "../notifications";
import { refreshAll, type FormState } from "./shared";

// "I'm interested": the tutor gets a notification inviting them to contact the student.
export async function expressInterest(tutorId: string): Promise<FormState> {
  const user = await requireUser(`/tuteurs/${tutorId}`);
  const _id = toObjectId(tutorId);
  if (!_id || _id.equals(user._id)) return { error: "Tuteur introuvable." };
  if (user.role !== "student") return { error: "Seuls les élèves peuvent signaler leur intérêt à un tuteur." };

  const db = await getDb();
  if (!(await db.users.countDocuments({ _id, role: "tutor", status: "active" }))) return { error: "Tuteur introuvable." };
  await notifyInterest(user, _id);
  refreshAll();
  return { success: "C'est noté ! Le tuteur est prévenu de votre intérêt et devrait vous écrire bientôt." };
}

// Called by the booking form when the student picks a time slot.
export async function bookingStarted(tutorId: string) {
  const user = await getCurrentUser();
  const _id = toObjectId(tutorId);
  if (!user || !_id || _id.equals(user._id)) return;
  await recordBookingStarted(user._id, _id);
}
