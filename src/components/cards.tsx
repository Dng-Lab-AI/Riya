import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck, MapPin, Users } from "lucide-react";
import { SPECIALTIES, formatPrice, labelFor, SITE } from "@/lib/constants";
import { regionPhoto } from "@/lib/images";
import type { Language, TutorSummary } from "@/lib/queries";
import { Avatar, Rating } from "./ui";

const REGION_ACCENT: Record<string, string> = {
  "Afrique de l'Ouest": "bg-ochre-100 text-ochre-800",
  "Afrique centrale": "bg-forest-100 text-forest-800",
  "Afrique de l'Est": "bg-clay-100 text-clay-800",
  "Afrique australe": "bg-sand-200 text-earth-800",
  "Corne de l'Afrique": "bg-clay-50 text-clay-700",
  "Océan Indien": "bg-forest-100 text-forest-700",
};

// Banner tones for tutor cards, picked from the tutor's name so a card always looks the same.
const TUTOR_BANDS = ["bg-forest-800", "bg-clay-600", "bg-earth-800", "bg-ochre-500", "bg-forest-600"];

function bandFor(name: string) {
  return TUTOR_BANDS[[...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) % TUTOR_BANDS.length];
}

export function LanguageCard({ language }: { language: Language }) {
  const photo = regionPhoto(language.region);
  return (
    <Link
      href={`/langues/${language.slug}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-sand-200 bg-white p-5 transition duration-300 hover:-translate-y-1 hover:border-earth-900/20 hover:shadow-[0_20px_40px_-20px_rgb(34_24_15/0.35)]"
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${REGION_ACCENT[language.region] ?? "bg-sand-100 text-earth-700"}`}>{language.region}</span>
        <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full ring-2 ring-white">
          <Image src={photo.src} alt="" fill sizes="48px" className="object-cover transition duration-500 group-hover:scale-125" />
        </span>
      </div>
      <p className="mt-6 font-display text-3xl font-semibold leading-tight text-earth-900">{language.greeting}</p>
      <p className="text-sm italic text-earth-500">« {language.greeting_meaning} »</p>
      <div className="mt-auto flex items-end justify-between gap-3 border-t border-dashed border-sand-300 pt-4">
        <div>
          <h3 className="font-semibold text-earth-900">{language.name}</h3>
          <p className="text-xs text-earth-500">{language.speakers} · {language.tutor_count} tuteur{language.tutor_count > 1 ? "s" : ""}</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-earth-900 text-sand-50 transition group-hover:rotate-45 group-hover:bg-clay-600">
          <ArrowUpRight size={18} />
        </span>
      </div>
    </Link>
  );
}

export function TutorCard({ tutor }: { tutor: TutorSummary }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-sand-200 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-20px_rgb(34_24_15/0.35)]">
      <div className={`relative h-20 ${bandFor(tutor.name)}`}>
        <div className="pattern-bogolan absolute inset-0 opacity-40 mix-blend-overlay" />
        <span className="absolute right-4 top-4 rounded-full bg-white/95 px-3 py-1 text-sm font-semibold text-earth-900">
          {formatPrice(tutor.hourly_rate)} <span className="font-normal text-earth-500">/ {SITE.lessonMinutes} min</span>
        </span>
      </div>

      <div className="relative -mt-10 flex flex-1 flex-col px-5 pb-5">
        <Link href={`/tuteurs/${tutor.id}`} className="w-fit">
          <Avatar name={tutor.name} src={tutor.avatar_url} size={80} className="rounded-3xl ring-4 ring-white" />
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link href={`/tuteurs/${tutor.id}`} className="font-display text-xl font-semibold text-earth-900 hover:text-clay-700">{tutor.name}</Link>
          <span title="Tuteur vérifié"><BadgeCheck size={18} className="text-forest-600" /></span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-earth-500">
          <span className="flex items-center gap-1"><MapPin size={14} /> {tutor.country}</span>
          <Rating value={tutor.rating} count={tutor.review_count} />
        </div>

        <p className="mt-3 font-semibold leading-snug text-earth-800">{tutor.headline}</p>
        <p className="mt-1 line-clamp-2 text-sm text-earth-600">{tutor.about}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {tutor.languages.map((l) => (
            <span key={l.slug} className={`chip ${l.level === "native" ? "bg-clay-50 text-clay-800" : ""}`}>
              {l.name} <span className="opacity-70">· {l.level === "native" ? "natif" : "courant"}</span>
            </span>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-earth-500">
          <span className="flex items-center gap-1"><Users size={13} /> {tutor.lesson_count} cours donnés</span>
          {tutor.specialties.slice(0, 3).map((s) => <span key={s}>#{labelFor(SPECIALTIES, s)}</span>)}
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
          <Link href={`/tuteurs/${tutor.id}`} className="btn-outline">Voir le profil</Link>
          <Link href={`/tuteurs/${tutor.id}#reserver`} className="btn-primary">Réserver</Link>
        </div>
      </div>
    </article>
  );
}

export function TutorTile({ tutor }: { tutor: TutorSummary }) {
  const main = tutor.languages[0];
  return (
    <Link href={`/tuteurs/${tutor.id}`} className="group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-sand-200 bg-white p-5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-20px_rgb(34_24_15/0.35)]">
      <div className={`absolute inset-x-0 top-0 h-16 ${bandFor(tutor.name)}`} />
      <div className="relative flex items-end justify-between pt-4">
        <Avatar name={tutor.name} src={tutor.avatar_url} size={72} className="rounded-3xl ring-4 ring-white" />
        <span className="chip bg-sand-50">{formatPrice(tutor.hourly_rate)}</span>
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold text-earth-900 group-hover:text-clay-700">{tutor.name}</h3>
      <p className="text-sm text-earth-500">{main?.name} · {tutor.country}</p>
      <p className="mt-2 line-clamp-2 text-sm text-earth-700">{tutor.headline}</p>
      <div className="mt-auto flex items-center justify-between pt-4">
        <Rating value={tutor.rating} count={tutor.review_count} />
        <ArrowUpRight size={18} className="text-earth-400 transition group-hover:rotate-45 group-hover:text-clay-600" />
      </div>
    </Link>
  );
}
