"use server";

import { redirect } from "next/navigation";
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
const SEND_FAILED = "Nous n'avons pas pu envoyer l'e-mail. Réessayez dans un instant.";

// Same rules for every new password: length, and the two fields must match.
function checkNewPassword(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD) return `Le mot de passe doit contenir au moins ${MIN_PASSWORD} caractères.`;
  if (password !== confirm) return "Les deux mots de passe ne correspondent pas.";
  return null;
}

async function sendVerificationEmail(user: Pick<UserDoc, "_id" | "name" | "email">, next?: string) {
  const token = await issueToken(user._id, "verify-email", next);
  await sendActionEmail({
    to: user.email,
    subject: "Confirmez votre adresse e-mail · Riya",
    greeting: `Bienvenue ${user.name.split(" ")[0]} !`,
    intro: "Merci de rejoindre Riya. Confirmez votre adresse e-mail pour activer votre compte et commencer.",
    button: "Confirmer mon adresse",
    url: `${await siteOrigin()}/verifier-email/confirmer?token=${token}`,
    outro: "Ce lien est valable 48 heures. Si vous n'avez pas créé de compte, ignorez ce message.",
  });
}

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = text(formData, "name", 80);
  const email = text(formData, "email", 120).toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("password_confirm") ?? "");
  const country = text(formData, "country", 60);
  const role = formData.get("role") === "tutor" ? "tutor" : "student";

  if (name.length < 2) return { error: "Indiquez votre nom." };
  if (!EMAIL_RE.test(email)) return { error: "Adresse e-mail invalide." };
  const passwordError = checkNewPassword(password, confirm);
  if (passwordError) return { error: passwordError };
  if (!isKnownCountry(country)) return { error: "Choisissez votre pays de résidence." };

  const db = await getDb();
  const user: UserDoc = {
    _id: new ObjectId(), name, email, passwordHash: hashPassword(password), role, status: "active", country, avatarUrl: "", favorites: [],
    emailVerified: false, createdAt: new Date(),
    ...(role === "tutor" ? { tutor: emptyTutorProfile() } : {}),
  };
  try {
    await db.users.insertOne(user);
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return { error: "Un compte existe déjà avec cette adresse e-mail. Connectez-vous ou utilisez « Mot de passe oublié »." };
    throw err;
  }

  const next = role === "tutor" ? "/profil/tuteur?bienvenue=1" : safeRedirectPath(formData.get("suite"), "/tuteurs");
  try {
    await sendVerificationEmail(user, next);
  } catch (err) {
    console.error("E-mail de vérification", err);
    await db.users.deleteOne({ _id: user._id });
    return { error: "Nous n'avons pas pu envoyer l'e-mail de confirmation. Réessayez dans un instant." };
  }
  redirect(`/verifier-email?email=${encodeURIComponent(email)}`);
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = text(formData, "email", 120).toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = await (await getDb()).users.findOne({ email });
  if (user && !user.passwordHash) {
    return { error: "Ce compte se connecte avec Google. Utilisez « Continuer avec Google », ou « Mot de passe oublié » pour créer un mot de passe." };
  }
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "E-mail ou mot de passe incorrect." };
  }
  if (user.status !== "active") {
    return { error: "Ce compte a été suspendu. Contactez l'équipe Riya." };
  }
  if (user.emailVerified === false) {
    redirect(`/verifier-email?email=${encodeURIComponent(email)}&bloque=1`);
  }

  await createSession(user._id);
  redirect(safeRedirectPath(formData.get("suite"), "/tableau-de-bord"));
}

export async function resendVerification(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = text(formData, "email", 120).toLowerCase();
  const db = await getDb();
  const user = await db.users.findOne({ email, emailVerified: false });
  // The answer is the same whether or not the address exists.
  const done = { success: "Si un compte attend une confirmation à cette adresse, un nouvel e-mail vient d'être envoyé." };
  if (!user) return done;
  if (await sentRecently(user._id, "verify-email")) return { error: "Un e-mail vient déjà d'être envoyé. Patientez une minute avant d'en redemander un." };
  const previous = await db.authTokens.findOne({ userId: user._id, kind: "verify-email" });
  try {
    await sendVerificationEmail(user, previous?.next);
  } catch (err) {
    console.error("E-mail de vérification", err);
    return { error: SEND_FAILED };
  }
  return done;
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = text(formData, "email", 120).toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "Adresse e-mail invalide." };
  const done = { success: "Si un compte existe avec cette adresse, vous allez recevoir un lien pour choisir un nouveau mot de passe. Pensez à regarder dans vos spams." };

  const db = await getDb();
  const user = await db.users.findOne({ email, status: "active" });
  if (!user || (await sentRecently(user._id, "reset-password"))) return done;

  const token = await issueToken(user._id, "reset-password");
  try {
    await sendActionEmail({
      to: user.email,
      subject: "Réinitialisez votre mot de passe · Riya",
      greeting: `Bonjour ${user.name.split(" ")[0]},`,
      intro: "Vous avez demandé à changer le mot de passe de votre compte Riya. Cliquez sur le bouton pour en choisir un nouveau.",
      button: "Choisir un nouveau mot de passe",
      url: `${await siteOrigin()}/mot-de-passe-oublie/nouveau?token=${token}`,
      outro: "Ce lien est valable 1 heure et ne peut servir qu'une fois. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe ne change pas.",
    });
  } catch (err) {
    console.error("E-mail de réinitialisation", err);
    return { error: SEND_FAILED };
  }
  return done;
}

export async function resetPassword(token: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  const passwordError = checkNewPassword(password, String(formData.get("password_confirm") ?? ""));
  if (passwordError) return { error: passwordError };

  const doc = await consumeToken(token, "reset-password");
  if (!doc) return { error: "Ce lien a expiré ou a déjà servi. Demandez-en un nouveau." };

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
