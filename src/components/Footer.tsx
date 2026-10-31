import Link from "next/link";
import { ArrowUp, ArrowUpRight, Search, Sparkles } from "lucide-react";
import { SITE } from "@/lib/constants";
import { listLanguages } from "@/lib/queries";
import { Logo } from "./ui";

const COLUMNS = [
  {
    title: "Apprendre",
    links: [
      { href: "/tuteurs", label: "Trouver un tuteur" },
      { href: "/langues", label: "Toutes les langues" },
      { href: "/#comment-ca-marche", label: "Comment ça marche" },
      { href: "/forum", label: "Communauté" },
    ],
  },
  {
    title: "Enseigner",
    links: [
      { href: "/devenir-tuteur", label: "Devenir tuteur" },
      { href: "/inscription?role=tuteur", label: "Créer un compte tuteur" },
      { href: "/profil/tuteur", label: "Mon profil de tuteur" },
    ],
  },
  {
    title: "Mon compte",
    links: [
      { href: "/connexion", label: "Se connecter" },
      { href: "/inscription", label: "Créer un compte" },
      { href: "/tableau-de-bord", label: "Mes cours" },
      { href: "/progression", label: "Ma progression" },
    ],
  },
];

const PAYMENTS = ["MTN Mobile Money", "Orange Money", "Carte bancaire", "Apple Pay / Google Pay"];

export async function Footer() {
  const languages = await listLanguages();

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
            <p className="mt-5 max-w-sm text-lg leading-relaxed text-sand-100">{SITE.tagline}.</p>
            <figure className="mt-6 max-w-sm border-l-2 border-ochre-400 pl-4">
              <blockquote className="font-display text-xl italic text-ochre-300">« Lugha ni utambulisho »</blockquote>
              <figcaption className="mt-1 text-xs text-sand-300">La langue, c&apos;est l&apos;identité. Proverbe swahili.</figcaption>
            </figure>
            <div className="mt-8 flex flex-wrap gap-2">
              <Link href="/tuteurs" className="btn bg-ochre-400 text-forest-900 hover:bg-ochre-300"><Search size={16} /> Trouver un tuteur</Link>
              <Link href="/devenir-tuteur" className="btn border border-white/20 text-sand-50 hover:border-white/50 hover:bg-white/5"><Sparkles size={16} /> Enseigner sur Riya</Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            {COLUMNS.map((col) => (
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
              <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-ochre-300">Paiement simple, selon votre pays</h2>
              <ul className="flex flex-wrap gap-2">
                {PAYMENTS.map((p) => (
                  <li key={p} className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-sand-100">{p}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="relative border-t border-white/10 px-6 py-6 sm:px-10 lg:px-14">
          <h2 className="sr-only">Nos langues</h2>
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
          <p>© {new Date().getFullYear()} {SITE.name}. Fait avec fierté pour les langues africaines, depuis le Cameroun.</p>
          <div className="flex items-center gap-5">
            <span>Photos : <a href="https://unsplash.com" className="underline hover:text-white">Unsplash</a></span>
            <a href="#" className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 font-medium text-sand-100 hover:border-white/40">
              <ArrowUp size={14} /> Haut de page
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
