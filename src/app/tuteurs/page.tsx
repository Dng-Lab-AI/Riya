import Link from "next/link";
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { TutorCard } from "@/components/cards";
import { Stagger } from "@/components/Motion";
import { EmptyState, PageHeader } from "@/components/ui";
import { defineMessages } from "@/i18n";
import { countryName } from "@/i18n/catalog";
import { getLocale, titled } from "@/i18n/server";
import { AVAILABILITY, SPECIALTIES, choicesFor, first, formatPrice } from "@/lib/constants";
import { PHOTOS } from "@/lib/images";
import { listLanguages, listTutorCountries, searchTutors } from "@/lib/queries";

const PRICES = [10, 15, 20, 25];

const M = defineMessages({
  en: {
    sorts: ["Best rated", "Most reviews", "Price: low to high", "Price: high to low"],
    eyebrow: "Tutors", title: "Find the tutor who's right for you",
    lead: "All our tutors are native or fluent speakers of the language they teach, and their profiles are checked by our team.",
    search: "Search", placeholder: "Name, language, keyword…", language: "Language", allLanguages: "All languages",
    maxPrice: "Maximum price", allPrices: "All prices", upTo: (price: string) => `Up to ${price}`, submit: "Search",
    more: "More filters", reset: "Reset", from: "The tutor comes from", allCountries: "All countries", availability: "Availability",
    any: "Any time", specialty: "Specialty", all: "All", sort: "Sort by",
    count: (n: number) => `tutor${n > 1 ? "s" : ""} available`, empty: "No tutor matches these criteria",
    widen: "Try widening your search or", resetFilters: "reset the filters",
  },
  fr: {
    sorts: ["Mieux notés", "Plus d'avis", "Prix croissant", "Prix décroissant"],
    eyebrow: "Tuteurs", title: "Trouvez le tuteur qui vous correspond",
    lead: "Tous nos tuteurs sont natifs ou parlent couramment la langue qu'ils enseignent, et leurs profils sont vérifiés par notre équipe.",
    search: "Recherche", placeholder: "Nom, langue, mot-clé…", language: "Langue", allLanguages: "Toutes les langues",
    maxPrice: "Prix maximum", allPrices: "Tous les prix", upTo: (price: string) => `Jusqu'à ${price}`, submit: "Rechercher",
    more: "Plus de filtres", reset: "Réinitialiser", from: "Le tuteur vient de", allCountries: "Tous les pays", availability: "Disponibilité",
    any: "Peu importe", specialty: "Spécialité", all: "Toutes", sort: "Trier par",
    count: (n: number) => `tuteur${n > 1 ? "s" : ""} disponible${n > 1 ? "s" : ""}`, empty: "Aucun tuteur ne correspond à ces critères",
    widen: "Essayez d'élargir votre recherche ou", resetFilters: "réinitialisez les filtres",
  },
});

const SORT_VALUES = ["", "avis", "prix-asc", "prix-desc"];

export const generateMetadata = () => titled({ en: "Find a tutor", fr: "Trouver un tuteur" });

export default async function TutorsPage({ searchParams }: PageProps<"/tuteurs">) {
  const sp = await searchParams;
  const filters = {
    q: first(sp.q),
    langue: first(sp.langue),
    prixMax: Number(first(sp.prixMax)) || undefined,
    pays: first(sp.pays),
    dispo: first(sp.dispo),
    specialite: first(sp.specialite),
    tri: first(sp.tri),
  };
  const [tutors, languages, countries, locale] = await Promise.all([searchTutors(filters), listLanguages(), listTutorCountries(), getLocale()]);
  const t = M[locale];
  const hasFilters = Object.values(filters).some(Boolean);
  const moreFilters = [filters.pays, filters.dispo, filters.specialite, filters.tri].filter(Boolean).length;

  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={t.title} photo={PHOTOS.marche}>
        {t.lead}
      </PageHeader>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <form className="sticky top-20 z-30 rounded-[1.75rem] border border-earth-900/10 bg-white/95 p-3 shadow-[0_12px_30px_-18px_rgb(34_24_15/0.35)] backdrop-blur">
          <div className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_auto]">
            <label className="flex items-center gap-2 rounded-2xl bg-sand-50 px-4">
              <Search size={18} className="shrink-0 text-earth-400" />
              <span className="sr-only">{t.search}</span>
              <input name="q" defaultValue={filters.q} placeholder={t.placeholder} className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-earth-400" />
            </label>
            <select name="langue" aria-label={t.language} defaultValue={filters.langue} className="rounded-2xl bg-sand-50 px-4 py-3 text-sm outline-none">
              <option value="">{t.allLanguages}</option>
              {languages.map((l) => <option key={l.slug} value={l.slug}>{l.name}</option>)}
            </select>
            <select name="prixMax" aria-label={t.maxPrice} defaultValue={filters.prixMax ?? ""} className="rounded-2xl bg-sand-50 px-4 py-3 text-sm outline-none">
              <option value="">{t.allPrices}</option>
              {PRICES.map((p) => <option key={p} value={p}>{t.upTo(formatPrice(p, locale))}</option>)}
            </select>
            <button className="btn-primary py-3">{t.submit}</button>
          </div>

          <details className="group mt-1" open={moreFilters > 0}>
            <summary className="flex cursor-pointer list-none items-center gap-2 px-2 py-2 text-sm font-semibold text-earth-700 hover:text-clay-700">
              <SlidersHorizontal size={16} /> {t.more}{moreFilters > 0 && <span className="rounded-full bg-clay-600 px-2 text-xs text-white">{moreFilters}</span>}
              <ChevronDown size={16} className="transition group-open:rotate-180" />
              {hasFilters && <Link href="/tuteurs" className="ml-auto font-normal text-earth-500 underline">{t.reset}</Link>}
            </summary>
            <div className="grid gap-3 px-2 pb-2 pt-1 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="label" htmlFor="pays">{t.from}</label>
                <select id="pays" name="pays" defaultValue={filters.pays} className="input">
                  <option value="">{t.allCountries}</option>
                  {countries.map((c) => <option key={c} value={c}>{countryName(c, locale)}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="dispo">{t.availability}</label>
                <select id="dispo" name="dispo" defaultValue={filters.dispo} className="input">
                  <option value="">{t.any}</option>
                  {choicesFor(AVAILABILITY, locale).map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="specialite">{t.specialty}</label>
                <select id="specialite" name="specialite" defaultValue={filters.specialite} className="input">
                  <option value="">{t.all}</option>
                  {choicesFor(SPECIALTIES, locale).map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="tri">{t.sort}</label>
                <select id="tri" name="tri" defaultValue={filters.tri} className="input">
                  {SORT_VALUES.map((value, i) => <option key={value} value={value}>{t.sorts[i]}</option>)}
                </select>
              </div>
            </div>
          </details>
        </form>

        <p className="mb-5 mt-8 text-sm text-earth-600">
          <strong className="text-earth-900">{tutors.length}</strong> {t.count(tutors.length)}
        </p>
        {tutors.length ? (
          <Stagger className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{tutors.map((tutor) => <TutorCard key={tutor.id} tutor={tutor} />)}</Stagger>
        ) : (
          <EmptyState title={t.empty}>
            {t.widen} <Link href="/tuteurs" className="font-semibold text-clay-700 underline">{t.resetFilters}</Link>.
          </EmptyState>
        )}
      </div>
    </>
  );
}
