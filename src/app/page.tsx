import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Bot, CalendarCheck, Captions, Hand, Layers, ListChecks, PenLine, Search, Video } from "lucide-react";
import { LanguageCard, TutorTile } from "@/components/cards";
import { HeroGreetings } from "@/components/HeroGreetings";
import { Reveal, Stagger } from "@/components/Motion";
import { REGIONS, regionId } from "@/lib/constants";
import { PHOTOS, regionPhoto } from "@/lib/images";
import { listLanguages, searchTutors } from "@/lib/queries";

const STEPS = [
  { icon: Search, title: "Choisissez votre langue", text: "Swahili, wolof, yoruba, amharique… Parcourez les profils, les avis et les tarifs." },
  { icon: CalendarCheck, title: "Réservez un créneau", text: "Choisissez l'heure qui vous convient, dans votre fuseau horaire. Le tuteur confirme." },
  { icon: Video, title: "Apprenez en visio", text: "Rejoignez le cours en un clic depuis votre tableau de bord, sans rien installer." },
];

const CLASSROOM_FEATURES = [
  { icon: PenLine, title: "Tableau blanc partagé", text: "Écrivez, dessinez, corrigez ensemble en temps réel." },
  { icon: ListChecks, title: "Quiz éclair", text: "Le tuteur lance une question… et les confettis volent quand c'est juste !" },
  { icon: Bot, title: "Assistant IA", text: "Sous-titres en direct, réponses à vos questions et résumé de chaque cours." },
  { icon: Layers, title: "Révisions faciles", text: "Fiche de révision, cartes mémoire et devoirs après chaque séance." },
];

const AUDIENCES = [
  { photo: PHOTOS.portraitGhana, title: "La diaspora", text: "Renouez avec la langue de vos parents et transmettez-la à vos enfants." },
  { photo: PHOTOS.stoneTown, title: "Les voyageurs et expatriés", text: "Préparez votre séjour et échangez vraiment avec les gens sur place." },
  { photo: PHOTOS.portraitJoie, title: "Les passionnés", text: "Musique, cinéma, littérature, famille : comprenez les cultures de l'intérieur." },
];

export default async function Home() {
  const [languages, tutors] = await Promise.all([listLanguages(), searchTutors({}, 4)]);
  const greetings = languages.map((l) => ({ text: l.greeting, language: l.name }));
  const popular = [...languages].sort((a, b) => b.tutor_count - a.tutor_count).slice(0, 4);
  const regions = REGIONS.map((region) => ({ region, count: languages.filter((l) => l.region === region).length })).filter((r) => r.count > 0);

  return (
    <>
      {/* Hero */}
      <section className="relative -mt-16 overflow-hidden pt-16">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-ochre-100 blur-3xl" />
        <div className="pointer-events-none absolute -left-32 bottom-0 h-80 w-80 rounded-full bg-clay-100/70 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 pb-16 pt-12 sm:px-6 md:pb-24 md:pt-20 lg:grid-cols-[1.05fr_1fr] lg:px-8">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-forest-600/20 bg-forest-100/60 px-3 py-1 text-xs font-semibold text-forest-800">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-forest-500 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-forest-600" /></span>
              {languages.length} langues africaines · tuteurs natifs
            </p>
            <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.02] tracking-tight text-earth-900 sm:text-6xl lg:text-7xl">
              Dites <HeroGreetings greetings={greetings} />
              <br />
              <span className="italic text-forest-700">à toute l&apos;Afrique.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-earth-600">
              Des cours particuliers en visio avec celles et ceux qui parlent la langue depuis toujours. Pour la diaspora,
              les voyageurs et tous les curieux.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/tuteurs" className="btn-primary px-7 py-3.5 text-base">Trouver mon tuteur <ArrowRight size={18} /></Link>
              <Link href="#comment-ca-marche" className="btn px-4 py-3.5 text-base text-earth-800 underline decoration-clay-500 decoration-2 underline-offset-4 hover:text-clay-700">Comment ça marche</Link>
            </div>

            <div className="mt-10">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-earth-500">Commencer directement par</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {popular.map((l) => (
                  <Link key={l.slug} href={`/tuteurs?langue=${l.slug}`} className="rounded-full border border-earth-900/15 bg-white px-4 py-2 text-sm font-medium text-earth-800 transition hover:border-forest-700 hover:bg-forest-800 hover:text-sand-50">
                    {l.name}
                  </Link>
                ))}
                <Link href="/langues" className="rounded-full px-3 py-2 text-sm font-semibold text-clay-700 hover:underline">+ {Math.max(0, languages.length - popular.length)} autres</Link>
              </div>
            </div>
          </div>

          {/* Photo collage */}
          <div className="relative mx-auto h-[30rem] w-full max-w-md sm:h-[34rem] lg:max-w-none">
            <Reveal className="absolute right-0 top-0 h-[88%] w-[64%]">
              <div className="arch relative h-full w-full overflow-hidden shadow-2xl">
                <Image src={PHOTOS.portraitLagos.src} alt={PHOTOS.portraitLagos.alt} fill preload sizes="(min-width: 1024px) 380px, 64vw" placeholder="blur" className="object-cover" />
              </div>
            </Reveal>
            <Reveal delay={0.15} className="absolute bottom-0 left-0 h-[52%] w-[50%]">
              <div className="arch relative h-full w-full overflow-hidden border-[6px] border-sand-50 shadow-xl">
                <Image src={PHOTOS.eleve.src} alt={PHOTOS.eleve.alt} fill sizes="(min-width: 1024px) 300px, 50vw" placeholder="blur" className="object-cover object-[60%_center]" />
              </div>
            </Reveal>
            <Reveal delay={0.3} className="absolute left-[6%] top-[8%]">
              <div className="relative h-24 w-24 overflow-hidden rounded-full border-[5px] border-sand-50 shadow-lg sm:h-28 sm:w-28">
                <Image src={PHOTOS.tissus.src} alt="" fill sizes="112px" className="object-cover" />
              </div>
            </Reveal>
            <Reveal delay={0.45} className="absolute bottom-[14%] right-[-4%] sm:right-[-6%]">
              <div className="rounded-2xl bg-white p-4 shadow-xl ring-1 ring-earth-900/5">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-forest-700"><Captions size={14} /> Sous-titres en direct</p>
                <p className="mt-1 font-display text-xl font-semibold text-earth-900">« Sawubona »</p>
                <p className="text-sm text-earth-500">Je te vois · zoulou</p>
              </div>
            </Reveal>
            <Reveal delay={0.6} className="absolute left-[44%] top-[2%] hidden sm:block">
              <div className="flex items-center gap-2 rounded-full bg-earth-900 px-4 py-2 text-sm font-medium text-sand-50 shadow-lg">
                <span className="h-2 w-2 rounded-full bg-clay-500" /> En classe maintenant
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Greetings marquee */}
      <section aria-label="Bonjour dans les langues africaines" className="overflow-hidden bg-forest-800 py-5 text-sand-50">
        <div className="animate-marquee flex w-max gap-10 whitespace-nowrap">
          {[...languages, ...languages].map((l, i) => (
            <span key={`${l.slug}-${i}`} aria-hidden={i >= languages.length} className="flex items-center gap-3 font-display text-2xl">
              {l.greeting}
              <span className="font-sans text-xs uppercase tracking-[0.2em] text-ochre-300">{l.name}</span>
              <span className="text-ochre-400">✦</span>
            </span>
          ))}
        </div>
      </section>

      {/* Regions */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-clay-600">Un continent, mille voix</p>
            <h2 className="mt-2 font-display text-4xl font-semibold leading-tight md:text-5xl">Partez à la découverte d&apos;une région</h2>
          </div>
          <Link href="/langues" className="btn-outline">Toutes les langues <ArrowRight size={16} /></Link>
        </Reveal>

        <div className="mt-10 grid auto-rows-[12rem] grid-cols-2 gap-4 md:auto-rows-[14rem] md:grid-cols-3">
          {regions.map(({ region, count }, i) => {
            const photo = regionPhoto(region);
            const big = i === 0;
            return (
              <Reveal key={region} delay={i * 0.06} className={big ? "col-span-2 row-span-2" : ""}>
              <Link href={`/langues#${regionId(region)}`} className="group relative block h-full overflow-hidden rounded-[1.75rem]">
                <Image src={photo.src} alt={photo.alt} fill sizes={big ? "(min-width: 768px) 66vw, 100vw" : "(min-width: 768px) 33vw, 50vw"} placeholder="blur" className="object-cover transition duration-700 group-hover:scale-110" />
                <div className="photo-shade absolute inset-0" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-5 text-sand-50">
                  <div>
                    <p className={`font-display font-semibold leading-tight ${big ? "text-3xl md:text-4xl" : "text-lg md:text-xl"}`}>{region}</p>
                    <p className="text-sm text-sand-200">{count} langue{count > 1 ? "s" : ""}</p>
                  </div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur transition group-hover:rotate-45 group-hover:bg-ochre-400 group-hover:text-forest-900"><ArrowUpRight size={18} /></span>
                </div>
              </Link>
              </Reveal>
            );
          })}
        </div>

        <div className="mt-14">
          <h3 className="font-display text-2xl font-semibold">Les plus demandées en ce moment</h3>
          <Stagger className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {popular.map((l) => <LanguageCard key={l.slug} language={l} />)}
          </Stagger>
        </div>
      </section>

      {/* How it works */}
      <section id="comment-ca-marche" className="scroll-mt-20 bg-sand-100">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8">
          <Reveal className="relative mx-auto w-full max-w-md">
            <div className="arch relative aspect-[4/5] overflow-hidden shadow-2xl">
              <Image src={PHOTOS.visio.src} alt={PHOTOS.visio.alt} fill sizes="(min-width: 1024px) 450px, 90vw" placeholder="blur" className="object-cover object-[40%_center]" />
            </div>
            <div className="absolute -bottom-6 -left-4 rounded-2xl bg-forest-800 px-5 py-4 text-sand-50 shadow-xl sm:-left-10">
              <p className="font-display text-3xl font-semibold text-ochre-300">3 étapes</p>
              <p className="text-sm text-sand-200">et vous êtes en cours</p>
            </div>
          </Reveal>

          <div>
            <Reveal>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-clay-600">Comment ça marche</p>
              <h2 className="mt-2 font-display text-4xl font-semibold leading-tight md:text-5xl">De la curiosité à la conversation</h2>
            </Reveal>
            <Reveal><ol className="relative mt-10 space-y-8 before:absolute before:bottom-6 before:left-6 before:top-6 before:w-px before:bg-earth-900/15">
              {STEPS.map((step, i) => (
                  <li key={step.title} className="relative flex gap-5">
                    <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-clay-600 shadow ring-1 ring-earth-900/10">
                      <step.icon size={22} />
                    </span>
                    <div className="pt-1">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-earth-400">Étape {i + 1}</p>
                      <h3 className="mt-1 text-xl font-semibold">{step.title}</h3>
                      <p className="mt-1 text-earth-600">{step.text}</p>
                    </div>
                  </li>
              ))}
            </ol></Reveal>
            <Link href="/tuteurs" className="btn-dark mt-10">Je choisis mon tuteur <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>

      {/* Classroom bento */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-clay-600">La classe Riya</p>
          <h2 className="mt-2 font-display text-4xl font-semibold leading-tight md:text-5xl">Une salle de classe vivante, directement sur le site</h2>
        </Reveal>

        <div className="mt-10 grid gap-4 lg:grid-cols-3 lg:grid-rows-2">
          <Reveal className="relative min-h-[22rem] overflow-hidden rounded-[1.75rem] bg-earth-900 lg:col-span-2 lg:row-span-2">
            <Image src={PHOTOS.eleve.src} alt={PHOTOS.eleve.alt} fill sizes="(min-width: 1024px) 66vw, 100vw" placeholder="blur" className="object-cover opacity-80" />
            <div className="photo-shade absolute inset-0" />
            <div className="absolute left-5 top-5 flex gap-2">
              <span className="rounded-full bg-clay-600 px-3 py-1 text-xs font-semibold text-white">● En direct</span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">32:14</span>
            </div>
            <div className="absolute right-5 top-5 flex flex-col gap-2 text-2xl">
              <span className="rounded-full bg-white/90 p-2 shadow">👏</span>
              <span className="rounded-full bg-white/90 p-2 shadow"><Hand size={22} className="text-ochre-500" /></span>
            </div>
            <div className="absolute inset-x-0 bottom-0 p-6 text-sand-50 md:p-8">
              <p className="inline-block rounded-xl bg-black/55 px-4 py-2 text-lg backdrop-blur">« Habari yako ? — Nzuri sana, asante ! »</p>
              <h3 className="mt-5 flex items-center gap-2 font-display text-2xl font-semibold"><Video size={24} className="text-ochre-300" /> Face à face en visio</h3>
              <p className="mt-1 max-w-lg text-sand-200">Vidéo et son en direct, partage d&apos;écran, réactions et main levée : comme si vous étiez dans la même pièce.</p>
            </div>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:row-span-2 lg:grid-cols-1 lg:grid-rows-4">
            {CLASSROOM_FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.08} className="group flex h-full gap-4 rounded-[1.5rem] border border-sand-200 bg-white p-5 transition hover:border-forest-600/40">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-forest-100 text-forest-700 transition group-hover:rotate-6 group-hover:bg-forest-800 group-hover:text-ochre-300"><f.icon size={22} /></span>
                <div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-0.5 text-sm text-earth-600">{f.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Tutors */}
      <section className="bg-forest-900 text-sand-50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-ochre-300">Nos tuteurs</p>
              <h2 className="mt-2 font-display text-4xl font-semibold leading-tight md:text-5xl">Des locuteurs natifs,<br />des pédagogues passionnés</h2>
            </div>
            <Link href="/tuteurs" className="btn bg-ochre-400 text-forest-900 hover:bg-ochre-300">Voir tous les tuteurs <ArrowRight size={16} /></Link>
          </div>
          <Stagger className="grid gap-5 text-earth-900 sm:grid-cols-2 lg:grid-cols-4">
            {tutors.map((t) => <TutorTile key={t.id} tutor={t} />)}
          </Stagger>
        </div>
      </section>

      {/* Audiences */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-clay-600">Pour qui ?</p>
          <h2 className="mt-2 font-display text-4xl font-semibold leading-tight md:text-5xl">Pour toutes celles et ceux qui aiment l&apos;Afrique</h2>
        </Reveal>
        <Stagger className="mt-12 grid gap-5 md:grid-cols-3">
          {AUDIENCES.map((a, i) => (
            <div key={a.title} className={`group relative h-[26rem] overflow-hidden rounded-[1.75rem] ${i === 1 ? "md:mt-10" : ""}`}>
              <Image src={a.photo.src} alt={a.photo.alt} fill sizes="(min-width: 768px) 33vw, 100vw" placeholder="blur" className="object-cover transition duration-700 group-hover:scale-105" />
              <div className="photo-shade absolute inset-0" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-sand-50">
                <h3 className="font-display text-2xl font-semibold">{a.title}</h3>
                <p className="mt-2 text-sand-200">{a.text}</p>
              </div>
            </div>
          ))}
        </Stagger>
      </section>

      {/* Become a tutor */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <Reveal className="grid overflow-hidden rounded-[2rem] bg-clay-600 text-white md:grid-cols-[2fr_3fr]">
          <div className="relative min-h-64">
            <Image src={PHOTOS.portraitRue.src} alt={PHOTOS.portraitRue.alt} fill sizes="(min-width: 768px) 40vw, 100vw" placeholder="blur" className="object-cover" />
          </div>
          <div className="flex flex-col items-start justify-center gap-5 p-8 md:p-12">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-clay-100">Devenir tuteur</p>
            <h2 className="font-display text-3xl font-semibold leading-tight md:text-4xl">Vous parlez une langue africaine ? Faites-la voyager.</h2>
            <p className="max-w-xl text-clay-50">Partagez-la avec le monde, fixez vos tarifs et enseignez depuis chez vous, avec une salle de classe déjà prête.</p>
            <Link href="/devenir-tuteur" className="btn bg-white text-clay-700 hover:bg-sand-100">Je deviens tuteur <ArrowRight size={16} /></Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
