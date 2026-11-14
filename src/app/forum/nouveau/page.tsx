import { TopicForm } from "@/components/CommunityForms";
import { PageHeader } from "@/components/ui";
import { getLocale, titled } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { first } from "@/lib/constants";
import { listLanguages } from "@/lib/queries";

export const generateMetadata = () => titled({ en: "New discussion", fr: "Nouvelle discussion" });

export default async function NewTopicPage({ searchParams }: PageProps<"/forum/nouveau">) {
  await requireUser("/forum/nouveau");
  const languages = (await listLanguages()).map((l) => ({ slug: l.slug, name: l.name }));
  const en = (await getLocale()) === "en";

  return (
    <>
      <PageHeader eyebrow={en ? "Community" : "Communauté"} title={en ? "Start a discussion" : "Lancer une discussion"} />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="card p-6 sm:p-8">
          <TopicForm languages={languages} defaultLanguage={first((await searchParams).langue)} />
        </div>
      </div>
    </>
  );
}
