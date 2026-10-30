"use client";

import { useState } from "react";
import { BookOpen, Mic } from "lucide-react";
import { login, register } from "@/lib/actions/auth";
import { SubmitButton, useKeepValuesForm } from "./client";
import { FormAlert } from "./ui";

export function LoginForm({ suite }: { suite: string }) {
  const { state, pending, onSubmit } = useKeepValuesForm(login);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="suite" value={suite} />
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="password">Mot de passe</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
      </div>
      <FormAlert state={state} />
      <SubmitButton pending={pending} className="btn-primary w-full" pendingText="Connexion…">Se connecter</SubmitButton>
    </form>
  );
}

export function RegisterForm({ suite, defaultRole }: { suite: string; defaultRole: "student" | "tutor" }) {
  const { state, pending, onSubmit } = useKeepValuesForm(register);
  const [role, setRole] = useState(defaultRole);
  const roles = [
    { value: "student", icon: BookOpen, title: "Je veux apprendre", text: "Trouvez un tuteur et réservez des cours." },
    { value: "tutor", icon: Mic, title: "Je veux enseigner", text: "Partagez votre langue et fixez vos tarifs." },
  ] as const;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="suite" value={suite} />
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="label">Vous êtes ici pour…</legend>
        {roles.map((r) => (
          <label
            key={r.value}
            className={`cursor-pointer rounded-2xl border-2 p-4 transition ${role === r.value ? "border-clay-600 bg-clay-50" : "border-sand-200 bg-white hover:border-sand-300"}`}
          >
            <input type="radio" name="role" value={r.value} checked={role === r.value} onChange={() => setRole(r.value)} className="sr-only" />
            <r.icon size={22} className="text-clay-600" />
            <span className="mt-2 block font-semibold">{r.title}</span>
            <span className="block text-xs text-earth-600">{r.text}</span>
          </label>
        ))}
      </fieldset>
      <div>
        <label className="label" htmlFor="name">Nom complet</label>
        <input id="name" name="name" autoComplete="name" required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="country">Pays de résidence</label>
        <input id="country" name="country" autoComplete="country-name" className="input" placeholder="Ex. : Sénégal, France, Canada…" />
      </div>
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="password">Mot de passe</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className="input" />
        <p className="mt-1 text-xs text-earth-500">8 caractères minimum.</p>
      </div>
      <FormAlert state={state} />
      <SubmitButton pending={pending} className="btn-primary w-full" pendingText="Création du compte…">Créer mon compte</SubmitButton>
    </form>
  );
}
