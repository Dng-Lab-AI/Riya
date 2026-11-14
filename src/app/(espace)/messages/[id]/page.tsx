import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArchiveRestore, ArrowLeft, ExternalLink } from "lucide-react";
import { LocalDateTime } from "@/components/client";
import { LiveThread } from "@/components/LiveThread";
import { Avatar } from "@/components/ui";
import { toggleArchive } from "@/lib/actions/community";
import { requireUser } from "@/lib/auth";
import { getDb, toObjectId } from "@/lib/db";
import { getPairSummary } from "@/lib/inbox";
import { getThread, getUserProfile, markThreadRead } from "@/lib/queries";

export const metadata: Metadata = { title: "Conversation" };

const ROLE_LABEL: Record<string, string> = { tutor: "Tuteur", admin: "Équipe Riya", student: "Élève" };

export default async function ThreadPage({ params }: PageProps<"/messages/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/messages/${id}`);
  const other = await getUserProfile(id);
  const otherId = toObjectId(id);
  if (!other || !otherId || other.id === user.id) notFound();

  await markThreadRead(user._id, otherId);
  const [messages, summary, me] = await Promise.all([
    getThread(user._id, otherId),
    getPairSummary(user._id, otherId),
    (await getDb()).users.findOne({ _id: user._id }, { projection: { archivedChats: 1 } }),
  ]);
  const archived = !!me?.archivedChats?.some((a) => a.equals(otherId));

  return (
    <>
      <header className="flex items-center gap-3 border-b border-sand-200 px-3 py-3 sm:px-4">
        <Link href="/messages" className="btn-ghost px-2 lg:hidden" aria-label="Retour aux conversations"><ArrowLeft size={18} /></Link>
        <Avatar name={other.name} src={other.avatar_url} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{other.name}</p>
          <p className="truncate text-xs text-earth-500">
            {ROLE_LABEL[other.role] ?? "Membre"}
            {other.country && ` · ${other.country}`}
            {summary.completed > 0 && ` · ${summary.completed} cours ensemble`}
            {summary.next_at && <> · prochain cours <LocalDateTime iso={summary.next_at} /></>}
          </p>
        </div>
        {other.role === "tutor" && (
          <Link href={`/tuteurs/${other.id}`} className="btn-ghost px-2" title="Voir le profil" aria-label="Voir le profil"><ExternalLink size={18} /></Link>
        )}
        <form action={toggleArchive.bind(null, other.id)}>
          <button className="btn-ghost px-2" title={archived ? "Désarchiver" : "Archiver la conversation"} aria-label={archived ? "Désarchiver" : "Archiver la conversation"}>
            {archived ? <ArchiveRestore size={18} /> : <Archive size={18} />}
          </button>
        </form>
      </header>

      <LiveThread otherId={other.id} otherFirstName={other.name.split(" ")[0]} me={user.id} initial={messages} />
    </>
  );
}
