"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";
import { saveLessonNotes } from "@/lib/actions/classroom";
import { SubmitButton, useKeepValuesForm } from "./client";
import { FormAlert } from "./ui";
import type { Notes } from "./LessonExtras";

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
  return (
    <button onClick={() => window.print()} className="btn-outline print:hidden">
      <Printer size={16} /> Imprimer la fiche
    </button>
  );
}

export function NotesForm({ lessonId, notes }: { lessonId: string; notes: Notes | null }) {
  const { state, pending, onSubmit } = useKeepValuesForm(saveLessonNotes.bind(null, lessonId));
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="keyPoints">Points clés</label>
        <textarea id="keyPoints" name="keyPoints" rows={5} defaultValue={notes?.keyPoints} className="input" placeholder="Ce qui a été vu, les erreurs fréquentes, les progrès…" />
      </div>
      <div>
        <label className="label" htmlFor="vocabulary">Vocabulaire <span className="font-normal text-earth-500">(une ligne par mot : mot = traduction)</span></label>
        <textarea id="vocabulary" name="vocabulary" rows={6} defaultValue={notes?.vocabulary} className="input font-mono" placeholder={"habari = comment ça va ?\nasante = merci"} />
      </div>
      <div>
        <label className="label" htmlFor="homework">Devoirs</label>
        <textarea id="homework" name="homework" rows={3} defaultValue={notes?.homework} className="input" />
      </div>
      <FormAlert state={state} />
      <SubmitButton pending={pending} pendingText="Enregistrement…">Enregistrer les notes</SubmitButton>
    </form>
  );
}
