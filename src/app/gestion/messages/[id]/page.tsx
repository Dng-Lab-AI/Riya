import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, UserRound } from "lucide-react";
import { LiveThread } from "@/components/LiveThread";
import { Avatar } from "@/components/ui";
import { defineMessages } from "@/i18n";
import { getLocale, titled } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth";
import { toObjectId, type Role } from "@/lib/db";
import { getThread, getUserProfile, markThreadRead } from "@/lib/queries";
import { ROLE_LABELS } from "../../labels";

const M = defineMessages({
  en: { back: "Conversations", member: "Member page" },
  fr: { back: "Conversations", member: "Fiche du membre" },
});

export const generateMetadata = () => titled({ en: "Conversation", fr: "Conversation" });

export default async function AdminThreadPage({ params }: PageProps<"/gestion/messages/[id]">) {
  const admin = await requireAdmin();
  const { id } = await params;
  const other = await getUserProfile(id);
  const otherId = toObjectId(id);
  if (!other || !otherId || other.id === admin.id) notFound();

  await markThreadRead(admin._id, otherId);
  const [messages, locale] = await Promise.all([getThread(admin._id, otherId), getLocale()]);
  const t = M[locale];

  return (
    <>
      <header className="flex items-center gap-3 border-b border-sand-200 px-4 py-3">
        <Link href="/messages" className="btn-ghost px-2 lg:hidden" aria-label={t.back}><ArrowLeft size={18} /></Link>
        <Avatar name={other.name} src={other.avatar_url} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{other.name}</p>
          <p className="truncate text-xs text-earth-500">{ROLE_LABELS[locale][other.role as Role] ?? other.role} · {other.email}</p>
        </div>
        <Link href={`/utilisateurs/${other.id}`} className="btn-ghost px-2" title={t.member} aria-label={t.member}><UserRound size={18} /></Link>
      </header>
      <LiveThread otherId={other.id} otherFirstName={other.name.split(" ")[0]} me={admin.id} initial={messages} />
    </>
  );
}
