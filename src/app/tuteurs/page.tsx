import type { Metadata } from "next";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { TutorCard } from "@/components/cards";
import { Stagger } from "@/components/Motion";
import { EmptyState, PageHeader } from "@/components/ui";
import { AVAILABILITY, SPECIALTIES, SITE, first } from "@/lib/constants";
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

  return (
    <>
      <PageHeader eyebrow="Tuteurs" title="Trouvez le tuteur qui vous correspond">
        Tous nos tuteurs sont natifs ou parlent couramment la langue qu&apos;ils enseignent, et leurs profils sont vérifiés par notre équipe.
      </PageHeader>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <form className="card h-fit space-y-5 p-5 lg:sticky lg:top-24">
          <p className="flex items-center gap-2 font-semibold"><SlidersHorizontal size={18} /> Filtres</p>
          <div>
            <label className="label" htmlFor="q">Recherche</label>
            <input id="q" name="q" defaultValue={filters.q} placeholder="Nom, langue, mot-clé…" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="langue">Langue</label>
            <select id="langue" name="langue" defaultValue={filters.langue} className="input">
              <option value="">Toutes les langues</option>
              {languages.map((l) => <option key={l.slug} value={l.slug}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="prixMax">Prix maximum</label>
            <select id="prixMax" name="prixMax" defaultValue={filters.prixMax ?? ""} className="input">
              <option value="">Tous les prix</option>
              {PRICES.map((p) => <option key={p} value={p}>Jusqu&apos;à {p} {SITE.currency}</option>)}
            </select>
          </div>
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
          <button className="btn-primary w-full">Appliquer</button>
          {hasFilters && <Link href="/tuteurs" className="block text-center text-sm text-earth-600 underline">Réinitialiser</Link>}
        </form>

        <div>
          <p className="mb-4 text-sm text-earth-600">
            <strong className="text-earth-900">{tutors.length}</strong> tuteur{tutors.length > 1 ? "s" : ""} disponible{tutors.length > 1 ? "s" : ""}
          </p>
          <div className="space-y-4">
            {tutors.length ? (
              <Stagger className="space-y-4">{tutors.map((t) => <TutorCard key={t.id} tutor={t} />)}</Stagger>
            ) : (
              <EmptyState title="Aucun tuteur ne correspond à ces critères">
                Essayez d&apos;élargir votre recherche ou <Link href="/tuteurs" className="font-semibold text-clay-700 underline">réinitialisez les filtres</Link>.
              </EmptyState>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
