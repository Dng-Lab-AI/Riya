import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { SubmitButton } from "@/components/client";
import { ReplyForm } from "@/components/CommunityForms";
import { Avatar } from "@/components/ui";
import { defineMessages, type Locale } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { deleteReply, deleteTopic } from "@/lib/actions/community";
import { getCurrentUser } from "@/lib/auth";
import { FORUM_CATEGORIES, labelFor, timeAgo } from "@/lib/constants";
import { getReplies, getTopic, incrementTopicViews } from "@/lib/queries";

const M = defineMessages({
  en: {
    notFound: "Discussion not found", tutor: "Tutor", team: "Riya team", back: "← Back to discussions",
    views: (n: number) => `${n} view${n === 1 ? "" : "s"}`, deleteTopic: "Delete the discussion",
    replies: (n: number) => `${n} repl${n === 1 ? "y" : "ies"}`, deleteReply: "Delete the reply", login: "Log in", toJoin: "to join the discussion.",
  },
  fr: {
    notFound: "Discussion introuvable", tutor: "Tuteur", team: "Équipe Riya", back: "← Retour aux discussions",
    views: (n: number) => `${n} vues`, deleteTopic: "Supprimer la discussion",
    replies: (n: number) => `${n} réponse${n > 1 ? "s" : ""}`, deleteReply: "Supprimer la réponse", login: "Connectez-vous", toJoin: "pour participer à la discussion.",
  },
});

export async function generateMetadata({ params }: PageProps<"/forum/[id]">): Promise<Metadata> {
  const [topic, locale] = await Promise.all([getTopic((await params).id), getLocale()]);
  return { title: topic?.title ?? M[locale].notFound };
}

function RoleBadge({ role, locale }: { role: string; locale: Locale }) {
  if (role === "tutor") return <span className="chip bg-forest-100 text-forest-800">{M[locale].tutor}</span>;
  if (role === "admin") return <span className="chip bg-ochre-100 text-ochre-800">{M[locale].team}</span>;
  return null;
}

export default async function TopicPage({ params }: PageProps<"/forum/[id]">) {
  const { id } = await params;
  const topic = await getTopic(id);
  if (!topic) notFound();

  await incrementTopicViews(id);
  const [user, replies, locale] = await Promise.all([getCurrentUser(), getReplies(id), getLocale()]);
  const t = M[locale];
  const canModerate = (authorId: string) => !!user && (user.id === authorId || user.role === "admin");

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/forum" className="text-sm text-earth-600 hover:text-clay-700">{t.back}</Link>

      <article className="card p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="chip bg-forest-100 text-forest-800">{labelFor(FORUM_CATEGORIES, topic.category, locale)}</span>
          {topic.language_slug && <Link href={`/langues/${topic.language_slug}`} className="chip bg-clay-50 text-clay-800">{topic.language_name}</Link>}
        </div>
        <h1 className="mt-3 font-display text-3xl font-semibold">{topic.title}</h1>
        <div className="mt-4 flex items-center gap-3">
          <Avatar name={topic.author_name} src={topic.author_avatar} size={40} />
          <div className="text-sm">
            <p className="flex items-center gap-2 font-semibold">{topic.author_name} <RoleBadge role={topic.author_role} locale={locale} /></p>
            <p className="text-earth-500">{timeAgo(topic.created_at, locale)} · {t.views(topic.views)}</p>
          </div>
          {canModerate(topic.author_id) && (
            <form action={deleteTopic.bind(null, topic.id)} className="ml-auto">
              <SubmitButton className="btn-ghost text-clay-700" pendingText="…" aria-label={t.deleteTopic}><Trash2 size={16} /></SubmitButton>
            </form>
          )}
        </div>
        <p className="mt-6 whitespace-pre-line leading-relaxed text-earth-800">{topic.body}</p>
      </article>

      <h2 className="font-display text-xl font-semibold">{t.replies(replies.length)}</h2>
      <div className="space-y-3">
        {replies.map((r) => (
          <div key={r.id} className="card flex gap-4 p-5">
            <Avatar name={r.author_name} src={r.author_avatar} size={36} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold">{r.author_name}</span>
                <RoleBadge role={r.author_role} locale={locale} />
                <span className="text-earth-500">{timeAgo(r.created_at, locale)}</span>
              </p>
              <p className="mt-1 whitespace-pre-line text-earth-800">{r.body}</p>
            </div>
            {canModerate(r.author_id) && (
              <form action={deleteReply.bind(null, r.id)}>
                <SubmitButton className="btn-ghost text-clay-700" pendingText="…" aria-label={t.deleteReply}><Trash2 size={15} /></SubmitButton>
              </form>
            )}
          </div>
        ))}
      </div>

      <div className="card p-6">
        {user ? (
          <ReplyForm topicId={topic.id} />
        ) : (
          <p className="text-center text-earth-600">
            <Link href={`/connexion?suite=/forum/${topic.id}`} className="font-semibold text-clay-700 underline">{t.login}</Link> {t.toJoin}
          </p>
        )}
      </div>
    </div>
  );
}
