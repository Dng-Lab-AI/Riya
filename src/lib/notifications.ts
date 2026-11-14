import "server-only";
import { getDb, ObjectId, type NotificationKind } from "./db";

// Automatic messages sent to a tutor about a student: they appear in the tutor's
// conversation with that student (and in the unread badge), never on the student's side.

const DAY_MS = 24 * 60 * 60 * 1000;
// How long a booking may stay unfinished before the tutor is told (shorter in development, to try it).
const REMINDER_DELAY_MS = Number(process.env.BOOKING_REMINDER_MINUTES || (process.env.NODE_ENV === "production" ? 30 : 2)) * 60 * 1000;
// At most one notification of each kind per student and tutor in this period.
const QUIET_PERIOD_MS: Record<NotificationKind, number> = { interest: 30 * DAY_MS, booking_abandoned: DAY_MS };

const firstName = (name: string) => name.split(" ")[0] || name;

async function notify(kind: NotificationKind, studentId: ObjectId, tutorId: ObjectId, body: string): Promise<boolean> {
  const db = await getDb();
  const recent = await db.messages.countDocuments({ kind, senderId: studentId, recipientId: tutorId, createdAt: { $gt: new Date(Date.now() - QUIET_PERIOD_MS[kind]) } });
  if (recent) return false;
  await db.messages.insertOne({ _id: new ObjectId(), senderId: studentId, recipientId: tutorId, body, readAt: null, createdAt: new Date(), kind });
  return true;
}

export async function hasShownInterest(studentId: ObjectId, tutorId: ObjectId) {
  const db = await getDb();
  return (await db.messages.countDocuments({ kind: "interest", senderId: studentId, recipientId: tutorId })) > 0;
}

// "This student is interested in your profile, contact them."
export async function notifyInterest(student: { _id: ObjectId; name: string }, tutorId: ObjectId) {
  const name = firstName(student.name);
  return notify("interest", student._id, tutorId, `${name} s'intéresse à votre profil. Écrivez-lui pour vous présenter et l'aider à réserver un premier cours !`);
}

// The student picked a time slot on the tutor's profile.
export async function recordBookingStarted(studentId: ObjectId, tutorId: ObjectId) {
  const db = await getDb();
  const now = new Date();
  await db.bookingIntents.updateOne(
    { studentId, tutorId, completedAt: null, notifiedAt: null },
    { $set: { lastActivityAt: now }, $setOnInsert: { _id: new ObjectId(), startedAt: now } },
    { upsert: true },
  );
}

// The student went on to pay: the booking is no longer "started and abandoned".
export async function recordBookingSubmitted(studentId: ObjectId, tutorId: ObjectId) {
  const db = await getDb();
  await db.bookingIntents.updateMany({ studentId, tutorId, completedAt: null }, { $set: { completedAt: new Date() } });
}

// Looks for bookings left halfway and tells the tutors. Cheap and safe to call often:
// it runs at most once a minute per server.
const globalForReminders = globalThis as unknown as { riyaRemindersAt?: number };
export async function sendBookingReminders() {
  const now = Date.now();
  if (now - (globalForReminders.riyaRemindersAt ?? 0) < 60 * 1000) return;
  globalForReminders.riyaRemindersAt = now;

  const db = await getDb();
  const cutoff = new Date(now - REMINDER_DELAY_MS);
  const [intents, unpaid] = await Promise.all([
    // A time slot was picked, but the booking form was never submitted.
    db.bookingIntents.find({ completedAt: null, notifiedAt: null, lastActivityAt: { $lt: cutoff } }).limit(100).toArray(),
    // The booking was submitted but never paid.
    db.lessons
      .find({ status: "pending", "payment.status": { $in: ["pending", "failed"] }, "payment.createdAt": { $lt: cutoff }, abandonNotifiedAt: { $exists: false }, startsAt: { $gt: new Date(now) } })
      .limit(100)
      .toArray(),
  ]);
  if (!intents.length && !unpaid.length) return;

  const students = await db.users
    .find({ _id: { $in: [...intents.map((i) => i.studentId), ...unpaid.map((l) => l.studentId)] }, status: "active" }, { projection: { name: 1 } })
    .toArray();
  const nameOf = new Map(students.map((s) => [s._id.toHexString(), firstName(s.name)]));

  for (const intent of intents) {
    // Claim it first, so two servers never send the same reminder.
    const { modifiedCount } = await db.bookingIntents.updateOne({ _id: intent._id, notifiedAt: null }, { $set: { notifiedAt: new Date() } });
    const name = nameOf.get(intent.studentId.toHexString());
    if (!modifiedCount || !name) continue;
    await notify("booking_abandoned", intent.studentId, intent.tutorId, `${name} a commencé à réserver un cours avec vous mais ne l'a pas terminé. Envoyez-lui un petit message pour l'encourager à réserver !`);
  }
  for (const lesson of unpaid) {
    const { modifiedCount } = await db.lessons.updateOne({ _id: lesson._id, abandonNotifiedAt: { $exists: false } }, { $set: { abandonNotifiedAt: new Date() } });
    const name = nameOf.get(lesson.studentId.toHexString());
    if (!modifiedCount || !name) continue;
    await notify("booking_abandoned", lesson.studentId, lesson.tutorId, `${name} a choisi un créneau avec vous mais n'a pas finalisé le paiement. Un petit message peut l'aider à terminer sa réservation !`);
  }
}
