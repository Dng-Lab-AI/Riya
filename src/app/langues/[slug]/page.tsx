import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, MapPin, MessagesSquare, Users } from "lucide-react";
import { TutorCard } from "@/components/cards";
import { EmptyState } from "@/components/ui";
import { defineMessages } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { withDe, withLe } from "@/lib/constants";
import { regionPhoto } from "@/lib/images";
import { getLanguage, searchTutors } from "@/lib/queries";

const M = defineMessages({
  en: {
    metaTitle: (name: string) => `Online ${name} lessons`, notFound: "Language not found",
    speakers: "Speakers", spokenIn: "Spoken in", family: "Family", all: "← All languages",
    meaning: (meaning: string, name: string) => `“${meaning}” in ${name}`, learn: (name: string) => `Learn ${name}`,
    tutors: (n: number, name: string) => `${n} ${name} tutor${n > 1 ? "s" : ""}`, discussions: (name: string) => `Discussions about ${name}`,
    none: "No tutor for this language yet", speakIt: "Do you speak it?", beFirst: "Become the first tutor",
  },
  fr: {
    metaTitle: (name: string) => `Cours ${withDe(name)} en ligne`, notFound: "Langue introuvable",
    speakers: "Locuteurs", spokenIn: "Parlée en", family: "Famille", all: "← Toutes les langues",
    meaning: (meaning: string, name: string) => `« ${meaning} » en ${name.toLowerCase()}`, learn: (name: string) => `Apprendre ${withLe(name)}`,
    tutors: (n: number, name: string) => `${n} tuteur${n > 1 ? "s" : ""} ${withDe(name)}`, discussions: (name: string) => `Discussions sur ${withLe(name)}`,
    none: "Pas encore de tuteur pour cette langue", speakIt: "Vous la parlez ?", beFirst: "Devenez le premier tuteur",
  },
});

export async function generateMetadata({ params }: PageProps<"/langues/[slug]">): Promise<Metadata> {
  const [language, locale] = await Promise.all([getLanguage((await params).slug), getLocale()]);
  const t = M[locale];
  return { title: language ? t.metaTitle(language.name) : t.notFound };
}

export default async function LanguagePage({ params }: PageProps<"/langues/[slug]">) {
  const language = await getLanguage((await params).slug);
  if (!language) notFound();
  const [tutors, locale] = await Promise.all([searchTutors({ langue: language.slug }), getLocale()]);
  const t = M[locale];

  const photo = regionPhoto(language.region);
  const facts = [
    { icon: Users, label: t.speakers, value: language.speakers },
    { icon: MapPin, label: t.spokenIn, value: language.countries },
    { icon: BookOpen, label: t.family, value: language.family },
  ];

  return (
    <>
      <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] bg-forest-900">
          <Image src={photo.src} alt={photo.alt} fill preload sizes="(min-width: 1280px) 1216px, 100vw" placeholder="blur" className="object-cover opacity-45" />
          <div className="absolute inset-0 bg-linear-to-r from-forest-900 via-forest-900/80 to-forest-900/20" />
          <div className="relative px-6 py-14 text-sand-50 sm:px-10 md:py-20">
            <Link href="/langues" className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-sand-100 backdrop-blur hover:bg-white/20">{t.all}</Link>
            <p className="mt-8 font-display text-6xl font-semibold text-ochre-300 md:text-7xl">{language.greeting}</p>
            <p className="text-sm text-sand-300">{t.meaning(language.greeting_meaning, language.name)}</p>
            <h1 className="mt-6 font-display text-4xl font-semibold">{t.learn(language.name)} <span className="text-sand-300">· {language.native_name}</span></h1>
            <p className="mt-4 max-w-2xl text-lg text-sand-200">{language.description}</p>
            <dl className="mt-8 grid gap-4 sm:grid-cols-3">
              {facts.map((f) => (
                <div key={f.label} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
                  <dt className="flex items-center gap-2 text-xs uppercase tracking-wider text-sand-300"><f.icon size={14} /> {f.label}</dt>
                  <dd className="mt-1 font-semibold">{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold">{t.tutors(tutors.length, language.name)}</h2>
          <Link href={`/forum?langue=${language.slug}`} className="btn-outline"><MessagesSquare size={16} /> {t.discussions(language.name)}</Link>
        </div>
        <div>
          {tutors.length ? (
            <div className="grid gap-5 md:grid-cols-2">{tutors.map((tutor) => <TutorCard key={tutor.id} tutor={tutor} />)}</div>
          ) : (
            <EmptyState title={t.none}>
              {t.speakIt} <Link href="/devenir-tuteur" className="font-semibold text-clay-700 underline">{t.beFirst}</Link>.
            </EmptyState>
          )}
        </div>
      </div>
    </>
  );
}
