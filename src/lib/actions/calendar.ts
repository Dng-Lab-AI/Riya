"use server";

import { requireUser } from "../auth";
import { availabilityTags, busyIntervals, lessonInterval, MIN_NOTICE_MS, normalizeRanges } from "../availability";
import { getDb, ObjectId, toObjectId, type LessonDoc, type WeeklyRange } from "../db";
import { tutorStudentIds } from "../calendar";
import { isValidTimeZone, labelToMinutes, overlaps, zonedTimeToUtc } from "../timezone";
import { int, refreshAll, text, type FormState } from "./shared";

const DAY_MS = 24 * 60 * 60 * 1000;

async function requireTutor() {
  const user = await requireUser("/calendrier");
  return user.role === "tutor" ? user : null;
}

const formatIn = (date: Date, timeZone: string) =>
  date.toLocaleString("fr-FR", { timeZone, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

// "Set up availability": the hours students can book, every week.
export async function saveAvailability(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireTutor();
  if (!user) return { error: "Seuls les tuteurs ont un calendrier." };
  const timeZone = text(formData, "time_zone", 60);
  if (!isValidTimeZone(timeZone)) return { error: "Fuseau horaire inconnu." };

  let raw: unknown;
  try {
    raw = JSON.parse(text(formData, "ranges", 20000) || "[]");
  } catch {
    return { error: "Disponibilités illisibles. Rechargez la page et réessayez." };
  }
  if (!Array.isArray(raw) || raw.length > 100) return { error: "Trop de plages horaires." };
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
  return {
    success: ranges.length
      ? "Disponibilités enregistrées : les élèves peuvent réserver ces horaires."
      : "Disponibilités enregistrées. Aucune plage : les élèves ne peuvent plus réserver, sauf vos créneaux supplémentaires.",
  };
}

function readPeriod(formData: FormData): { startsAt: Date; endsAt: Date } | null {
  const startsAt = new Date(text(formData, "starts_at", 40));
  const endsAt = new Date(text(formData, "ends_at", 40));
  return Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) ? null : { startsAt, endsAt };
}

// "Add time off": hours outside the weekly schedule where the tutor cannot be booked.
export async function addTimeOff(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireTutor();
  if (!user) return { error: "Seuls les tuteurs ont un calendrier." };
  const period = readPeriod(formData);
  if (!period) return { error: "Indiquez le début et la fin de votre absence." };
  const { startsAt, endsAt } = period;
  if (endsAt <= startsAt) return { error: "La fin de l'absence doit être après son début." };
  if (endsAt.getTime() < Date.now()) return { error: "Cette période est déjà passée." };
  if (endsAt.getTime() - startsAt.getTime() > 92 * DAY_MS) return { error: "Une absence dure au plus trois mois. Ajoutez-en plusieurs si besoin." };

  const db = await getDb();
  await db.calendarBlocks.insertOne({ _id: new ObjectId(), tutorId: user._id, kind: "time_off", startsAt, endsAt, note: text(formData, "note", 200), createdAt: new Date() });
  // Lessons already planned are kept: the tutor decides whether to cancel or move them.
  const kept = (await busyIntervals({ tutorId: user._id }, startsAt, endsAt)).filter((b) => overlaps(b, [startsAt.getTime(), endsAt.getTime()])).length;
  refreshAll();
  return {
    success: kept
      ? `Absence ajoutée. Attention : ${kept} cours ${kept > 1 ? "sont prévus" : "est prévu"} pendant cette période, pensez à prévenir ${kept > 1 ? "vos élèves" : "votre élève"}.`
      : "Absence ajoutée : ces horaires ne sont plus réservables.",
  };
}

// "Add extra slots": open hours outside the weekly schedule, on a given day.
export async function addExtraSlots(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireTutor();
  if (!user) return { error: "Seuls les tuteurs ont un calendrier." };
  const period = readPeriod(formData);
  if (!period) return { error: "Indiquez le jour et les horaires du créneau." };
  const { startsAt, endsAt } = period;
  if (endsAt <= startsAt) return { error: "L'heure de fin doit être après l'heure de début." };
  if (endsAt.getTime() - startsAt.getTime() > DAY_MS) return { error: "Un créneau supplémentaire dure au plus 24 heures." };
  if (endsAt.getTime() < Date.now() + MIN_NOTICE_MS) return { error: "Ce créneau est trop proche ou déjà passé." };

  const db = await getDb();
  await db.calendarBlocks.insertOne({ _id: new ObjectId(), tutorId: user._id, kind: "extra", startsAt, endsAt, note: text(formData, "note", 200), createdAt: new Date() });
  refreshAll();
  return { success: "Créneau ajouté : les élèves peuvent maintenant le réserver." };
}

export async function deleteCalendarBlock(blockId: string): Promise<FormState> {
  const user = await requireTutor();
  const _id = toObjectId(blockId);
  if (!user || !_id) return { error: "Élément introuvable." };
  const db = await getDb();
  await db.calendarBlocks.deleteOne({ _id, tutorId: user._id });
  refreshAll();
  return { success: "Supprimé." };
}

// "Schedule lesson": the tutor proposes a lesson (or a weekly series) to one of their students,
// who confirms it by paying from "Mes cours".
export async function scheduleLesson(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireTutor();
  if (!user) return { error: "Seuls les tuteurs peuvent planifier un cours." };

  const studentId = toObjectId(text(formData, "student_id", 40));
  const languageSlug = text(formData, "language", 40);
  const timeZone = text(formData, "time_zone", 60);
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text(formData, "date", 10));
  const minutes = labelToMinutes(text(formData, "time", 5));
  const weeks = Math.min(12, Math.max(1, int(formData, "weeks") || 1));
  const message = text(formData, "message", 1000);

  if (!studentId) return { error: "Choisissez un élève." };
  if (!date || minutes === null || minutes >= 24 * 60) return { error: "Choisissez le jour et l'heure du cours." };
  if (!isValidTimeZone(timeZone)) return { error: "Fuseau horaire inconnu." };

  const db = await getDb();
  const [tutor, student, known] = await Promise.all([
    db.users.findOne({ _id: user._id }),
    db.users.findOne({ _id: studentId, status: "active" }),
    tutorStudentIds(user._id),
  ]);
  if (!tutor?.tutor) return { error: "Profil de tuteur introuvable." };
  if (!student || !known.some((id) => id.equals(studentId))) return { error: "Vous ne pouvez planifier un cours qu'avec vos élèves." };
  if (!tutor.tutor.languages.some((l) => l.slug === languageSlug)) return { error: "Choisissez une langue que vous enseignez." };

  const [y, m, d] = [Number(date[1]), Number(date[2]), Number(date[3])];
  const starts = Array.from({ length: weeks }, (_, k) => zonedTimeToUtc(y, m, d + 7 * k, minutes, timeZone));
  if (starts[0].getTime() < Date.now() + MIN_NOTICE_MS) return { error: "Planifiez le cours au moins une heure à l'avance." };

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
  if (clash) return { error: `Le cours du ${formatIn(clash.startsAt, timeZone)} chevauche un autre cours. Choisissez un autre horaire.` };

  await db.lessons.insertMany(lessons);
  refreshAll();
  const first = student.name.split(" ")[0];
  return {
    success:
      weeks > 1
        ? `${weeks} cours hebdomadaires proposés à ${first}, à partir du ${formatIn(from, timeZone)}. ${first} les confirme depuis « Mes cours ».`
        : `Cours proposé à ${first} le ${formatIn(from, timeZone)}. ${first} le confirme depuis « Mes cours ».`,
  };
}
