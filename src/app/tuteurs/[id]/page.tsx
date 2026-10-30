import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, GraduationCap, Heart, Languages, MapPin, MessageCircle, Video } from "lucide-react";
import { BookingForm } from "@/components/BookingForm";
import { Avatar, EmptyState, Rating, Stars } from "@/components/ui";
import { toggleFavorite } from "@/lib/actions/lessons";
import { getCurrentUser } from "@/lib/auth";
import { AVAILABILITY, SITE, SPECIALTIES, formatPrice, labelFor, timeAgo } from "@/lib/constants";
import { getTutor, getTutorBusySlots, getTutorReviews, isFavorite } from "@/lib/queries";

async function loadTutor(params: PageProps<"/tuteurs/[id]">["params"]) {
  return getTutor((await params).id);
}

export async function generateMetadata({ params }: PageProps<"/tuteurs/[id]">): Promise<Metadata> {
  const tutor = await loadTutor(params);
  return { title: tutor ? `${tutor.name}, tuteur de ${tutor.languages.map((l) => l.name).join(" et ")}` : "Tuteur introuvable" };
}

export default async function TutorPage({ params }: PageProps<"/tuteurs/[id]">) {
  const [tutor, user] = await Promise.all([loadTutor(params), getCurrentUser()]);
  // Profiles awaiting approval are only visible to their owner and admins.
  if (!tutor || (!tutor.approved && user?.id !== tutor.id && user?.role !== "admin")) notFound();

  const isSelf = user?.id === tutor.id;
  const [reviews, favorite, busySlots] = await Promise.all([getTutorReviews(tutor.id), user ? isFavorite(user._id, tutor.id) : false, getTutorBusySlots(tutor.id)]);

  return (
    <div className="pattern-bogolan">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_400px] lg:px-8">
        <div className="space-y-6">
          {!tutor.approved && (
            <p className="rounded-xl bg-ochre-100 px-4 py-3 text-sm font-medium text-ochre-800">
              Ce profil est en attente de validation et n&apos;apparaît pas encore dans les résultats de recherche.
            </p>
          )}

          <section className="card p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row">
              <Avatar name={tutor.name} src={tutor.avatar_url} size={128} className="rounded-3xl" />
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="flex items-center gap-2 font-display text-3xl font-semibold">
                      {tutor.name} <GraduationCap size={22} className="text-forest-600" aria-label="Tuteur vérifié" />
                    </h1>
                    <p className="mt-1 flex items-center gap-1.5 text-earth-500"><MapPin size={15} /> {tutor.country}</p>
                  </div>
                  {user && !isSelf && (
                    <form action={toggleFavorite.bind(null, tutor.id)}>
                      <button className="btn-ghost" aria-label={favorite ? "Retirer des favoris" : "Ajouter aux favoris"}>
                        <Heart size={24} className={favorite ? "fill-clay-600 text-clay-600" : ""} />
                      </button>
                    </form>
                  )}
                </div>
                <p className="mt-4 text-lg font-semibold text-earth-800">{tutor.headline || "Profil en cours de création"}</p>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-earth-600">
                  <Rating value={tutor.rating} count={tutor.review_count} />
                  <span className="flex items-center gap-1.5"><Video size={15} /> {tutor.lesson_count} cours donnés</span>
                  <span className="flex items-center gap-1.5"><Clock size={15} /> {tutor.years_experience} an{tutor.years_experience > 1 ? "s" : ""} d&apos;expérience</span>
                </div>
              </div>
            </div>
          </section>

          <section className="card p-6 sm:p-8">
            <h2 className="font-display text-xl font-semibold">À propos</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-earth-700">{tutor.about}</p>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-earth-500"><Languages size={15} /> Enseigne</h3>
                <ul className="mt-2 space-y-1">
                  {tutor.languages.map((l) => (
                    <li key={l.slug}>
                      <Link href={`/langues/${l.slug}`} className="font-semibold hover:text-clay-700">{l.name}</Link>{" "}
                      <span className="text-sm text-earth-500">({l.level === "native" ? "langue maternelle" : "courant"})</span>
                    </li>
                  ))}
                </ul>
                {tutor.speaks && <p className="mt-2 text-sm text-earth-600">Parle aussi : {tutor.speaks}</p>}
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-earth-500">Spécialités</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tutor.specialties.map((s) => <span key={s} className="chip">{labelFor(SPECIALTIES, s)}</span>)}
                </div>
                <h3 className="mt-4 text-sm font-bold uppercase tracking-wider text-earth-500">Disponibilités</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tutor.availability.map((a) => <span key={a} className="chip bg-forest-100 text-forest-800">{labelFor(AVAILABILITY, a)}</span>)}
                </div>
              </div>
            </div>
          </section>

          <section className="card p-6 sm:p-8">
            <h2 className="font-display text-xl font-semibold">Avis des élèves</h2>
            <div className="mt-4 space-y-5">
              {reviews.length ? (
                reviews.map((r) => (
                  <div key={r.id} className="flex gap-4 border-b border-sand-200 pb-5 last:border-0 last:pb-0">
                    <Avatar name={r.student_name} src={r.student_avatar} size={40} />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{r.student_name}</span>
                        <Stars value={r.rating} />
                        <span className="text-xs text-earth-500">{timeAgo(r.created_at)}</span>
                      </div>
                      {r.comment && <p className="mt-1 text-earth-700">{r.comment}</p>}
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState title="Pas encore d'avis">Réservez un premier cours et partagez votre expérience !</EmptyState>
              )}
            </div>
          </section>
        </div>

        <aside id="reserver" className="h-fit scroll-mt-24 lg:sticky lg:top-24">
          <div className="card p-6">
            <div className="flex items-baseline justify-between">
              <p className="font-display text-3xl font-semibold">{formatPrice(tutor.hourly_rate)}</p>
              <p className="text-sm text-earth-500">cours de {SITE.lessonMinutes} min</p>
            </div>
            <div className="mt-5">
              {isSelf ? (
                <div className="space-y-3 text-sm text-earth-600">
                  <p>Voici votre profil public, tel que les élèves le voient.</p>
                  <Link href="/profil" className="btn-outline w-full">Modifier mon profil</Link>
                </div>
              ) : !tutor.approved ? (
                <p className="text-sm text-earth-600">Les réservations ouvriront après validation du profil.</p>
              ) : user ? (
                <BookingForm tutorId={tutor.id} languages={tutor.languages} busySlots={busySlots} />
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-earth-600">Connectez-vous pour choisir un créneau et réserver votre cours.</p>
                  <Link href={`/connexion?suite=/tuteurs/${tutor.id}`} className="btn-primary w-full">Se connecter pour réserver</Link>
                  <Link href={`/inscription?suite=/tuteurs/${tutor.id}`} className="btn-outline w-full">Créer un compte gratuit</Link>
                </div>
              )}
            </div>
            {user && !isSelf && (
              <Link href={`/messages/${tutor.id}`} className="btn-outline mt-3 w-full"><MessageCircle size={16} /> Envoyer un message</Link>
            )}
          </div>
          <p className="mt-3 px-2 text-center text-xs text-earth-500">
            Le tuteur confirme votre demande, puis le lien de visio apparaît dans votre tableau de bord.
          </p>
        </aside>
      </div>
    </div>
  );
}
