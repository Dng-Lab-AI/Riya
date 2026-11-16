import { ShieldCheck } from "lucide-react";
import { AddAdminForm, ChangePasswordForm, RemoveAdminButton } from "@/components/admin/TeamForms";
import { Avatar } from "@/components/ui";
import { defineMessages } from "@/i18n";
import { getLocale, titled } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth";
import { timeAgo } from "@/lib/constants";
import { getDb } from "@/lib/db";

const M = defineMessages({
  en: {
    title: "Team", lead: "The people who have access to this administration site.", admins: (n: number) => `Administrators (${n})`,
    you: "You", added: (ago: string) => `added ${ago}`, seen: (ago: string) => `last seen ${ago}`, never: "not seen yet",
    add: "Add an administrator", addLead: "A new account is created with the password you choose. If the e-mail already belongs to a member, that account becomes an administrator.",
    password: "My password",
  },
  fr: {
    title: "Équipe", lead: "Les personnes qui ont accès à ce site d'administration.", admins: (n: number) => `Administrateurs (${n})`,
    you: "Vous", added: (ago: string) => `ajouté ${ago}`, seen: (ago: string) => `vu ${ago}`, never: "pas encore connecté",
    add: "Ajouter un administrateur", addLead: "Un nouveau compte est créé avec le mot de passe que vous choisissez. Si l'e-mail appartient déjà à un membre, ce compte devient administrateur.",
    password: "Mon mot de passe",
  },
});

export const generateMetadata = () => titled({ en: "Team", fr: "Équipe" });

export default async function TeamPage() {
  const me = await requireAdmin();
  const locale = await getLocale();
  const t = M[locale];
  const admins = await (await getDb()).users
    .find({ role: "admin" }, { projection: { name: 1, email: 1, avatarUrl: 1, createdAt: 1, lastSeenAt: 1 } })
    .sort({ createdAt: 1 })
    .toArray();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold">{t.title}</h1>
        <p className="mt-1 text-earth-600">{t.lead}</p>
      </header>

      <section className="card p-5">
        <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-semibold"><ShieldCheck size={20} /> {t.admins(admins.length)}</h2>
        <ul className="divide-y divide-sand-200">
          {admins.map((a) => (
            <li key={a._id.toHexString()} className="flex flex-wrap items-center gap-3 py-3">
              <Avatar name={a.name} src={a.avatarUrl} size={40} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{a.name}{a._id.equals(me._id) && <span className="ml-2 chip bg-forest-100 text-forest-800">{t.you}</span>}</p>
                <p className="truncate text-sm text-earth-500">
                  {a.email} · {t.added(timeAgo(a.createdAt.toISOString(), locale))} · {a.lastSeenAt ? t.seen(timeAgo(a.lastSeenAt.toISOString(), locale)) : t.never}
                </p>
              </div>
              {!a._id.equals(me._id) && <RemoveAdminButton userId={a._id.toHexString()} name={a.name} />}
            </li>
          ))}
        </ul>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <section className="card space-y-3 p-5">
          <h2 className="font-display text-xl font-semibold">{t.add}</h2>
          <p className="text-sm text-earth-600">{t.addLead}</p>
          <AddAdminForm />
        </section>
        <section className="card space-y-3 p-5">
          <h2 className="font-display text-xl font-semibold">{t.password}</h2>
          <ChangePasswordForm />
        </section>
      </div>
    </div>
  );
}
