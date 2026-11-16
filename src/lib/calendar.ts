import "server-only";
import type { Filter } from "mongodb";
import { languageName } from "@/i18n/catalog";
import { getLocale } from "@/i18n/server";
import { openIntervals, scheduleOf } from "./availability";
import { getDb, REAL_LESSON, type LessonDoc, type ObjectId, type WeeklyRange } from "./db";

// Data of the tutor's weekly calendar. Everything is serialisable (ISO dates) for the client component.

// "learning": a lesson the tutor takes themself, with another tutor.
export type LessonKind = "first" | "single" | "weekly" | "learning";

export type CalendarLesson = {
  id: string;
  starts_at: string;
  duration_minutes: number;
  status: LessonDoc["status"];
  kind: LessonKind;
  // Proposed by the tutor and not answered yet by the student.
  awaiting_student: boolean;
  // Booked and paid by the student, waiting for the tutor to accept it.
  awaiting_tutor: boolean;
  language_name: string;
  message: string;
  // The other person: the student, or the other tutor for a "learning" lesson.
  student_id: string;
  student_name: string;
  student_avatar: string;
};

export type CalendarBlock = { id: string; kind: "time_off" | "extra"; starts_at: string; ends_at: string; note: string };

export type TutorCalendarData = {
  lessons: CalendarLesson[];
  blocks: CalendarBlock[];
  open: { start: string; end: string }[];
  schedule: { time_zone: string; ranges: WeeklyRange[]; custom: boolean };
  students: { id: string; name: string }[];
  languages: { slug: string; name: string }[];
};

// Lessons the tutor should see: paid bookings, older unpaid-free ones, and their own proposals
// (never the practice classroom).
const VISIBLE_TO_TUTOR: Filter<LessonDoc> = { ...REAL_LESSON, $or: [{ "payment.status": { $nin: ["pending", "failed"] } }, { proposedBy: "tutor" }] };

// Students the tutor can schedule lessons with: anyone who booked them (a tutor included) or a student who wrote to them.
export async function tutorStudentIds(tutorId: ObjectId): Promise<ObjectId[]> {
  const db = await getDb();
  const [booked, wrote, received] = await Promise.all([
    db.lessons.distinct("studentId", { tutorId }),
    db.messages.distinct("senderId", { recipientId: tutorId }),
    db.messages.distinct("recipientId", { senderId: tutorId }),
  ]);
  const talked = [...wrote, ...received] as ObjectId[];
  const students = await db.users
    .find({ status: "active", _id: { $ne: tutorId }, $or: [{ _id: { $in: booked as ObjectId[] }, role: { $in: ["student", "tutor"] } }, { _id: { $in: talked }, role: "student" }] }, { projection: { _id: 1 } })
    .toArray();
  return students.map((s) => s._id);
}

// The first non-cancelled lesson of each student with this tutor ("Premier cours" tag).
async function firstLessonIds(tutorId: ObjectId, studentIds: ObjectId[]): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.lessons
    .aggregate<{ first: ObjectId }>([
      { $match: { tutorId, studentId: { $in: studentIds }, status: { $ne: "cancelled" }, ...VISIBLE_TO_TUTOR } },
      { $sort: { startsAt: 1 } },
      { $group: { _id: "$studentId", first: { $first: "$_id" } } },
    ])
    .toArray();
  return new Set(rows.map((r) => r.first.toHexString()));
}

export async function getTutorCalendar(tutorId: ObjectId, from: Date, to: Date): Promise<TutorCalendarData> {
  const locale = await getLocale();
  const db = await getDb();
  const tutor = await db.users.findOne({ _id: tutorId });
  if (!tutor?.tutor) throw new Error("Tutor profile not found.");

  const [lessons, learning, { open, blocks }, studentIds] = await Promise.all([
    db.lessons.find({ tutorId, startsAt: { $gte: from, $lt: to }, status: { $ne: "cancelled" }, ...VISIBLE_TO_TUTOR }).sort({ startsAt: 1 }).toArray(),
    // Lessons the tutor booked with another tutor (once paid): their time is taken too.
    db.lessons
      .find({ studentId: tutorId, startsAt: { $gte: from, $lt: to }, ...REAL_LESSON, $or: [{ status: { $in: ["confirmed", "completed"] } }, { status: "pending", "payment.status": "paid" }] })
      .toArray(),
    openIntervals(tutor, from, to),
    tutorStudentIds(tutorId),
  ]);
  const slugs = [...new Set([...tutor.tutor.languages.map((l) => l.slug), ...learning.map((l) => l.languageSlug)])];
  const [studentDocs, languageDocs] = await Promise.all([
    db.users.find({ _id: { $in: [...lessons.map((l) => l.studentId), ...learning.map((l) => l.tutorId), ...studentIds] } }, { projection: { name: 1, avatarUrl: 1 } }).toArray(),
    db.languages.find({ slug: { $in: slugs } }, { projection: { slug: 1, name: 1 } }).toArray(),
  ]);
  const people = new Map(studentDocs.map((u) => [u._id.toHexString(), u]));
  const firsts = await firstLessonIds(tutorId, [...new Map(lessons.map((l) => [l.studentId.toHexString(), l.studentId])).values()]);
  const languageNames = new Map(languageDocs.map((l) => [l.slug, languageName(l.slug, l.name, locale)]));
  const schedule = scheduleOf(tutor.tutor, tutor.country);

  const former = locale === "en" ? "Former member" : "Ancien membre";

  return {
    lessons: [
      ...lessons.map((l) => {
        const student = people.get(l.studentId.toHexString());
        const id = l._id.toHexString();
        return {
          id,
          starts_at: l.startsAt.toISOString(),
          duration_minutes: l.durationMinutes,
          status: l.status,
          kind: firsts.has(id) ? "first" : l.seriesId ? "weekly" : "single",
          awaiting_student: l.status === "pending" && l.proposedBy === "tutor",
          awaiting_tutor: l.status === "pending" && l.proposedBy !== "tutor",
          language_name: languageNames.get(l.languageSlug) ?? l.languageSlug,
          message: l.message,
          student_id: l.studentId.toHexString(),
          student_name: student?.name ?? former,
          student_avatar: student?.avatarUrl ?? "",
        } satisfies CalendarLesson;
      }),
      ...learning.map((l) => {
        const other = people.get(l.tutorId.toHexString());
        return {
          id: l._id.toHexString(),
          starts_at: l.startsAt.toISOString(),
          duration_minutes: l.durationMinutes,
          status: l.status,
          kind: "learning",
          awaiting_student: false,
          awaiting_tutor: false,
          language_name: languageNames.get(l.languageSlug) ?? l.languageSlug,
          message: l.message,
          student_id: l.tutorId.toHexString(),
          student_name: other?.name ?? former,
          student_avatar: other?.avatarUrl ?? "",
        } satisfies CalendarLesson;
      }),
    ].sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    blocks: blocks.map((b) => ({ id: b._id.toHexString(), kind: b.kind, starts_at: b.startsAt.toISOString(), ends_at: b.endsAt.toISOString(), note: b.note })),
    open: open.map(([s, e]) => ({ start: new Date(s).toISOString(), end: new Date(e).toISOString() })),
    schedule: { time_zone: schedule.timeZone, ranges: schedule.ranges, custom: !!tutor.tutor.schedule },
    students: studentIds
      .map((id) => ({ id: id.toHexString(), name: people.get(id.toHexString())?.name ?? "" }))
      .filter((s) => s.name)
      .sort((a, b) => a.name.localeCompare(b.name, "fr")),
    languages: tutor.tutor.languages.map((l) => ({ slug: l.slug, name: languageNames.get(l.slug) ?? l.slug })),
  };
}
