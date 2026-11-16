"use server";

import { defineMessages } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { requireRole } from "../auth";
import { getDb, toObjectId } from "../db";
import { emptyTutorProfile } from "../tutor-profile";
import { tellTutorDecision } from "../tutor-review";
import { refreshAll, text, type FormState } from "./shared";

const M = defineMessages({
  en: { note: "Explain in a few words what the tutor should change (at least 10 characters).", notFound: "Tutor not found.", sent: "The tutor has been told what to change." },
  fr: { note: "Expliquez en quelques mots ce que le tuteur doit modifier (10 caractères minimum).", notFound: "Tuteur introuvable.", sent: "Le tuteur a été prévenu des modifications à faire." },
});

export async function setUserStatus(userId: string, status: "active" | "suspended") {
  const admin = await requireRole("admin", "/admin");
  const _id = toObjectId(userId);
  if (!_id || _id.equals(admin._id) || !["active", "suspended"].includes(status)) return;
  const db = await getDb();
  await db.users.updateOne({ _id }, { $set: { status } });
  // Suspending signs the member out everywhere.
  if (status === "suspended") await db.sessions.deleteMany({ userId: _id });
  refreshAll();
}

export async function setUserRole(userId: string, role: "student" | "tutor") {
  const admin = await requireRole("admin", "/admin");
  const _id = toObjectId(userId);
  if (!_id || _id.equals(admin._id) || !["student", "tutor"].includes(role)) return;
  const db = await getDb();
  if (role === "tutor") await db.users.updateOne({ _id, tutor: { $exists: false } }, { $set: { tutor: emptyTutorProfile() } });
  await db.users.updateOne({ _id, role: { $ne: "admin" } }, { $set: { role } });
  refreshAll();
}

// Approving shows the tutor in the search and tells them by e-mail; un-approving only hides them.
export async function setTutorApproval(userId: string, approved: boolean) {
  await requireRole("admin", "/admin");
  const _id = toObjectId(userId);
  if (!_id) return;
  const db = await getDb();
  const filter = { _id, tutor: { $exists: true } };
  const before = approved
    ? await db.users.findOneAndUpdate(filter, { $set: { "tutor.approved": true, "tutor.approvedAt": new Date() }, $unset: { "tutor.review": "" } })
    : await db.users.findOneAndUpdate(filter, { $set: { "tutor.approved": false } });
  if (approved && before?.tutor && !before.tutor.approved) await tellTutorDecision(before, { approved: true });
  refreshAll();
}

// "Ask for changes": the profile leaves the review list until the tutor saves it again.
export async function askTutorChanges(userId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("admin", "/admin");
  const t = M[await getLocale()];
  const _id = toObjectId(userId);
  const note = text(formData, "note", 1000);
  if (note.length < 10) return { error: t.note };
  const db = await getDb();
  const user = _id && (await db.users.findOneAndUpdate(
    { _id, role: "tutor", "tutor.approved": { $ne: true } },
    { $set: { "tutor.review": { note, at: new Date() } }, $unset: { "tutor.submittedAt": "" } },
  ));
  if (!user) return { error: t.notFound };
  await tellTutorDecision(user, { approved: false, note });
  refreshAll();
  return { success: t.sent };
}
