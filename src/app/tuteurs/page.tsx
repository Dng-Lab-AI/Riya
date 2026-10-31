import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { TutorCard } from "@/components/cards";
import { Stagger } from "@/components/Motion";
import { EmptyState, PageHeader } from "@/components/ui";
import { AVAILABILITY, SPECIALTIES, SITE, first } from "@/lib/constants";
import { PHOTOS } from "@/lib/images";
import { listLanguages, listTutorCountries, searchTutors } from "@/lib/queries";

export const metadata: Metadata = { title: "Trouver un tuteur" };

const PRICES = [10, 15, 20, 25];
const SORTS = [
  { value: "", label: "Mieux notés" },
  { value: "avis", label: "Plus d'avis" },
  { value: "prix-asc", label: "Prix croissant" },
  { value: "prix-desc", label: "Prix décroissant" },
];

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
  const [tutors, languages, countries] = await Promise.all([searchTutors(filters), listLanguages(), listTutorCountries()]);
  const hasFilters = Object.values(filters).some(Boolean);
  const moreFilters = [filters.pays, filters.dispo, filters.specialite, filters.tri].filter(Boolean).length;

  return (
    <>
      <PageHeader eyebrow="Tuteurs" title="Trouvez le tuteur qui vous correspond" photo={PHOTOS.marche}>
        Tous nos tuteurs sont natifs ou parlent couramment la langue qu&apos;ils enseignent, et leurs profils sont vérifiés par notre équipe.
      </PageHeader>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <form className="sticky top-20 z-30 rounded-[1.75rem] border border-earth-900/10 bg-white/95 p-3 shadow-[0_12px_30px_-18px_rgb(34_24_15/0.35)] backdrop-blur">
          <div className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_auto]">
            <label className="flex items-center gap-2 rounded-2xl bg-sand-50 px-4">
              <Search size={18} className="shrink-0 text-earth-400" />
              <span className="sr-only">Recherche</span>
              <input name="q" defaultValue={filters.q} placeholder="Nom, langue, mot-clé…" className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-earth-400" />
            </label>
            <select name="langue" aria-label="Langue" defaultValue={filters.langue} className="rounded-2xl bg-sand-50 px-4 py-3 text-sm outline-none">
              <option value="">Toutes les langues</option>
              {languages.map((l) => <option key={l.slug} value={l.slug}>{l.name}</option>)}
            </select>
            <select name="prixMax" aria-label="Prix maximum" defaultValue={filters.prixMax ?? ""} className="rounded-2xl bg-sand-50 px-4 py-3 text-sm outline-none">
              <option value="">Tous les prix</option>
              {PRICES.map((p) => <option key={p} value={p}>Jusqu&apos;à {p} {SITE.currency}</option>)}
            </select>
            <button className="btn-primary py-3">Rechercher</button>
          </div>

          <details className="group mt-1" open={moreFilters > 0}>
            <summary className="flex cursor-pointer list-none items-center gap-2 px-2 py-2 text-sm font-semibold text-earth-700 hover:text-clay-700">
              <SlidersHorizontal size={16} /> Plus de filtres{moreFilters > 0 && <span className="rounded-full bg-clay-600 px-2 text-xs text-white">{moreFilters}</span>}
              <ChevronDown size={16} className="transition group-open:rotate-180" />
              {hasFilters && <Link href="/tuteurs" className="ml-auto font-normal text-earth-500 underline">Réinitialiser</Link>}
            </summary>
            <div className="grid gap-3 px-2 pb-2 pt-1 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="label" htmlFor="pays">Le tuteur vient de</label>
                <select id="pays" name="pays" defaultValue={filters.pays} className="input">
                  <option value="">Tous les pays</option>
                  {countries.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="dispo">Disponibilité</label>
                <select id="dispo" name="dispo" defaultValue={filters.dispo} className="input">
                  <option value="">Peu importe</option>
                  {AVAILABILITY.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="specialite">Spécialité</label>
                <select id="specialite" name="specialite" defaultValue={filters.specialite} className="input">
                  <option value="">Toutes</option>
                  {SPECIALTIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="tri">Trier par</label>
                <select id="tri" name="tri" defaultValue={filters.tri} className="input">
                  {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
          </details>
        </form>

        <p className="mb-5 mt-8 text-sm text-earth-600">
          <strong className="text-earth-900">{tutors.length}</strong> tuteur{tutors.length > 1 ? "s" : ""} disponible{tutors.length > 1 ? "s" : ""}
        </p>
        {tutors.length ? (
          <Stagger className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{tutors.map((t) => <TutorCard key={t.id} tutor={t} />)}</Stagger>
        ) : (
          <EmptyState title="Aucun tuteur ne correspond à ces critères">
            Essayez d&apos;élargir votre recherche ou <Link href="/tuteurs" className="font-semibold text-clay-700 underline">réinitialisez les filtres</Link>.
          </EmptyState>
        )}
      </div>
    </>
  );
}
