import Link from "next/link";
import { CalendarClock, Coins, Globe2, ShieldCheck } from "lucide-react";
import { defineMessages } from "@/i18n";
import { getLocale, titled } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { becomeTutor } from "@/lib/actions/profile";
import { withLe } from "@/lib/constants";
import { listLanguages } from "@/lib/queries";

const ICONS = [Coins, CalendarClock, Globe2, ShieldCheck];

const M = defineMessages({
  en: {
    benefits: [
      { title: "Set your own prices", text: "You choose the price of your lessons and change it whenever you like." },
      { title: "Teach at your own pace", text: "Share your availability, then accept or decline each request." },
      { title: "Students from all over the world", text: "Diaspora, travellers, researchers, families: the world is curious about your language." },
      { title: "A verified community", text: "Every profile is reviewed by our team to guarantee quality." },
    ],
    steps: [
      "Create your tutor account for free.",
      "Complete your profile: languages, introduction, price and availability.",
      "Our team approves your profile within 48 hours.",
      "Receive your first requests and teach your lessons by video.",
    ],
    completeProfile: "Complete my profile", createAccount: "Create my tutor account", openProfile: "Open my tutor profile",
    eyebrow: "Become a tutor", title: "Your language is a treasure. Share it.",
    lead: (names: string) => `Teach ${names} or any other African language to motivated students, from home.`,
    fourSteps: "In four steps",
  },
  fr: {
    benefits: [
      { title: "Fixez vos tarifs", text: "Vous choisissez le prix de vos cours et le modifiez quand vous voulez." },
      { title: "Enseignez à votre rythme", text: "Indiquez vos disponibilités, acceptez ou refusez chaque demande." },
      { title: "Des élèves du monde entier", text: "Diaspora, voyageurs, chercheurs, familles : votre langue intéresse le monde." },
      { title: "Une communauté vérifiée", text: "Chaque profil est relu par notre équipe pour garantir la qualité." },
    ],
    steps: [
      "Créez votre compte tuteur gratuitement.",
      "Complétez votre profil : langues, présentation, tarif et disponibilités.",
      "Notre équipe valide votre profil sous 48 h.",
      "Recevez vos premières demandes et donnez vos cours en visio.",
    ],
    completeProfile: "Compléter mon profil", createAccount: "Créer mon compte tuteur", openProfile: "Ouvrir mon profil de tuteur",
    eyebrow: "Devenir tuteur", title: "Votre langue est un trésor. Partagez-la.",
    lead: (names: string) => `Enseignez ${names} ou toute autre langue africaine à des élèves motivés, depuis chez vous.`,
    fourSteps: "En quatre étapes",
  },
});

export const generateMetadata = () => titled({ en: "Become a tutor", fr: "Devenir tuteur" });

export default async function BecomeTutorPage() {
  const [user, languages, locale] = await Promise.all([getCurrentUser(), listLanguages(), getLocale()]);
  const t = M[locale];
  const cta = user?.role === "tutor" ? { href: "/profil/tuteur", label: t.completeProfile } : { href: "/inscription?role=tuteur", label: t.createAccount };
  // Signed-in students switch their own account to a tutor account.
  const callToAction = (className: string) =>
    user?.role === "student" ? (
      <form action={becomeTutor}><button className={className}>{t.openProfile}</button></form>
    ) : (
      <Link href={cta.href} className={className}>{cta.label}</Link>
    );
  const names = languages.slice(0, 4).map((l) => (locale === "en" ? l.name : withLe(l.name))).join(", ");

  return (
    <>
      <section className="pattern-kente">
        <div className="bg-forest-900/90">
          <div className="mx-auto max-w-4xl px-4 py-20 text-center text-sand-50 sm:px-6 lg:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-ochre-300">{t.eyebrow}</p>
            <h1 className="mt-4 font-display text-4xl font-semibold md:text-5xl">{t.title}</h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-sand-200">{t.lead(names)}</p>
            <div className="mt-8">{callToAction("btn bg-ochre-400 px-7 py-3 text-base text-forest-900 hover:bg-ochre-300")}</div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {t.benefits.map((b, i) => {
            const Icon = ICONS[i];
            return (
              <div key={b.title} className="card p-6">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-clay-50 text-clay-600"><Icon size={24} /></span>
                <h2 className="mt-4 font-display text-lg font-semibold">{b.title}</h2>
                <p className="mt-2 text-sm text-earth-600">{b.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="pattern-bogolan border-y border-sand-200">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
          <h2 className="text-center font-display text-3xl font-semibold">{t.fourSteps}</h2>
          <ol className="mt-10 space-y-4">
            {t.steps.map((step, i) => (
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
