"use client";

import { useState } from "react";
import { Download, FileText, Star } from "lucide-react";
import { defineMessages } from "@/i18n";
import { useLocale } from "@/i18n/client";
import { submitFeedback } from "@/lib/actions/classroom";
import { LESSON_FILE_TYPES, formatBytes, parseVocabulary } from "@/lib/constants";
import { SubmitButton, useKeepValuesForm } from "./client";
import { FormAlert } from "./ui";

// Pieces shared by the classroom and the lesson recap page.

const M = defineMessages({
  en: {
    opensAfter: (type: string) => `This ${type} document opens once downloaded.`, download: "Download", downloadName: (name: string) => `Download ${name}`,
    file: "File", noNotes: "The tutor hasn't taken any notes yet.", keyPoints: "Key points", vocabulary: "Vocabulary", homework: "Homework",
    outOf: (label: string, i: number) => `${label}: ${i} out of 5`, overall: "Overall rating of the session", clarity: "Clarity of the explanations",
    interaction: "Speaking time and interaction", content: "Content and materials", pace: "Pace suited to my level", liked: "What you liked",
    improve: (name: string) => `What ${name} could improve`, improvePlaceholder: "More speaking, more breaks, other materials…",
    private: "This feedback is private: only your tutor sees it, it doesn't appear on their public profile.", sending: "Sending…",
    update: "Update my feedback", send: "Send my feedback",
  },
  fr: {
    opensAfter: (type: string) => `Ce document ${type} s'ouvre après téléchargement.`, download: "Télécharger", downloadName: (name: string) => `Télécharger ${name}`,
    file: "Fichier", noNotes: "Le tuteur n'a pas encore pris de notes.", keyPoints: "Points clés", vocabulary: "Vocabulaire", homework: "Devoirs",
    outOf: (label: string, i: number) => `${label} : ${i} sur 5`, overall: "Note globale de la séance", clarity: "Clarté des explications",
    interaction: "Temps de parole et interaction", content: "Contenu et supports", pace: "Rythme adapté à mon niveau", liked: "Ce que vous avez aimé",
    improve: (name: string) => `Ce que ${name} pourrait améliorer`, improvePlaceholder: "Plus d'oral, plus de pauses, d'autres supports…",
    private: "Ce retour est privé : seul votre tuteur le voit, il n'apparaît pas sur son profil public.", sending: "Envoi…",
    update: "Mettre à jour mon retour", send: "Envoyer mon retour",
  },
});

export type SharedDocument = { id: string; name: string; content_type: string; size: number; uploaded_at: string };
export type Notes = { keyPoints: string; vocabulary: string; homework: string };

export const fileUrl = (id: string, download = false) => `/api/fichiers/${id}${download ? "?telecharger=1" : ""}`;

export function DocumentViewer({ doc, dark = false }: { doc: SharedDocument; dark?: boolean }) {
  const t = M[useLocale()];
  const type = doc.content_type;
  if (type === "application/pdf" || type === "text/plain") {
    return <iframe src={fileUrl(doc.id)} title={doc.name} className="h-full w-full rounded-xl bg-white" />;
  }
  if (type.startsWith("image/")) {
    // eslint-disable-next-line @next/next/no-img-element -- served by our own authenticated route
    return <img src={fileUrl(doc.id)} alt={doc.name} className="mx-auto h-full max-h-full w-auto max-w-full rounded-xl object-contain" />;
  }
  if (type.startsWith("audio/")) {
    return (
      <div className={`flex h-full flex-col items-center justify-center gap-4 rounded-xl p-6 ${dark ? "bg-white/5" : "bg-sand-100"}`}>
        <p className="font-semibold">{doc.name}</p>
        <audio controls src={fileUrl(doc.id)} className="w-full max-w-md" />
      </div>
    );
  }
  return (
    <div className={`flex h-full flex-col items-center justify-center gap-3 rounded-xl p-6 text-center ${dark ? "bg-white/5" : "bg-sand-100"}`}>
      <FileText size={40} />
      <p className="font-semibold">{doc.name}</p>
      <p className="text-sm opacity-75">{t.opensAfter(LESSON_FILE_TYPES[type] ?? "")}</p>
      <a href={fileUrl(doc.id, true)} className="btn bg-ochre-400 text-forest-900 hover:bg-ochre-300"><Download size={16} /> {t.download}</a>
    </div>
  );
}

export function DocumentRow({ doc, dark = false, children }: { doc: SharedDocument; dark?: boolean; children?: React.ReactNode }) {
  const locale = useLocale();
  const t = M[locale];
  return (
    <li className={`flex items-center gap-3 rounded-xl p-3 ${dark ? "bg-white/5" : "border border-sand-200 bg-white"}`}>
      <FileText size={20} className="shrink-0 text-clay-500" />
      <div className="min-w-0 flex-1">
        <a href={fileUrl(doc.id)} target="_blank" rel="noreferrer" className="block truncate text-sm font-semibold hover:underline">{doc.name}</a>
        <p className={`text-xs ${dark ? "text-sand-300" : "text-earth-500"}`}>{LESSON_FILE_TYPES[doc.content_type] ?? t.file} · {formatBytes(doc.size, locale)}</p>
      </div>
      {children}
      <a href={fileUrl(doc.id, true)} aria-label={t.downloadName(doc.name)} title={t.download} className={`rounded-full p-2 ${dark ? "hover:bg-white/10" : "hover:bg-sand-100"}`}><Download size={16} /></a>
    </li>
  );
}

export function NotesView({ notes, dark = false }: { notes: Notes | null; dark?: boolean }) {
  const t = M[useLocale()];
  const vocabulary = parseVocabulary(notes?.vocabulary ?? "");
  const muted = dark ? "text-sand-300" : "text-earth-500";
  if (!notes || (!notes.keyPoints && !vocabulary.length && !notes.homework)) {
    return <p className={`text-sm ${muted}`}>{t.noNotes}</p>;
  }
  return (
    <div className="space-y-5 text-sm">
      {notes.keyPoints && (
        <section>
          <h3 className={`mb-1 text-xs font-bold uppercase tracking-wider ${muted}`}>{t.keyPoints}</h3>
          <p className="whitespace-pre-line">{notes.keyPoints}</p>
        </section>
      )}
      {vocabulary.length > 0 && (
        <section>
          <h3 className={`mb-1 text-xs font-bold uppercase tracking-wider ${muted}`}>{t.vocabulary}</h3>
          <table className="w-full">
            <tbody>
              {vocabulary.map((v, i) => (
                <tr key={i} className={dark ? "border-b border-white/10" : "border-b border-sand-200"}>
                  <td className="py-1.5 pr-3 font-semibold">{v.term}</td>
                  <td className={`py-1.5 ${muted}`}>{v.translation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      {notes.homework && (
        <section>
          <h3 className={`mb-1 text-xs font-bold uppercase tracking-wider ${muted}`}>{t.homework}</h3>
          <p className="whitespace-pre-line">{notes.homework}</p>
        </section>
      )}
    </div>
  );
}

function StarInput({ name, label, value, onChange, size = 22 }: { name: string; label: string; value: number; onChange: (v: number) => void; size?: number }) {
  const t = M[useLocale()];
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium">{label}</span>
      <input type="hidden" name={name} value={value || ""} />
      <div className="flex" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" onClick={() => onChange(i)} aria-label={t.outOf(label, i)} aria-pressed={value === i} className="p-0.5">
            <Star size={size} className={i <= value ? "fill-ochre-400 text-ochre-400" : "text-sand-300"} />
          </button>
        ))}
      </div>
    </div>
  );
}

export type FeedbackValues = { rating: number; clarity: number; interaction: number; content: number; pace: number; liked: string; improve: string };

export function FeedbackForm({ lessonId, initial, tutorName }: { lessonId: string; initial?: FeedbackValues | null; tutorName: string }) {
  const t = M[useLocale()];
  const { state, pending, onSubmit } = useKeepValuesForm(submitFeedback.bind(null, lessonId));
  const [values, setValues] = useState({
    rating: initial?.rating ?? 0,
    clarity: initial?.clarity ?? 0,
    interaction: initial?.interaction ?? 0,
    content: initial?.content ?? 0,
    pace: initial?.pace ?? 0,
  });
  const set = (key: keyof typeof values) => (v: number) => setValues((old) => ({ ...old, [key]: v }));
  const complete = Object.values(values).every(Boolean);

  return (
    <form onSubmit={onSubmit} className="space-y-4 text-left">
      <StarInput name="rating" label={t.overall} value={values.rating} onChange={set("rating")} size={28} />
      <div className="space-y-2 rounded-xl bg-sand-50 p-4 text-earth-900">
        <StarInput name="clarity" label={t.clarity} value={values.clarity} onChange={set("clarity")} />
        <StarInput name="interaction" label={t.interaction} value={values.interaction} onChange={set("interaction")} />
        <StarInput name="content" label={t.content} value={values.content} onChange={set("content")} />
        <StarInput name="pace" label={t.pace} value={values.pace} onChange={set("pace")} />
      </div>
      <div>
        <label className="label" htmlFor="liked">{t.liked}</label>
        <textarea id="liked" name="liked" rows={2} defaultValue={initial?.liked} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="improve">{t.improve(tutorName)}</label>
        <textarea id="improve" name="improve" rows={2} defaultValue={initial?.improve} className="input" placeholder={t.improvePlaceholder} />
        <p className="mt-1 text-xs text-earth-500">{t.private}</p>
      </div>
      <FormAlert state={state} />
      <SubmitButton pending={pending} disabled={!complete} pendingText={t.sending}>{initial ? t.update : t.send}</SubmitButton>
    </form>
  );
}
