"use server";

import { Binary } from "mongodb";
import { redirect } from "next/navigation";
import { defineMessages } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { requireUser } from "../auth";
import { availabilityTags } from "../availability";
import { AVAILABILITY, SPECIALTIES } from "../constants";
import { getDb } from "../db";
import { hashPassword, verifyPassword } from "../password";
import { isKnownCountry } from "../payments/countries";
import { emptyTutorProfile } from "../tutor-profile";
import { submitForReview } from "../tutor-review";
import { int, refreshAll, text, type FormState } from "./shared";

const M = defineMessages({
  en: {
    name: "Enter your name.", country: "Choose your country from the list.", accountSaved: "Account updated.",
    noPhoto: "No photo received.", tooHeavy: "This photo is too large. Try another one.", format: "Format not recognised: choose a JPEG, PNG or WebP photo.",
    tutorsOnly: "Only tutors have a public profile.", headline: "Your headline must be at least 10 characters long.",
    about: "Introduce yourself in at least 50 characters.", rate: "The price must be between 5 and 200.", years: "Invalid years of experience.",
    languages: "Choose at least one language you teach.", schedule: "Add availability in your calendar.", availability: "Choose at least one availability slot.",
    saved: "Profile saved.", savedPending: "Profile saved. It will be visible as soon as our team approves it.",
    noAccount: "Account not found.", wrongPassword: "Current password is incorrect.", short: "The new password must be at least 8 characters long.",
    mismatch: "The two passwords don't match.", changed: "Password changed.", set: "Password set. You can now also log in with your email.",
  },
  fr: {
    name: "Indiquez votre nom.", country: "Choisissez votre pays dans la liste.", accountSaved: "Compte mis à jour.",
    noPhoto: "Aucune photo reçue.", tooHeavy: "Cette photo est trop lourde. Essayez-en une autre.", format: "Format non reconnu : choisissez une photo JPEG, PNG ou WebP.",
    tutorsOnly: "Seuls les tuteurs ont un profil public.", headline: "Votre accroche doit faire au moins 10 caractères.",
    about: "Présentez-vous en au moins 50 caractères.", rate: "Le tarif doit être compris entre 5 et 200.", years: "Années d'expérience invalides.",
    languages: "Choisissez au moins une langue enseignée.", schedule: "Ajoutez des disponibilités dans votre calendrier.", availability: "Indiquez au moins un créneau de disponibilité.",
    saved: "Profil enregistré.", savedPending: "Profil enregistré. Il sera visible dès sa validation par notre équipe.",
    noAccount: "Compte introuvable.", wrongPassword: "Mot de passe actuel incorrect.", short: "Le nouveau mot de passe doit contenir au moins 8 caractères.",
    mismatch: "Les deux mots de passe ne correspondent pas.", changed: "Mot de passe modifié.", set: "Mot de passe défini. Vous pouvez aussi vous connecter avec votre e-mail.",
  },
});

export async function updateAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/profil");
  const name = text(formData, "name", 80);
  const country = text(formData, "country", 60);
  const t = M[await getLocale()];

  if (name.length < 2) return { error: t.name };
  if (!isKnownCountry(country)) return { error: t.country };

  await (await getDb()).users.updateOne({ _id: user._id }, { $set: { name, country } });
  refreshAll();
  return { success: t.accountSaved };
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
  const t = M[await getLocale()];
  if (!(file instanceof File) || file.size === 0) return { error: t.noPhoto };
  if (file.size > AVATAR_MAX_BYTES) return { error: t.tooHeavy };

  const bytes = Buffer.from(await file.arrayBuffer());
  const contentType = imageType(bytes);
  if (!contentType) return { error: t.format };

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
  const t = M[await getLocale()];
  if (user.role !== "tutor") return { error: t.tutorsOnly };

  const headline = text(formData, "headline", 120);
  const about = text(formData, "about", 3000);
  const speaks = text(formData, "speaks", 200);
  const rate = int(formData, "hourly_rate");
  const years = int(formData, "years_experience");
  const allowedSpecialties = new Set<string>(SPECIALTIES.map((s) => s.value));
  const allowedAvailability = new Set<string>(AVAILABILITY.map((a) => a.value));
  const specialties = formData.getAll("specialties").map(String).filter((s) => allowedSpecialties.has(s));
  const db = await getDb();
  // Once the tutor sets their hours in the calendar, the availability tags follow that schedule.
  const schedule = (await db.users.findOne({ _id: user._id }, { projection: { "tutor.schedule": 1 } }))?.tutor?.schedule;
  const availability = schedule
    ? availabilityTags(schedule.ranges)
    : formData.getAll("availability").map(String).filter((a) => allowedAvailability.has(a));

  const slugs = await db.languages.distinct("slug");
  const languages = slugs
    .map((slug) => ({ slug, level: String(formData.get(`lang_${slug}`) ?? "") }))
    .filter((l): l is { slug: string; level: "native" | "fluent" } => l.level === "native" || l.level === "fluent");

  if (headline.length < 10) return { error: t.headline };
  if (about.length < 50) return { error: t.about };
  if (!(rate >= 5 && rate <= 200)) return { error: t.rate };
  if (!(years >= 0 && years <= 60)) return { error: t.years };
  if (languages.length === 0) return { error: t.languages };
  if (availability.length === 0) {
    return { error: schedule ? t.schedule : t.availability };
  }

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

  // A complete profile goes to the Riya team for review (and they are told).
  if (!updated?.tutor?.approved) await submitForReview(user._id);
  refreshAll();
  return {
    success: updated?.tutor?.approved ? t.saved : t.savedPending,
  };
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/profil/securite");
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("password") ?? "");
  const db = await getDb();
  const doc = await db.users.findOne({ _id: user._id }, { projection: { passwordHash: 1 } });
  const t = M[await getLocale()];
  if (!doc) return { error: t.noAccount };

  // Accounts created with Google have no password yet: they can set one directly.
  if (doc.passwordHash && !verifyPassword(current, doc.passwordHash)) return { error: t.wrongPassword };
  if (next.length < 8) return { error: t.short };
  if (next !== String(formData.get("password_confirm") ?? "")) return { error: t.mismatch };

  await db.users.updateOne({ _id: user._id }, { $set: { passwordHash: hashPassword(next) } });
  refreshAll();
  return { success: doc.passwordHash ? t.changed : t.set };
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
