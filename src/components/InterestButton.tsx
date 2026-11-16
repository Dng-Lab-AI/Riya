"use client";

import { useState, useTransition } from "react";
import { HeartHandshake } from "lucide-react";
import { defineMessages } from "@/i18n";
import { useLocale } from "@/i18n/client";
import { expressInterest } from "@/lib/actions/notifications";

const M = defineMessages({
  en: {
    knows: (name: string) => `${name} knows you're interested and can write to you at any time.`,
    sending: "Sending…", interested: "I'm interested",
    hint: (name: string) => `${name} will be notified and can contact you first.`,
  },
  fr: {
    knows: (name: string) => `${name} sait que vous êtes intéressé·e et peut vous écrire à tout moment.`,
    sending: "Envoi…", interested: "Je suis intéressé·e",
    hint: (name: string) => `${name} sera prévenu·e et pourra vous contacter en premier.`,
  },
});

// "I'm interested": the tutor gets a notification in their messages and can reach out first.
export function InterestButton({ tutorId, tutorFirstName, alreadySent }: { tutorId: string; tutorFirstName: string; alreadySent: boolean }) {
  const t = M[useLocale()];
  const [result, setResult] = useState<{ error?: string; success?: string }>();
  const [pending, start] = useTransition();

  if (result?.success || (alreadySent && !result)) {
    return (
      <p role="status" className="mt-3 flex items-start gap-2 rounded-2xl bg-forest-100 px-4 py-3 text-sm text-forest-800">
        <HeartHandshake size={18} className="mt-0.5 shrink-0" />
        {result?.success ?? t.knows(tutorFirstName)}
      </p>
    );
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => setResult((await expressInterest(tutorId)) ?? {}))}
        className="btn-outline w-full"
      >
        <HeartHandshake size={16} /> {pending ? t.sending : t.interested}
      </button>
      {result?.error && <p role="alert" className="mt-2 text-sm text-clay-700">{result.error}</p>}
      <p className="mt-1.5 text-center text-xs text-earth-500">{t.hint(tutorFirstName)}</p>
    </div>
  );
}
