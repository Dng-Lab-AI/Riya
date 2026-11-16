import Link from "next/link";
import { Eye, MessageSquare } from "lucide-react";
import { Avatar, EmptyState, PageHeader } from "@/components/ui";
import { defineMessages } from "@/i18n";
import { getLocale, titled } from "@/i18n/server";
import { FORUM_CATEGORIES, choicesFor, first, labelFor, timeAgo } from "@/lib/constants";
import { countTopicsByCategory, listLanguages, listTopics } from "@/lib/queries";

const M = defineMessages({
  en: {
    eyebrow: "Community", title: "The palaver tree", lead: "Ask your questions, share your resources and find language-exchange partners.",
    newTopic: "New discussion", categories: "Categories", all: "All discussions", language: "Language", allLanguages: "All",
    by: "by", tutor: " · Tutor", empty: "No discussions here yet", first: "Start the first one!",
  },
  fr: {
    eyebrow: "Communauté", title: "L'arbre à palabres", lead: "Posez vos questions, partagez vos ressources et trouvez des partenaires d'échange linguistique.",
    newTopic: "Nouvelle discussion", categories: "Catégories", all: "Toutes les discussions", language: "Langue", allLanguages: "Toutes",
    by: "par", tutor: " · Tuteur", empty: "Aucune discussion ici pour le moment", first: "Lancez la première !",
  },
});

export const generateMetadata = () => titled({ en: "Community", fr: "Communauté" });

export default async function ForumPage({ searchParams }: PageProps<"/forum">) {
  const sp = await searchParams;
  const categorie = first(sp.categorie);
  const langue = first(sp.langue);
  const [topics, counts, languages, locale] = await Promise.all([listTopics({ categorie, langue }), countTopicsByCategory(), listLanguages(), getLocale()]);
  const t = M[locale];
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const href = (params: Record<string, string>) => {
    const query = new URLSearchParams(Object.entries({ categorie, langue, ...params }).filter(([, v]) => v)).toString();
    return `/forum${query ? `?${query}` : ""}`;
  };

  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={t.title}>
        {t.lead}
      </PageHeader>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[260px_1fr] lg:px-8">
        <aside className="space-y-6">
          <Link href={`/forum/nouveau${langue ? `?langue=${langue}` : ""}`} className="btn-primary w-full">{t.newTopic}</Link>
          <nav>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-earth-500">{t.categories}</h2>
            <ul className="space-y-1">
              {[{ value: "", label: t.all }, ...choicesFor(FORUM_CATEGORIES, locale)].map((c) => {
                const active = categorie === c.value;
                return (
                  <li key={c.value}>
                    <Link href={href({ categorie: c.value })} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${active ? "bg-clay-50 font-semibold text-clay-800" : "text-earth-700 hover:bg-sand-100"}`}>
                      {c.label}
                      <span className="rounded-full bg-white px-2 text-xs text-earth-500">{c.value ? (counts[c.value] ?? 0) : total}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <form>
            {categorie && <input type="hidden" name="categorie" value={categorie} />}
            <label htmlFor="langue" className="mb-2 block text-xs font-bold uppercase tracking-[0.15em] text-earth-500">{t.language}</label>
            <div className="flex gap-2">
              <select id="langue" name="langue" defaultValue={langue} className="input">
                <option value="">{t.allLanguages}</option>
                {languages.map((l) => <option key={l.slug} value={l.slug}>{l.name}</option>)}
              </select>
              <button className="btn-outline">OK</button>
            </div>
          </form>
        </aside>

        <div className="space-y-3">
          {topics.length ? (
            topics.map((topic) => (
              <Link key={topic.id} href={`/forum/${topic.id}`} className="card group flex gap-4 p-5 transition hover:shadow-md">
                <Avatar name={topic.author_name} src={topic.author_avatar} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="chip bg-forest-100 text-forest-800">{labelFor(FORUM_CATEGORIES, topic.category, locale)}</span>
                    {topic.language_name && <span className="chip bg-clay-50 text-clay-800">{topic.language_name}</span>}
                    <span className="text-earth-500">{timeAgo(topic.created_at, locale)}</span>
                  </div>
                  <h3 className="mt-2 font-display text-lg font-semibold group-hover:text-clay-700">{topic.title}</h3>
                  <p className="mt-1 text-sm text-earth-500">{t.by} <span className="font-medium text-earth-800">{topic.author_name}</span>{topic.author_role === "tutor" && t.tutor}</p>
                </div>
                <div className="hidden shrink-0 gap-5 text-center text-sm text-earth-500 sm:flex">
                  <div><MessageSquare size={16} className="mx-auto" /><span className="font-semibold text-earth-900">{topic.reply_count}</span></div>
                  <div><Eye size={16} className="mx-auto" /><span className="font-semibold text-earth-900">{topic.views}</span></div>
                </div>
              </Link>
            ))
          ) : (
            <EmptyState title={t.empty}>{t.first}</EmptyState>
          )}
        </div>
      </div>
    </>
  );
}
