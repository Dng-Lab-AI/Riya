import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, MapPin, MessagesSquare, Users } from "lucide-react";
import { TutorCard } from "@/components/cards";
import { EmptyState } from "@/components/ui";
import { withDe, withLe } from "@/lib/constants";
import { regionPhoto } from "@/lib/images";
import { getLanguage, searchTutors } from "@/lib/queries";

export async function generateMetadata({ params }: PageProps<"/langues/[slug]">): Promise<Metadata> {
  const language = await getLanguage((await params).slug);
  return { title: language ? `Cours ${withDe(language.name)} en ligne` : "Langue introuvable" };
}

export default async function LanguagePage({ params }: PageProps<"/langues/[slug]">) {
  const language = await getLanguage((await params).slug);
  if (!language) notFound();
  const tutors = await searchTutors({ langue: language.slug });

  const photo = regionPhoto(language.region);
  const facts = [
    { icon: Users, label: "Locuteurs", value: language.speakers },
    { icon: MapPin, label: "Parlée en", value: language.countries },
    { icon: BookOpen, label: "Famille", value: language.family },
  ];

  return (
    <>
      <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] bg-forest-900">
          <Image src={photo.src} alt={photo.alt} fill preload sizes="(min-width: 1280px) 1216px, 100vw" placeholder="blur" className="object-cover opacity-45" />
          <div className="absolute inset-0 bg-linear-to-r from-forest-900 via-forest-900/80 to-forest-900/20" />
          <div className="relative px-6 py-14 text-sand-50 sm:px-10 md:py-20">
            <Link href="/langues" className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-sand-100 backdrop-blur hover:bg-white/20">← Toutes les langues</Link>
            <p className="mt-8 font-display text-6xl font-semibold text-ochre-300 md:text-7xl">{language.greeting}</p>
            <p className="text-sm text-sand-300">« {language.greeting_meaning} » en {language.name.toLowerCase()}</p>
            <h1 className="mt-6 font-display text-4xl font-semibold">Apprendre {withLe(language.name)} <span className="text-sand-300">· {language.native_name}</span></h1>
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
          <h2 className="font-display text-2xl font-semibold">
            {tutors.length} tuteur{tutors.length > 1 ? "s" : ""} {withDe(language.name)}
          </h2>
          <Link href={`/forum?langue=${language.slug}`} className="btn-outline"><MessagesSquare size={16} /> Discussions sur {withLe(language.name)}</Link>
        </div>
        <div>
          {tutors.length ? (
            <div className="grid gap-5 md:grid-cols-2">{tutors.map((t) => <TutorCard key={t.id} tutor={t} />)}</div>
          ) : (
            <EmptyState title="Pas encore de tuteur pour cette langue">
              Vous la parlez ? <Link href="/devenir-tuteur" className="font-semibold text-clay-700 underline">Devenez le premier tuteur</Link>.
            </EmptyState>
          )}
        </div>
      </div>
    </>
  );
}
