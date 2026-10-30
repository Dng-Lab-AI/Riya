import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/AuthForms";
import { AuthShell } from "@/components/AuthShell";
import { getCurrentUser } from "@/lib/auth";
import { first } from "@/lib/constants";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: PageProps<"/connexion">) {
  if (await getCurrentUser()) redirect("/tableau-de-bord");
  const suite = first((await searchParams).suite);

  return (
    <AuthShell
      title="Bon retour parmi nous"
      subtitle="Connectez-vous pour retrouver vos cours et vos messages."
      footer={<>Pas encore de compte ? <Link href={`/inscription${suite ? `?suite=${encodeURIComponent(suite)}` : ""}`} className="font-semibold text-clay-700 underline">Inscrivez-vous</Link></>}
    >
      <LoginForm suite={suite} />
    </AuthShell>
  );
}
