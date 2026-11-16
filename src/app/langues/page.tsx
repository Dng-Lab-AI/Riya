import Image from "next/image";
import { LanguageCard } from "@/components/cards";
import { Stagger } from "@/components/Motion";
import { PageHeader } from "@/components/ui";
import { defineMessages } from "@/i18n";
import { regionLabel } from "@/i18n/catalog";
import { getLocale, titled } from "@/i18n/server";
import { REGIONS, regionId } from "@/lib/constants";
import { PHOTOS, regionPhoto } from "@/lib/images";
import { listLanguages } from "@/lib/queries";

const M = defineMessages({
  en: {
    eyebrow: "Explore", title: "The languages you can learn", regions: "Regions",
    lead: "From the Sahel to the Indian Ocean, every language opens the door to a culture. Choose yours.",
    count: (n: number) => `${n} language${n > 1 ? "s" : ""}`,
  },
  fr: {
    eyebrow: "Explorer", title: "Les langues que vous pouvez apprendre", regions: "Régions",
    lead: "Du Sahel à l'océan Indien, chaque langue ouvre la porte d'une culture. Choisissez la vôtre.",
    count: (n: number) => `${n} langue${n > 1 ? "s" : ""}`,
  },
});

export const generateMetadata = () => titled({ en: "African languages", fr: "Langues africaines" });

export default async function LanguagesPage() {
  const [languages, locale] = await Promise.all([listLanguages(), getLocale()]);
  const t = M[locale];
  const regions = REGIONS.filter((region) => languages.some((l) => l.region === region));

  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={t.title} photo={PHOTOS.madagascar}>
        {t.lead}
      </PageHeader>

      <nav aria-label={t.regions} className="mx-auto mt-6 flex max-w-7xl flex-wrap gap-2 px-4 sm:px-6 lg:px-8">
        {regions.map((region) => (
          <a key={region} href={`#${regionId(region)}`} className="rounded-full border border-earth-900/15 bg-white px-4 py-2 text-sm font-medium text-earth-800 transition hover:bg-forest-800 hover:text-sand-50">
            {regionLabel(region, locale)}
          </a>
        ))}
      </nav>

      <div className="mx-auto max-w-7xl space-y-16 px-4 py-12 sm:px-6 lg:px-8">
        {regions.map((region) => {
          const inRegion = languages.filter((l) => l.region === region);
          const photo = regionPhoto(region);
          return (
            <section key={region} id={regionId(region)} className="scroll-mt-24">
              <div className="relative mb-6 flex h-36 items-end overflow-hidden rounded-[1.75rem] p-6 md:h-44">
                <Image src={photo.src} alt={photo.alt} fill sizes="(min-width: 1280px) 1216px, 100vw" placeholder="blur" className="object-cover" />
                <div className="photo-shade absolute inset-0" />
                <div className="relative text-sand-50">
                  <h2 className="font-display text-3xl font-semibold">{regionLabel(region, locale)}</h2>
                  <p className="text-sm text-sand-200">{t.count(inRegion.length)}</p>
                </div>
              </div>
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
