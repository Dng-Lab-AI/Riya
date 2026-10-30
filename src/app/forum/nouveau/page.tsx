import type { Metadata } from "next";
import { TopicForm } from "@/components/CommunityForms";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { first } from "@/lib/constants";
import { listLanguages } from "@/lib/queries";

export const metadata: Metadata = { title: "Nouvelle discussion" };

export default async function NewTopicPage({ searchParams }: PageProps<"/forum/nouveau">) {
  await requireUser("/forum/nouveau");
  const languages = (await listLanguages()).map((l) => ({ slug: l.slug, name: l.name }));

  return (
    <>
      <PageHeader eyebrow="Communauté" title="Lancer une discussion" />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="card p-6 sm:p-8">
          <TopicForm languages={languages} defaultLanguage={first((await searchParams).langue)} />
        </div>
      </div>
    </>
  );
}
