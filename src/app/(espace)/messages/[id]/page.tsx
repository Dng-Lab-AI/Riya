import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LiveThread } from "@/components/LiveThread";
import { Avatar } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { toObjectId } from "@/lib/db";
import { getThread, getUserProfile, markThreadRead } from "@/lib/queries";

export const metadata: Metadata = { title: "Conversation" };

export default async function ThreadPage({ params }: PageProps<"/messages/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/messages/${id}`);
  const other = await getUserProfile(id);
  const otherId = toObjectId(id);
  if (!other || !otherId || other.id === user.id) notFound();

  await markThreadRead(user._id, otherId);
  const messages = await getThread(user._id, otherId);

  return (
    <div className="flex max-w-3xl flex-col">
      <div className="card flex items-center gap-3 p-4">
        <Link href="/messages" className="btn-ghost" aria-label="Retour"><ArrowLeft size={18} /></Link>
        <Avatar name={other.name} src={other.avatar_url} size={44} />
        <div>
          {other.role === "tutor" ? (
            <Link href={`/tuteurs/${other.id}`} className="font-semibold hover:text-clay-700">{other.name}</Link>
          ) : (
            <p className="font-semibold">{other.name}</p>
          )}
          <p className="text-xs text-earth-500">{other.role === "tutor" ? "Tuteur" : other.role === "admin" ? "Équipe Riya" : "Élève"}{other.country && ` · ${other.country}`}</p>
        </div>
      </div>

      <LiveThread otherId={other.id} otherFirstName={other.name.split(" ")[0]} me={user.id} initial={messages} />
    </div>
  );
}
