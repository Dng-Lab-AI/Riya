import "server-only";
import { DEFAULT_LOCALE, defineMessages, intlLocale, type Locale } from "@/i18n";
import { defaultTimeZone } from "./availability";
import { getDb, REAL_LESSON, type LessonDoc, type UserDoc } from "./db";
import { sendActionEmail } from "./mail";
import { publicOrigin } from "./site";

// E-mails about lessons: a new request (to the tutor), a proposal (to the student), a confirmation,
// a reminder the day before (to both) and a cancellation (to both). Each one is sent once per lesson
// (lesson.mails), and only for lessons created since this was switched on, so nobody gets old news.

const REMINDER_BEFORE_MS = 24 * 60 * 60 * 1000;
const SINCE_KEY = "lesson-mails-since";

const M = defineMessages({
  en: {
    greeting: (name: string) => `Hello ${name},`,
    requestSubject: (name: string) => `New lesson request from ${name}`,
    requestIntro: (name: string, when: string) => `${name} has booked and paid for a lesson with you on ${when}. Accept it so it appears in both your calendars (or decline it: the student is refunded).`,
    requestButton: "Answer the request",
    proposalSubject: (name: string) => `${name} proposes a lesson`,
    proposalIntro: (name: string, when: string) => `${name} proposes a lesson on ${when}. Accept and pay it so it is confirmed.`,
    proposalButton: "See the proposal",
    confirmedSubject: (name: string) => `Lesson confirmed with ${name}`,
    confirmedIntro: (name: string, when: string) => `Your lesson with ${name} on ${when} is confirmed. The classroom opens a few minutes before the start.`,
    confirmedButton: "See my lessons",
    reminderSubject: (name: string) => `Reminder: lesson with ${name} tomorrow`,
    reminderIntro: (name: string, when: string) => `Your lesson with ${name} is on ${when}. Check your camera and microphone a few minutes before, then join from Riya.`,
    reminderButton: "Open the classroom",
    cancelledSubject: (name: string) => `Lesson with ${name} cancelled`,
    cancelledIntro: (name: string, when: string) => `The lesson with ${name} on ${when} has been cancelled.`,
    refunded: " If you had paid for it, the refund follows the cancellation rules (full refund when the tutor cancels or declines).",
    cancelledButton: "See my lessons",
    outro: "You receive this e-mail because you have a lesson on Riya.",
  },
  fr: {
    greeting: (name: string) => `Bonjour ${name},`,
    requestSubject: (name: string) => `Nouvelle demande de cours de ${name}`,
    requestIntro: (name: string, when: string) => `${name} a réservé et payé un cours avec vous le ${when}. Acceptez-le pour qu'il apparaisse dans vos deux calendriers (ou refusez-le : l'élève est remboursé).`,
    requestButton: "Répondre à la demande",
    proposalSubject: (name: string) => `${name} vous propose un cours`,
    proposalIntro: (name: string, when: string) => `${name} vous propose un cours le ${when}. Acceptez-le et payez-le pour qu'il soit confirmé.`,
    proposalButton: "Voir la proposition",
    confirmedSubject: (name: string) => `Cours confirmé avec ${name}`,
    confirmedIntro: (name: string, when: string) => `Votre cours avec ${name} le ${when} est confirmé. La salle de classe ouvre quelques minutes avant le début.`,
    confirmedButton: "Voir mes cours",
    reminderSubject: (name: string) => `Rappel : cours avec ${name} demain`,
    reminderIntro: (name: string, when: string) => `Votre cours avec ${name} a lieu le ${when}. Vérifiez votre caméra et votre micro quelques minutes avant, puis rejoignez-le depuis Riya.`,
    reminderButton: "Ouvrir la salle de classe",
    cancelledSubject: (name: string) => `Cours avec ${name} annulé`,
    cancelledIntro: (name: string, when: string) => `Le cours avec ${name} du ${when} a été annulé.`,
    refunded: " Si vous l'aviez payé, le remboursement suit les règles d'annulation (remboursement complet quand le tuteur annule ou refuse).",
    cancelledButton: "Voir mes cours",
    outro: "Vous recevez cet e-mail parce que vous avez un cours sur Riya.",
  },
});

type Person = Pick<UserDoc, "_id" | "name" | "email" | "locale" | "country" | "tutor" | "status">;
type Kind = keyof NonNullable<LessonDoc["mails"]>;

const firstName = (name: string) => name.split(" ")[0] || name;

// The lesson time in the recipient's time zone (their calendar's, or their country's).
function when(lesson: LessonDoc, person: Person, locale: Locale) {
  const timeZone = person.tutor?.schedule?.timeZone ?? defaultTimeZone(person.country);
  return lesson.startsAt.toLocaleString(intlLocale(locale), { timeZone, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
}

async function tell(person: Person | undefined, other: Person | undefined, lesson: LessonDoc, kind: Kind, origin: string) {
  if (!person || !other || person.status !== "active") return;
  const locale: Locale = person.locale ?? DEFAULT_LOCALE;
  const t = M[locale];
  const at = when(lesson, person, locale);
  const name = other.name;
  const content = {
    request: { subject: t.requestSubject(name), intro: t.requestIntro(name, at), button: t.requestButton, url: `${origin}/tableau-de-bord` },
    proposal: { subject: t.proposalSubject(name), intro: t.proposalIntro(name, at), button: t.proposalButton, url: `${origin}/tableau-de-bord#cours-a-venir` },
    confirmed: { subject: t.confirmedSubject(name), intro: t.confirmedIntro(name, at), button: t.confirmedButton, url: `${origin}/tableau-de-bord` },
    reminder: { subject: t.reminderSubject(name), intro: t.reminderIntro(name, at), button: t.reminderButton, url: `${origin}/classe/${lesson._id.toHexString()}` },
    cancelled: {
      subject: t.cancelledSubject(name), intro: t.cancelledIntro(name, at) + (person._id.equals(lesson.studentId) ? t.refunded : ""),
      button: t.cancelledButton, url: `${origin}/tableau-de-bord`,
    },
  }[kind];
  try {
    await sendActionEmail({ to: person.email, greeting: t.greeting(firstName(person.name)), outro: t.outro, locale, ...content });
  } catch (err) {
    console.error(`Lesson e-mail (${kind})`, err);
  }
}

export async function sendLessonMails() {
  const db = await getDb();
  // The first run sets the starting point: lessons created before are left alone.
  await db.meta.updateOne({ _id: SINCE_KEY }, { $setOnInsert: { at: new Date() } }, { upsert: true });
  const since = (await db.meta.findOne({ _id: SINCE_KEY }))!.at;
  const now = new Date();
  const recent = { ...REAL_LESSON, createdAt: { $gte: since } };

  const settled = { $or: [{ payment: { $exists: false } }, { "payment.status": "paid" }] };
  const jobs: { kind: Kind; filter: object; to: (l: LessonDoc) => ("student" | "tutor")[] }[] = [
    // Paid booking waiting for the tutor.
    { kind: "request", filter: { ...recent, status: "pending", proposedBy: { $exists: false }, startsAt: { $gt: now }, ...settled }, to: () => ["tutor"] },
    // Lesson proposed by the tutor, waiting for the student.
    { kind: "proposal", filter: { ...recent, status: "pending", proposedBy: "tutor", startsAt: { $gt: now } }, to: () => ["student"] },
    // Confirmed: the student for a booking the tutor accepted, the tutor for a proposal the student paid.
    { kind: "confirmed", filter: { ...recent, status: "confirmed", startsAt: { $gt: now } }, to: (l) => (l.proposedBy === "tutor" ? ["tutor"] : ["student"]) },
    // The day before.
    { kind: "reminder", filter: { ...REAL_LESSON, status: "confirmed", startsAt: { $gt: now, $lte: new Date(now.getTime() + REMINDER_BEFORE_MS) }, createdAt: { $gte: since } }, to: () => ["student", "tutor"] },
    // Cancelled after one of the e-mails above went out.
    { kind: "cancelled", filter: { ...recent, status: "cancelled", $or: [{ "mails.request": { $exists: true } }, { "mails.proposal": { $exists: true } }, { "mails.confirmed": { $exists: true } }] }, to: () => ["student", "tutor"] },
  ];

  const origin = await publicOrigin();
  for (const job of jobs) {
    const lessons = await db.lessons.find({ ...job.filter, [`mails.${job.kind}`]: { $exists: false } }).limit(50).toArray();
    if (!lessons.length) continue;
    const people = new Map(
      (await db.users.find({ _id: { $in: lessons.flatMap((l) => [l.studentId, l.tutorId]) } }, { projection: { name: 1, email: 1, locale: 1, country: 1, tutor: 1, status: 1 } }).toArray())
        .map((u) => [u._id.toHexString(), u as Person]),
    );
    for (const lesson of lessons) {
      // Claimed first, so two servers never send the same e-mail.
      const { modifiedCount } = await db.lessons.updateOne({ _id: lesson._id, [`mails.${job.kind}`]: { $exists: false } }, { $set: { [`mails.${job.kind}`]: new Date() } });
      if (!modifiedCount) continue;
      const student = people.get(lesson.studentId.toHexString());
      const tutor = people.get(lesson.tutorId.toHexString());
      for (const side of job.to(lesson)) {
        await tell(side === "student" ? student : tutor, side === "student" ? tutor : student, lesson, job.kind, origin);
      }
    }
  }
}
