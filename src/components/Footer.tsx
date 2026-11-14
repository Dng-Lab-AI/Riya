import Link from "next/link";
import { ArrowUp, ArrowUpRight, Search, Sparkles } from "lucide-react";
import { defineMessages, type Locale } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { getCurrentUser, type SessionUser } from "@/lib/auth";
import { SITE, SITE_TEXT } from "@/lib/constants";
import { listLanguages } from "@/lib/queries";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Logo } from "./ui";

type Column = { title: string; links: { href: string; label: string }[] };

const M = defineMessages({
  en: {
    learn: "Learn", findTutor: "Find a tutor", allLanguages: "All languages", how: "How it works", community: "Community",
    teaching: "My teaching", tutorHome: "Tutor home", calendar: "Calendar", students: "My students", tutorProfile: "My tutor profile",
    account: "My account", messages: "Messages", progressTutor: "My progress", profile: "My profile",
    teach: "Teach", becomeTutor: "Become a tutor", createTutorAccount: "Create a tutor account",
    lessons: "My lessons", tutors: "My tutors", progressStudent: "My progress", signIn: "Log in", signUp: "Create an account",
    proverb: "Language is identity. Swahili proverb.", teachOnRiya: "Teach on Riya", payTitle: "Easy payment, wherever you live", card: "Bank card",
    ourLanguages: "Our languages", madeWith: "Made with pride for African languages, from Cameroon.", photos: "Photos", top: "Back to top",
  },
  fr: {
    learn: "Apprendre", findTutor: "Trouver un tuteur", allLanguages: "Toutes les langues", how: "Comment ça marche", community: "Communauté",
    teaching: "Mon enseignement", tutorHome: "Accueil tuteur", calendar: "Calendrier", students: "Mes élèves", tutorProfile: "Mon profil de tuteur",
    account: "Mon compte", messages: "Messages", progressTutor: "Mon évolution", profile: "Mon profil",
    teach: "Enseigner", becomeTutor: "Devenir tuteur", createTutorAccount: "Créer un compte tuteur",
    lessons: "Mes cours", tutors: "Mes tuteurs", progressStudent: "Ma progression", signIn: "Se connecter", signUp: "Créer un compte",
    proverb: "La langue, c'est l'identité. Proverbe swahili.", teachOnRiya: "Enseigner sur Riya", payTitle: "Paiement simple, selon votre pays", card: "Carte bancaire",
    ourLanguages: "Nos langues", madeWith: "Fait avec fierté pour les langues africaines, depuis le Cameroun.", photos: "Photos", top: "Haut de page",
  },
});

// The footer adapts to who is reading: no "become a tutor" for tutors, no sign-up once signed in.
function columnsFor(role: SessionUser["role"] | null, locale: Locale): Column[] {
  const t = M[locale];
  const learn: Column = {
    title: t.learn,
    links: [
      { href: "/tuteurs", label: t.findTutor },
      { href: "/langues", label: t.allLanguages },
      { href: "/#comment-ca-marche", label: t.how },
      { href: "/forum", label: t.community },
    ],
  };
  if (role === "tutor") {
    return [
      learn,
      {
        title: t.teaching,
        links: [
          { href: "/accueil", label: t.tutorHome },
          { href: "/calendrier", label: t.calendar },
          { href: "/eleves", label: t.students },
          { href: "/profil/tuteur", label: t.tutorProfile },
        ],
      },
      { title: t.account, links: [{ href: "/messages", label: t.messages }, { href: "/progression", label: t.progressTutor }, { href: "/profil", label: t.profile }] },
    ];
  }
  if (role) {
    return [
      learn,
      { title: t.teach, links: [{ href: "/devenir-tuteur", label: t.becomeTutor }] },
      { title: t.account, links: [{ href: "/tableau-de-bord", label: t.lessons }, { href: "/mes-tuteurs", label: t.tutors }, { href: "/messages", label: t.messages }, { href: "/progression", label: t.progressStudent }] },
    ];
  }
  return [
    learn,
    { title: t.teach, links: [{ href: "/devenir-tuteur", label: t.becomeTutor }, { href: "/inscription?role=tuteur", label: t.createTutorAccount }] },
    { title: t.account, links: [{ href: "/connexion", label: t.signIn }, { href: "/inscription", label: t.signUp }] },
  ];
}

export async function Footer() {
  const [languages, user, locale] = await Promise.all([listLanguages(), getCurrentUser(), getLocale()]);
  const t = M[locale];
  const columns = columnsFor(user?.role ?? null, locale);
  const payments = ["MTN Mobile Money", "Orange Money", t.card, "Apple Pay / Google Pay"];

  return (
    <footer className="mt-auto px-3 pb-3 pt-10 sm:px-4 sm:pb-4">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-earth-900 text-sand-200">
        {/* Large faint greeting in the background, like a watermark. */}
        <p aria-hidden className="pointer-events-none absolute -bottom-10 right-4 select-none font-display text-[9rem] font-semibold leading-none text-white/[0.04] sm:text-[13rem]">
          Karibu
        </p>

        <div className="relative grid gap-12 px-6 pb-10 pt-12 sm:px-10 lg:grid-cols-[1.1fr_2fr] lg:px-14 lg:pt-14">
          <div>
            <Logo light />
            <p className="mt-5 max-w-sm text-lg leading-relaxed text-sand-100">{SITE_TEXT[locale].tagline}.</p>
            <figure className="mt-6 max-w-sm border-l-2 border-ochre-400 pl-4">
              <blockquote className="font-display text-xl italic text-ochre-300">« Lugha ni utambulisho »</blockquote>
              <figcaption className="mt-1 text-xs text-sand-300">{t.proverb}</figcaption>
            </figure>
            <div className="mt-8 flex flex-wrap gap-2">
              <Link href="/tuteurs" className="btn bg-ochre-400 text-forest-900 hover:bg-ochre-300"><Search size={16} /> {t.findTutor}</Link>
              {(!user || user.role === "student") && (
                <Link href="/devenir-tuteur" className="btn border border-white/20 text-sand-50 hover:border-white/50 hover:bg-white/5"><Sparkles size={16} /> {t.teachOnRiya}</Link>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            {columns.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-ochre-300">{col.title}</h2>
                <ul className="space-y-3 text-sm">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="group inline-flex items-center gap-1 text-sand-200 transition hover:text-white">
                        {link.label}
                        <ArrowUpRight size={14} className="opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}

            <div className="col-span-2 sm:col-span-3">
              <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-ochre-300">{t.payTitle}</h2>
              <ul className="flex flex-wrap gap-2">
                {payments.map((p) => (
                  <li key={p} className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-sand-100">{p}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="relative border-t border-white/10 px-6 py-6 sm:px-10 lg:px-14">
          <h2 className="sr-only">{t.ourLanguages}</h2>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {languages.map((l) => (
              <li key={l.slug}>
                <Link href={`/langues/${l.slug}`} className="text-sand-300 transition hover:text-ochre-300">{l.name}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="kente-strip relative opacity-70" />
        <div className="relative flex flex-col items-start justify-between gap-3 px-6 py-5 text-xs text-sand-300 sm:flex-row sm:items-center sm:px-10 lg:px-14">
          <p>© {new Date().getFullYear()} {SITE.name}. {t.madeWith}</p>
          <div className="flex flex-wrap items-center gap-5">
            <LanguageSwitcher dark />
            <span>{t.photos} : <a href="https://unsplash.com" className="underline hover:text-white">Unsplash</a></span>
            <a href="#" className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 font-medium text-sand-100 hover:border-white/40">
              <ArrowUp size={14} /> {t.top}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
