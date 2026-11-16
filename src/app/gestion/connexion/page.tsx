import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { AdminLoginForm } from "@/components/admin/AdminForms";
import { defineMessages } from "@/i18n";
import { getLocale, titled } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { adminOrigin } from "@/lib/site";

const M = defineMessages({
  en: { title: "Riya administration", lead: "Reserved for the Riya team. Log in with your administrator account." },
  fr: { title: "Administration Riya", lead: "Réservé à l'équipe Riya. Connectez-vous avec votre compte administrateur." },
});

export const generateMetadata = () => titled({ en: "Administration login", fr: "Connexion à l'administration" });

export default async function AdminLoginPage() {
  const user = await getCurrentUser();
  if (user?.role === "admin") redirect(`${await adminOrigin()}/`);
  const t = M[await getLocale()];
  return (
    <div className="w-full max-w-sm rounded-[1.75rem] bg-white p-8 shadow-xl">
      <p className="font-display text-3xl font-semibold">riya <span className="text-base font-normal text-clay-700">admin</span></p>
      <h1 className="mt-6 flex items-center gap-2 text-lg font-semibold"><ShieldCheck size={20} className="text-forest-700" /> {t.title}</h1>
      <p className="mb-6 mt-1 text-sm text-earth-600">{t.lead}</p>
      <AdminLoginForm />
    </div>
  );
}
