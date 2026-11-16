"use client";

import { useEffect, useRef } from "react";
import { KeyRound, UserMinus, UserPlus } from "lucide-react";
import { defineMessages } from "@/i18n";
import { useLocale } from "@/i18n/client";
import { addAdmin, changeAdminPassword, removeAdmin } from "@/lib/actions/team";
import { SubmitButton, useKeepValuesForm } from "../client";
import { FormAlert } from "../ui";

const M = defineMessages({
  en: {
    name: "Name", email: "E-mail", password: "Password", passwordHint: "Only for a new account: an existing member keeps their own password. Give it to the person yourself.",
    add: "Add the administrator", adding: "Adding…", remove: "Remove admin rights", confirmRemove: (name: string) => `Remove the administrator rights of ${name}? Their account becomes a student account.`,
    current: "Current password", next: "New password", confirm: "New password again", change: "Change my password", saving: "Saving…",
  },
  fr: {
    name: "Nom", email: "E-mail", password: "Mot de passe", passwordHint: "Seulement pour un nouveau compte : un membre existant garde son propre mot de passe. Communiquez-le vous-même à la personne.",
    add: "Ajouter l'administrateur", adding: "Ajout…", remove: "Retirer les droits", confirmRemove: (name: string) => `Retirer les droits d'administrateur de ${name} ? Son compte devient un compte élève.`,
    current: "Mot de passe actuel", next: "Nouveau mot de passe", confirm: "Nouveau mot de passe (encore)", change: "Changer mon mot de passe", saving: "Enregistrement…",
  },
});

// Empties the form once the action succeeded (the values are kept on an error).
function useResetOnSuccess(state: { success?: string } | undefined) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.success) ref.current?.reset();
  }, [state]);
  return ref;
}

export function AddAdminForm() {
  const t = M[useLocale()];
  const { state, onSubmit } = useKeepValuesForm(addAdmin);
  const ref = useResetOnSuccess(state);
  return (
    <form ref={ref} onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">{t.name}</span>
          <input name="name" maxLength={80} className="input" autoComplete="off" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">{t.email}</span>
          <input name="email" type="email" required maxLength={120} className="input" autoComplete="off" />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">{t.password}</span>
        <input name="password" type="password" minLength={8} className="input" autoComplete="new-password" />
        <span className="mt-1 block text-xs text-earth-500">{t.passwordHint}</span>
      </label>
      <FormAlert state={state} />
      <SubmitButton pendingText={t.adding}><UserPlus size={16} /> {t.add}</SubmitButton>
    </form>
  );
}

export function RemoveAdminButton({ userId, name }: { userId: string; name: string }) {
  const t = M[useLocale()];
  const { state, onSubmit } = useKeepValuesForm(() => removeAdmin(userId));
  return (
    <form
      onSubmit={(e) => {
        if (!window.confirm(t.confirmRemove(name))) e.preventDefault();
        else onSubmit(e);
      }}
      className="space-y-1"
    >
      <SubmitButton className="btn-ghost text-xs text-clay-700"><UserMinus size={14} /> {t.remove}</SubmitButton>
      <FormAlert state={state} />
    </form>
  );
}

export function ChangePasswordForm() {
  const t = M[useLocale()];
  const { state, onSubmit } = useKeepValuesForm(changeAdminPassword);
  const ref = useResetOnSuccess(state);
  return (
    <form ref={ref} onSubmit={onSubmit} className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">{t.current}</span>
        <input name="current" type="password" required className="input" autoComplete="current-password" />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">{t.next}</span>
          <input name="password" type="password" required minLength={8} className="input" autoComplete="new-password" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">{t.confirm}</span>
          <input name="confirm" type="password" required minLength={8} className="input" autoComplete="new-password" />
        </label>
      </div>
      <FormAlert state={state} />
      <SubmitButton className="btn-outline" pendingText={t.saving}><KeyRound size={16} /> {t.change}</SubmitButton>
    </form>
  );
}
