"use server";

import { redirect } from "next/navigation";
import { DEFAULT_LOCALE, defineMessages, type Locale } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { createSession, destroySession, isActive, requireAdmin, type SessionUser } from "../auth";
import { getDb, ObjectId, REAL_LESSON, toObjectId, type AdminLogAction, type UserDoc } from "../db";
import { sendActionEmail } from "../mail";
import { moderationMessage } from "../moderation";
import { verifyPassword } from "../password";
import { refundLesson } from "../payments";
import { publicOrigin } from "../site";
import { emptyTutorProfile } from "../tutor-profile";
import { tellTutorDecision } from "../tutor-review";
import { refreshAll, text, type FormState } from "./shared";

// Actions of the admin site (admin.<domain>). Each one checks that an administrator is logged in,
// never acts on an administrator account (except to write to them), and is written to the admin log.

const M = defineMessages({
  en: {
    wrong: "Incorrect email or password.", notAdmin: "This account does not have access to the administration.",
    note: "Explain in a few words what the tutor should change (at least 10 characters).", notFound: "Member not found.",
    sent: "The tutor has been told what to change.", reason: "Give a reason (at least 5 characters): the member will see it.",
    suspended: "Account suspended.", blocked: "Account blocked.", confirm: "Type the member's e-mail address exactly to confirm.",
    empty: "Write a message.", messageSent: "Message sent.", messageSentMail: "Message sent, with a copy by e-mail.",
    protectedAdmin: "Administrator accounts cannot be changed from here.",
  },
  fr: {
    wrong: "E-mail ou mot de passe incorrect.", notAdmin: "Ce compte n'a pas accès à l'administration.",
    note: "Expliquez en quelques mots ce que le tuteur doit modifier (10 caractères minimum).", notFound: "Membre introuvable.",
    sent: "Le tuteur a été prévenu des modifications à faire.", reason: "Indiquez un motif (5 caractères minimum) : le membre le verra.",
    suspended: "Compte suspendu.", blocked: "Compte bloqué.", confirm: "Saisissez exactement l'adresse e-mail du membre pour confirmer.",
    empty: "Écrivez un message.", messageSent: "Message envoyé.", messageSentMail: "Message envoyé, avec une copie par e-mail.",
    protectedAdmin: "Les comptes administrateurs ne peuvent pas être modifiés ici.",
  },
});

// E-mails to the member, in their language.
const MAIL = defineMessages({
  en: {
    greeting: (name: string) => `Hello ${name},`,
    suspendedSubject: "Your Riya account has been suspended",
    blockedSubject: "Your Riya account has been blocked",
    reactivatedSubject: "Your Riya account is active again",
    reactivatedIntro: "The Riya team has reactivated your account: you can log in again.",
    login: "Log in", contact: "If you have any questions, simply reply to the Riya team from your messages or by e-mail.",
    messageSubject: "New message from the Riya team",
    messageButton: "Reply on Riya",
  },
  fr: {
    greeting: (name: string) => `Bonjour ${name},`,
    suspendedSubject: "Votre compte Riya a été suspendu",
    blockedSubject: "Votre compte Riya a été bloqué",
    reactivatedSubject: "Votre compte Riya est de nouveau actif",
    reactivatedIntro: "L'équipe Riya a réactivé votre compte : vous pouvez de nouveau vous connecter.",
    login: "Se connecter", contact: "Pour toute question, répondez simplement à l'équipe Riya depuis vos messages ou par e-mail.",
    messageSubject: "Nouveau message de l'équipe Riya",
    messageButton: "Répondre sur Riya",
  },
});

const firstName = (name: string) => name.split(" ")[0] || name;

// An e-mail that fails never blocks the action itself.
async function safeSend(input: Parameters<typeof sendActionEmail>[0]) {
  try {
    await sendActionEmail(input);
  } catch (err) {
    console.error("Admin e-mail", err);
  }
}

async function log(admin: SessionUser, user: Pick<UserDoc, "_id" | "name" | "email">, action: AdminLogAction, note = "") {
  await (await getDb()).adminLogs.insertOne({ _id: new ObjectId(), adminId: admin._id, userId: user._id, action, note, userName: user.name, userEmail: user.email, at: new Date() });
}

// The member the action is about; administrators are left alone.
async function target(userId: string) {
  const _id = toObjectId(userId);
  if (!_id) return null;
  const user = await (await getDb()).users.findOne({ _id });
  return user && user.role !== "admin" ? user : null;
}

// Lessons still to come are cancelled (and paid ones refunded) when an account is blocked or deleted.
async function cancelUpcomingLessons(userId: ObjectId) {
  const db = await getDb();
  const lessons = await db.lessons
    .find({ ...REAL_LESSON, $or: [{ studentId: userId }, { tutorId: userId }], status: { $in: ["pending", "confirmed"] }, startsAt: { $gt: new Date() } })
    .toArray();
  for (const lesson of lessons) {
    const { modifiedCount } = await db.lessons.updateOne({ _id: lesson._id, status: lesson.status }, { $set: { status: "cancelled" } });
    if (modifiedCount) await refundLesson(lesson);
  }
  return lessons.length;
}

// ── Login ────────────────────────────────────────────────

export async function adminLogin(_prev: FormState, formData: FormData): Promise<FormState> {
  const locale = await getLocale();
  const t = M[locale];
  const email = text(formData, "email", 120).toLowerCase();
  const password = String(formData.get("password") ?? "");
  const user = await (await getDb()).users.findOne({ email });
  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) return { error: t.wrong };
  if (user.role !== "admin") return { error: t.notAdmin };
  if (!(await isActive(user))) return { error: moderationMessage(user, locale) };
  await createSession(user._id);
  redirect("/");
}

export async function adminLogout() {
  await destroySession();
  redirect("/connexion");
}

// ── Tutors ───────────────────────────────────────────────

// Approving shows the tutor in the search and tells them by e-mail; un-approving only hides them.
export async function setTutorApproval(userId: string, approved: boolean) {
  const admin = await requireAdmin();
  const _id = toObjectId(userId);
  if (!_id) return;
  const db = await getDb();
  const filter = { _id, tutor: { $exists: true } };
  const before = approved
    ? await db.users.findOneAndUpdate(filter, { $set: { "tutor.approved": true, "tutor.approvedAt": new Date() }, $unset: { "tutor.review": "" } })
    : await db.users.findOneAndUpdate(filter, { $set: { "tutor.approved": false } });
  if (!before?.tutor || before.tutor.approved === approved) return;
  if (approved) await tellTutorDecision(before, { approved: true });
  await log(admin, before, approved ? "approve" : "hide");
  refreshAll();
}

// "Ask for changes": the profile leaves the review list until the tutor saves it again.
export async function askTutorChanges(userId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
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
  await log(admin, user, "ask_changes", note);
  refreshAll();
  return { success: t.sent };
}

// ── Accounts ─────────────────────────────────────────────

export async function setUserRole(userId: string, role: "student" | "tutor") {
  const admin = await requireAdmin();
  const user = await target(userId);
  if (!user || !["student", "tutor"].includes(role) || user.role === role) return;
  const db = await getDb();
  if (role === "tutor") await db.users.updateOne({ _id: user._id, tutor: { $exists: false } }, { $set: { tutor: emptyTutorProfile() } });
  await db.users.updateOne({ _id: user._id }, { $set: { role } });
  await log(admin, user, "role", role);
  refreshAll();
}

// Suspension: for a number of days (or until reactivated). The member is signed out and told why.
export async function suspendMember(userId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const t = M[await getLocale()];
  const user = await target(userId);
  if (!user) return { error: t.protectedAdmin };
  const reason = text(formData, "reason", 500);
  if (reason.length < 5) return { error: t.reason };
  const days = Math.min(365, Math.max(0, Number.parseInt(String(formData.get("days") ?? "0"), 10) || 0));
  const until = days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : undefined;

  const db = await getDb();
  await db.users.updateOne(
    { _id: user._id },
    { $set: { status: "suspended", moderation: { reason, at: new Date(), by: admin._id }, ...(until ? { suspendedUntil: until } : {}) }, ...(until ? {} : { $unset: { suspendedUntil: "" } }) },
  );
  await db.sessions.deleteMany({ userId: user._id });
  const locale: Locale = user.locale ?? DEFAULT_LOCALE;
  const mail = MAIL[locale];
  await safeSend({
    to: user.email, subject: mail.suspendedSubject, greeting: mail.greeting(firstName(user.name)),
    intro: moderationMessage({ status: "suspended", suspendedUntil: until, moderation: { reason, at: new Date(), by: admin._id } }, locale),
    button: mail.login, url: `${await publicOrigin()}/connexion`, outro: mail.contact, locale,
  });
  await log(admin, user, "suspend", `${days ? `${days} d · ` : ""}${reason}`);
  refreshAll();
  return { success: t.suspended };
}

// Block: for good. The member is signed out, their upcoming lessons are cancelled and refunded.
export async function blockMember(userId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const t = M[await getLocale()];
  const user = await target(userId);
  if (!user) return { error: t.protectedAdmin };
  const reason = text(formData, "reason", 500);
  if (reason.length < 5) return { error: t.reason };

  const db = await getDb();
  const moderation = { reason, at: new Date(), by: admin._id };
  await db.users.updateOne({ _id: user._id }, { $set: { status: "blocked", moderation, ...(user.tutor ? { "tutor.approved": false } : {}) }, $unset: { suspendedUntil: "" } });
  await db.sessions.deleteMany({ userId: user._id });
  const cancelled = await cancelUpcomingLessons(user._id);
  const locale: Locale = user.locale ?? DEFAULT_LOCALE;
  const mail = MAIL[locale];
  await safeSend({
    to: user.email, subject: mail.blockedSubject, greeting: mail.greeting(firstName(user.name)),
    intro: moderationMessage({ status: "blocked", moderation }, locale), button: mail.login, url: `${await publicOrigin()}/connexion`, outro: mail.contact, locale,
  });
  await log(admin, user, "block", `${reason}${cancelled ? ` · ${cancelled} lesson(s) cancelled` : ""}`);
  refreshAll();
  return { success: t.blocked };
}

export async function reactivateMember(userId: string) {
  const admin = await requireAdmin();
  const user = await target(userId);
  if (!user || user.status === "active") return;
  await (await getDb()).users.updateOne({ _id: user._id }, { $set: { status: "active" }, $unset: { suspendedUntil: "", moderation: "" } });
  const locale: Locale = user.locale ?? DEFAULT_LOCALE;
  const mail = MAIL[locale];
  await safeSend({
    to: user.email, subject: mail.reactivatedSubject, greeting: mail.greeting(firstName(user.name)), intro: mail.reactivatedIntro,
    button: mail.login, url: `${await publicOrigin()}/connexion`, outro: mail.contact, locale,
  });
  await log(admin, user, "reactivate");
  refreshAll();
}

// Deletion: the account and its personal data go; lessons, messages and reviews stay for the other
// members (shown as "former member"). Upcoming lessons are cancelled and refunded first.
export async function deleteMember(userId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const t = M[await getLocale()];
  const user = await target(userId);
  if (!user) return { error: t.protectedAdmin };
  if (text(formData, "confirm", 200).toLowerCase() !== user.email.toLowerCase()) return { error: t.confirm };

  const db = await getDb();
  const cancelled = await cancelUpcomingLessons(user._id);
  const videoId = user.tutor?.video?.kind === "upload" ? user.tutor.video.fileId : null;
  await Promise.all([
    db.sessions.deleteMany({ userId: user._id }),
    db.authTokens.deleteMany({ userId: user._id }),
    db.avatars.deleteOne({ _id: user._id }),
    db.bookingIntents.deleteMany({ $or: [{ studentId: user._id }, { tutorId: user._id }] }),
    db.profileViews.deleteMany({ tutorId: user._id }),
    db.users.updateMany({ favorites: user._id }, { $pull: { favorites: user._id } }),
    videoId ? db.videos.delete(videoId).catch(() => {}) : null,
  ]);
  await db.users.deleteOne({ _id: user._id });
  await log(admin, user, "delete", cancelled ? `${cancelled} lesson(s) cancelled` : "");
  refreshAll();
  redirect("/utilisateurs?supprime=1");
}

// ── Messages ─────────────────────────────────────────────

// A message from the administrator, in the member's Riya messages (they can reply there), with an
// optional copy by e-mail.
export async function sendMemberMessage(userId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const t = M[await getLocale()];
  const _id = toObjectId(userId);
  const user = _id && (await (await getDb()).users.findOne({ _id }));
  if (!user || user._id.equals(admin._id)) return { error: t.notFound };
  const body = text(formData, "body", 4000);
  if (!body) return { error: t.empty };
  const byMail = formData.get("email") === "on";

  await (await getDb()).messages.insertOne({ _id: new ObjectId(), senderId: admin._id, recipientId: user._id, body, readAt: null, createdAt: new Date() });
  if (byMail) {
    const locale: Locale = user.locale ?? DEFAULT_LOCALE;
    const mail = MAIL[locale];
    await safeSend({
      to: user.email, subject: mail.messageSubject, greeting: mail.greeting(firstName(user.name)), intro: body,
      button: mail.messageButton, url: `${await publicOrigin()}/messages/${admin.id}`, outro: mail.contact, locale,
    });
  }
  await log(admin, user, "message", body.length > 140 ? `${body.slice(0, 140)}…` : body);
  refreshAll();
  return { success: byMail ? t.messageSentMail : t.messageSent };
}
