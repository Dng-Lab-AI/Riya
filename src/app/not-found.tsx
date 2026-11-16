import Link from "next/link";
import { defineMessages } from "@/i18n";
import { getLocale } from "@/i18n/server";

const M = defineMessages({
  en: {
    title: "Page not found",
    text: "“Haba na haba hujaza kibaba”: little by little, the basket fills up… but this page simply doesn't exist.",
    back: "Back to the home page",
  },
  fr: {
    title: "Page introuvable",
    text: "« Haba na haba hujaza kibaba » : petit à petit, on remplit le panier… mais cette page, elle, n'existe pas.",
    back: "Retour à l'accueil",
  },
});

export default async function NotFound() {
  const t = M[await getLocale()];
  return (
    <div className="pattern-bogolan">
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-28 text-center">
        <p className="font-display text-7xl font-semibold text-clay-600">404</p>
        <h1 className="mt-4 font-display text-3xl font-semibold">{t.title}</h1>
        <p className="mt-2 text-earth-600">{t.text}</p>
        <Link href="/" className="btn-primary mt-8">{t.back}</Link>
      </div>
    </div>
  );
}
