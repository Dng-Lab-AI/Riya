"use client";

import { useState } from "react";
import { Check, Circle, Eye, EyeOff, Save } from "lucide-react";
import { changePassword, updateAccount, updateTutorProfile } from "@/lib/actions/profile";
import { AVAILABILITY, SPECIALTIES } from "@/lib/constants";
import { formatMoney, quoteFor } from "@/lib/payments/countries";
import { SubmitButton, useKeepValuesForm } from "./client";
import { CountrySelect } from "./CountrySelect";
import { Avatar, FormAlert, Panel } from "./ui";

export function AccountForm({ name, email, country, avatarUrl }: { name: string; email: string; country: string; avatarUrl: string }) {
  const { state, pending, onSubmit } = useKeepValuesForm(updateAccount);
  const [preview, setPreview] = useState({ name, avatarUrl });
  const validPhoto = /^https:\/\/\S+$/.test(preview.avatarUrl) ? preview.avatarUrl : "";

  return (
    <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-[1fr_18rem]">
      <Panel title="Vos informations" description="Elles apparaissent sur vos messages, vos réservations et, pour les tuteurs, sur votre profil public.">
        <div className="space-y-4">
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
          <div>
            <label className="label" htmlFor="avatar_url">Photo de profil</label>
            <input
              id="avatar_url"
              name="avatar_url"
              type="url"
              defaultValue={avatarUrl}
              placeholder="https://… (lien vers une image)"
              className="input"
              onChange={(e) => setPreview((p) => ({ ...p, avatarUrl: e.target.value.trim() }))}
            />
          </div>
          <FormAlert state={state} />
          <SubmitButton pending={pending} pendingText="Enregistrement…"><Save size={16} /> Enregistrer</SubmitButton>
        </div>
      </Panel>

      <aside className="h-fit rounded-[1.75rem] bg-forest-800 p-6 text-center text-sand-50">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-ochre-300">Aperçu</p>
        <div className="mt-5 flex justify-center">
          <Avatar name={preview.name || "?"} src={validPhoto} size={96} className="ring-4 ring-white/15" />
        </div>
        <p className="mt-4 font-display text-xl font-semibold">{preview.name || "Votre nom"}</p>
        <p className="mt-1 text-sm text-sand-300">C&apos;est ainsi que les autres membres vous voient.</p>
      </aside>
    </form>
  );
}

export function PasswordForm() {
  const { state, pending, onSubmit } = useKeepValuesForm(changePassword);
  const [visible, setVisible] = useState(false);
  const type = visible ? "text" : "password";
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="current">Mot de passe actuel</label>
          <input id="current" name="current" type={type} autoComplete="current-password" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="next">Nouveau mot de passe</label>
          <input id="next" name="next" type={type} autoComplete="new-password" minLength={8} required className="input" />
          <p className="mt-1 text-xs text-earth-500">8 caractères minimum.</p>
        </div>
      </div>
      <button type="button" onClick={() => setVisible((v) => !v)} className="flex items-center gap-2 text-sm text-earth-600 hover:text-earth-900">
        {visible ? <EyeOff size={16} /> : <Eye size={16} />} {visible ? "Masquer" : "Afficher"} les mots de passe
      </button>
      <FormAlert state={state} />
      <SubmitButton pending={pending} pendingText="Modification…">Changer le mot de passe</SubmitButton>
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
    <form onSubmit={onSubmit} onInput={(e) => setChecklist(completion(e.currentTarget, profile, levels))} className="grid gap-6 xl:grid-cols-[1fr_18rem]">
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
