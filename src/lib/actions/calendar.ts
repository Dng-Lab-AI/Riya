"use server";

import { defineMessages, intlLocale, type Locale } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { requireUser } from "../auth";
import { availabilityTags, busyIntervals, lessonInterval, MIN_NOTICE_MS, normalizeRanges } from "../availability";
import { getDb, ObjectId, toObjectId, type LessonDoc, type WeeklyRange } from "../db";
import { tutorStudentIds } from "../calendar";
import { isValidTimeZone, labelToMinutes, overlaps, zonedTimeToUtc } from "../timezone";
import { int, refreshAll, text, type FormState } from "./shared";

const DAY_MS = 24 * 60 * 60 * 1000;

const M = defineMessages({
  en: {
    tutorsOnly: "Only tutors have a calendar.", timeZone: "Unknown time zone.", unreadable: "Availability couldn't be read. Reload the page and try again.",
    tooMany: "Too many time ranges.", saved: "Availability saved: students can book these hours.",
    savedEmpty: "Availability saved. No time ranges: students can no longer book, except your extra slots.",
    timeOffPeriod: "Enter the start and end of your time off.", timeOffOrder: "The end of the time off must be after its start.",
    past: "This period is already over.", tooLong: "Time off lasts at most three months. Add several if needed.",
    timeOffKept: (n: number) => `Time off added. Note: ${n} lesson${n > 1 ? "s are" : " is"} planned during this period, remember to let ${n > 1 ? "your students" : "your student"} know.`,
    timeOffAdded: "Time off added: these hours can no longer be booked.", slotPeriod: "Enter the day and the hours of the slot.",
    slotOrder: "The end time must be after the start time.", slotLong: "An extra slot lasts at most 24 hours.", slotSoon: "This slot is too soon or already over.",
    slotAdded: "Slot added: students can now book it.", notFound: "Item not found.", deleted: "Deleted.",
    tutorsSchedule: "Only tutors can schedule a lesson.", student: "Choose a student.", when: "Choose the day and time of the lesson.",
    noProfile: "Tutor profile not found.", yourStudents: "You can only schedule a lesson with your students.", language: "Choose a language you teach.",
    notice: "Schedule the lesson at least one hour in advance.",
    clash: (when: string) => `The lesson on ${when} overlaps another lesson. Choose another time.`,
    series: (n: number, name: string, when: string) => `${n} weekly lessons proposed to ${name}, starting ${when}. ${name} confirms them from “My lessons”.`,
    single: (name: string, when: string) => `Lesson proposed to ${name} on ${when}. ${name} confirms it from “My lessons”.`,
  },
  fr: {
    tutorsOnly: "Seuls les tuteurs ont un calendrier.", timeZone: "Fuseau horaire inconnu.", unreadable: "Disponibilités illisibles. Rechargez la page et réessayez.",
    tooMany: "Trop de plages horaires.", saved: "Disponibilités enregistrées : les élèves peuvent réserver ces horaires.",
    savedEmpty: "Disponibilités enregistrées. Aucune plage : les élèves ne peuvent plus réserver, sauf vos créneaux supplémentaires.",
    timeOffPeriod: "Indiquez le début et la fin de votre absence.", timeOffOrder: "La fin de l'absence doit être après son début.",
    past: "Cette période est déjà passée.", tooLong: "Une absence dure au plus trois mois. Ajoutez-en plusieurs si besoin.",
    timeOffKept: (n: number) => `Absence ajoutée. Attention : ${n} cours ${n > 1 ? "sont prévus" : "est prévu"} pendant cette période, pensez à prévenir ${n > 1 ? "vos élèves" : "votre élève"}.`,
    timeOffAdded: "Absence ajoutée : ces horaires ne sont plus réservables.", slotPeriod: "Indiquez le jour et les horaires du créneau.",
    slotOrder: "L'heure de fin doit être après l'heure de début.", slotLong: "Un créneau supplémentaire dure au plus 24 heures.", slotSoon: "Ce créneau est trop proche ou déjà passé.",
    slotAdded: "Créneau ajouté : les élèves peuvent maintenant le réserver.", notFound: "Élément introuvable.", deleted: "Supprimé.",
    tutorsSchedule: "Seuls les tuteurs peuvent planifier un cours.", student: "Choisissez un élève.", when: "Choisissez le jour et l'heure du cours.",
    noProfile: "Profil de tuteur introuvable.", yourStudents: "Vous ne pouvez planifier un cours qu'avec vos élèves.", language: "Choisissez une langue que vous enseignez.",
    notice: "Planifiez le cours au moins une heure à l'avance.",
    clash: (when: string) => `Le cours du ${when} chevauche un autre cours. Choisissez un autre horaire.`,
    series: (n: number, name: string, when: string) => `${n} cours hebdomadaires proposés à ${name}, à partir du ${when}. ${name} les confirme depuis « Mes cours ».`,
    single: (name: string, when: string) => `Cours proposé à ${name} le ${when}. ${name} le confirme depuis « Mes cours ».`,
  },
});

async function requireTutor() {
  const user = await requireUser("/calendrier");
  return user.role === "tutor" ? user : null;
}

const formatIn = (date: Date, timeZone: string, locale: Locale) =>
  date.toLocaleString(intlLocale(locale), { timeZone, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

// "Set up availability": the hours students can book, every week.
export async function saveAvailability(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = M[await getLocale()];
  const user = await requireTutor();
  if (!user) return { error: t.tutorsOnly };
  const timeZone = text(formData, "time_zone", 60);
  if (!isValidTimeZone(timeZone)) return { error: t.timeZone };

  let raw: unknown;
  try {
    raw = JSON.parse(text(formData, "ranges", 20000) || "[]");
  } catch {
    return { error: t.unreadable };
  }
  if (!Array.isArray(raw) || raw.length > 100) return { error: t.tooMany };
  const ranges = normalizeRanges(
    raw.map((r) => ({ day: Number((r as WeeklyRange)?.day), start: Number((r as WeeklyRange)?.start), end: Number((r as WeeklyRange)?.end) })),
  );

  const db = await getDb();
  await db.users.updateOne(
    { _id: user._id, role: "tutor" },
    // The search filters ("matin", "soir", "week-end"…) follow the new schedule.
    { $set: { "tutor.schedule": { timeZone, ranges, updatedAt: new Date() }, "tutor.availability": availabilityTags(ranges) } },
  );
  refreshAll();
  return { success: ranges.length ? t.saved : t.savedEmpty };
}

function readPeriod(formData: FormData): { startsAt: Date; endsAt: Date } | null {
  const startsAt = new Date(text(formData, "starts_at", 40));
  const endsAt = new Date(text(formData, "ends_at", 40));
  return Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) ? null : { startsAt, endsAt };
}

// "Add time off": hours outside the weekly schedule where the tutor cannot be booked.
export async function addTimeOff(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = M[await getLocale()];
  const user = await requireTutor();
  if (!user) return { error: t.tutorsOnly };
  const period = readPeriod(formData);
  if (!period) return { error: t.timeOffPeriod };
  const { startsAt, endsAt } = period;
  if (endsAt <= startsAt) return { error: t.timeOffOrder };
  if (endsAt.getTime() < Date.now()) return { error: t.past };
  if (endsAt.getTime() - startsAt.getTime() > 92 * DAY_MS) return { error: t.tooLong };

  const db = await getDb();
  await db.calendarBlocks.insertOne({ _id: new ObjectId(), tutorId: user._id, kind: "time_off", startsAt, endsAt, note: text(formData, "note", 200), createdAt: new Date() });
  // Lessons already planned are kept: the tutor decides whether to cancel or move them.
  const kept = (await busyIntervals({ tutorId: user._id }, startsAt, endsAt)).filter((b) => overlaps(b, [startsAt.getTime(), endsAt.getTime()])).length;
  refreshAll();
  return { success: kept ? t.timeOffKept(kept) : t.timeOffAdded };
}

// "Add extra slots": open hours outside the weekly schedule, on a given day.
export async function addExtraSlots(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = M[await getLocale()];
  const user = await requireTutor();
  if (!user) return { error: t.tutorsOnly };
  const period = readPeriod(formData);
  if (!period) return { error: t.slotPeriod };
  const { startsAt, endsAt } = period;
  if (endsAt <= startsAt) return { error: t.slotOrder };
  if (endsAt.getTime() - startsAt.getTime() > DAY_MS) return { error: t.slotLong };
  if (endsAt.getTime() < Date.now() + MIN_NOTICE_MS) return { error: t.slotSoon };

  const db = await getDb();
  await db.calendarBlocks.insertOne({ _id: new ObjectId(), tutorId: user._id, kind: "extra", startsAt, endsAt, note: text(formData, "note", 200), createdAt: new Date() });
  refreshAll();
  return { success: t.slotAdded };
}

export async function deleteCalendarBlock(blockId: string): Promise<FormState> {
  const t = M[await getLocale()];
  const user = await requireTutor();
  const _id = toObjectId(blockId);
  if (!user || !_id) return { error: t.notFound };
  const db = await getDb();
  await db.calendarBlocks.deleteOne({ _id, tutorId: user._id });
  refreshAll();
  return { success: t.deleted };
}

// "Schedule lesson": the tutor proposes a lesson (or a weekly series) to one of their students,
// who confirms it by paying from "My lessons".
export async function scheduleLesson(_prev: FormState, formData: FormData): Promise<FormState> {
  const locale = await getLocale();
  const t = M[locale];
  const user = await requireTutor();
  if (!user) return { error: t.tutorsSchedule };

  const studentId = toObjectId(text(formData, "student_id", 40));
  const languageSlug = text(formData, "language", 40);
  const timeZone = text(formData, "time_zone", 60);
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text(formData, "date", 10));
  const minutes = labelToMinutes(text(formData, "time", 5));
  const weeks = Math.min(12, Math.max(1, int(formData, "weeks") || 1));
  const message = text(formData, "message", 1000);

  if (!studentId) return { error: t.student };
  if (!date || minutes === null || minutes >= 24 * 60) return { error: t.when };
  if (!isValidTimeZone(timeZone)) return { error: t.timeZone };

  const db = await getDb();
  const [tutor, student, known] = await Promise.all([
    db.users.findOne({ _id: user._id }),
    db.users.findOne({ _id: studentId, status: "active" }),
    tutorStudentIds(user._id),
  ]);
  if (!tutor?.tutor) return { error: t.noProfile };
  if (!student || !known.some((id) => id.equals(studentId))) return { error: t.yourStudents };
  if (!tutor.tutor.languages.some((l) => l.slug === languageSlug)) return { error: t.language };

  const [y, m, d] = [Number(date[1]), Number(date[2]), Number(date[3])];
  const starts = Array.from({ length: weeks }, (_, k) => zonedTimeToUtc(y, m, d + 7 * k, minutes, timeZone));
  if (starts[0].getTime() < Date.now() + MIN_NOTICE_MS) return { error: t.notice };

  const durationMinutes = 50;
  const lessons: LessonDoc[] = starts.map((startsAt) => ({
    _id: new ObjectId(), studentId, tutorId: user._id, languageSlug, startsAt, durationMinutes, price: tutor.tutor!.hourlyRate,
    status: "pending", message, proposedBy: "tutor", createdAt: new Date(),
  }));
  if (weeks > 1) {
    const seriesId = new ObjectId();
    lessons.forEach((l) => (l.seriesId = seriesId));
  }

  // Neither the tutor nor the student may already have a lesson at that time.
  const from = starts[0];
  const to = new Date(starts.at(-1)!.getTime() + durationMinutes * 60 * 1000);
  const [tutorBusy, studentBusy] = await Promise.all([busyIntervals({ tutorId: user._id }, from, to), busyIntervals({ studentId }, from, to)]);
  const clash = lessons.find((l) => [...tutorBusy, ...studentBusy].some((b) => overlaps(lessonInterval(l), b)));
  if (clash) return { error: t.clash(formatIn(clash.startsAt, timeZone, locale)) };

  await db.lessons.insertMany(lessons);
  refreshAll();
  const first = student.name.split(" ")[0];
  const when = formatIn(from, timeZone, locale);
  return { success: weeks > 1 ? t.series(weeks, first, when) : t.single(first, when) };
}
