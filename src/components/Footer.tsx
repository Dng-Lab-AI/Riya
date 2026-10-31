import Link from "next/link";
import { SITE } from "@/lib/constants";
import { Logo } from "./ui";

const COLUMNS = [
  {
    title: "Apprendre",
    links: [
      { href: "/langues/swahili", label: "Cours de swahili" },
      { href: "/langues/wolof", label: "Cours de wolof" },
      { href: "/langues/yoruba", label: "Cours de yoruba" },
      { href: "/langues/lingala", label: "Cours de lingala" },
      { href: "/langues", label: "Toutes les langues" },
    ],
  },
  {
    title: "Riya",
    links: [
      { href: "/#comment-ca-marche", label: "Comment ça marche" },
      { href: "/devenir-tuteur", label: "Devenir tuteur" },
      { href: "/forum", label: "Communauté" },
    ],
  },
  {
    title: "Mon compte",
    links: [
      { href: "/connexion", label: "Se connecter" },
      { href: "/inscription", label: "Créer un compte" },
      { href: "/tableau-de-bord", label: "Mes cours" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-auto overflow-hidden rounded-t-[2.5rem] bg-forest-900 text-sand-200">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 border-b border-white/10 px-4 py-12 sm:px-6 md:flex-row md:items-center lg:px-8">
        <p className="font-display text-3xl font-semibold leading-tight text-sand-50 md:text-5xl">
          Prêt à dire <span className="italic text-ochre-300">Habari</span> ?
        </p>
        <Link href="/tuteurs" className="btn bg-ochre-400 px-6 py-3 text-base text-forest-900 hover:bg-ochre-300">Trouver mon tuteur</Link>
      </div>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4 lg:px-8">
        <div>
          <Logo light />
          <p className="mt-4 text-sm leading-relaxed text-sand-300">{SITE.tagline}.</p>
          <p className="mt-4 font-display text-lg italic text-ochre-300">« Lugha ni utambulisho »</p>
          <p className="text-xs text-sand-300">La langue, c&apos;est l&apos;identité. (swahili)</p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-ochre-300">{col.title}</h4>
            <ul className="space-y-2.5 text-sm">
              {col.links.map((link) => (
                <li key={link.href}><Link href={link.href} className="hover:text-white">{link.label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="kente-strip opacity-80" />
      <div className="py-6 text-center text-xs text-sand-300">
        © {new Date().getFullYear()} {SITE.name}. Fait avec fierté pour les langues africaines. Photos : <a href="https://unsplash.com" className="underline hover:text-white">Unsplash</a>.
      </div>
    </footer>
  );
}
