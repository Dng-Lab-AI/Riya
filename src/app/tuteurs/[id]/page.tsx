import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, GraduationCap, Heart, Languages, MapPin, MessageCircle, Video } from "lucide-react";
import { BookingForm } from "@/components/BookingForm";
import { ReportButton } from "@/components/ReportButton";
import { Avatar, EmptyState, Rating, Stars } from "@/components/ui";
import { defineMessages } from "@/i18n";
import { countryName } from "@/i18n/catalog";
import { getLocale } from "@/i18n/server";
import { toggleFavorite } from "@/lib/actions/lessons";
import { getCurrentUser } from "@/lib/auth";
import { AVAILABILITY, SITE, SPECIALTIES, formatPrice, labelFor, timeAgo } from "@/lib/constants";
import { fxRates, quoteLesson } from "@/lib/payments";
import { LAUNCH_COUNTRY, findCountry, formatMoney, isKnownCountry } from "@/lib/payments/countries";
import { getTutor, getTutorBookableSlots, getTutorReviews, isFavorite } from "@/lib/queries";
import { hasShownInterest } from "@/lib/notifications";
import { toObjectId } from "@/lib/db";
import { InterestButton } from "@/components/InterestButton";
import { TutorVideoPlayer } from "@/components/TutorVideoPlayer";
import { ProfileViewTracker } from "@/components/ProfileViewTracker";

const M = defineMessages({
  en: {
    metaTitle: (name: string, languages: string[]) => `${name}, ${languages.join(" and ")} tutor`, notFound: "Tutor not found",
    pending: "This profile is waiting for approval and doesn't appear in search results yet.", verified: "Verified tutor",
    unfavorite: "Remove from favourites", favorite: "Add to favourites", inProgress: "Profile being created",
    lessons: (n: number) => `${n} lesson${n === 1 ? "" : "s"} taught`, years: (n: number) => `${n} year${n > 1 ? "s" : ""} of experience`,
    about: "About", teaches: "Teaches", native: "native language", fluent: "fluent", alsoSpeaks: "Also speaks:", specialties: "Specialties",
    availability: "Availability", reviews: "Student reviews", noReviews: "No reviews yet", noReviewsText: "Book a first lesson and share your experience!",
    about_: (price: string) => `about ${price}`, lessonOf: (n: number) => `${n}-min lesson`, self: "This is your public profile, as students see it.",
    edit: "Edit my profile", afterApproval: "Bookings will open once the profile is approved.",
    loginToBook: "Log in to choose a time slot and book your lesson.", login: "Log in to book", signUp: "Create a free account",
    message: "Send a message", videoTitle: (name: string) => `${name}'s presentation video`,
    footer: "You pay online when booking (mobile money or card depending on your country). The tutor confirms, then the video link appears on your dashboard.",
  },
  fr: {
    metaTitle: (name: string, languages: string[]) => `${name}, tuteur de ${languages.join(" et ")}`, notFound: "Tuteur introuvable",
    pending: "Ce profil est en attente de validation et n'apparaît pas encore dans les résultats de recherche.", verified: "Tuteur vérifié",
    unfavorite: "Retirer des favoris", favorite: "Ajouter aux favoris", inProgress: "Profil en cours de création",
    lessons: (n: number) => `${n} cours donnés`, years: (n: number) => `${n} an${n > 1 ? "s" : ""} d'expérience`,
    about: "À propos", teaches: "Enseigne", native: "langue maternelle", fluent: "courant", alsoSpeaks: "Parle aussi :", specialties: "Spécialités",
    availability: "Disponibilités", reviews: "Avis des élèves", noReviews: "Pas encore d'avis", noReviewsText: "Réservez un premier cours et partagez votre expérience !",
    about_: (price: string) => `soit ${price}`, lessonOf: (n: number) => `cours de ${n} min`, self: "Voici votre profil public, tel que les élèves le voient.",
    edit: "Modifier mon profil", afterApproval: "Les réservations ouvriront après validation du profil.",
    loginToBook: "Connectez-vous pour choisir un créneau et réserver votre cours.", login: "Se connecter pour réserver", signUp: "Créer un compte gratuit",
    message: "Envoyer un message", videoTitle: (name: string) => `Vidéo de présentation de ${name}`,
    footer: "Vous payez en ligne en réservant (mobile money ou carte selon votre pays). Le tuteur confirme, puis le lien de visio apparaît dans votre tableau de bord.",
  },
});

async function loadTutor(params: PageProps<"/tuteurs/[id]">["params"]) {
  return getTutor((await params).id);
}

export async function generateMetadata({ params }: PageProps<"/tuteurs/[id]">): Promise<Metadata> {
  const [tutor, locale] = await Promise.all([loadTutor(params), getLocale()]);
  const t = M[locale];
  return { title: tutor ? t.metaTitle(tutor.name, tutor.languages.map((l) => l.name)) : t.notFound };
}

export default async function TutorPage({ params }: PageProps<"/tuteurs/[id]">) {
  const [tutor, user, locale] = await Promise.all([loadTutor(params), getCurrentUser(), getLocale()]);
  // Profiles awaiting approval are only visible to their owner and admins.
  if (!tutor || (!tutor.approved && user?.id !== tutor.id && user?.role !== "admin")) notFound();
  const t = M[locale];

  const isSelf = user?.id === tutor.id;
  // Price shown in the visitor's currency; visitors who are not signed in see the launch country's.
  const known = findCountry(user?.country).name;
  const payCountry = isKnownCountry(known) ? known : LAUNCH_COUNTRY;
  const localPrice = quoteLesson(payCountry, tutor.hourly_rate);
  const [reviews, favorite, slots] = await Promise.all([getTutorReviews(tutor.id), user ? isFavorite(user._id, tutor.id) : false, getTutorBookableSlots(tutor.id)]);
  // Students can tell the tutor they are interested, so the tutor can reach out first.
  const canShowInterest = !!user && user.role !== "admin" && !isSelf && tutor.approved;
  const interested = canShowInterest ? await hasShownInterest(user._id, toObjectId(tutor.id)!) : false;

  return (
    <div className="pattern-bogolan">
      {!isSelf && tutor.approved && <ProfileViewTracker tutorId={tutor.id} />}
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_400px] lg:px-8">
        <div className="space-y-6">
          {!tutor.approved && (
            <p className="rounded-xl bg-ochre-100 px-4 py-3 text-sm font-medium text-ochre-800">{t.pending}</p>
          )}

          <section className="card p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row">
              <Avatar name={tutor.name} src={tutor.avatar_url} size={128} className="rounded-3xl" />
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="flex items-center gap-2 font-display text-3xl font-semibold">
                      {tutor.name} <GraduationCap size={22} className="text-forest-600" aria-label={t.verified} />
                    </h1>
                    <p className="mt-1 flex items-center gap-1.5 text-earth-500"><MapPin size={15} /> {countryName(tutor.country, locale)}</p>
                  </div>
                  {user && !isSelf && (
                    <form action={toggleFavorite.bind(null, tutor.id)}>
                      <button className="btn-ghost" aria-label={favorite ? t.unfavorite : t.favorite}>
                        <Heart size={24} className={favorite ? "fill-clay-600 text-clay-600" : ""} />
                      </button>
                    </form>
                  )}
                </div>
                <p className="mt-4 text-lg font-semibold text-earth-800">{tutor.headline || t.inProgress}</p>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-earth-600">
                  <Rating value={tutor.rating} count={tutor.review_count} />
                  <span className="flex items-center gap-1.5"><Video size={15} /> {t.lessons(tutor.lesson_count)}</span>
                  <span className="flex items-center gap-1.5"><Clock size={15} /> {t.years(tutor.years_experience)}</span>
                </div>
              </div>
            </div>
          </section>

          {tutor.video && (
            <section className="card p-3 sm:p-4">
              <TutorVideoPlayer video={tutor.video} title={t.videoTitle(tutor.name)} />
            </section>
          )}

          <section className="card p-6 sm:p-8">
            <h2 className="font-display text-xl font-semibold">{t.about}</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-earth-700">{tutor.about}</p>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-earth-500"><Languages size={15} /> {t.teaches}</h3>
                <ul className="mt-2 space-y-1">
                  {tutor.languages.map((l) => (
                    <li key={l.slug}>
                      <Link href={`/langues/${l.slug}`} className="font-semibold hover:text-clay-700">{l.name}</Link>{" "}
                      <span className="text-sm text-earth-500">({l.level === "native" ? t.native : t.fluent})</span>
                    </li>
                  ))}
                </ul>
                {tutor.speaks && <p className="mt-2 text-sm text-earth-600">{t.alsoSpeaks} {tutor.speaks}</p>}
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-earth-500">{t.specialties}</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tutor.specialties.map((s) => <span key={s} className="chip">{labelFor(SPECIALTIES, s, locale)}</span>)}
                </div>
                <h3 className="mt-4 text-sm font-bold uppercase tracking-wider text-earth-500">{t.availability}</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tutor.availability.map((a) => <span key={a} className="chip bg-forest-100 text-forest-800">{labelFor(AVAILABILITY, a, locale)}</span>)}
                </div>
              </div>
            </div>
          </section>

          <section className="card p-6 sm:p-8">
            <h2 className="font-display text-xl font-semibold">{t.reviews}</h2>
            <div className="mt-4 space-y-5">
              {reviews.length ? (
                reviews.map((r) => (
                  <div key={r.id} className="flex gap-4 border-b border-sand-200 pb-5 last:border-0 last:pb-0">
                    <Avatar name={r.student_name} src={r.student_avatar} size={40} />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{r.student_name}</span>
                        <Stars value={r.rating} />
                        <span className="text-xs text-earth-500">{timeAgo(r.created_at, locale)}</span>
                      </div>
                      {r.comment && <p className="mt-1 text-earth-700">{r.comment}</p>}
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState title={t.noReviews}>{t.noReviewsText}</EmptyState>
              )}
            </div>
          </section>
        </div>

        <aside id="reserver" className="h-fit scroll-mt-24 lg:sticky lg:top-24">
          <div className="card p-6">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="font-display text-3xl font-semibold">{formatMoney(localPrice.amount, localPrice.currency, locale)}</p>
                {localPrice.currency !== "EUR" && <p className="text-xs text-earth-500">{t.about_(formatPrice(tutor.hourly_rate, locale))}</p>}
              </div>
              <p className="text-sm text-earth-500">{t.lessonOf(SITE.lessonMinutes)}</p>
            </div>
            <div className="mt-5">
              {isSelf ? (
                <div className="space-y-3 text-sm text-earth-600">
                  <p>{t.self}</p>
                  <Link href="/profil/tuteur" className="btn-outline w-full">{t.edit}</Link>
                </div>
              ) : !tutor.approved ? (
                <p className="text-sm text-earth-600">{t.afterApproval}</p>
              ) : user ? (
                <BookingForm tutorId={tutor.id} languages={tutor.languages} slots={slots} priceEur={tutor.hourly_rate} defaultCountry={payCountry} rates={fxRates()} />
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-earth-600">{t.loginToBook}</p>
                  <Link href={`/connexion?suite=/tuteurs/${tutor.id}`} className="btn-primary w-full">{t.login}</Link>
                  <Link href={`/inscription?suite=/tuteurs/${tutor.id}`} className="btn-outline w-full">{t.signUp}</Link>
                </div>
              )}
            </div>
            {user && !isSelf && (
              <Link href={`/messages/${tutor.id}`} className="btn-outline mt-3 w-full"><MessageCircle size={16} /> {t.message}</Link>
            )}
            {canShowInterest && <InterestButton tutorId={tutor.id} tutorFirstName={tutor.name.split(" ")[0]} alreadySent={interested} />}
          </div>
          <p className="mt-3 px-2 text-center text-xs text-earth-500">{t.footer}</p>
          {user && !isSelf && (
            <div className="mt-3 flex justify-center"><ReportButton targetId={tutor.id} name={tutor.name} /></div>
          )}
        </aside>
      </div>
    </div>
  );
}
