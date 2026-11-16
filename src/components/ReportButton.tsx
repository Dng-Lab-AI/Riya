"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { defineMessages } from "@/i18n";
import { useLocale } from "@/i18n/client";
import { reportMember } from "@/lib/actions/reports";
import { SubmitButton, useKeepValuesForm } from "./client";
import { FormAlert } from "./ui";

export const REPORT_REASONS = ["behaviour", "no_show", "spam", "fraud", "content", "other"] as const;

const M = defineMessages({
  en: {
    report: "Report", title: (name: string) => `Report ${name} to the Riya team`, reason: "Reason", choose: "Choose…",
    reasons: { behaviour: "Inappropriate behaviour", no_show: "Missed lessons without warning", spam: "Spam or advertising", fraud: "Payment outside Riya or fraud", content: "Offensive content", other: "Something else" } as Record<string, string>,
    details: "What happened?", placeholder: "Dates, messages, anything that helps the team understand.", send: "Send the report", sending: "Sending…", cancel: "Cancel",
    private: "The member is not told who reported them.",
  },
  fr: {
    report: "Signaler", title: (name: string) => `Signaler ${name} à l'équipe Riya`, reason: "Motif", choose: "Choisir…",
    reasons: { behaviour: "Comportement inapproprié", no_show: "Absences aux cours sans prévenir", spam: "Spam ou publicité", fraud: "Paiement hors de Riya ou fraude", content: "Contenu choquant", other: "Autre chose" } as Record<string, string>,
    details: "Que s'est-il passé ?", placeholder: "Dates, messages, tout ce qui aide l'équipe à comprendre.", send: "Envoyer le signalement", sending: "Envoi…", cancel: "Annuler",
    private: "Le membre ne sait pas qui l'a signalé.",
  },
});

// "Report" on a member's profile or conversation: the report goes to the admin site.
export function ReportButton({ targetId, name, compact = false }: { targetId: string; name: string; compact?: boolean }) {
  const t = M[useLocale()];
  const [open, setOpen] = useState(false);
  const { state, onSubmit } = useKeepValuesForm(reportMember.bind(null, targetId));

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={compact ? "btn-ghost px-2" : "inline-flex items-center gap-1.5 text-sm text-earth-500 hover:text-clay-700"}
        title={t.title(name)}
        aria-label={t.title(name)}
        aria-expanded={open}
      >
        <Flag size={compact ? 18 : 14} /> {!compact && t.report}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-sand-200 bg-white p-4 text-left shadow-xl">
          {state?.success ? (
            <div className="space-y-3">
              <FormAlert state={state} />
              <button type="button" onClick={() => setOpen(false)} className="btn-outline w-full">OK</button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-3">
              <p className="font-semibold">{t.title(name)}</p>
              <label className="block">
                <span className="mb-1 block text-sm">{t.reason}</span>
                <select name="reason" required defaultValue="" className="input">
                  <option value="" disabled>{t.choose}</option>
                  {REPORT_REASONS.map((r) => <option key={r} value={r}>{t.reasons[r]}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm">{t.details}</span>
                <textarea name="details" required minLength={10} maxLength={2000} rows={3} className="input" placeholder={t.placeholder} />
              </label>
              <p className="text-xs text-earth-500">{t.private}</p>
              <FormAlert state={state} />
              <div className="flex gap-2">
                <SubmitButton pendingText={t.sending}>{t.send}</SubmitButton>
                <button type="button" onClick={() => setOpen(false)} className="btn-ghost">{t.cancel}</button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
