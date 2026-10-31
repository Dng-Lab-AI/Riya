import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/AuthForms";
import { AuthShell } from "@/components/AuthShell";
import { getCurrentUser } from "@/lib/auth";
import { first } from "@/lib/constants";
import { showGoogleButton } from "@/lib/google";

export const metadata: Metadata = { title: "Connexion" };

const ERRORS: Record<string, string> = {
  "google-indisponible": "La connexion avec Google n'est pas encore configurée sur ce site (GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET).",
  "google-annule": "La connexion avec Google a été annulée. Réessayez.",
  "google-email": "Votre compte Google n'a pas d'adresse e-mail vérifiée.",
  google: "La connexion avec Google a échoué. Réessayez dans un instant.",
  suspendu: "Ce compte a été suspendu. Contactez l'équipe Riya.",
};

export default async function LoginPage({ searchParams }: PageProps<"/connexion">) {
  if (await getCurrentUser()) redirect("/tableau-de-bord");
  const sp = await searchParams;
  const suite = first(sp.suite);
  const error = ERRORS[first(sp.erreur) ?? ""];

  return (
    <AuthShell
      title="Bon retour parmi nous"
      subtitle="Connectez-vous pour retrouver vos cours et vos messages."
      footer={<>Pas encore de compte ? <Link href={`/inscription${suite ? `?suite=${encodeURIComponent(suite)}` : ""}`} className="font-semibold text-clay-700 underline">Inscrivez-vous</Link></>}
    >
      {error && <p role="alert" className="mb-5 rounded-xl bg-clay-50 px-4 py-3 text-sm font-medium text-clay-800">{error}</p>}
      <LoginForm suite={suite} google={showGoogleButton()} />
    </AuthShell>
  );
}
