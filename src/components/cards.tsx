import Link from "next/link";
import { ArrowRight, GraduationCap, MapPin, Users } from "lucide-react";
import { SPECIALTIES, formatPrice, labelFor, SITE } from "@/lib/constants";
import type { Language, TutorSummary } from "@/lib/queries";
import { Avatar, Rating } from "./ui";

const REGION_ACCENT: Record<string, string> = {
  "Afrique de l'Ouest": "from-ochre-400 to-clay-500",
  "Afrique centrale": "from-forest-500 to-forest-800",
  "Afrique de l'Est": "from-clay-500 to-clay-800",
  "Afrique australe": "from-ochre-500 to-forest-600",
  "Corne de l'Afrique": "from-clay-600 to-earth-800",
  "Océan Indien": "from-forest-500 to-ochre-500",
};

export function LanguageCard({ language }: { language: Language }) {
  return (
    <Link href={`/langues/${language.slug}`} className="card group flex h-full flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-lg">
      <div className={`bg-linear-to-br ${REGION_ACCENT[language.region] ?? "from-clay-500 to-ochre-400"} px-5 py-6 text-white`}>
        <p className="font-display text-2xl font-semibold">{language.greeting}</p>
        <p className="text-xs opacity-90">« {language.greeting_meaning} »</p>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-display text-xl font-semibold text-earth-900">{language.name}</h3>
          <span className="text-xs text-earth-500">{language.speakers}</span>
        </div>
        <p className="text-sm text-earth-500">{language.native_name}</p>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-earth-600"><MapPin size={13} /> {language.region}</p>
        <p className="mt-auto flex items-center justify-between pt-4 text-sm font-semibold text-clay-700">
          {language.tutor_count} tuteur{language.tutor_count > 1 ? "s" : ""}
          <ArrowRight size={16} className="transition group-hover:translate-x-1" />
        </p>
      </div>
    </Link>
  );
}

export function TutorCard({ tutor }: { tutor: TutorSummary }) {
  return (
    <article className="card flex flex-col gap-5 p-5 transition hover:shadow-lg sm:flex-row sm:p-6">
      <Link href={`/tuteurs/${tutor.id}`} className="shrink-0 self-start">
        <Avatar name={tutor.name} src={tutor.avatar_url} size={96} className="rounded-2xl" />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link href={`/tuteurs/${tutor.id}`} className="font-display text-xl font-semibold text-earth-900 hover:text-clay-700">{tutor.name}</Link>
          <span title="Tuteur vérifié"><GraduationCap size={18} className="text-forest-600" /></span>
          <Rating value={tutor.rating} count={tutor.review_count} />
        </div>
        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-earth-500"><MapPin size={14} /> {tutor.country}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {tutor.languages.map((l) => (
            <span key={l.slug} className={`chip ${l.level === "native" ? "bg-clay-50 text-clay-800" : ""}`}>
              {l.name} <span className="opacity-70">· {l.level === "native" ? "natif" : "courant"}</span>
            </span>
          ))}
        </div>

        <p className="mt-3 font-semibold text-earth-800">{tutor.headline}</p>
        <p className="mt-1 line-clamp-2 text-sm text-earth-600">{tutor.about}</p>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-earth-500">
          <span className="flex items-center gap-1"><Users size={13} /> {tutor.lesson_count} cours donnés</span>
          {tutor.specialties.slice(0, 3).map((s) => <span key={s}>#{labelFor(SPECIALTIES, s)}</span>)}
        </div>
      </div>

      <div className="flex shrink-0 flex-row items-center justify-between gap-3 border-t border-sand-200 pt-4 sm:w-44 sm:flex-col sm:items-stretch sm:justify-start sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
        <div className="sm:text-right">
          <p className="font-display text-2xl font-semibold">{formatPrice(tutor.hourly_rate)}</p>
          <p className="text-xs text-earth-500">par cours de {SITE.lessonMinutes} min</p>
        </div>
        <Link href={`/tuteurs/${tutor.id}#reserver`} className="btn-primary">Réserver</Link>
      </div>
    </article>
  );
}

export function TutorTile({ tutor }: { tutor: TutorSummary }) {
  const main = tutor.languages[0];
  return (
    <Link href={`/tuteurs/${tutor.id}`} className="card group flex h-full flex-col p-5 transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start justify-between">
        <Avatar name={tutor.name} src={tutor.avatar_url} size={64} />
        <span className="chip">{formatPrice(tutor.hourly_rate)}</span>
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold text-earth-900 group-hover:text-clay-700">{tutor.name}</h3>
      <p className="text-sm text-earth-500">{main?.name} · {tutor.country}</p>
      <p className="mt-2 line-clamp-2 text-sm text-earth-700">{tutor.headline}</p>
      <div className="mt-auto pt-4"><Rating value={tutor.rating} count={tutor.review_count} /></div>
    </Link>
  );
}
