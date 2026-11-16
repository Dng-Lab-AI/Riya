"use client";

import { useState } from "react";
import { MessageSquareWarning } from "lucide-react";
import { defineMessages } from "@/i18n";
import { useLocale } from "@/i18n/client";
import { askTutorChanges } from "@/lib/actions/admin";
import { SubmitButton, useKeepValuesForm } from "../client";
import { FormAlert } from "../ui";

const M = defineMessages({
  en: {
    open: "Ask for changes", label: "What should the tutor change?", cancel: "Cancel", send: "Send to the tutor", sending: "Sending…",
    placeholder: "E.g. Your description is too short: tell students how your lessons go. Please also add a profile photo.",
    hint: "The tutor receives this message by e-mail and on their profile page. Their profile comes back here as soon as they save it again.",
  },
  fr: {
    open: "Demander des modifications", label: "Que doit modifier le tuteur ?", cancel: "Annuler", send: "Envoyer au tuteur", sending: "Envoi…",
    placeholder: "Ex. : Votre description est trop courte : expliquez aux élèves comment se passent vos cours. Ajoutez aussi une photo de profil.",
    hint: "Le tuteur reçoit ce message par e-mail et sur sa page de profil. Son profil revient ici dès qu'il l'enregistre à nouveau.",
  },
});

// "Ask for changes" on a tutor profile waiting for review, with the reason sent to the tutor.
export function AskChangesForm({ tutorId }: { tutorId: string }) {
  const t = M[useLocale()];
  const [open, setOpen] = useState(false);
  const { state, onSubmit } = useKeepValuesForm(askTutorChanges.bind(null, tutorId));

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-outline">
        <MessageSquareWarning size={16} /> {t.open}
      </button>
    );
  }
  return (
    <form onSubmit={onSubmit} className="w-full space-y-3 rounded-2xl bg-sand-50 p-4">
      <label className="block text-sm font-semibold" htmlFor={`note-${tutorId}`}>{t.label}</label>
      <textarea id={`note-${tutorId}`} name="note" rows={3} required minLength={10} maxLength={1000} className="input" placeholder={t.placeholder} />
      <p className="text-xs text-earth-500">{t.hint}</p>
      <FormAlert state={state} />
      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingText={t.sending}>{t.send}</SubmitButton>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost">{t.cancel}</button>
      </div>
    </form>
  );
}
