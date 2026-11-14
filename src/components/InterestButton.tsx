"use client";

import { useState, useTransition } from "react";
import { HeartHandshake } from "lucide-react";
import { expressInterest } from "@/lib/actions/notifications";

// "Je suis intéressé·e": the tutor gets a notification in their messages and can reach out first.
export function InterestButton({ tutorId, tutorFirstName, alreadySent }: { tutorId: string; tutorFirstName: string; alreadySent: boolean }) {
  const [result, setResult] = useState<{ error?: string; success?: string }>();
  const [pending, start] = useTransition();

  if (result?.success || (alreadySent && !result)) {
    return (
      <p role="status" className="mt-3 flex items-start gap-2 rounded-2xl bg-forest-100 px-4 py-3 text-sm text-forest-800">
        <HeartHandshake size={18} className="mt-0.5 shrink-0" />
        {result?.success ?? `${tutorFirstName} sait que vous êtes intéressé·e et peut vous écrire à tout moment.`}
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
        <HeartHandshake size={16} /> {pending ? "Envoi…" : "Je suis intéressé·e"}
      </button>
      {result?.error && <p role="alert" className="mt-2 text-sm text-clay-700">{result.error}</p>}
      <p className="mt-1.5 text-center text-xs text-earth-500">{tutorFirstName} sera prévenu·e et pourra vous contacter en premier.</p>
    </div>
  );
}
