"use server";

import { after } from "next/server";
import { DEFAULT_LOCALE, defineMessages, type Locale } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { formatPrice } from "@/lib/constants";
import { OWED, tutorShare } from "../admin-ops";
import { requireAdmin } from "../auth";
import type { Filter } from "mongodb";
import { getDb, ObjectId, toObjectId, type AnnouncementDoc, type UserDoc } from "../db";
import { sendActionEmail } from "../mail";
import { publicOrigin } from "../site";
import { refreshAll, text, type FormState } from "./shared";

// Admin site: tutor payouts, refunds finished by hand, announcements to a group of members.

const M = defineMessages({
  en: {
    notFound: "Not found.", nothing: "Nothing is owed to this tutor any more.", reference: "Give the reference of the transfer (mobile money or bank), at least 3 characters.",
    paid: (amount: string, n: number) => `Payout of ${amount} recorded for ${n} lesson${n === 1 ? "" : "s"}. The tutor has been told.`,
    refunded: "Refund marked as done.", body: "Write the announcement (at least 10 characters).", audience: "Choose who receives it.",
    sent: (n: number) => `Announcement sent to ${n} member${n === 1 ? "" : "s"}.`,
  },
  fr: {
    notFound: "Introuvable.", nothing: "Plus rien n'est dû à ce tuteur.", reference: "Indiquez la référence du virement (mobile money ou banque), 3 caractères minimum.",
    paid: (amount: string, n: number) => `Versement de ${amount} enregistré pour ${n} cours. Le tuteur est prévenu.`,
    refunded: "Remboursement marqué comme fait.", body: "Écrivez l'annonce (10 caractères minimum).", audience: "Choisissez qui la reçoit.",
    sent: (n: number) => `Annonce envoyée à ${n} membre${n > 1 ? "s" : ""}.`,
  },
});

const MAIL = defineMessages({
  en: {
    greeting: (name: string) => `Hello ${name},`,
    payoutSubject: (amount: string) => `Riya has sent you ${amount}`,
    payoutIntro: (amount: string, n: number, reference: string) => `The Riya team has paid out ${amount} for ${n} completed lesson${n === 1 ? "" : "s"} (reference: ${reference}). Thank you for teaching on Riya!`,
    payoutButton: "See my earnings",
    announcementSubject: "News from the Riya team", announcementButton: "Open Riya",
    outro: "You can reply to the Riya team from your messages.",
  },
  fr: {
    greeting: (name: string) => `Bonjour ${name},`,
    payoutSubject: (amount: string) => `Riya vous a versé ${amount}`,
    payoutIntro: (amount: string, n: number, reference: string) => `L'équipe Riya vous a versé ${amount} pour ${n} cours terminé${n > 1 ? "s" : ""} (référence : ${reference}). Merci d'enseigner sur Riya !`,
    payoutButton: "Voir mes revenus",
    announcementSubject: "Des nouvelles de l'équipe Riya", announcementButton: "Ouvrir Riya",
    outro: "Vous pouvez répondre à l'équipe Riya depuis vos messages.",
  },
});

const firstName = (name: string) => name.split(" ")[0] || name;

async function safeSend(input: Parameters<typeof sendActionEmail>[0]) {
  try {
    await sendActionEmail(input);
  } catch (err) {
    console.error("Admin e-mail", err);
  }
}

// Everything owed to the tutor right now is marked as paid out, with the transfer reference.
export async function recordPayout(tutorId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const t = M[await getLocale()];
  const _id = toObjectId(tutorId);
  const reference = text(formData, "reference", 120);
  if (!_id) return { error: t.notFound };
  if (reference.length < 3) return { error: t.reference };
  const db = await getDb();
  const tutor = await db.users.findOne({ _id });
  if (!tutor) return { error: t.notFound };
  const lessons = await db.lessons.find({ ...OWED, tutorId: _id }).toArray();
  if (!lessons.length) return { error: t.nothing };

  const payoutId = new ObjectId();
  // Only the lessons still unpaid at this moment (two admins clicking together never pay twice).
  const { modifiedCount } = await db.lessons.updateMany({ _id: { $in: lessons.map((l) => l._id) }, payoutId: { $exists: false } }, { $set: { payoutId } });
  if (!modifiedCount) return { error: t.nothing };
  const paid = await db.lessons.find({ payoutId }).toArray();
  const amount = tutorShare(paid);
  await db.payouts.insertOne({ _id: payoutId, tutorId: _id, lessonIds: paid.map((l) => l._id), amount, reference, adminId: admin._id, at: new Date() });
  await db.adminLogs.insertOne({
    _id: new ObjectId(), adminId: admin._id, userId: _id, action: "payout", note: `${formatPrice(amount, "en")} · ${paid.length} lesson(s) · ${reference}`,
    userName: tutor.name, userEmail: tutor.email, at: new Date(),
  });

  const locale: Locale = tutor.locale ?? DEFAULT_LOCALE;
  const mail = MAIL[locale];
  const money = formatPrice(amount, locale);
  await safeSend({
    to: tutor.email, subject: mail.payoutSubject(money), greeting: mail.greeting(firstName(tutor.name)), intro: mail.payoutIntro(money, paid.length, reference),
    button: mail.payoutButton, url: `${await publicOrigin()}/profil/paiements`, outro: mail.outro, locale,
  });
  refreshAll();
  return { success: t.paid(formatPrice(amount, await getLocale()), paid.length) };
}

// A refund the provider refused, done by hand by the team (bank transfer, mobile money…).
export async function markRefunded(lessonId: string) {
  await requireAdmin();
  const _id = toObjectId(lessonId);
  if (!_id) return;
  await (await getDb()).lessons.updateOne({ _id, "payment.status": "refund_failed" }, { $set: { "payment.status": "refunded", "payment.refundedAt": new Date() } });
  refreshAll();
}

// A message from the team to every active student, tutor, or both: in their Riya messages (they can
// reply), with an optional copy by e-mail sent after the response.
export async function sendAnnouncement(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const t = M[await getLocale()];
  const audience = String(formData.get("audience") ?? "") as AnnouncementDoc["audience"];
  if (!["all", "students", "tutors"].includes(audience)) return { error: t.audience };
  const body = text(formData, "body", 4000);
  if (body.length < 10) return { error: t.body };
  const emailed = formData.get("email") === "on";

  const db = await getDb();
  const filter: Filter<UserDoc> = { status: "active", _id: { $ne: admin._id }, role: audience === "all" ? { $in: ["student", "tutor"] } : audience === "students" ? "student" : "tutor" };
  const members = await db.users.find(filter, { projection: { name: 1, email: 1, locale: 1 } }).toArray();
  const now = new Date();
  if (members.length) {
    await db.messages.insertMany(members.map((m) => ({ _id: new ObjectId(), senderId: admin._id, recipientId: m._id, body, readAt: null, createdAt: now })));
  }
  await db.announcements.insertOne({ _id: new ObjectId(), adminId: admin._id, audience, body, recipients: members.length, emailed, at: now });

  if (emailed && members.length) {
    const origin = await publicOrigin();
    after(async () => {
      for (const m of members) {
        const locale: Locale = m.locale ?? DEFAULT_LOCALE;
        const mail = MAIL[locale];
        await safeSend({
          to: m.email, subject: mail.announcementSubject, greeting: mail.greeting(firstName(m.name)), intro: body,
          button: mail.announcementButton, url: `${origin}/messages/${admin.id}`, outro: mail.outro, locale,
        });
      }
    });
  }
  refreshAll();
  return { success: t.sent(members.length) };
}
