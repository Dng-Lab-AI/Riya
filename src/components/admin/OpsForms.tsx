"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Mail, Megaphone, Wallet } from "lucide-react";
import { defineMessages } from "@/i18n";
import { useLocale } from "@/i18n/client";
import { recordPayout, sendAnnouncement } from "@/lib/actions/admin-ops";
import { resolveReport } from "@/lib/actions/reports";
import { SubmitButton, useKeepValuesForm } from "../client";
import { FormAlert } from "../ui";

const M = defineMessages({
  en: {
    resolve: "Mark as handled", resolution: "What was done (optional)", resolutionPlaceholder: "E.g. Member warned by message; account suspended 7 days.", cancel: "Cancel", saving: "Saving…",
    pay: "Record the payout", reference: "Transfer reference", referencePlaceholder: "E.g. MoMo 0123456789 or bank transfer ID", confirm: "Record",
    audience: "Recipients", all: "All members", students: "All students", tutors: "All tutors", body: "Message",
    bodyPlaceholder: "E.g. New: you can now book lessons in Kinyarwanda!", email: "Also send a copy by e-mail", send: "Send the announcement", sending: "Sending…",
    confirmSend: "Send this announcement to every member of the group? This cannot be undone.",
  },
  fr: {
    resolve: "Marquer comme traité", resolution: "Ce qui a été fait (facultatif)", resolutionPlaceholder: "Ex. : membre averti par message ; compte suspendu 7 jours.", cancel: "Annuler", saving: "Enregistrement…",
    pay: "Enregistrer le versement", reference: "Référence du virement", referencePlaceholder: "Ex. : MoMo 0123456789 ou identifiant du virement", confirm: "Enregistrer",
    audience: "Destinataires", all: "Tous les membres", students: "Tous les élèves", tutors: "Tous les tuteurs", body: "Message",
    bodyPlaceholder: "Ex. : Nouveau : vous pouvez maintenant réserver des cours de kinyarwanda !", email: "Envoyer aussi une copie par e-mail", send: "Envoyer l'annonce", sending: "Envoi…",
    confirmSend: "Envoyer cette annonce à tous les membres du groupe ? C'est irréversible.",
  },
});

export function ResolveReportForm({ reportId }: { reportId: string }) {
  const t = M[useLocale()];
  const [open, setOpen] = useState(false);
  const { state, onSubmit } = useKeepValuesForm(resolveReport.bind(null, reportId));
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="btn-outline"><Check size={16} /> {t.resolve}</button>;
  return (
    <form onSubmit={onSubmit} className="w-full space-y-2 rounded-2xl bg-sand-50 p-3">
      <label className="block">
        <span className="mb-1 block text-sm">{t.resolution}</span>
        <textarea name="resolution" rows={2} maxLength={1000} className="input" placeholder={t.resolutionPlaceholder} />
      </label>
      <FormAlert state={state} />
      <div className="flex gap-2">
        <SubmitButton pendingText={t.saving}>{t.resolve}</SubmitButton>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost">{t.cancel}</button>
      </div>
    </form>
  );
}

export function PayoutForm({ tutorId }: { tutorId: string }) {
  const t = M[useLocale()];
  const [open, setOpen] = useState(false);
  const { state, onSubmit } = useKeepValuesForm(recordPayout.bind(null, tutorId));
  if (state?.success) return <FormAlert state={state} />;
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="btn-outline"><Wallet size={16} /> {t.pay}</button>;
  return (
    <form onSubmit={onSubmit} className="w-full space-y-2">
      <label className="block">
        <span className="mb-1 block text-sm">{t.reference}</span>
        <input name="reference" required minLength={3} maxLength={120} className="input" placeholder={t.referencePlaceholder} />
      </label>
      <FormAlert state={state} />
      <div className="flex gap-2">
        <SubmitButton pendingText={t.saving}>{t.confirm}</SubmitButton>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost">{t.cancel}</button>
      </div>
    </form>
  );
}

export function AnnouncementForm() {
  const t = M[useLocale()];
  const { state, onSubmit } = useKeepValuesForm(sendAnnouncement);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.success) ref.current?.reset();
  }, [state]);
  return (
    <form
      ref={ref}
      onSubmit={(e) => {
        if (!window.confirm(t.confirmSend)) e.preventDefault();
        else onSubmit(e);
      }}
      className="space-y-3"
    >
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">{t.audience}</span>
        <select name="audience" defaultValue="all" className="input">
          <option value="all">{t.all}</option>
          <option value="students">{t.students}</option>
          <option value="tutors">{t.tutors}</option>
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">{t.body}</span>
        <textarea name="body" required minLength={10} maxLength={4000} rows={5} className="input" placeholder={t.bodyPlaceholder} />
      </label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="email" /> <Mail size={14} /> {t.email}</label>
      <FormAlert state={state} />
      <SubmitButton pendingText={t.sending}><Megaphone size={16} /> {t.send}</SubmitButton>
    </form>
  );
}
