"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Check, Eye, EyeOff, Mic, X } from "lucide-react";
import { login, register, requestPasswordReset, resendVerification, resetPassword } from "@/lib/actions/auth";
import { SubmitButton, useKeepValuesForm } from "./client";
import { CountrySelect } from "./CountrySelect";
import { FormAlert } from "./ui";

// Password field with a button to show or hide what is typed.
export function PasswordInput({ id, name, autoComplete, minLength, value, onChange }: { id: string; name: string; autoComplete: string; minLength?: number; value?: string; onChange?: (value: string) => void }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        minLength={minLength}
        required
        value={value}
        onChange={onChange && ((e) => onChange(e.target.value))}
        className="input pr-12"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-earth-500 hover:text-earth-900"
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

// New password typed twice, with live feedback on length and match.
export function NewPasswordFields({ label = "Mot de passe" }: { label?: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const longEnough = password.length >= 8;
  const matches = confirm.length > 0 && confirm === password;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="label" htmlFor="password">{label}</label>
        <PasswordInput id="password" name="password" autoComplete="new-password" minLength={8} value={password} onChange={setPassword} />
        <Hint ok={longEnough} show={password.length > 0}>8 caractères minimum</Hint>
      </div>
      <div>
        <label className="label" htmlFor="password_confirm">Confirmez le mot de passe</label>
        <PasswordInput id="password_confirm" name="password_confirm" autoComplete="new-password" minLength={8} value={confirm} onChange={setConfirm} />
        <Hint ok={matches} show={confirm.length > 0}>{matches ? "Les mots de passe correspondent" : "Les mots de passe ne correspondent pas"}</Hint>
      </div>
    </div>
  );
}

function Hint({ ok, show, children }: { ok: boolean; show: boolean; children: React.ReactNode }) {
  if (!show) return <p className="mt-1 text-xs text-earth-500">{children}</p>;
  return (
    <p className={`mt-1 flex items-center gap-1 text-xs ${ok ? "text-forest-700" : "text-clay-700"}`}>
      {ok ? <Check size={13} /> : <X size={13} />} {children}
    </p>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function GoogleButton({ role, suite, label = "Continuer avec Google" }: { role?: "student" | "tutor"; suite?: string; label?: string }) {
  const params = new URLSearchParams({ ...(role ? { role } : {}), ...(suite ? { suite } : {}) });
  return (
    // A plain link: the browser must leave for Google's page.
    <a href={`/api/auth/google?${params}`} className="btn-outline w-full py-3">
      <GoogleIcon /> {label}
    </a>
  );
}

function Separator() {
  return (
    <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-earth-400">
      <span className="h-px flex-1 bg-sand-300" /> ou <span className="h-px flex-1 bg-sand-300" />
    </div>
  );
}

export function LoginForm({ suite, google }: { suite: string; google: boolean }) {
  const { state, pending, onSubmit } = useKeepValuesForm(login);
  return (
    <div className="space-y-5">
      {google && (
        <>
          <GoogleButton suite={suite} />
          <Separator />
        </>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <input type="hidden" name="suite" value={suite} />
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="input" />
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <label className="label" htmlFor="password">Mot de passe</label>
            <Link href="/mot-de-passe-oublie" className="text-xs font-semibold text-clay-700 hover:underline">Mot de passe oublié ?</Link>
          </div>
          <PasswordInput id="password" name="password" autoComplete="current-password" />
        </div>
        <FormAlert state={state} />
        <SubmitButton pending={pending} className="btn-primary w-full py-3" pendingText="Connexion…">Se connecter</SubmitButton>
      </form>
    </div>
  );
}

export function RegisterForm({ suite, defaultRole, google }: { suite: string; defaultRole: "student" | "tutor"; google: boolean }) {
  const { state, pending, onSubmit } = useKeepValuesForm(register);
  const [role, setRole] = useState(defaultRole);
  const roles = [
    { value: "student", icon: BookOpen, title: "Je veux apprendre", text: "Trouvez un tuteur et réservez des cours." },
    { value: "tutor", icon: Mic, title: "Je veux enseigner", text: "Partagez votre langue et fixez vos tarifs." },
  ] as const;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
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

      {google && (
        <>
          <GoogleButton role={role} suite={suite} label="S'inscrire avec Google" />
          <Separator />
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">Nom complet</label>
          <input id="name" name="name" autoComplete="name" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="country">Pays de résidence</label>
          <CountrySelect />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
        <p className="mt-1 text-xs text-earth-500">Nous vous enverrons un lien pour confirmer cette adresse.</p>
      </div>
      <NewPasswordFields />
      <FormAlert state={state} />
      <SubmitButton pending={pending} className="btn-primary w-full py-3" pendingText="Création du compte…">Créer mon compte</SubmitButton>
    </form>
  );
}

export function ResendVerificationForm({ email }: { email: string }) {
  const { state, pending, onSubmit } = useKeepValuesForm(resendVerification);
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="label" htmlFor="email">Adresse e-mail</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input id="email" name="email" type="email" defaultValue={email} required className="input" />
        <SubmitButton pending={pending} className="btn-outline shrink-0" pendingText="Envoi…">Renvoyer l&apos;e-mail</SubmitButton>
      </div>
      <FormAlert state={state} />
    </form>
  );
}

export function ForgotPasswordForm() {
  const { state, pending, onSubmit } = useKeepValuesForm(requestPasswordReset);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">Adresse e-mail du compte</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
      </div>
      <FormAlert state={state} />
      <SubmitButton pending={pending} className="btn-primary w-full py-3" pendingText="Envoi…">Recevoir un lien</SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const { state, pending, onSubmit } = useKeepValuesForm(resetPassword.bind(null, token));
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <NewPasswordFields label="Nouveau mot de passe" />
      <FormAlert state={state} />
      <SubmitButton pending={pending} className="btn-primary w-full py-3" pendingText="Enregistrement…">Enregistrer et me connecter</SubmitButton>
    </form>
  );
}
