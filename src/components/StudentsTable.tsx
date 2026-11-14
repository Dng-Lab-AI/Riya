"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarPlus, MessageCircle, NotebookText, Search, X } from "lucide-react";
import { defineMessages } from "@/i18n";
import { useLocale } from "@/i18n/client";
import type { StudentRow, StudentType } from "@/lib/students";
import { LocalDateTime } from "./client";
import { Avatar } from "./ui";

const TYPE_CLASSES: Record<StudentType, string> = {
  new: "bg-sky-100 text-sky-900",
  weekly: "bg-clay-100 text-clay-800",
  regular: "bg-forest-100 text-forest-800",
  occasional: "bg-sand-100 text-earth-700",
  inactive: "bg-clay-100 text-clay-800",
};

const M = defineMessages<{
  types: Record<StudentType, string>; request: string; feedback: string; rebook: (name: string) => string;
  progress: (done: number, total: number) => string; search: string; searchPlaceholder: string; current: string; showAll: string;
  allShowCurrent: string; noMatch: string; empty: string; student: string; type: string; lessons: string; next: string;
  suggested: string; actions: string; write: (name: string) => string; schedule: (name: string) => string; lastLesson: string; seeLast: string;
}>({
  en: {
    types: { new: "New student", weekly: "Weekly", regular: "Regular", occasional: "Occasional", inactive: "Cancelled" },
    request: "Answer the request", feedback: "Give feedback", rebook: (name) => `Schedule a lesson with ${name}`,
    progress: (done, total) => `${done} of ${total} lesson${total > 1 ? "s" : ""} completed`,
    search: "Search for a student", searchPlaceholder: "Search", current: "Current", showAll: "Show all students",
    allShowCurrent: "All students · Show current ones", noMatch: "No student matches.", empty: "Your students will appear here after their first booking.",
    student: "Student", type: "Type", lessons: "Lessons", next: "Next lesson", suggested: "Suggested action", actions: "Actions",
    write: (name) => `Write to ${name}`, schedule: (name) => `Schedule a lesson with ${name}`, lastLesson: "Last lesson", seeLast: "See the last lesson",
  },
  fr: {
    types: { new: "Nouvel élève", weekly: "Hebdomadaire", regular: "Régulier", occasional: "Occasionnel", inactive: "Annulé" },
    request: "Répondre à la demande", feedback: "Donner un retour", rebook: (name) => `Planifier un cours avec ${name}`,
    progress: (done, total) => `${done} cours terminé${done > 1 ? "s" : ""} sur ${total}`,
    search: "Rechercher un élève", searchPlaceholder: "Rechercher", current: "Actuels", showAll: "Afficher tous les élèves",
    allShowCurrent: "Tous les élèves · Afficher les actuels", noMatch: "Aucun élève ne correspond.", empty: "Vos élèves apparaîtront ici après leur première réservation.",
    student: "Élève", type: "Type", lessons: "Cours", next: "Prochain cours", suggested: "Action suggérée", actions: "Actions",
    write: (name) => `Écrire à ${name}`, schedule: (name) => `Planifier un cours avec ${name}`, lastLesson: "Dernier cours", seeLast: "Voir le dernier cours",
  },
});

type Texts = (typeof M)["en"];

function SuggestedAction({ student, t }: { student: StudentRow; t: Texts }) {
  const action = student.action;
  if (!action) return <span className="text-earth-400">—</span>;
  const first = student.name.split(" ")[0];
  const link = {
    request: { href: "/tableau-de-bord", label: t.request },
    feedback: { href: `/cours/${action.lesson_id}`, label: t.feedback },
    rebook: { href: `/calendrier?eleve=${student.id}`, label: t.rebook(first) },
  }[action.kind];
  return <Link href={link.href} className="font-semibold text-clay-700 underline underline-offset-4 hover:text-clay-800">{link.label}</Link>;
}

function Progress({ done, total, t }: { done: number; total: number; t: Texts }) {
  const percent = total ? Math.round((done / total) * 100) : 0;
  return (
    <span className="flex items-center gap-2" title={t.progress(done, total)}>
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-sand-200">
        <span className="block h-full rounded-full bg-earth-900" style={{ width: `${percent}%` }} />
      </span>
      <span className="tabular-nums">{done}/{total}</span>
    </span>
  );
}

export function StudentsTable({ students }: { students: StudentRow[] }) {
  const t = M[useLocale()];
  const [query, setQuery] = useState("");
  const [onlyCurrent, setOnlyCurrent] = useState(true);
  const q = query.trim().toLowerCase();
  const shown = students.filter((s) => (!onlyCurrent || s.current) && (!q || s.name.toLowerCase().includes(q)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1 sm:max-w-xs">
          <span className="sr-only">{t.search}</span>
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-earth-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.searchPlaceholder} className="input pl-10" />
        </label>
        {onlyCurrent ? (
          <button type="button" onClick={() => setOnlyCurrent(false)} className="flex items-center gap-1.5 rounded-xl border border-earth-900 px-3.5 py-2.5 text-sm font-semibold">
            {t.current} <X size={15} aria-label={t.showAll} />
          </button>
        ) : (
          <button type="button" onClick={() => setOnlyCurrent(true)} className="rounded-xl border border-sand-300 bg-white px-3.5 py-2.5 text-sm font-medium text-earth-700">
            {t.allShowCurrent}
          </button>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-[1.5rem] border border-sand-200 bg-white p-8 text-center text-earth-600">
          {students.length ? t.noMatch : t.empty}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[1.5rem] border border-sand-200 bg-white">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="border-b border-sand-200 text-xs text-earth-500">
              <tr>
                <th className="px-4 py-3 font-medium">{t.student}</th>
                <th className="px-4 py-3 font-medium">{t.type}</th>
                <th className="px-4 py-3 font-medium">{t.lessons}</th>
                <th className="px-4 py-3 font-medium">{t.next}</th>
                <th className="px-4 py-3 font-medium">{t.suggested}</th>
                <th className="px-4 py-3"><span className="sr-only">{t.actions}</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-200">
              {shown.map((s) => (
                <tr key={s.id} className="hover:bg-sand-50/60">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-3 font-semibold">
                      <Avatar name={s.name} src={s.avatar_url} size={36} className="rounded-xl" />
                      {s.name}
                    </span>
                  </td>
                  <td className="px-4 py-3"><span className={`chip ${TYPE_CLASSES[s.type]}`}>{t.types[s.type]}</span></td>
                  <td className="px-4 py-3"><Progress done={s.completed} total={s.total} t={t} /></td>
                  <td className="px-4 py-3 text-earth-700">{s.next_at ? <LocalDateTime iso={s.next_at} mode="date" /> : <span className="text-earth-400">—</span>}</td>
                  <td className="px-4 py-3"><SuggestedAction student={s} t={t} /></td>
                  <td className="px-4 py-3">
                    <span className="flex justify-end gap-1">
                      <Link href={`/messages/${s.id}`} className="btn-ghost px-2" title={t.write(s.name)} aria-label={t.write(s.name)}><MessageCircle size={18} /></Link>
                      <Link href={`/calendrier?eleve=${s.id}`} className="btn-ghost px-2" title={t.schedule(s.name)} aria-label={t.schedule(s.name)}><CalendarPlus size={18} /></Link>
                      {s.action?.lesson_id && (
                        <Link href={`/cours/${s.action.lesson_id}`} className="btn-ghost px-2" title={t.lastLesson} aria-label={t.seeLast}><NotebookText size={18} /></Link>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
