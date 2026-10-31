import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/AuthForms";
import { AuthShell } from "@/components/AuthShell";
import { getCurrentUser } from "@/lib/auth";
import { first } from "@/lib/constants";
import { showGoogleButton } from "@/lib/google";

export const metadata: Metadata = { title: "Créer un compte" };

export default async function RegisterPage({ searchParams }: PageProps<"/inscription">) {
  if (await getCurrentUser()) redirect("/tableau-de-bord");
  const sp = await searchParams;
  const suite = first(sp.suite);

  return (
    <AuthShell
      title="Rejoignez Riya"
      subtitle="Gratuit et sans engagement. Vous ne payez que les cours que vous réservez."
      footer={<>Déjà inscrit ? <Link href={`/connexion${suite ? `?suite=${encodeURIComponent(suite)}` : ""}`} className="font-semibold text-clay-700 underline">Connectez-vous</Link></>}
    >
      <RegisterForm suite={suite} defaultRole={first(sp.role) === "tuteur" ? "tutor" : "student"} google={showGoogleButton()} />
    </AuthShell>
  );
}
