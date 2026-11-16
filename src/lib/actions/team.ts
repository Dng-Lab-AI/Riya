"use server";

import { DEFAULT_LOCALE, defineMessages, type Locale } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { requireAdmin } from "../auth";
import { getDb, ObjectId, toObjectId, type UserDoc } from "../db";
import { sendActionEmail } from "../mail";
import { hashPassword, verifyPassword } from "../password";
import { adminOrigin } from "../site";
import { refreshAll, text, type FormState } from "./shared";

// The Riya team on the admin site: add an administrator (new account, or an existing member),
// remove administrator rights, and change one's own password.

const MIN_PASSWORD = 8;

const M = defineMessages({
  en: {
    name: "Enter the person's name.", email: "Enter a valid e-mail address.", password: (n: number) => `The password must have at least ${n} characters.`,
    already: "This account is already an administrator.", created: (email: string) => `Administrator account created for ${email}. Give them their password yourself: it is not sent by e-mail.`,
    promoted: (name: string) => `${name} is now an administrator. They log in with their usual password.`,
    self: "You cannot remove your own administrator rights.", last: "Riya must keep at least one administrator.", removed: "Administrator rights removed.",
    current: "Your current password is incorrect.", mismatch: "The two new passwords are different.", changed: "Password changed.",
  },
  fr: {
    name: "Indiquez le nom de la personne.", email: "Indiquez une adresse e-mail valide.", password: (n: number) => `Le mot de passe doit faire au moins ${n} caractères.`,
    already: "Ce compte est déjà administrateur.", created: (email: string) => `Compte administrateur créé pour ${email}. Communiquez-lui son mot de passe vous-même : il n'est pas envoyé par e-mail.`,
    promoted: (name: string) => `${name} est maintenant administrateur. Il se connecte avec son mot de passe habituel.`,
    self: "Vous ne pouvez pas retirer vos propres droits d'administrateur.", last: "Riya doit garder au moins un administrateur.", removed: "Droits d'administrateur retirés.",
    current: "Votre mot de passe actuel est incorrect.", mismatch: "Les deux nouveaux mots de passe sont différents.", changed: "Mot de passe modifié.",
  },
});

const MAIL = defineMessages({
  en: {
    subject: "You are now an administrator of Riya",
    greeting: (name: string) => `Hello ${name},`,
    intro: (by: string, existing: boolean) =>
      `${by} has added you to the Riya team: you now have access to the administration site.${existing ? " Log in with your usual Riya e-mail and password." : ` ${by} will give you your password; change it once logged in, under Team.`}`,
    button: "Open the administration", outro: "If you did not expect this, reply to this e-mail.",
  },
  fr: {
    subject: "Vous êtes maintenant administrateur de Riya",
    greeting: (name: string) => `Bonjour ${name},`,
    intro: (by: string, existing: boolean) =>
      `${by} vous a ajouté à l'équipe Riya : vous avez maintenant accès au site d'administration.${existing ? " Connectez-vous avec votre e-mail et votre mot de passe Riya habituels." : ` ${by} vous communiquera votre mot de passe ; changez-le une fois connecté, dans Équipe.`}`,
    button: "Ouvrir l'administration", outro: "Si vous ne vous attendiez pas à ce message, répondez à cet e-mail.",
  },
});

async function log(adminId: ObjectId, user: Pick<UserDoc, "_id" | "name" | "email">, action: "admin_add" | "admin_remove", note = "") {
  await (await getDb()).adminLogs.insertOne({ _id: new ObjectId(), adminId, userId: user._id, action, note, userName: user.name, userEmail: user.email, at: new Date() });
}

// New administrator: a new account with the password chosen here, or an existing member promoted
// (they keep their password). They are told by e-mail, without the password.
export async function addAdmin(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const t = M[await getLocale()];
  const name = text(formData, "name", 80);
  const email = text(formData, "email", 120).toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: t.email };

  const db = await getDb();
  const existing = await db.users.findOne({ email });
  let user: UserDoc;
  if (existing) {
    if (existing.role === "admin") return { error: t.already };
    await db.users.updateOne({ _id: existing._id }, { $set: { role: "admin", status: "active" }, $unset: { suspendedUntil: "", moderation: "" } });
    user = existing;
  } else {
    if (name.length < 2) return { error: t.name };
    if (password.length < MIN_PASSWORD) return { error: t.password(MIN_PASSWORD) };
    user = {
      _id: new ObjectId(), name, email, passwordHash: hashPassword(password), role: "admin", status: "active",
      country: "", avatarUrl: "", favorites: [], emailVerified: true, locale: await getLocale(), createdAt: new Date(),
    };
    await db.users.insertOne(user);
  }

  const locale: Locale = user.locale ?? DEFAULT_LOCALE;
  const mail = MAIL[locale];
  try {
    await sendActionEmail({
      to: user.email, subject: mail.subject, greeting: mail.greeting(user.name.split(" ")[0] || user.name), intro: mail.intro(admin.name, !!existing),
      button: mail.button, url: `${await adminOrigin()}/connexion`, outro: mail.outro, locale,
    });
  } catch (err) {
    console.error("New administrator e-mail", err);
  }
  await log(admin._id, user, "admin_add", existing ? `was ${existing.role}` : "new account");
  refreshAll();
  return { success: existing ? t.promoted(user.name) : t.created(email) };
}

// Removing the rights makes the account a student account again (it is not deleted).
export async function removeAdmin(userId: string): Promise<FormState> {
  const admin = await requireAdmin();
  const t = M[await getLocale()];
  const _id = toObjectId(userId);
  if (!_id) return { error: t.email };
  if (_id.equals(admin._id)) return { error: t.self };
  const db = await getDb();
  if ((await db.users.countDocuments({ role: "admin", status: "active" })) <= 1) return { error: t.last };
  const user = await db.users.findOneAndUpdate({ _id, role: "admin" }, { $set: { role: "student" } });
  if (!user) return { error: t.email };
  // Signed out everywhere, so the admin site closes for them at once.
  await db.sessions.deleteMany({ userId: _id });
  await log(admin._id, user, "admin_remove");
  refreshAll();
  return { success: t.removed };
}

export async function changeAdminPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const t = M[await getLocale()];
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("password") ?? "");
  if (next.length < MIN_PASSWORD) return { error: t.password(MIN_PASSWORD) };
  if (next !== String(formData.get("confirm") ?? "")) return { error: t.mismatch };
  const db = await getDb();
  const doc = await db.users.findOne({ _id: admin._id }, { projection: { passwordHash: 1 } });
  if (!doc?.passwordHash || !verifyPassword(current, doc.passwordHash)) return { error: t.current };
  await db.users.updateOne({ _id: admin._id }, { $set: { passwordHash: hashPassword(next) } });
  return { success: t.changed };
}
