import Link from "next/link";
import { Bot, CalendarCheck, Globe2, HeartHandshake, Layers, ListChecks, PenLine, Search, Sprout, Video } from "lucide-react";
import { LanguageCard, TutorTile } from "@/components/cards";
import { HeroGreetings } from "@/components/HeroGreetings";
import { Reveal, Stagger } from "@/components/Motion";
import { Avatar } from "@/components/ui";
import { listLanguages, searchTutors } from "@/lib/queries";

const STEPS = [
  { icon: Search, title: "Choisissez votre langue", text: "Swahili, wolof, yoruba, amharique… Parcourez les profils, les avis et les tarifs." },
  { icon: CalendarCheck, title: "Réservez un créneau", text: "Choisissez l'heure qui vous convient, dans votre fuseau horaire. Le tuteur confirme." },
  { icon: Video, title: "Apprenez en visio", text: "Rejoignez le cours en un clic depuis votre tableau de bord, sans rien installer." },
];

const CLASSROOM_FEATURES = [
  { icon: Video, title: "Face à face en visio", text: "Vidéo et son en direct, sans rien installer, partage d'écran inclus." },
  { icon: PenLine, title: "Tableau blanc partagé", text: "Écrivez, dessinez, corrigez ensemble en temps réel." },
  { icon: ListChecks, title: "Quiz éclair", text: "Le tuteur lance une question, vous répondez… et les confettis volent quand c'est juste !" },
  { icon: Bot, title: "Assistant IA", text: "Sous-titres en direct, réponses à vos questions et résumé complet de chaque cours." },
  { icon: Layers, title: "Révisions faciles", text: "Fiche de révision, cartes mémoire et devoirs, disponibles après chaque séance." },
  { icon: HeartHandshake, title: "Réactions et main levée", text: "👏 🎉 ✋ : une classe vivante, comme si vous étiez dans la même pièce." },
];

const AUDIENCES = [
  { icon: Sprout, title: "La diaspora", text: "Renouez avec la langue de vos parents et transmettez-la à vos enfants." },
  { icon: Globe2, title: "Les voyageurs et expatriés", text: "Préparez votre séjour et échangez vraiment avec les gens sur place." },
  { icon: HeartHandshake, title: "Les passionnés", text: "Musique, cinéma, littérature, famille : comprenez les cultures de l'intérieur." },
];

export default async function Home() {
  const [languages, tutors] = await Promise.all([listLanguages(), searchTutors({}, 4)]);
  const greetings = languages.map((l) => ({ text: l.greeting, language: l.name }));

  return (
    <>
      {/* Hero */}
      <section className="pattern-bogolan relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-forest-700 shadow-sm">
              {languages.length} langues africaines · tuteurs natifs
            </p>
            <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight text-earth-900 md:text-6xl">
              Dites <HeroGreetings greetings={greetings} />
              <br />à toute l&apos;Afrique.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-earth-600">
              Apprenez une langue africaine en cours particuliers avec des tuteurs natifs, que vous soyez de la diaspora,
              voyageur ou simplement curieux.
            </p>

            <form action="/tuteurs" className="mt-8 flex max-w-xl flex-col gap-2 rounded-2xl border border-sand-200 bg-white p-2 shadow-lg sm:flex-row">
              <label className="flex flex-1 items-center gap-3 px-3">
                <Search size={20} className="text-earth-400" />
                <span className="sr-only">Langue</span>
                <select name="langue" className="w-full bg-transparent py-3 text-earth-800 outline-none" defaultValue="">
                  <option value="">Quelle langue voulez-vous apprendre ?</option>
                  {languages.map((l) => <option key={l.slug} value={l.slug}>{l.name} ({l.native_name})</option>)}
                </select>
              </label>
              <button className="btn-primary py-3">Trouver un tuteur</button>
            </form>
          </div>

          <div className="relative hidden lg:block">
            <div className="pattern-kente absolute -right-6 -top-6 h-full w-full rounded-[2rem] opacity-90" />
            <div className="card relative space-y-4 rounded-[2rem] p-6">
              {tutors.slice(0, 3).map((t) => (
                <div key={t.id} className="flex items-center gap-4 rounded-2xl bg-sand-50 p-4">
                  <Avatar name={t.name} src={t.avatar_url} size={52} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{t.name}</p>
                    <p className="truncate text-sm text-earth-500">{t.languages.map((l) => l.name).join(", ")} · {t.country}</p>
                  </div>
                  <span className="chip bg-forest-100 text-forest-800">Disponible</span>
                </div>
              ))}
              <p className="text-center text-sm text-earth-500">… et bien d&apos;autres tuteurs prêts à vous accueillir</p>
            </div>
          </div>
        </div>
      </section>

      {/* Languages */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-clay-600">Nos langues</p>
            <h2 className="mt-2 font-display text-3xl font-semibold md:text-4xl">Quelle langue vous appelle ?</h2>
          </div>
          <Link href="/langues" className="btn-outline hidden sm:inline-flex">Toutes les langues</Link>
        </div>
        <Stagger className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {languages.slice(0, 8).map((l) => <LanguageCard key={l.slug} language={l} />)}
        </Stagger>
        <Link href="/langues" className="btn-outline mt-8 w-full sm:hidden">Toutes les langues</Link>
      </section>

      {/* How it works */}
      <section id="comment-ca-marche" className="bg-forest-800 text-sand-50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <Reveal><h2 className="font-display text-3xl font-semibold md:text-4xl">Comment ça marche</h2></Reveal>
          <Stagger className="mt-12 grid gap-8 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title} className="h-full rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 transition hover:-translate-y-1 hover:bg-white/10">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ochre-400 text-forest-900"><step.icon size={22} /></span>
                  <span className="font-display text-4xl font-semibold text-white/20">0{i + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-sand-200">{step.text}</p>
              </div>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Classroom */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-clay-600">La classe Riya</p>
          <h2 className="mt-2 font-display text-3xl font-semibold md:text-4xl">Une salle de classe vivante, pensée pour apprendre</h2>
          <p className="mt-3 text-earth-600">Tout ce qu&apos;il faut pour pratiquer, comprendre et retenir, directement sur le site.</p>
        </Reveal>
        <Stagger className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CLASSROOM_FEATURES.map((f) => (
            <div key={f.title} className="card group h-full p-6 transition hover:-translate-y-1 hover:shadow-lg">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-800 text-ochre-300 transition group-hover:rotate-6 group-hover:scale-110"><f.icon size={24} /></span>
              <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-earth-600">{f.text}</p>
            </div>
          ))}
        </Stagger>
      </section>

      {/* Tutors */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-clay-600">Nos tuteurs</p>
            <h2 className="mt-2 font-display text-3xl font-semibold md:text-4xl">Des locuteurs natifs, des pédagogues passionnés</h2>
          </div>
          <Link href="/tuteurs" className="btn-outline hidden sm:inline-flex">Voir tous les tuteurs</Link>
        </div>
        <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {tutors.map((t) => <TutorTile key={t.id} tutor={t} />)}
        </Stagger>
      </section>

      {/* Audiences */}
      <section className="pattern-bogolan border-y border-sand-200">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <h2 className="text-center font-display text-3xl font-semibold md:text-4xl">Pour toutes celles et ceux qui aiment l&apos;Afrique</h2>
          <Stagger className="mt-12 grid gap-6 md:grid-cols-3">
            {AUDIENCES.map((a) => (
              <div key={a.title} className="card h-full p-7 text-center">
                <span className="mx-auto flex h-14 w-14 rotate-3 items-center justify-center rounded-2xl bg-clay-50 text-clay-600"><a.icon size={28} /></span>
                <h3 className="mt-5 font-display text-xl font-semibold">{a.title}</h3>
                <p className="mt-2 text-earth-600">{a.text}</p>
              </div>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Become a tutor */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Reveal className="pattern-kente overflow-hidden rounded-[2rem] p-1.5">
          <div className="flex flex-col items-start gap-6 rounded-[1.6rem] bg-forest-900/95 p-8 text-sand-50 md:flex-row md:items-center md:justify-between md:p-12">
            <div>
              <h2 className="font-display text-3xl font-semibold">Vous parlez une langue africaine ?</h2>
              <p className="mt-2 max-w-xl text-sand-200">Partagez-la avec le monde, fixez vos tarifs et enseignez depuis chez vous.</p>
            </div>
            <Link href="/devenir-tuteur" className="btn bg-ochre-400 text-forest-900 hover:bg-ochre-300">Devenir tuteur</Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
