"use client";

import Link from "next/link";
import { useState } from "react";
import { MessageCircle, NotebookText, Search, X } from "lucide-react";
import type { StudentRow, StudentType } from "@/lib/students";
import { LocalDateTime } from "./client";
import { Avatar } from "./ui";

const TYPES: Record<StudentType, { label: string; className: string }> = {
  new: { label: "Nouvel élève", className: "bg-sky-100 text-sky-900" },
  regular: { label: "Régulier", className: "bg-forest-100 text-forest-800" },
  occasional: { label: "Occasionnel", className: "bg-sand-100 text-earth-700" },
  inactive: { label: "Annulé", className: "bg-clay-100 text-clay-800" },
};

function SuggestedAction({ student }: { student: StudentRow }) {
  const action = student.action;
  if (!action) return <span className="text-earth-400">—</span>;
  const first = student.name.split(" ")[0];
  const link = {
    request: { href: "/tableau-de-bord", label: "Répondre à la demande" },
    feedback: { href: `/cours/${action.lesson_id}`, label: "Donner un retour" },
    rebook: { href: `/messages/${student.id}`, label: `Proposer un cours à ${first}` },
  }[action.kind];
  return <Link href={link.href} className="font-semibold text-clay-700 underline underline-offset-4 hover:text-clay-800">{link.label}</Link>;
}

function Progress({ done, total }: { done: number; total: number }) {
  const percent = total ? Math.round((done / total) * 100) : 0;
  return (
    <span className="flex items-center gap-2" title={`${done} cours terminé${done > 1 ? "s" : ""} sur ${total}`}>
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-sand-200">
        <span className="block h-full rounded-full bg-earth-900" style={{ width: `${percent}%` }} />
      </span>
      <span className="tabular-nums">{done}/{total}</span>
    </span>
  );
}

export function StudentsTable({ students }: { students: StudentRow[] }) {
  const [query, setQuery] = useState("");
  const [onlyCurrent, setOnlyCurrent] = useState(true);
  const q = query.trim().toLowerCase();
  const shown = students.filter((s) => (!onlyCurrent || s.current) && (!q || s.name.toLowerCase().includes(q)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1 sm:max-w-xs">
          <span className="sr-only">Rechercher un élève</span>
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-earth-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher" className="input pl-10" />
        </label>
        {onlyCurrent ? (
          <button type="button" onClick={() => setOnlyCurrent(false)} className="flex items-center gap-1.5 rounded-xl border border-earth-900 px-3.5 py-2.5 text-sm font-semibold">
            Actuels <X size={15} aria-label="Afficher tous les élèves" />
          </button>
        ) : (
          <button type="button" onClick={() => setOnlyCurrent(true)} className="rounded-xl border border-sand-300 bg-white px-3.5 py-2.5 text-sm font-medium text-earth-700">
            Tous les élèves · Afficher les actuels
          </button>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-[1.5rem] border border-sand-200 bg-white p-8 text-center text-earth-600">
          {students.length ? "Aucun élève ne correspond." : "Vos élèves apparaîtront ici après leur première réservation."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[1.5rem] border border-sand-200 bg-white">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="border-b border-sand-200 text-xs text-earth-500">
              <tr>
                <th className="px-4 py-3 font-medium">Élève</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Cours</th>
                <th className="px-4 py-3 font-medium">Prochain cours</th>
                <th className="px-4 py-3 font-medium">Action suggérée</th>
                <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
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
                  <td className="px-4 py-3"><span className={`chip ${TYPES[s.type].className}`}>{TYPES[s.type].label}</span></td>
                  <td className="px-4 py-3"><Progress done={s.completed} total={s.total} /></td>
                  <td className="px-4 py-3 text-earth-700">{s.next_at ? <LocalDateTime iso={s.next_at} mode="date" /> : <span className="text-earth-400">—</span>}</td>
                  <td className="px-4 py-3"><SuggestedAction student={s} /></td>
                  <td className="px-4 py-3">
                    <span className="flex justify-end gap-1">
                      <Link href={`/messages/${s.id}`} className="btn-ghost px-2" title={`Écrire à ${s.name}`} aria-label={`Écrire à ${s.name}`}><MessageCircle size={18} /></Link>
                      {s.action?.lesson_id && (
                        <Link href={`/cours/${s.action.lesson_id}`} className="btn-ghost px-2" title="Dernier cours" aria-label="Voir le dernier cours"><NotebookText size={18} /></Link>
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
