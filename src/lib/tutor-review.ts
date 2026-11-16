import "server-only";
import { DEFAULT_LOCALE, defineMessages, type Locale } from "@/i18n";
import { languageName } from "@/i18n/catalog";
import { getDb, type ObjectId, type TutorProfile, type UserDoc } from "./db";
import { sendActionEmail } from "./mail";
import { adminOrigin, publicOrigin } from "./site";

// Review of new tutor profiles by the Riya team: a tutor only appears in the search once approved.
// When a profile is ready, the team is told (e-mail and a counter in the menu); the tutor is told
// the decision, with the reason when changes are asked.

// What a profile needs before it can be reviewed (the same rules as the profile form).
export function isProfileComplete(tutor: Pick<TutorProfile, "headline" | "about" | "languages" | "availability">) {
  return tutor.headline.trim().length >= 10 && tutor.about.trim().length >= 50 && tutor.languages.length > 0 && tutor.availability.length > 0;
}

// Ready to review: complete, not approved, and not sent back for changes since the last save.
const READY = { role: "tutor", "tutor.approved": { $ne: true }, "tutor.review": { $exists: false } } as const;

const M = defineMessages({
  en: {
    adminSubject: (name: string) => `New tutor to review: ${name}`,
    adminGreeting: "Hello,",
    adminIntro: (name: string, languages: string) => `${name} has completed their tutor profile (${languages}). It will appear in the search once you approve it.`,
    adminButton: "Review the profile",
    adminOutro: "You can approve it or ask for changes from the administration page.",
    approvedSubject: "Your Riya tutor profile is live!",
    approvedGreeting: (name: string) => `Congratulations ${name}!`,
    approvedIntro: "Our team has approved your profile: students can now find you in the search and book lessons with you.",
    approvedButton: "See my public profile",
    approvedOutro: "Tip: keep your calendar up to date and add a short presentation video to get your first bookings faster.",
    declinedSubject: "Your Riya tutor profile needs a few changes",
    declinedGreeting: (name: string) => `Hello ${name},`,
    declinedIntro: (note: string) => `Thank you for your interest in teaching on Riya. Before we publish your profile, our team asks you for a few changes:\n\n${note}`,
    declinedButton: "Update my profile",
    declinedOutro: "Once you save your profile again, it is automatically sent back to our team.",
  },
  fr: {
    adminSubject: (name: string) => `Nouveau tuteur à valider : ${name}`,
    adminGreeting: "Bonjour,",
    adminIntro: (name: string, languages: string) => `${name} a terminé son profil de tuteur (${languages}). Il apparaîtra dans la recherche dès que vous l'aurez validé.`,
    adminButton: "Examiner le profil",
    adminOutro: "Vous pouvez le valider ou demander des modifications depuis la page d'administration.",
    approvedSubject: "Votre profil de tuteur Riya est en ligne !",
    approvedGreeting: (name: string) => `Félicitations ${name} !`,
    approvedIntro: "Notre équipe a validé votre profil : les élèves peuvent maintenant vous trouver dans la recherche et réserver des cours avec vous.",
    approvedButton: "Voir mon profil public",
    approvedOutro: "Astuce : tenez votre calendrier à jour et ajoutez une courte vidéo de présentation pour obtenir vos premières réservations plus vite.",
    declinedSubject: "Votre profil de tuteur Riya demande quelques modifications",
    declinedGreeting: (name: string) => `Bonjour ${name},`,
    declinedIntro: (note: string) => `Merci de votre intérêt pour l'enseignement sur Riya. Avant de publier votre profil, notre équipe vous demande quelques modifications :\n\n${note}`,
    declinedButton: "Modifier mon profil",
    declinedOutro: "Dès que vous enregistrez à nouveau votre profil, il est automatiquement renvoyé à notre équipe.",
  },
});

const firstName = (name: string) => name.split(" ")[0] || name;

// Language names in a given interface language (the database keeps the French names).
async function languageNameMap() {
  const db = await getDb();
  const docs = await db.languages.find({}, { projection: { slug: 1, name: 1 } }).toArray();
  return (locale: Locale) => new Map(docs.map((l) => [l.slug, languageName(l.slug, l.name, locale)]));
}

// An e-mail that fails (provider down, not configured) never blocks the action that triggered it.
async function safeSend(input: Parameters<typeof sendActionEmail>[0]) {
  try {
    await sendActionEmail(input);
  } catch (err) {
    console.error("Tutor review e-mail", err);
  }
}

// Called after a tutor saves their profile: the first time it is complete (or after changes were
// asked), it is sent for review and the team is told by e-mail.
export async function submitForReview(tutorId: ObjectId) {
  const db = await getDb();
  const user = await db.users.findOne({ _id: tutorId, role: "tutor" });
  const tutor = user?.tutor;
  if (!user || !tutor || tutor.approved || !isProfileComplete(tutor)) return;
  // Already waiting for the team, with no changes asked: nothing new to tell.
  if (tutor.submittedAt && !tutor.review) return;

  await db.users.updateOne({ _id: tutorId }, { $set: { "tutor.submittedAt": new Date() }, $unset: { "tutor.review": "" } });

  const [admins, names, origin] = await Promise.all([
    db.users.find({ role: "admin", status: "active" }, { projection: { email: 1, locale: 1 } }).toArray(),
    languageNameMap(),
    adminOrigin(),
  ]);
  for (const admin of admins) {
    const locale: Locale = admin.locale ?? DEFAULT_LOCALE;
    const t = M[locale];
    const languages = tutor.languages.map((l) => names(locale).get(l.slug) ?? l.slug).join(", ");
    await safeSend({
      to: admin.email,
      subject: t.adminSubject(user.name),
      greeting: t.adminGreeting,
      intro: t.adminIntro(user.name, languages),
      button: t.adminButton,
      url: `${origin}/#a-valider`,
      outro: t.adminOutro,
      locale,
    });
  }
}

// The decision of the team, told to the tutor by e-mail (and shown on their profile page).
export async function tellTutorDecision(user: Pick<UserDoc, "_id" | "name" | "email" | "locale">, decision: { approved: true } | { approved: false; note: string }) {
  const locale: Locale = user.locale ?? DEFAULT_LOCALE;
  const t = M[locale];
  const origin = await publicOrigin();
  await safeSend(
    decision.approved
      ? {
          to: user.email, subject: t.approvedSubject, greeting: t.approvedGreeting(firstName(user.name)), intro: t.approvedIntro,
          button: t.approvedButton, url: `${origin}/tuteurs/${user._id.toHexString()}`, outro: t.approvedOutro, locale,
        }
      : {
          to: user.email, subject: t.declinedSubject, greeting: t.declinedGreeting(firstName(user.name)), intro: t.declinedIntro(decision.note),
          button: t.declinedButton, url: `${origin}/profil/tuteur`, outro: t.declinedOutro, locale,
        },
  );
}

// Profiles waiting for the team: the counter in the administrator's menu.
export async function countTutorsToReview() {
  const db = await getDb();
  const docs = await db.users.find(READY, { projection: { tutor: 1 } }).toArray();
  return docs.filter((u) => u.tutor && isProfileComplete(u.tutor)).length;
}

export type ReviewItem = {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
  country: string;
  headline: string;
  about: string;
  hourly_rate: number;
  years_experience: number;
  languages: string[];
  has_video: boolean;
  joined_at: string;
  submitted_at: string | null;
  // Changes the team asked for, until the tutor saves their profile again.
  review: { note: string; at: string } | null;
};

// Every tutor not approved yet, split for the administration page.
export async function listTutorReviews(locale: Locale): Promise<{ ready: ReviewItem[]; changesAsked: ReviewItem[]; unfinished: ReviewItem[] }> {
  const db = await getDb();
  const [docs, names] = await Promise.all([
    db.users.find({ role: "tutor", "tutor.approved": { $ne: true } }).sort({ "tutor.submittedAt": 1, _id: -1 }).toArray(),
    languageNameMap(),
  ]);
  const items = docs
    .filter((u) => u.tutor)
    .map((u) => {
      const tutor = u.tutor!;
      const item: ReviewItem = {
        id: u._id.toHexString(), name: u.name, email: u.email, avatar_url: u.avatarUrl, country: u.country,
        headline: tutor.headline, about: tutor.about, hourly_rate: tutor.hourlyRate, years_experience: tutor.yearsExperience,
        languages: tutor.languages.map((l) => names(locale).get(l.slug) ?? l.slug), has_video: !!tutor.video,
        joined_at: u.createdAt.toISOString(), submitted_at: tutor.submittedAt?.toISOString() ?? null,
        review: tutor.review ? { note: tutor.review.note, at: tutor.review.at.toISOString() } : null,
      };
      return { item, complete: isProfileComplete(tutor) };
    });
  return {
    ready: items.filter((x) => x.complete && !x.item.review).map((x) => x.item),
    changesAsked: items.filter((x) => x.item.review).map((x) => x.item),
    unfinished: items.filter((x) => !x.complete && !x.item.review).map((x) => x.item),
  };
}
