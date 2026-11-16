"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";
import { defineMessages } from "@/i18n";
import { useLocale } from "@/i18n/client";
import { saveLessonNotes } from "@/lib/actions/classroom";
import { SubmitButton, useKeepValuesForm } from "./client";
import { FormAlert } from "./ui";
import type { Notes } from "./LessonExtras";

const M = defineMessages({
  en: {
    print: "Print the sheet", keyPoints: "Key points", keyPlaceholder: "What was covered, common mistakes, progress…",
    vocabulary: "Vocabulary", vocabHint: "(one line per word: word = translation)", vocabPlaceholder: "habari = how are you?\nasante = thank you",
    homework: "Homework", saving: "Saving…", save: "Save the notes",
  },
  fr: {
    print: "Imprimer la fiche", keyPoints: "Points clés", keyPlaceholder: "Ce qui a été vu, les erreurs fréquentes, les progrès…",
    vocabulary: "Vocabulaire", vocabHint: "(une ligne par mot : mot = traduction)", vocabPlaceholder: "habari = comment ça va ?\nasante = merci",
    homework: "Devoirs", saving: "Enregistrement…", save: "Enregistrer les notes",
  },
});

// Refreshes the page while the AI recap is being written.
export function AutoRefresh({ everyMs = 4000 }: { everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), everyMs);
    return () => clearInterval(id);
  }, [router, everyMs]);
  return null;
}

export function PrintButton() {
  const t = M[useLocale()];
  return (
    <button onClick={() => window.print()} className="btn-outline print:hidden">
      <Printer size={16} /> {t.print}
    </button>
  );
}

export function NotesForm({ lessonId, notes }: { lessonId: string; notes: Notes | null }) {
  const t = M[useLocale()];
  const { state, pending, onSubmit } = useKeepValuesForm(saveLessonNotes.bind(null, lessonId));
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="keyPoints">{t.keyPoints}</label>
        <textarea id="keyPoints" name="keyPoints" rows={5} defaultValue={notes?.keyPoints} className="input" placeholder={t.keyPlaceholder} />
      </div>
      <div>
        <label className="label" htmlFor="vocabulary">{t.vocabulary} <span className="font-normal text-earth-500">{t.vocabHint}</span></label>
        <textarea id="vocabulary" name="vocabulary" rows={6} defaultValue={notes?.vocabulary} className="input font-mono" placeholder={t.vocabPlaceholder} />
      </div>
      <div>
        <label className="label" htmlFor="homework">{t.homework}</label>
        <textarea id="homework" name="homework" rows={3} defaultValue={notes?.homework} className="input" />
      </div>
      <FormAlert state={state} />
      <SubmitButton pending={pending} pendingText={t.saving}>{t.save}</SubmitButton>
    </form>
  );
}
