import type { Metadata } from "next";
import { LanguageCard } from "@/components/cards";
import { Stagger } from "@/components/Motion";
import { PageHeader } from "@/components/ui";
import { REGIONS } from "@/lib/constants";
import { listLanguages } from "@/lib/queries";

export const metadata: Metadata = { title: "Langues africaines" };

export default async function LanguagesPage() {
  const languages = await listLanguages();

  return (
    <>
      <PageHeader eyebrow="Explorer" title="Les langues que vous pouvez apprendre">
        Du Sahel à l&apos;océan Indien, chaque langue ouvre la porte d&apos;une culture. Choisissez la vôtre.
      </PageHeader>
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-12 sm:px-6 lg:px-8">
        {REGIONS.map((region) => {
          const inRegion = languages.filter((l) => l.region === region);
          if (inRegion.length === 0) return null;
          return (
            <section key={region}>
              <h2 className="mb-5 font-display text-2xl font-semibold">{region}</h2>
              <Stagger className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {inRegion.map((l) => <LanguageCard key={l.slug} language={l} />)}
              </Stagger>
            </section>
          );
        })}
      </div>
    </>
  );
}
