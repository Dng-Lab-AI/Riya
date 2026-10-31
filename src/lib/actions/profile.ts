"use server";

import { Binary } from "mongodb";
import { redirect } from "next/navigation";
import { requireUser } from "../auth";
import { AVAILABILITY, SPECIALTIES } from "../constants";
import { getDb } from "../db";
import { hashPassword, verifyPassword } from "../password";
import { isKnownCountry } from "../payments/countries";
import { emptyTutorProfile } from "../tutor-profile";
import { int, refreshAll, text, type FormState } from "./shared";

export async function updateAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/profil");
  const name = text(formData, "name", 80);
  const country = text(formData, "country", 60);

  if (name.length < 2) return { error: "Indiquez votre nom." };
  if (!isKnownCountry(country)) return { error: "Choisissez votre pays dans la liste." };

  await (await getDb()).users.updateOne({ _id: user._id }, { $set: { name, country } });
  refreshAll();
  return { success: "Compte mis à jour." };
}

// The browser sends the photo already cropped and resized (see AvatarPicker), far under this size.
const AVATAR_MAX_BYTES = 900 * 1024;

// The real format, read from the first bytes: the declared type and file name can be anything.
function imageType(bytes: Buffer): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

export type AvatarResult = { error: string } | { avatarUrl: string };

export async function uploadAvatar(formData: FormData): Promise<AvatarResult> {
  const user = await requireUser("/profil");
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Aucune photo reçue." };
  if (file.size > AVATAR_MAX_BYTES) return { error: "Cette photo est trop lourde. Essayez-en une autre." };

  const bytes = Buffer.from(await file.arrayBuffer());
  const contentType = imageType(bytes);
  if (!contentType) return { error: "Format non reconnu : choisissez une photo JPEG, PNG ou WebP." };

  const db = await getDb();
  await db.avatars.replaceOne({ _id: user._id }, { data: new Binary(bytes), contentType, updatedAt: new Date() }, { upsert: true });
  // The version in the address makes browsers load the new photo instead of a cached one.
  const avatarUrl = `/api/avatars/${user._id.toHexString()}?v=${Date.now()}`;
  await db.users.updateOne({ _id: user._id }, { $set: { avatarUrl } });
  refreshAll();
  return { avatarUrl };
}

export async function removeAvatar(): Promise<AvatarResult> {
  const user = await requireUser("/profil");
  const db = await getDb();
  await db.avatars.deleteOne({ _id: user._id });
  await db.users.updateOne({ _id: user._id }, { $set: { avatarUrl: "" } });
  refreshAll();
  return { avatarUrl: "" };
}

export async function updateTutorProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/profil");
  if (user.role !== "tutor") return { error: "Seuls les tuteurs ont un profil public." };

  const headline = text(formData, "headline", 120);
  const about = text(formData, "about", 3000);
  const speaks = text(formData, "speaks", 200);
  const rate = int(formData, "hourly_rate");
  const years = int(formData, "years_experience");
  const allowedSpecialties = new Set<string>(SPECIALTIES.map((s) => s.value));
  const allowedAvailability = new Set<string>(AVAILABILITY.map((a) => a.value));
  const specialties = formData.getAll("specialties").map(String).filter((s) => allowedSpecialties.has(s));
  const availability = formData.getAll("availability").map(String).filter((a) => allowedAvailability.has(a));

  const db = await getDb();
  const slugs = await db.languages.distinct("slug");
  const languages = slugs
    .map((slug) => ({ slug, level: String(formData.get(`lang_${slug}`) ?? "") }))
    .filter((l): l is { slug: string; level: "native" | "fluent" } => l.level === "native" || l.level === "fluent");

  if (headline.length < 10) return { error: "Votre accroche doit faire au moins 10 caractères." };
  if (about.length < 50) return { error: "Présentez-vous en au moins 50 caractères." };
  if (!(rate >= 5 && rate <= 200)) return { error: "Le tarif doit être compris entre 5 et 200." };
  if (!(years >= 0 && years <= 60)) return { error: "Années d'expérience invalides." };
  if (languages.length === 0) return { error: "Choisissez au moins une langue enseignée." };
  if (availability.length === 0) return { error: "Indiquez au moins un créneau de disponibilité." };

  const updated = await db.users.findOneAndUpdate(
    { _id: user._id },
    {
      $set: {
        "tutor.headline": headline, "tutor.about": about, "tutor.hourlyRate": rate, "tutor.yearsExperience": years,
        "tutor.specialties": specialties, "tutor.availability": availability, "tutor.speaks": speaks, "tutor.languages": languages,
      },
    },
    { returnDocument: "after" },
  );

  refreshAll();
  return {
    success: updated?.tutor?.approved
      ? "Profil enregistré."
      : "Profil enregistré. Il sera visible dès sa validation par notre équipe.",
  };
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/profil/securite");
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("password") ?? "");
  const db = await getDb();
  const doc = await db.users.findOne({ _id: user._id }, { projection: { passwordHash: 1 } });
  if (!doc) return { error: "Compte introuvable." };

  // Accounts created with Google have no password yet: they can set one directly.
  if (doc.passwordHash && !verifyPassword(current, doc.passwordHash)) return { error: "Mot de passe actuel incorrect." };
  if (next.length < 8) return { error: "Le nouveau mot de passe doit contenir au moins 8 caractères." };
  if (next !== String(formData.get("password_confirm") ?? "")) return { error: "Les deux mots de passe ne correspondent pas." };

  await db.users.updateOne({ _id: user._id }, { $set: { passwordHash: hashPassword(next) } });
  refreshAll();
  return { success: doc.passwordHash ? "Mot de passe modifié." : "Mot de passe défini. Vous pouvez aussi vous connecter avec votre e-mail." };
}

// Lets an existing student open a tutor profile without creating a second account.
export async function becomeTutor() {
  const user = await requireUser("/devenir-tuteur");
  if (user.role === "student") {
    const db = await getDb();
    await db.users.updateOne({ _id: user._id, tutor: { $exists: false } }, { $set: { tutor: emptyTutorProfile() } });
    await db.users.updateOne({ _id: user._id }, { $set: { role: "tutor" } });
    refreshAll();
  }
  redirect("/profil/tuteur?bienvenue=1");
}
