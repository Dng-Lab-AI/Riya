"use client";

import { useState } from "react";
import { Ban, Lock, Mail, PauseCircle, Send, Trash2 } from "lucide-react";
import { defineMessages } from "@/i18n";
import { useLocale } from "@/i18n/client";
import { adminLogin, blockMember, deleteMember, sendMemberMessage, suspendMember } from "@/lib/actions/admin";
import { SubmitButton, useKeepValuesForm } from "../client";
import { FormAlert } from "../ui";

const M = defineMessages({
  en: {
    email: "Email", password: "Password", login: "Log in to the administration", loggingIn: "Logging in…", cancel: "Cancel",
    suspend: "Suspend", suspendTitle: "Suspend the account", duration: "Duration", days: (n: number) => `${n} days`, untilReactivated: "Until I reactivate it",
    reason: "Reason (the member will see it)", reasonPlaceholder: "E.g. Repeated lessons missed without warning.",
    suspendHint: "The member is signed out at once and cannot log in until the end of the suspension.", confirmSuspend: "Suspend the account",
    block: "Block", blockTitle: "Block the account for good", blockHint: "The member is signed out, can no longer log in, and their upcoming lessons are cancelled and refunded.",
    confirmBlock: "Block the account",
    delete: "Delete", deleteTitle: "Delete the account", deleteHint: (email: string) => `This cannot be undone. The account, its photo and its personal data are deleted; upcoming lessons are cancelled and refunded. Past lessons and messages stay for the other members, under "Former member". Type ${email} to confirm.`,
    confirmDelete: "Delete for good", working: "Please wait…",
    message: "Message", messagePlaceholder: "Write to the member: they receive it in their Riya messages and can reply there.",
    byEmail: "Also send a copy by e-mail", send: "Send", sending: "Sending…",
  },
  fr: {
    email: "E-mail", password: "Mot de passe", login: "Se connecter à l'administration", loggingIn: "Connexion…", cancel: "Annuler",
    suspend: "Suspendre", suspendTitle: "Suspendre le compte", duration: "Durée", days: (n: number) => `${n} jours`, untilReactivated: "Jusqu'à ce que je le réactive",
    reason: "Motif (le membre le verra)", reasonPlaceholder: "Ex. : Absences répétées aux cours sans prévenir.",
    suspendHint: "Le membre est déconnecté tout de suite et ne peut plus se connecter jusqu'à la fin de la suspension.", confirmSuspend: "Suspendre le compte",
    block: "Bloquer", blockTitle: "Bloquer le compte définitivement", blockHint: "Le membre est déconnecté, ne peut plus se connecter, et ses cours à venir sont annulés et remboursés.",
    confirmBlock: "Bloquer le compte",
    delete: "Supprimer", deleteTitle: "Supprimer le compte", deleteHint: (email: string) => `Action irréversible. Le compte, sa photo et ses données personnelles sont supprimés ; les cours à venir sont annulés et remboursés. Les cours et messages passés restent pour les autres membres, sous « Ancien membre ». Saisissez ${email} pour confirmer.`,
    confirmDelete: "Supprimer définitivement", working: "Patientez…",
    message: "Message", messagePlaceholder: "Écrivez au membre : il le reçoit dans ses messages Riya et peut y répondre.",
    byEmail: "Envoyer aussi une copie par e-mail", send: "Envoyer", sending: "Envoi…",
  },
});

export function AdminLoginForm() {
  const t = M[useLocale()];
  const { state, onSubmit } = useKeepValuesForm(adminLogin);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">{t.email}</span>
        <input name="email" type="email" required autoComplete="username" className="input" />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">{t.password}</span>
        <input name="password" type="password" required autoComplete="current-password" className="input" />
      </label>
      <FormAlert state={state} />
      <SubmitButton className="btn-dark w-full" pendingText={t.loggingIn}><Lock size={16} /> {t.login}</SubmitButton>
    </form>
  );
}

// One moderation action behind a button: the form opens below it.
function Disclosure({ label, icon, tone, children }: { label: string; icon: React.ReactNode; tone: string; children: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  if (!open) return <button type="button" onClick={() => setOpen(true)} className={`btn-outline ${tone}`}>{icon} {label}</button>;
  return <div className="w-full">{children(() => setOpen(false))}</div>;
}

export function SuspendForm({ userId }: { userId: string }) {
  const t = M[useLocale()];
  const { state, onSubmit } = useKeepValuesForm(suspendMember.bind(null, userId));
  return (
    <Disclosure label={t.suspend} icon={<PauseCircle size={16} />} tone="text-ochre-800">
      {(close) => (
        <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-ochre-300 bg-ochre-100/50 p-4">
          <p className="font-semibold">{t.suspendTitle}</p>
          <label className="block">
            <span className="mb-1 block text-sm">{t.duration}</span>
            <select name="days" defaultValue="7" className="input">
              {[3, 7, 30, 90].map((d) => <option key={d} value={d}>{t.days(d)}</option>)}
              <option value="0">{t.untilReactivated}</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm">{t.reason}</span>
            <textarea name="reason" required minLength={5} maxLength={500} rows={2} className="input" placeholder={t.reasonPlaceholder} />
          </label>
          <p className="text-xs text-earth-600">{t.suspendHint}</p>
          <FormAlert state={state} />
          <div className="flex flex-wrap gap-2">
            <SubmitButton pendingText={t.working}>{t.confirmSuspend}</SubmitButton>
            <button type="button" onClick={close} className="btn-ghost">{t.cancel}</button>
          </div>
        </form>
      )}
    </Disclosure>
  );
}

export function BlockForm({ userId }: { userId: string }) {
  const t = M[useLocale()];
  const { state, onSubmit } = useKeepValuesForm(blockMember.bind(null, userId));
  return (
    <Disclosure label={t.block} icon={<Ban size={16} />} tone="text-clay-700">
      {(close) => (
        <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-clay-200 bg-clay-50 p-4">
          <p className="font-semibold">{t.blockTitle}</p>
          <label className="block">
            <span className="mb-1 block text-sm">{t.reason}</span>
            <textarea name="reason" required minLength={5} maxLength={500} rows={2} className="input" placeholder={t.reasonPlaceholder} />
          </label>
          <p className="text-xs text-earth-600">{t.blockHint}</p>
          <FormAlert state={state} />
          <div className="flex flex-wrap gap-2">
            <SubmitButton className="btn-primary" pendingText={t.working}>{t.confirmBlock}</SubmitButton>
            <button type="button" onClick={close} className="btn-ghost">{t.cancel}</button>
          </div>
        </form>
      )}
    </Disclosure>
  );
}

export function DeleteForm({ userId, email }: { userId: string; email: string }) {
  const t = M[useLocale()];
  const { state, onSubmit } = useKeepValuesForm(deleteMember.bind(null, userId));
  return (
    <Disclosure label={t.delete} icon={<Trash2 size={16} />} tone="text-clay-700">
      {(close) => (
        <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-clay-200 bg-clay-50 p-4">
          <p className="font-semibold">{t.deleteTitle}</p>
          <p className="text-sm text-earth-700">{t.deleteHint(email)}</p>
          <input name="confirm" required autoComplete="off" className="input" placeholder={email} />
          <FormAlert state={state} />
          <div className="flex flex-wrap gap-2">
            <SubmitButton className="btn-primary" pendingText={t.working}>{t.confirmDelete}</SubmitButton>
            <button type="button" onClick={close} className="btn-ghost">{t.cancel}</button>
          </div>
        </form>
      )}
    </Disclosure>
  );
}

export function MessageForm({ userId }: { userId: string }) {
  const t = M[useLocale()];
  const { state, onSubmit } = useKeepValuesForm(sendMemberMessage.bind(null, userId));
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <textarea name="body" required maxLength={4000} rows={4} className="input" placeholder={t.messagePlaceholder} aria-label={t.message} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="email" defaultChecked /> <Mail size={14} /> {t.byEmail}
      </label>
      <FormAlert state={state} />
      <SubmitButton pendingText={t.sending}><Send size={16} /> {t.send}</SubmitButton>
    </form>
  );
}
