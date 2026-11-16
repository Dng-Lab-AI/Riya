"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Camera, Check, Circle, Loader2, Save, Trash2, Upload } from "lucide-react";
import { defineMessages } from "@/i18n";
import { useLocale } from "@/i18n/client";
import { changePassword, removeAvatar, updateAccount, updateTutorProfile, uploadAvatar, type AvatarResult } from "@/lib/actions/profile";
import { AVAILABILITY, SPECIALTIES, choicesFor, labelFor } from "@/lib/constants";
import { formatMoney, quoteFor } from "@/lib/payments/countries";
import { NewPasswordFields, PasswordInput } from "./AuthForms";
import { SubmitButton, useKeepValuesForm } from "./client";
import { CountrySelect } from "./CountrySelect";
import { Avatar, FormAlert, Panel } from "./ui";

const AVATAR_SIZE = 512;

const M = defineMessages({
  en: {
    notImage: "Choose an image (JPEG, PNG, WebP…).", unreadable: "This image can't be read. Try a JPEG or PNG photo.",
    uploadFailed: "The upload failed. Check your connection and try again.", photo: "Profile photo", changePhoto: "Change the profile photo",
    sending: "Uploading…", change: "Change the photo", add: "Add a photo", remove: "Remove",
    photoHint: "From your computer, your gallery or the camera. It's cropped to a square.",
    yourDetails: "Your details", detailsHint: "They appear on your messages, your bookings and, for tutors, on your public profile.",
    name: "Full name", email: "Email", country: "Country of residence", countryHint: "It sets the currency and the payment methods offered.",
    saving: "Saving…", save: "Save", preview: "Preview", yourName: "Your name", seenAs: "This is how other members see you.",
    current: "Current password", googleOnly: "You log in with Google. You can also set a password to log in with your email.",
    newPassword: "New password", changing: "Changing…", changePassword: "Change the password", setPassword: "Set a password",
    checklist: ["A headline (10 characters or more)", "An introduction (50 characters or more)", "At least one language taught", "At least one availability slot", "At least one specialty", "A profile photo"],
    intro: "Introduction", introHint: "What students read first on your profile.", headline: "Headline",
    headlinePlaceholder: "E.g. Lively, practical Swahili, from Nairobi to Zanzibar", about: "Introduction",
    aboutPlaceholder: "Your background, your method, what your students will learn…", years: "Years of experience", speaks: "Other languages spoken",
    speaksPlaceholder: "English, French…", languages: "Languages taught", languagesHint: "Give your level for each language you teach.",
    no: "No", native: "Native language", fluent: "Fluent", price: "Price",
    priceHint: (pct: number) => `Price of a 50-minute lesson, in euros. Riya keeps ${pct}% for payment, the online classroom and the platform.`,
    perLesson: "Price per lesson (€)", inCameroon: "Price shown in Cameroon", youReceive: "You receive",
    specialtiesAvailability: "Specialties and availability", filtersHint: "They're used by the students' search filters.", specialties: "Specialties",
    availability: "Availability", fromSchedule: "Calculated from your weekly hours.", editCalendar: "Edit in the calendar",
    preciseHours: "To choose your exact hours, day by day, use", yourCalendar: "your calendar", saveProfile: "Save my profile",
    completed: "Profile completed", photoElsewhere: "The photo is changed in “Personal details”.",
  },
  fr: {
    notImage: "Choisissez une image (JPEG, PNG, WebP…).", unreadable: "Impossible de lire cette image. Essayez une photo JPEG ou PNG.",
    uploadFailed: "L'envoi a échoué. Vérifiez votre connexion et réessayez.", photo: "Photo de profil", changePhoto: "Changer la photo de profil",
    sending: "Envoi…", change: "Changer la photo", add: "Ajouter une photo", remove: "Retirer",
    photoHint: "Depuis votre ordinateur, votre galerie ou l'appareil photo. Elle est recadrée en carré.",
    yourDetails: "Vos informations", detailsHint: "Elles apparaissent sur vos messages, vos réservations et, pour les tuteurs, sur votre profil public.",
    name: "Nom complet", email: "E-mail", country: "Pays de résidence", countryHint: "Il détermine la devise et les moyens de paiement proposés.",
    saving: "Enregistrement…", save: "Enregistrer", preview: "Aperçu", yourName: "Votre nom", seenAs: "C'est ainsi que les autres membres vous voient.",
    current: "Mot de passe actuel", googleOnly: "Vous vous connectez avec Google. Vous pouvez aussi définir un mot de passe pour vous connecter avec votre e-mail.",
    newPassword: "Nouveau mot de passe", changing: "Modification…", changePassword: "Changer le mot de passe", setPassword: "Définir un mot de passe",
    checklist: ["Une accroche (10 caractères ou plus)", "Une présentation (50 caractères ou plus)", "Au moins une langue enseignée", "Au moins un créneau de disponibilité", "Au moins une spécialité", "Une photo de profil"],
    intro: "Présentation", introHint: "Ce que les élèves lisent en premier sur votre profil.", headline: "Accroche",
    headlinePlaceholder: "Ex. : Swahili vivant et pratique, de Nairobi à Zanzibar", about: "Présentation",
    aboutPlaceholder: "Votre parcours, votre méthode, ce que vos élèves vont apprendre…", years: "Années d'expérience", speaks: "Autres langues parlées",
    speaksPlaceholder: "Français, Anglais…", languages: "Langues enseignées", languagesHint: "Indiquez votre niveau pour chaque langue que vous enseignez.",
    no: "Non", native: "Langue maternelle", fluent: "Courant", price: "Tarif",
    priceHint: (pct: number) => `Prix d'un cours de 50 minutes, en euros. Riya garde ${pct} % pour le paiement, la classe en ligne et la plateforme.`,
    perLesson: "Tarif par cours (€)", inCameroon: "Prix affiché au Cameroun", youReceive: "Vous recevez",
    specialtiesAvailability: "Spécialités et disponibilités", filtersHint: "Elles servent aux filtres de recherche des élèves.", specialties: "Spécialités",
    availability: "Disponibilités", fromSchedule: "Calculées à partir de vos horaires hebdomadaires.", editCalendar: "Modifier dans le calendrier",
    preciseHours: "Pour choisir vos horaires précis, jour par jour, utilisez", yourCalendar: "votre calendrier", saveProfile: "Enregistrer mon profil",
    completed: "Profil complété", photoElsewhere: "La photo se change dans « Informations personnelles ».",
  },
});

type Texts = (typeof M)["en"];

// Crops the picture to a centred square and shrinks it, so a 10 MB phone photo uploads as ~50 KB.
async function squareJpeg(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const out = Math.min(AVATAR_SIZE, side);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = out;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff"; // transparent PNGs get a white background instead of black
    ctx.fillRect(0, 0, out, out);
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, out, out);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob) throw new Error("toBlob");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Photo from the computer, or the gallery / camera on a phone. Saved at once, apart from the form.
function AvatarPicker({ name, avatarUrl, onChange }: { name: string; avatarUrl: string; onChange: (url: string) => void }) {
  const t = M[useLocale()];
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [busy, startBusy] = useTransition();

  const apply = (result: AvatarResult) => {
    if ("error" in result) setError(result.error);
    else onChange(result.avatarUrl);
  };

  const pick = (file: File | undefined) => {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) return setError(t.notImage);
    startBusy(async () => {
      let blob: Blob;
      try {
        blob = await squareJpeg(file);
      } catch {
        return setError(t.unreadable);
      }
      const data = new FormData();
      data.append("photo", blob, "photo.jpg");
      try {
        apply(await uploadAvatar(data));
      } catch {
        setError(t.uploadFailed);
      }
    });
  };

  return (
    <div>
      <p className="label">{t.photo}</p>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="group relative shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-600"
          aria-label={t.changePhoto}
        >
          <Avatar name={name || "?"} src={avatarUrl} size={80} />
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-earth-900/45 text-white opacity-0 transition group-hover:opacity-100">
            <Camera size={22} />
          </span>
          {busy && (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-earth-900/55 text-white">
              <Loader2 size={22} className="animate-spin" />
            </span>
          )}
        </button>
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => input.current?.click()} disabled={busy} className="btn-outline">
              <Upload size={16} /> {busy ? t.sending : avatarUrl ? t.change : t.add}
            </button>
            {avatarUrl && (
              <button type="button" onClick={() => startBusy(async () => apply(await removeAvatar()))} disabled={busy} className="btn text-clay-700 hover:bg-clay-50">
                <Trash2 size={16} /> {t.remove}
              </button>
            )}
          </div>
          <p className="text-xs text-earth-500">{t.photoHint}</p>
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-clay-700">{error}</p>}
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = ""; // choosing the same file again still triggers a change
        }}
      />
    </div>
  );
}

export function AccountForm({ name, email, country, avatarUrl }: { name: string; email: string; country: string; avatarUrl: string }) {
  const t = M[useLocale()];
  const { state, pending, onSubmit } = useKeepValuesForm(updateAccount);
  const [preview, setPreview] = useState({ name, avatarUrl });

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <Panel title={t.yourDetails} description={t.detailsHint}>
        <div className="space-y-4">
          <AvatarPicker name={preview.name} avatarUrl={preview.avatarUrl} onChange={(url) => setPreview((p) => ({ ...p, avatarUrl: url }))} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="name">{t.name}</label>
              <input id="name" name="name" defaultValue={name} required className="input" onChange={(e) => setPreview((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="label" htmlFor="email">{t.email}</label>
              <input id="email" value={email} readOnly className="input cursor-not-allowed bg-sand-50 text-earth-500" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="country">{t.country}</label>
            <CountrySelect defaultValue={country} />
            <p className="mt-1 text-xs text-earth-500">{t.countryHint}</p>
          </div>
          <FormAlert state={state} />
          <SubmitButton pending={pending} pendingText={t.saving}><Save size={16} /> {t.save}</SubmitButton>
        </div>
      </Panel>

      <aside className="h-fit rounded-[1.75rem] bg-forest-800 p-6 text-center text-sand-50">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-ochre-300">{t.preview}</p>
        <div className="mt-5 flex justify-center">
          <Avatar name={preview.name || "?"} src={preview.avatarUrl} size={96} className="ring-4 ring-white/15" />
        </div>
        <p className="mt-4 font-display text-xl font-semibold">{preview.name || t.yourName}</p>
        <p className="mt-1 text-sm text-sand-300">{t.seenAs}</p>
      </aside>
    </form>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const t = M[useLocale()];
  const { state, pending, onSubmit } = useKeepValuesForm(changePassword);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {hasPassword ? (
        <div className="max-w-sm">
          <label className="label" htmlFor="current">{t.current}</label>
          <PasswordInput id="current" name="current" autoComplete="current-password" />
        </div>
      ) : (
        <p className="rounded-2xl bg-sand-50 p-3 text-sm text-earth-600">{t.googleOnly}</p>
      )}
      <NewPasswordFields label={t.newPassword} />
      <FormAlert state={state} />
      <SubmitButton pending={pending} pendingText={t.changing}>{hasPassword ? t.changePassword : t.setPassword}</SubmitButton>
    </form>
  );
}

type TutorProfileProps = {
  profile: { headline: string; about: string; hourly_rate: number; years_experience: number; specialties: string[]; availability: string[]; speaks: string; has_photo: boolean; has_schedule: boolean };
  languages: { slug: string; name: string }[];
  levels: Record<string, string>;
  commission: number;
};

// The same rules the server applies, so the checklist shows what is still missing before saving.
function completion(form: HTMLFormElement | null, profile: TutorProfileProps["profile"], levels: Record<string, string>) {
  const data = form ? new FormData(form) : null;
  const value = (key: string, fallback: string) => (data ? String(data.get(key) ?? "") : fallback);
  const languages = data ? [...data.entries()].filter(([k, v]) => k.startsWith("lang_") && v).length : Object.keys(levels).length;
  const all = (key: string, fallback: string[]) => (data ? data.getAll(key) : fallback);
  return [
    value("headline", profile.headline).trim().length >= 10,
    value("about", profile.about).trim().length >= 50,
    languages > 0,
    all("availability", profile.availability).length > 0,
    all("specialties", profile.specialties).length > 0,
    profile.has_photo,
  ];
}

export function TutorProfileForm({ profile, languages, levels, commission }: TutorProfileProps) {
  const locale = useLocale();
  const t: Texts = M[locale];
  const { state, pending, onSubmit } = useKeepValuesForm(updateTutorProfile);
  const [checks, setChecks] = useState(() => completion(null, profile, levels));
  const [rate, setRate] = useState(profile.hourly_rate);
  const checklist = checks.map((done, i) => ({ label: t.checklist[i], done }));
  const done = checklist.filter((c) => c.done).length;
  const percent = Math.round((done / checklist.length) * 100);
  const local = quoteFor("Cameroun", rate || 0);

  return (
    <form onSubmit={onSubmit} onInput={(e) => setChecks(completion(e.currentTarget, profile, levels))} className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="space-y-6">
        <Panel title={t.intro} description={t.introHint}>
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="headline">{t.headline}</label>
              <input id="headline" name="headline" defaultValue={profile.headline} maxLength={120} required className="input" placeholder={t.headlinePlaceholder} />
            </div>
            <div>
              <label className="label" htmlFor="about">{t.about}</label>
              <textarea id="about" name="about" defaultValue={profile.about} rows={7} required className="input" placeholder={t.aboutPlaceholder} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="years_experience">{t.years}</label>
                <input id="years_experience" name="years_experience" type="number" min={0} max={60} defaultValue={profile.years_experience} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="speaks">{t.speaks}</label>
                <input id="speaks" name="speaks" defaultValue={profile.speaks} className="input" placeholder={t.speaksPlaceholder} />
              </div>
            </div>
          </div>
        </Panel>

        <Panel title={t.languages} description={t.languagesHint}>
          <div className="grid gap-2 sm:grid-cols-2">
            {languages.map((l) => (
              <label key={l.slug} className="flex items-center justify-between gap-3 rounded-2xl border border-sand-200 px-3 py-2 text-sm">
                <span className="font-medium">{l.name}</span>
                <select name={`lang_${l.slug}`} defaultValue={levels[l.slug] ?? ""} className="rounded-lg bg-sand-50 px-2 py-1 text-sm outline-none">
                  <option value="">{t.no}</option>
                  <option value="native">{t.native}</option>
                  <option value="fluent">{t.fluent}</option>
                </select>
              </label>
            ))}
          </div>
        </Panel>

        <Panel title={t.price} description={t.priceHint(Math.round(commission * 100))}>
          <div className="grid items-end gap-4 sm:grid-cols-[12rem_1fr]">
            <div>
              <label className="label" htmlFor="hourly_rate">{t.perLesson}</label>
              <input id="hourly_rate" name="hourly_rate" type="number" min={5} max={200} defaultValue={profile.hourly_rate} required className="input" onChange={(e) => setRate(Number(e.target.value))} />
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-sand-50 p-3">
                <dt className="text-earth-500">{t.inCameroon}</dt>
                <dd className="font-display text-lg font-semibold">{formatMoney(local.amount, local.currency, locale)}</dd>
              </div>
              <div className="rounded-2xl bg-forest-100 p-3 text-forest-800">
                <dt>{t.youReceive}</dt>
                <dd className="font-display text-lg font-semibold">{formatMoney(Math.round((rate || 0) * (1 - commission) * 100) / 100, "EUR", locale)}</dd>
              </div>
            </dl>
          </div>
        </Panel>

        <Panel title={t.specialtiesAvailability} description={t.filtersHint}>
          <p className="label">{t.specialties}</p>
          <ToggleGroup name="specialties" options={choicesFor(SPECIALTIES, locale)} selected={profile.specialties} />
          <p className="label mt-5">{t.availability}</p>
          {profile.has_schedule ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {profile.availability.map((a) => (
                  <span key={a} className="rounded-full bg-forest-800 px-3.5 py-2 text-sm font-medium text-sand-50">
                    <input type="hidden" name="availability" value={a} />
                    {labelFor(AVAILABILITY, a, locale)}
                  </span>
                ))}
              </div>
              <p className="text-sm text-earth-600">
                {t.fromSchedule} <Link href="/calendrier" className="font-semibold text-clay-700 underline">{t.editCalendar}</Link>
              </p>
            </div>
          ) : (
            <>
              <ToggleGroup name="availability" options={choicesFor(AVAILABILITY, locale)} selected={profile.availability} />
              <p className="mt-2 text-sm text-earth-600">
                {t.preciseHours} <Link href="/calendrier" className="font-semibold text-clay-700 underline">{t.yourCalendar}</Link>.
              </p>
            </>
          )}
        </Panel>

        <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-earth-900/10 bg-white/95 p-3 pl-5 shadow-lg backdrop-blur">
          <div className="min-w-0 flex-1"><FormAlert state={state} /></div>
          <SubmitButton pending={pending} pendingText={t.saving}><Save size={16} /> {t.saveProfile}</SubmitButton>
        </div>
      </div>

      <aside className="h-fit space-y-4 rounded-[1.75rem] bg-sand-100 p-6 xl:sticky xl:top-20">
        <div className="flex items-baseline justify-between">
          <p className="font-semibold">{t.completed}</p>
          <p className="font-display text-2xl font-semibold">{percent}{locale === "fr" ? " " : ""}%</p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-forest-600 transition-all duration-500" style={{ width: `${percent}%` }} />
        </div>
        <ul className="space-y-2 text-sm">
          {checklist.map((item) => (
            <li key={item.label} className={`flex items-start gap-2 ${item.done ? "text-earth-500" : "text-earth-900"}`}>
              {item.done ? <Check size={16} className="mt-0.5 shrink-0 text-forest-600" /> : <Circle size={16} className="mt-0.5 shrink-0 text-earth-400" />}
              <span className={item.done ? "line-through decoration-earth-300" : ""}>{item.label}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-earth-500">{t.photoElsewhere}</p>
      </aside>
    </form>
  );
}

// Multiple choice shown as pills: easier to scan and tap than a column of checkboxes.
function ToggleGroup({ name, options, selected }: { name: string; options: readonly { value: string; label: string }[]; selected: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <label key={o.value} className="cursor-pointer">
          <input type="checkbox" name={name} value={o.value} defaultChecked={selected.includes(o.value)} className="peer sr-only" />
          <span className="flex items-center gap-1.5 rounded-full border border-earth-900/15 bg-white px-3.5 py-2 text-sm font-medium text-earth-700 transition peer-checked:border-forest-700 peer-checked:bg-forest-800 peer-checked:text-sand-50 peer-focus-visible:ring-2 peer-focus-visible:ring-clay-300">
            {o.label}
          </span>
        </label>
      ))}
    </div>
  );
}
