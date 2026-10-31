"use server";

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
  const avatarUrl = text(formData, "avatar_url", 500);

  if (name.length < 2) return { error: "Indiquez votre nom." };
  if (!isKnownCountry(country)) return { error: "Choisissez votre pays dans la liste." };
  if (avatarUrl && !/^https:\/\/\S+$/.test(avatarUrl)) return { error: "La photo doit être un lien https://." };

  await (await getDb()).users.updateOne({ _id: user._id }, { $set: { name, country, avatarUrl } });
  refreshAll();
  return { success: "Compte mis à jour." };
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
  const user = await requireUser("/profil");
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const db = await getDb();
  const doc = await db.users.findOne({ _id: user._id }, { projection: { passwordHash: 1 } });

  if (!doc || !verifyPassword(current, doc.passwordHash)) return { error: "Mot de passe actuel incorrect." };
  if (next.length < 8) return { error: "Le nouveau mot de passe doit contenir au moins 8 caractères." };

  await db.users.updateOne({ _id: user._id }, { $set: { passwordHash: hashPassword(next) } });
  return { success: "Mot de passe modifié." };
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
