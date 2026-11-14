"use server";

import { redirect } from "next/navigation";
import { defineMessages, type Locale } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { createSession, destroySession } from "../auth";
import { consumeToken, issueToken, sentRecently } from "../auth-tokens";
import { getDb, ObjectId, type UserDoc } from "../db";
import { sendActionEmail } from "../mail";
import { isKnownCountry } from "../payments/countries";
import { hashPassword, verifyPassword } from "../password";
import { siteOrigin } from "../site";
import { emptyTutorProfile } from "../tutor-profile";
import { safeRedirectPath, text, type FormState } from "./shared";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

const M = defineMessages({
  en: {
    sendFailed: "We couldn't send the email. Please try again in a moment.",
    short: (n: number) => `The password must be at least ${n} characters long.`, mismatch: "The two passwords don't match.",
    verifySubject: "Confirm your email address · Riya", verifyGreeting: (name: string) => `Welcome ${name}!`,
    verifyIntro: "Thank you for joining Riya. Confirm your email address to activate your account and get started.",
    verifyButton: "Confirm my address", verifyOutro: "This link is valid for 48 hours. If you didn't create an account, ignore this message.",
    name: "Enter your name.", email: "Invalid email address.", country: "Choose your country of residence.",
    exists: "An account already exists with this email address. Log in or use “Forgot password”.",
    confirmFailed: "We couldn't send the confirmation email. Please try again in a moment.",
    google: "This account signs in with Google. Use “Continue with Google”, or “Forgot password” to create a password.",
    wrong: "Incorrect email or password.", suspended: "This account has been suspended. Please contact the Riya team.",
    resent: "If an account is waiting for confirmation at this address, a new email has just been sent.",
    wait: "An email has just been sent. Please wait a minute before asking for another one.",
    resetDone: "If an account exists with this address, you'll receive a link to choose a new password. Remember to check your spam folder.",
    resetSubject: "Reset your password · Riya", resetGreeting: (name: string) => `Hello ${name},`,
    resetIntro: "You asked to change the password of your Riya account. Click the button to choose a new one.",
    resetButton: "Choose a new password",
    resetOutro: "This link is valid for 1 hour and can only be used once. If you didn't make this request, ignore this message: your password won't change.",
    expired: "This link has expired or has already been used. Request a new one.",
  },
  fr: {
    sendFailed: "Nous n'avons pas pu envoyer l'e-mail. Réessayez dans un instant.",
    short: (n: number) => `Le mot de passe doit contenir au moins ${n} caractères.`, mismatch: "Les deux mots de passe ne correspondent pas.",
    verifySubject: "Confirmez votre adresse e-mail · Riya", verifyGreeting: (name: string) => `Bienvenue ${name} !`,
    verifyIntro: "Merci de rejoindre Riya. Confirmez votre adresse e-mail pour activer votre compte et commencer.",
    verifyButton: "Confirmer mon adresse", verifyOutro: "Ce lien est valable 48 heures. Si vous n'avez pas créé de compte, ignorez ce message.",
    name: "Indiquez votre nom.", email: "Adresse e-mail invalide.", country: "Choisissez votre pays de résidence.",
    exists: "Un compte existe déjà avec cette adresse e-mail. Connectez-vous ou utilisez « Mot de passe oublié ».",
    confirmFailed: "Nous n'avons pas pu envoyer l'e-mail de confirmation. Réessayez dans un instant.",
    google: "Ce compte se connecte avec Google. Utilisez « Continuer avec Google », ou « Mot de passe oublié » pour créer un mot de passe.",
    wrong: "E-mail ou mot de passe incorrect.", suspended: "Ce compte a été suspendu. Contactez l'équipe Riya.",
    resent: "Si un compte attend une confirmation à cette adresse, un nouvel e-mail vient d'être envoyé.",
    wait: "Un e-mail vient déjà d'être envoyé. Patientez une minute avant d'en redemander un.",
    resetDone: "Si un compte existe avec cette adresse, vous allez recevoir un lien pour choisir un nouveau mot de passe. Pensez à regarder dans vos spams.",
    resetSubject: "Réinitialisez votre mot de passe · Riya", resetGreeting: (name: string) => `Bonjour ${name},`,
    resetIntro: "Vous avez demandé à changer le mot de passe de votre compte Riya. Cliquez sur le bouton pour en choisir un nouveau.",
    resetButton: "Choisir un nouveau mot de passe",
    resetOutro: "Ce lien est valable 1 heure et ne peut servir qu'une fois. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe ne change pas.",
    expired: "Ce lien a expiré ou a déjà servi. Demandez-en un nouveau.",
  },
});

// Same rules for every new password: length, and the two fields must match.
function checkNewPassword(password: string, confirm: string, locale: Locale): string | null {
  if (password.length < MIN_PASSWORD) return M[locale].short(MIN_PASSWORD);
  if (password !== confirm) return M[locale].mismatch;
  return null;
}

// E-mails go out in the language the member uses on the site.
async function sendVerificationEmail(user: Pick<UserDoc, "_id" | "name" | "email" | "locale">, locale: Locale, next?: string) {
  const t = M[user.locale ?? locale];
  const token = await issueToken(user._id, "verify-email", next);
  await sendActionEmail({
    to: user.email,
    subject: t.verifySubject,
    greeting: t.verifyGreeting(user.name.split(" ")[0]),
    intro: t.verifyIntro,
    button: t.verifyButton,
    url: `${await siteOrigin()}/verifier-email/confirmer?token=${token}`,
    outro: t.verifyOutro,
    locale: user.locale ?? locale,
  });
}

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const locale = await getLocale();
  const t = M[locale];
  const name = text(formData, "name", 80);
  const email = text(formData, "email", 120).toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("password_confirm") ?? "");
  const country = text(formData, "country", 60);
  const role = formData.get("role") === "tutor" ? "tutor" : "student";

  if (name.length < 2) return { error: t.name };
  if (!EMAIL_RE.test(email)) return { error: t.email };
  const passwordError = checkNewPassword(password, confirm, locale);
  if (passwordError) return { error: passwordError };
  if (!isKnownCountry(country)) return { error: t.country };

  const db = await getDb();
  const user: UserDoc = {
    _id: new ObjectId(), name, email, passwordHash: hashPassword(password), role, status: "active", country, avatarUrl: "", favorites: [],
    emailVerified: false, createdAt: new Date(), locale,
    ...(role === "tutor" ? { tutor: emptyTutorProfile() } : {}),
  };
  try {
    await db.users.insertOne(user);
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return { error: t.exists };
    throw err;
  }

  const next = role === "tutor" ? "/profil/tuteur?bienvenue=1" : safeRedirectPath(formData.get("suite"), "/tuteurs");
  try {
    await sendVerificationEmail(user, locale, next);
  } catch (err) {
    console.error("Verification e-mail", err);
    await db.users.deleteOne({ _id: user._id });
    return { error: t.confirmFailed };
  }
  redirect(`/verifier-email?email=${encodeURIComponent(email)}`);
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = M[await getLocale()];
  const email = text(formData, "email", 120).toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = await (await getDb()).users.findOne({ email });
  if (user && !user.passwordHash) {
    return { error: t.google };
  }
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: t.wrong };
  }
  if (user.status !== "active") {
    return { error: t.suspended };
  }
  if (user.emailVerified === false) {
    redirect(`/verifier-email?email=${encodeURIComponent(email)}&bloque=1`);
  }

  await createSession(user._id);
  // Tutors land on their home page, students on their lessons.
  redirect(safeRedirectPath(formData.get("suite"), user.role === "tutor" ? "/accueil" : "/tableau-de-bord"));
}

export async function resendVerification(_prev: FormState, formData: FormData): Promise<FormState> {
  const locale = await getLocale();
  const t = M[locale];
  const email = text(formData, "email", 120).toLowerCase();
  const db = await getDb();
  const user = await db.users.findOne({ email, emailVerified: false });
  // The answer is the same whether or not the address exists.
  const done = { success: t.resent };
  if (!user) return done;
  if (await sentRecently(user._id, "verify-email")) return { error: t.wait };
  const previous = await db.authTokens.findOne({ userId: user._id, kind: "verify-email" });
  try {
    await sendVerificationEmail(user, locale, previous?.next);
  } catch (err) {
    console.error("Verification e-mail", err);
    return { error: t.sendFailed };
  }
  return done;
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const locale = await getLocale();
  const t = M[locale];
  const email = text(formData, "email", 120).toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: t.email };
  const done = { success: t.resetDone };

  const db = await getDb();
  const user = await db.users.findOne({ email, status: "active" });
  if (!user || (await sentRecently(user._id, "reset-password"))) return done;

  const token = await issueToken(user._id, "reset-password");
  const mail = M[user.locale ?? locale];
  try {
    await sendActionEmail({
      to: user.email,
      subject: mail.resetSubject,
      greeting: mail.resetGreeting(user.name.split(" ")[0]),
      intro: mail.resetIntro,
      button: mail.resetButton,
      url: `${await siteOrigin()}/mot-de-passe-oublie/nouveau?token=${token}`,
      outro: mail.resetOutro,
      locale: user.locale ?? locale,
    });
  } catch (err) {
    console.error("Password reset e-mail", err);
    return { error: t.sendFailed };
  }
  return done;
}

export async function resetPassword(token: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const locale = await getLocale();
  const password = String(formData.get("password") ?? "");
  const passwordError = checkNewPassword(password, String(formData.get("password_confirm") ?? ""), locale);
  if (passwordError) return { error: passwordError };

  const doc = await consumeToken(token, "reset-password");
  if (!doc) return { error: M[locale].expired };

  const db = await getDb();
  // Receiving the link proves the address, and every other device is signed out.
  await db.users.updateOne({ _id: doc.userId }, { $set: { passwordHash: hashPassword(password), emailVerified: true } });
  await db.sessions.deleteMany({ userId: doc.userId });
  await createSession(doc.userId);
  redirect("/tableau-de-bord?motdepasse=1");
}

export async function logout() {
  await destroySession();
  redirect("/");
}
