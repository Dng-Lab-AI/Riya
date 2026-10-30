import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Coins, Globe2, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { becomeTutor } from "@/lib/actions/profile";
import { withLe } from "@/lib/constants";
import { listLanguages } from "@/lib/queries";

export const metadata: Metadata = { title: "Devenir tuteur" };

const BENEFITS = [
  { icon: Coins, title: "Fixez vos tarifs", text: "Vous choisissez le prix de vos cours et le modifiez quand vous voulez." },
  { icon: CalendarClock, title: "Enseignez à votre rythme", text: "Indiquez vos disponibilités, acceptez ou refusez chaque demande." },
  { icon: Globe2, title: "Des élèves du monde entier", text: "Diaspora, voyageurs, chercheurs, familles : votre langue intéresse le monde." },
  { icon: ShieldCheck, title: "Une communauté vérifiée", text: "Chaque profil est relu par notre équipe pour garantir la qualité." },
];

const STEPS = [
  "Créez votre compte tuteur gratuitement.",
  "Complétez votre profil : langues, présentation, tarif et disponibilités.",
  "Notre équipe valide votre profil sous 48 h.",
  "Recevez vos premières demandes et donnez vos cours en visio.",
];

export default async function BecomeTutorPage() {
  const user = await getCurrentUser();
  const languages = await listLanguages();
  const cta = user?.role === "tutor" ? { href: "/profil", label: "Compléter mon profil" } : { href: "/inscription?role=tuteur", label: "Créer mon compte tuteur" };
  // Signed-in students switch their own account to a tutor account.
  const callToAction = (className: string) =>
    user?.role === "student" ? (
      <form action={becomeTutor}><button className={className}>Ouvrir mon profil de tuteur</button></form>
    ) : (
      <Link href={cta.href} className={className}>{cta.label}</Link>
    );

  return (
    <>
      <section className="pattern-kente">
        <div className="bg-forest-900/90">
          <div className="mx-auto max-w-4xl px-4 py-20 text-center text-sand-50 sm:px-6 lg:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-ochre-300">Devenir tuteur</p>
            <h1 className="mt-4 font-display text-4xl font-semibold md:text-5xl">Votre langue est un trésor. Partagez-la.</h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-sand-200">
              Enseignez {languages.slice(0, 4).map((l) => withLe(l.name)).join(", ")} ou toute autre langue africaine
              à des élèves motivés, depuis chez vous.
            </p>
            <div className="mt-8">{callToAction("btn bg-ochre-400 px-7 py-3 text-base text-forest-900 hover:bg-ochre-300")}</div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((b) => (
            <div key={b.title} className="card p-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-clay-50 text-clay-600"><b.icon size={24} /></span>
              <h2 className="mt-4 font-display text-lg font-semibold">{b.title}</h2>
              <p className="mt-2 text-sm text-earth-600">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="pattern-bogolan border-y border-sand-200">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
          <h2 className="text-center font-display text-3xl font-semibold">En quatre étapes</h2>
          <ol className="mt-10 space-y-4">
            {STEPS.map((step, i) => (
              <li key={step} className="card flex items-center gap-5 p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-clay-600 font-display text-lg font-semibold text-white">{i + 1}</span>
                <span className="font-medium">{step}</span>
              </li>
            ))}
          </ol>
          <div className="mt-10 text-center">{callToAction("btn-primary px-7 py-3 text-base")}</div>
        </div>
      </section>
    </>
  );
}
