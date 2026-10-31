import type { Metadata } from "next";
import Link from "next/link";
import { EnableNotifications } from "@/components/EnableNotifications";
import { Avatar, EmptyState, EspaceHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { timeAgo } from "@/lib/constants";
import { getConversations } from "@/lib/queries";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const user = await requireUser("/messages");
  const conversations = await getConversations(user._id);

  return (
    <>
      <EspaceHeader title="Messages">Vos conversations avec les tuteurs et les élèves.</EspaceHeader>
      <div className="max-w-3xl">
        {conversations.length > 0 && <EnableNotifications />}
        {conversations.length ? (
          <ul className="card divide-y divide-sand-200 overflow-hidden">
            {conversations.map((c) => (
              <li key={c.other_id}>
                <Link href={`/messages/${c.other_id}`} className="flex items-center gap-4 p-4 hover:bg-sand-50">
                  <Avatar name={c.other_name} src={c.other_avatar} size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={`truncate ${c.unread ? "font-bold" : "font-semibold"}`}>{c.other_name}</span>
                      <span className="shrink-0 text-xs text-earth-500">{timeAgo(c.last_at)}</span>
                    </div>
                    <p className={`truncate text-sm ${c.unread ? "font-semibold text-earth-900" : "text-earth-600"}`}>{c.last_body}</p>
                  </div>
                  {c.unread > 0 && <span className="rounded-full bg-clay-600 px-2 py-0.5 text-xs font-bold text-white">{c.unread}</span>}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Aucune conversation pour l'instant">
            Contactez un tuteur depuis son profil pour poser vos questions avant de réserver.
            <div className="mt-4"><Link href="/tuteurs" className="btn-primary">Parcourir les tuteurs</Link></div>
          </EmptyState>
        )}
      </div>
    </>
  );
}
