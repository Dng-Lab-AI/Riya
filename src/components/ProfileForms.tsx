"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Check, Circle, Loader2, Save, Trash2, Upload } from "lucide-react";
import { changePassword, removeAvatar, updateAccount, updateTutorProfile, uploadAvatar, type AvatarResult } from "@/lib/actions/profile";
import { AVAILABILITY, SPECIALTIES } from "@/lib/constants";
import { formatMoney, quoteFor } from "@/lib/payments/countries";
import { NewPasswordFields, PasswordInput } from "./AuthForms";
import { SubmitButton, useKeepValuesForm } from "./client";
import { CountrySelect } from "./CountrySelect";
import { Avatar, FormAlert, Panel } from "./ui";

const AVATAR_SIZE = 512;

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
    if (!file.type.startsWith("image/")) return setError("Choisissez une image (JPEG, PNG, WebP…).");
    startBusy(async () => {
      let blob: Blob;
      try {
        blob = await squareJpeg(file);
      } catch {
        return setError("Impossible de lire cette image. Essayez une photo JPEG ou PNG.");
      }
      const data = new FormData();
      data.append("photo", blob, "photo.jpg");
      try {
        apply(await uploadAvatar(data));
      } catch {
        setError("L'envoi a échoué. Vérifiez votre connexion et réessayez.");
      }
    });
  };

  return (
    <div>
      <p className="label">Photo de profil</p>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="group relative shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-600"
          aria-label="Changer la photo de profil"
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
              <Upload size={16} /> {busy ? "Envoi…" : avatarUrl ? "Changer la photo" : "Ajouter une photo"}
            </button>
            {avatarUrl && (
              <button type="button" onClick={() => startBusy(async () => apply(await removeAvatar()))} disabled={busy} className="btn text-clay-700 hover:bg-clay-50">
                <Trash2 size={16} /> Retirer
              </button>
            )}
          </div>
          <p className="text-xs text-earth-500">Depuis votre ordinateur, votre galerie ou l&apos;appareil photo. Elle est recadrée en carré.</p>
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
  const { state, pending, onSubmit } = useKeepValuesForm(updateAccount);
  const [preview, setPreview] = useState({ name, avatarUrl });

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <Panel title="Vos informations" description="Elles apparaissent sur vos messages, vos réservations et, pour les tuteurs, sur votre profil public.">
        <div className="space-y-4">
          <AvatarPicker name={preview.name} avatarUrl={preview.avatarUrl} onChange={(url) => setPreview((p) => ({ ...p, avatarUrl: url }))} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="name">Nom complet</label>
              <input id="name" name="name" defaultValue={name} required className="input" onChange={(e) => setPreview((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="label" htmlFor="email">E-mail</label>
              <input id="email" value={email} readOnly className="input cursor-not-allowed bg-sand-50 text-earth-500" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="country">Pays de résidence</label>
            <CountrySelect defaultValue={country} />
            <p className="mt-1 text-xs text-earth-500">Il détermine la devise et les moyens de paiement proposés.</p>
          </div>
          <FormAlert state={state} />
          <SubmitButton pending={pending} pendingText="Enregistrement…"><Save size={16} /> Enregistrer</SubmitButton>
        </div>
      </Panel>

      <aside className="h-fit rounded-[1.75rem] bg-forest-800 p-6 text-center text-sand-50">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-ochre-300">Aperçu</p>
        <div className="mt-5 flex justify-center">
          <Avatar name={preview.name || "?"} src={preview.avatarUrl} size={96} className="ring-4 ring-white/15" />
        </div>
        <p className="mt-4 font-display text-xl font-semibold">{preview.name || "Votre nom"}</p>
        <p className="mt-1 text-sm text-sand-300">C&apos;est ainsi que les autres membres vous voient.</p>
      </aside>
    </form>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const { state, pending, onSubmit } = useKeepValuesForm(changePassword);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {hasPassword ? (
        <div className="max-w-sm">
          <label className="label" htmlFor="current">Mot de passe actuel</label>
          <PasswordInput id="current" name="current" autoComplete="current-password" />
        </div>
      ) : (
        <p className="rounded-2xl bg-sand-50 p-3 text-sm text-earth-600">Vous vous connectez avec Google. Vous pouvez aussi définir un mot de passe pour vous connecter avec votre e-mail.</p>
      )}
      <NewPasswordFields label="Nouveau mot de passe" />
      <FormAlert state={state} />
      <SubmitButton pending={pending} pendingText="Modification…">{hasPassword ? "Changer le mot de passe" : "Définir un mot de passe"}</SubmitButton>
    </form>
  );
}

type TutorProfileProps = {
  profile: { headline: string; about: string; hourly_rate: number; years_experience: number; specialties: string[]; availability: string[]; speaks: string; has_photo: boolean };
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
    { label: "Une accroche (10 caractères ou plus)", done: value("headline", profile.headline).trim().length >= 10 },
    { label: "Une présentation (50 caractères ou plus)", done: value("about", profile.about).trim().length >= 50 },
    { label: "Au moins une langue enseignée", done: languages > 0 },
    { label: "Au moins un créneau de disponibilité", done: all("availability", profile.availability).length > 0 },
    { label: "Au moins une spécialité", done: all("specialties", profile.specialties).length > 0 },
    { label: "Une photo de profil", done: profile.has_photo },
  ];
}

export function TutorProfileForm({ profile, languages, levels, commission }: TutorProfileProps) {
  const { state, pending, onSubmit } = useKeepValuesForm(updateTutorProfile);
  const [checklist, setChecklist] = useState(() => completion(null, profile, levels));
  const [rate, setRate] = useState(profile.hourly_rate);
  const done = checklist.filter((c) => c.done).length;
  const percent = Math.round((done / checklist.length) * 100);
  const local = quoteFor("Cameroun", rate || 0);

  return (
    <form onSubmit={onSubmit} onInput={(e) => setChecklist(completion(e.currentTarget, profile, levels))} className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="space-y-6">
        <Panel title="Présentation" description="Ce que les élèves lisent en premier sur votre profil.">
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="headline">Accroche</label>
              <input id="headline" name="headline" defaultValue={profile.headline} maxLength={120} required className="input" placeholder="Ex. : Swahili vivant et pratique, de Nairobi à Zanzibar" />
            </div>
            <div>
              <label className="label" htmlFor="about">Présentation</label>
              <textarea id="about" name="about" defaultValue={profile.about} rows={7} required className="input" placeholder="Votre parcours, votre méthode, ce que vos élèves vont apprendre…" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="years_experience">Années d&apos;expérience</label>
                <input id="years_experience" name="years_experience" type="number" min={0} max={60} defaultValue={profile.years_experience} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="speaks">Autres langues parlées</label>
                <input id="speaks" name="speaks" defaultValue={profile.speaks} className="input" placeholder="Français, Anglais…" />
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Langues enseignées" description="Indiquez votre niveau pour chaque langue que vous enseignez.">
          <div className="grid gap-2 sm:grid-cols-2">
            {languages.map((l) => (
              <label key={l.slug} className="flex items-center justify-between gap-3 rounded-2xl border border-sand-200 px-3 py-2 text-sm">
                <span className="font-medium">{l.name}</span>
                <select name={`lang_${l.slug}`} defaultValue={levels[l.slug] ?? ""} className="rounded-lg bg-sand-50 px-2 py-1 text-sm outline-none">
                  <option value="">Non</option>
                  <option value="native">Langue maternelle</option>
                  <option value="fluent">Courant</option>
                </select>
              </label>
            ))}
          </div>
        </Panel>

        <Panel title="Tarif" description={`Prix d'un cours de 50 minutes, en euros. Riya garde ${Math.round(commission * 100)} % pour le paiement, la classe en ligne et la plateforme.`}>
          <div className="grid items-end gap-4 sm:grid-cols-[12rem_1fr]">
            <div>
              <label className="label" htmlFor="hourly_rate">Tarif par cours (€)</label>
              <input id="hourly_rate" name="hourly_rate" type="number" min={5} max={200} defaultValue={profile.hourly_rate} required className="input" onChange={(e) => setRate(Number(e.target.value))} />
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-sand-50 p-3">
                <dt className="text-earth-500">Prix affiché au Cameroun</dt>
                <dd className="font-display text-lg font-semibold">{formatMoney(local.amount, local.currency)}</dd>
              </div>
              <div className="rounded-2xl bg-forest-100 p-3 text-forest-800">
                <dt>Vous recevez</dt>
                <dd className="font-display text-lg font-semibold">{formatMoney(Math.round((rate || 0) * (1 - commission) * 100) / 100, "EUR")}</dd>
              </div>
            </dl>
          </div>
        </Panel>

        <Panel title="Spécialités et disponibilités" description="Elles servent aux filtres de recherche des élèves.">
          <p className="label">Spécialités</p>
          <ToggleGroup name="specialties" options={SPECIALTIES} selected={profile.specialties} />
          <p className="label mt-5">Disponibilités</p>
          <ToggleGroup name="availability" options={AVAILABILITY} selected={profile.availability} />
        </Panel>

        <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-earth-900/10 bg-white/95 p-3 pl-5 shadow-lg backdrop-blur">
          <div className="min-w-0 flex-1"><FormAlert state={state} /></div>
          <SubmitButton pending={pending} pendingText="Enregistrement…"><Save size={16} /> Enregistrer mon profil</SubmitButton>
        </div>
      </div>

      <aside className="h-fit space-y-4 rounded-[1.75rem] bg-sand-100 p-6 xl:sticky xl:top-20">
        <div className="flex items-baseline justify-between">
          <p className="font-semibold">Profil complété</p>
          <p className="font-display text-2xl font-semibold">{percent} %</p>
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
        <p className="text-xs text-earth-500">La photo se change dans « Informations personnelles ».</p>
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
