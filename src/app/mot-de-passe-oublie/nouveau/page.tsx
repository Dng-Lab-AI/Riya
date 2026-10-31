import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/AuthForms";
import { AuthShell } from "@/components/AuthShell";
import { first } from "@/lib/constants";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

export default async function NewPasswordPage({ searchParams }: PageProps<"/mot-de-passe-oublie/nouveau">) {
  const token = first((await searchParams).token) ?? "";
  return (
    <AuthShell
      title="Choisissez un nouveau mot de passe"
      subtitle="Vous serez connecté juste après, et déconnecté de vos autres appareils."
      footer={<Link href="/mot-de-passe-oublie" className="font-semibold text-clay-700 underline">Demander un nouveau lien</Link>}
    >
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
