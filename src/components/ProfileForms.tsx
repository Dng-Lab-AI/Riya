"use client";

import { changePassword, updateAccount, updateTutorProfile } from "@/lib/actions/profile";
import { AVAILABILITY, SPECIALTIES } from "@/lib/constants";
import { SubmitButton, useKeepValuesForm } from "./client";
import { FormAlert } from "./ui";

export function AccountForm({ name, country, avatarUrl }: { name: string; country: string; avatarUrl: string }) {
  const { state, pending, onSubmit } = useKeepValuesForm(updateAccount);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">Nom</label>
          <input id="name" name="name" defaultValue={name} required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="country">Pays</label>
          <input id="country" name="country" defaultValue={country} className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="avatar_url">Photo de profil (lien https)</label>
        <input id="avatar_url" name="avatar_url" type="url" defaultValue={avatarUrl} placeholder="https://…" className="input" />
      </div>
      <FormAlert state={state} />
      <SubmitButton pending={pending} pendingText="Enregistrement…">Enregistrer</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const { state, pending, onSubmit } = useKeepValuesForm(changePassword);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="current">Mot de passe actuel</label>
          <input id="current" name="current" type="password" autoComplete="current-password" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="next">Nouveau mot de passe</label>
          <input id="next" name="next" type="password" autoComplete="new-password" minLength={8} required className="input" />
        </div>
      </div>
      <FormAlert state={state} />
      <SubmitButton pending={pending} className="btn-outline" pendingText="Modification…">Changer le mot de passe</SubmitButton>
    </form>
  );
}

type TutorProfileProps = {
  profile: { headline: string; about: string; hourly_rate: number; years_experience: number; specialties: string[]; availability: string[]; speaks: string };
  languages: { slug: string; name: string }[];
  levels: Record<string, string>;
};

export function TutorProfileForm({ profile, languages, levels }: TutorProfileProps) {
  const { state, pending, onSubmit } = useKeepValuesForm(updateTutorProfile);
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className="label" htmlFor="headline">Accroche</label>
        <input id="headline" name="headline" defaultValue={profile.headline} maxLength={120} required className="input" placeholder="Ex. : Swahili vivant et pratique, de Nairobi à Zanzibar" />
      </div>
      <div>
        <label className="label" htmlFor="about">Présentation</label>
        <textarea id="about" name="about" defaultValue={profile.about} rows={6} required className="input" placeholder="Votre parcours, votre méthode, ce que vos élèves vont apprendre…" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="hourly_rate">Tarif par cours (€)</label>
          <input id="hourly_rate" name="hourly_rate" type="number" min={5} max={200} defaultValue={profile.hourly_rate} required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="years_experience">Années d&apos;expérience</label>
          <input id="years_experience" name="years_experience" type="number" min={0} max={60} defaultValue={profile.years_experience} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="speaks">Autres langues parlées</label>
          <input id="speaks" name="speaks" defaultValue={profile.speaks} className="input" placeholder="Français, Anglais…" />
        </div>
      </div>

      <fieldset>
        <legend className="label">Langues enseignées</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {languages.map((l) => (
            <label key={l.slug} className="flex items-center justify-between gap-3 rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm">
              <span className="font-medium">{l.name}</span>
              <select name={`lang_${l.slug}`} defaultValue={levels[l.slug] ?? ""} className="rounded-lg bg-sand-50 px-2 py-1 text-sm outline-none">
                <option value="">Non</option>
                <option value="native">Langue maternelle</option>
                <option value="fluent">Courant</option>
              </select>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <fieldset>
          <legend className="label">Spécialités</legend>
          <div className="space-y-1.5">
            {SPECIALTIES.map((s) => (
              <label key={s.value} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="specialties" value={s.value} defaultChecked={profile.specialties.includes(s.value)} className="accent-clay-600" /> {s.label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="label">Disponibilités</legend>
          <div className="space-y-1.5">
            {AVAILABILITY.map((a) => (
              <label key={a.value} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="availability" value={a.value} defaultChecked={profile.availability.includes(a.value)} className="accent-clay-600" /> {a.label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <FormAlert state={state} />
      <SubmitButton pending={pending} pendingText="Enregistrement…">Enregistrer mon profil de tuteur</SubmitButton>
    </form>
  );
}
