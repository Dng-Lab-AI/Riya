import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, MapPin, MessagesSquare, Users } from "lucide-react";
import { TutorCard } from "@/components/cards";
import { EmptyState } from "@/components/ui";
import { withDe, withLe } from "@/lib/constants";
import { getLanguage, searchTutors } from "@/lib/queries";

export async function generateMetadata({ params }: PageProps<"/langues/[slug]">): Promise<Metadata> {
  const language = await getLanguage((await params).slug);
  return { title: language ? `Cours ${withDe(language.name)} en ligne` : "Langue introuvable" };
}

export default async function LanguagePage({ params }: PageProps<"/langues/[slug]">) {
  const language = await getLanguage((await params).slug);
  if (!language) notFound();
  const tutors = await searchTutors({ langue: language.slug });

  const facts = [
    { icon: Users, label: "Locuteurs", value: language.speakers },
    { icon: MapPin, label: "Parlée en", value: language.countries },
    { icon: BookOpen, label: "Famille", value: language.family },
  ];

  return (
    <>
      <section className="pattern-kente">
        <div className="bg-forest-900/90">
          <div className="mx-auto max-w-7xl px-4 py-14 text-sand-50 sm:px-6 lg:px-8">
            <Link href="/langues" className="text-sm text-sand-300 hover:text-white">← Toutes les langues</Link>
            <p className="mt-6 font-display text-5xl font-semibold text-ochre-300">{language.greeting}</p>
            <p className="text-sm text-sand-300">« {language.greeting_meaning} » en {language.name.toLowerCase()}</p>
            <h1 className="mt-6 font-display text-4xl font-semibold">Apprendre {withLe(language.name)} <span className="text-sand-300">· {language.native_name}</span></h1>
            <p className="mt-4 max-w-2xl text-lg text-sand-200">{language.description}</p>
            <dl className="mt-8 grid gap-4 sm:grid-cols-3">
              {facts.map((f) => (
                <div key={f.label} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                  <dt className="flex items-center gap-2 text-xs uppercase tracking-wider text-sand-300"><f.icon size={14} /> {f.label}</dt>
                  <dd className="mt-1 font-semibold">{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold">
            {tutors.length} tuteur{tutors.length > 1 ? "s" : ""} {withDe(language.name)}
          </h2>
          <Link href={`/forum?langue=${language.slug}`} className="btn-outline"><MessagesSquare size={16} /> Discussions sur {withLe(language.name)}</Link>
        </div>
        <div className="space-y-4">
          {tutors.length ? (
            tutors.map((t) => <TutorCard key={t.id} tutor={t} />)
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
