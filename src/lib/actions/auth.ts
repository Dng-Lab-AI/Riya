"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession } from "../auth";
import { getDb, ObjectId } from "../db";
import { isKnownCountry } from "../payments/countries";
import { emptyTutorProfile } from "../tutor-profile";
import { hashPassword, verifyPassword } from "../password";
import { safeRedirectPath, text, type FormState } from "./shared";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = text(formData, "name", 80);
  const email = text(formData, "email", 120).toLowerCase();
  const password = String(formData.get("password") ?? "");
  const country = text(formData, "country", 60);
  const role = formData.get("role") === "tutor" ? "tutor" : "student";

  if (name.length < 2) return { error: "Indiquez votre nom." };
  if (!EMAIL_RE.test(email)) return { error: "Adresse e-mail invalide." };
  if (password.length < 8) return { error: "Le mot de passe doit contenir au moins 8 caractères." };
  if (!isKnownCountry(country)) return { error: "Choisissez votre pays de résidence." };

  const db = await getDb();
  const _id = new ObjectId();
  try {
    await db.users.insertOne({
      _id, name, email, passwordHash: hashPassword(password), role, status: "active", country, avatarUrl: "", favorites: [], createdAt: new Date(),
      ...(role === "tutor" ? { tutor: emptyTutorProfile() } : {}),
    });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return { error: "Un compte existe déjà avec cette adresse e-mail." };
    throw err;
  }

  await createSession(_id);
  redirect(role === "tutor" ? "/profil/tuteur?bienvenue=1" : safeRedirectPath(formData.get("suite"), "/tuteurs"));
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = text(formData, "email", 120).toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = await (await getDb()).users.findOne({ email });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "E-mail ou mot de passe incorrect." };
  }
  if (user.status !== "active") {
    return { error: "Ce compte a été suspendu. Contactez l'équipe Riya." };
  }

  await createSession(user._id);
  redirect(safeRedirectPath(formData.get("suite"), "/tableau-de-bord"));
}

export async function logout() {
  await destroySession();
  redirect("/");
}
