import "server-only";
import type { Filter } from "mongodb";
import { getDb, type CalendarBlockDoc, type LessonDoc, type ObjectId, type TutorProfile, type WeeklyRange, type WeeklySchedule } from "./db";
import { holdsSlot } from "./payments";
import { mergeIntervals, overlaps, subtractIntervals, zonedParts, zonedTimeToUtc, type Interval } from "./timezone";

// When a tutor can be booked: their weekly schedule, plus extra slots, minus time off,
// minus the lessons that already hold a slot.

export const SLOT_STEP_MINUTES = 30;
export const MIN_NOTICE_MS = 60 * 60 * 1000;
export const BOOKING_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

// Default clock for profiles created before the calendar existed.
const TIME_ZONE_BY_COUNTRY: Record<string, string> = {
  Kenya: "Africa/Nairobi", Tanzanie: "Africa/Dar_es_Salaam", Ouganda: "Africa/Kampala", Nigeria: "Africa/Lagos", Bénin: "Africa/Porto-Novo",
  Togo: "Africa/Lome", Ghana: "Africa/Accra", Sénégal: "Africa/Dakar", Gambie: "Africa/Banjul", Mali: "Africa/Bamako", Niger: "Africa/Niamey",
  "Burkina Faso": "Africa/Ouagadougou", "Côte d'Ivoire": "Africa/Abidjan", Guinée: "Africa/Conakry", Cameroun: "Africa/Douala", Gabon: "Africa/Libreville",
  "RD Congo": "Africa/Kinshasa", Congo: "Africa/Brazzaville", Rwanda: "Africa/Kigali", Burundi: "Africa/Bujumbura", Éthiopie: "Africa/Addis_Ababa",
  Érythrée: "Africa/Asmara", Djibouti: "Africa/Djibouti", Somalie: "Africa/Mogadishu", "Afrique du Sud": "Africa/Johannesburg", Zimbabwe: "Africa/Harare",
  Madagascar: "Indian/Antananarivo", Maroc: "Africa/Casablanca", Algérie: "Africa/Algiers", Tunisie: "Africa/Tunis", Égypte: "Africa/Cairo",
  France: "Europe/Paris", Belgique: "Europe/Brussels", Suisse: "Europe/Zurich", Canada: "America/Toronto", "États-Unis": "America/New_York",
};

export function defaultTimeZone(country: string) {
  return TIME_ZONE_BY_COUNTRY[country] ?? "UTC";
}

// The former availability tags, as hours of the day.
const DAY_PARTS: Record<string, [number, number]> = { matin: [6 * 60, 12 * 60], "apres-midi": [12 * 60, 18 * 60], soir: [18 * 60, 23 * 60] };

function legacySchedule(tags: string[], country: string): WeeklySchedule {
  const parts = Object.entries(DAY_PARTS).filter(([tag]) => tags.includes(tag)).map(([, range]) => range);
  const weekend = tags.includes("week-end") ? (parts.length ? parts : [[9 * 60, 18 * 60] as [number, number]]) : [];
  const ranges: WeeklyRange[] = [
    ...[0, 1, 2, 3, 4].flatMap((day) => parts.map(([start, end]) => ({ day, start, end }))),
    ...[5, 6].flatMap((day) => weekend.map(([start, end]) => ({ day, start, end }))),
  ];
  return { timeZone: defaultTimeZone(country), ranges: normalizeRanges(ranges), updatedAt: new Date(0) };
}

export function scheduleOf(tutor: Pick<TutorProfile, "schedule" | "availability">, country: string): WeeklySchedule {
  return tutor.schedule ?? legacySchedule(tutor.availability, country);
}

// Sorted, merged, on the 30-minute grid; invalid ranges are dropped.
export function normalizeRanges(ranges: WeeklyRange[]): WeeklyRange[] {
  const valid = ranges.filter(
    (r) => Number.isInteger(r.day) && r.day >= 0 && r.day <= 6 && r.start % SLOT_STEP_MINUTES === 0 && r.end % SLOT_STEP_MINUTES === 0 && r.start >= 0 && r.end <= 24 * 60 && r.start < r.end,
  );
  return [0, 1, 2, 3, 4, 5, 6].flatMap((day) =>
    mergeIntervals(valid.filter((r) => r.day === day).map((r) => [r.start, r.end] as Interval)).map(([start, end]) => ({ day, start, end })),
  );
}

// Tags used by the search filters ("matin", "soir", "week-end"…), derived from the weekly schedule.
export function availabilityTags(ranges: WeeklyRange[]): string[] {
  const weekdays = ranges.filter((r) => r.day < 5);
  const tags = Object.entries(DAY_PARTS).filter(([, [s, e]]) => weekdays.some((r) => r.start < e && r.end > s)).map(([tag]) => tag);
  if (ranges.some((r) => r.day >= 5)) tags.push("week-end");
  return tags;
}

// The weekly schedule laid out on real dates, as instants.
export function weeklyIntervals({ timeZone, ranges }: Pick<WeeklySchedule, "timeZone" | "ranges">, from: Date, to: Date): Interval[] {
  if (!ranges.length) return [];
  const first = zonedParts(new Date(from.getTime() - DAY_MS), timeZone);
  const days = Math.ceil((to.getTime() - from.getTime()) / DAY_MS) + 3;
  const out: Interval[] = [];
  for (let k = 0; k < days; k++) {
    const date = new Date(Date.UTC(first.year, first.month - 1, first.day + k));
    const [y, m, d, weekday] = [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), (date.getUTCDay() + 6) % 7];
    for (const r of ranges) {
      if (r.day === weekday) out.push([zonedTimeToUtc(y, m, d, r.start, timeZone).getTime(), zonedTimeToUtc(y, m, d, r.end, timeZone).getTime()]);
    }
  }
  return clamp(mergeIntervals(out), from, to);
}

const clamp = (list: Interval[], from: Date, to: Date): Interval[] =>
  list.map(([s, e]): Interval => [Math.max(s, from.getTime()), Math.min(e, to.getTime())]).filter(([s, e]) => e > s);

type TutorLike = { _id: ObjectId; country: string; tutor?: Pick<TutorProfile, "schedule" | "availability"> };

// Bookable time (before removing lessons), and the calendar blocks of the period.
export async function openIntervals(tutor: TutorLike, from: Date, to: Date): Promise<{ open: Interval[]; blocks: CalendarBlockDoc[] }> {
  const db = await getDb();
  const blocks = await db.calendarBlocks.find({ tutorId: tutor._id, startsAt: { $lt: to }, endsAt: { $gt: from } }).sort({ startsAt: 1 }).toArray();
  const span = (kind: CalendarBlockDoc["kind"]) => blocks.filter((b) => b.kind === kind).map((b): Interval => [b.startsAt.getTime(), b.endsAt.getTime()]);
  const weekly = tutor.tutor ? weeklyIntervals(scheduleOf(tutor.tutor, tutor.country), from, to) : [];
  return { open: clamp(subtractIntervals([...weekly, ...span("extra")], span("time_off")), from, to), blocks };
}

export const lessonInterval = (l: Pick<LessonDoc, "startsAt" | "durationMinutes">): Interval => [l.startsAt.getTime(), l.startsAt.getTime() + l.durationMinutes * 60 * 1000];

// Lessons of the tutor (or of the student) that keep that time busy.
export async function busyIntervals(who: { tutorId: ObjectId } | { studentId: ObjectId }, from: Date, to: Date, exceptId?: ObjectId): Promise<Interval[]> {
  const db = await getDb();
  // A lesson lasts a few hours at most, so one starting a little before `from` may still overlap it.
  const filter: Filter<LessonDoc> = { ...who, startsAt: { $lt: to, $gt: new Date(from.getTime() - 4 * 60 * 60 * 1000) }, ...holdsSlot() };
  if (exceptId) filter._id = { $ne: exceptId };
  const lessons = await db.lessons.find(filter, { projection: { startsAt: 1, durationMinutes: 1 } }).toArray();
  return lessons.map(lessonInterval);
}

// Every start time a student can book over the next days (on the 30-minute grid).
export async function bookableSlots(tutor: TutorLike, durationMinutes = 50, days = BOOKING_DAYS): Promise<string[]> {
  const now = Date.now();
  const from = new Date(now + MIN_NOTICE_MS);
  const to = new Date(now + days * DAY_MS);
  const [{ open }, busy] = await Promise.all([openIntervals(tutor, from, to), busyIntervals({ tutorId: tutor._id }, from, to)]);
  const step = SLOT_STEP_MINUTES * 60 * 1000;
  const length = durationMinutes * 60 * 1000;
  const slots: string[] = [];
  for (const [s, e] of open) {
    for (let t = Math.ceil(s / step) * step; t + length <= e; t += step) {
      if (!busy.some((b) => overlaps([t, t + length], b))) slots.push(new Date(t).toISOString());
    }
  }
  return slots;
}

// Whether a student can still book this exact start time.
export async function isSlotBookable(tutor: TutorLike, startsAt: Date, durationMinutes = 50): Promise<boolean> {
  const start = startsAt.getTime();
  const end = start + durationMinutes * 60 * 1000;
  if (start < Date.now() + MIN_NOTICE_MS || start % (SLOT_STEP_MINUTES * 60 * 1000) !== 0) return false;
  const [{ open }, busy] = await Promise.all([openIntervals(tutor, startsAt, new Date(end)), busyIntervals({ tutorId: tutor._id }, startsAt, new Date(end))]);
  const covered = open.some(([s, e]) => s <= start && e >= end);
  return covered && !busy.some((b) => overlaps([start, end], b));
}
