import Link from "next/link";

export default function NotFound() {
  return (
    <div className="pattern-bogolan">
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-28 text-center">
        <p className="font-display text-7xl font-semibold text-clay-600">404</p>
        <h1 className="mt-4 font-display text-3xl font-semibold">Page introuvable</h1>
        <p className="mt-2 text-earth-600">« Haba na haba hujaza kibaba » : petit à petit, on remplit le panier… mais cette page, elle, n&apos;existe pas.</p>
        <Link href="/" className="btn-primary mt-8">Retour à l&apos;accueil</Link>
      </div>
    </div>
  );
}
