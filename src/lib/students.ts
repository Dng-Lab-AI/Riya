import "server-only";
import type { ObjectId } from "./db";
import { getTutorLessons, type Lesson } from "./queries";

// "My students": one row per student of the tutor, built from their lessons.

export type StudentType = "new" | "weekly" | "regular" | "occasional" | "inactive";

export type StudentRow = {
  id: string;
  name: string;
  avatar_url: string;
  type: StudentType;
  completed: number;
  // Lessons taken or planned (not cancelled).
  total: number;
  next_at: string | null;
  last_at: string | null;
  // Shown in the "suggested action" column.
  action: { kind: "request" | "feedback" | "rebook"; lesson_id: string } | null;
  // Has a lesson planned, or took one in the last two months.
  current: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function typeOf(lessons: Lesson[], now: number): StudentType {
  const kept = lessons.filter((l) => l.status !== "cancelled");
  if (!kept.length) return "inactive";
  // A weekly series planned from the calendar, still running.
  if (kept.some((l) => l.weekly && new Date(l.starts_at).getTime() > now)) return "weekly";
  const recent = kept.filter((l) => Math.abs(new Date(l.starts_at).getTime() - now) < 60 * DAY_MS).length;
  if (kept.length === 1) return "new";
  return recent >= 3 ? "regular" : "occasional";
}

export async function getTutorStudents(tutorId: ObjectId): Promise<StudentRow[]> {
  const lessons = await getTutorLessons(tutorId);
  const now = Date.now();
  const byStudent = new Map<string, Lesson[]>();
  for (const l of lessons) byStudent.set(l.other_id, [...(byStudent.get(l.other_id) ?? []), l]);

  return [...byStudent.values()]
    .map((list): StudentRow => {
      const sorted = [...list].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
      const startOf = (l: Lesson) => new Date(l.starts_at).getTime();
      const upcoming = sorted.filter((l) => ["pending", "confirmed"].includes(l.status) && startOf(l) > now);
      const past = sorted.filter((l) => l.status === "completed" || (l.status === "confirmed" && startOf(l) <= now));
      const last = past.at(-1);
      // A booking waiting for the tutor (not a lesson the tutor proposed, which waits for the student).
      const request = upcoming.find((l) => l.status === "pending" && !l.proposed_by_tutor);
      const action: StudentRow["action"] = request
        ? { kind: "request", lesson_id: request.id }
        : last && !last.has_notes
          ? { kind: "feedback", lesson_id: last.id }
          : last && !upcoming.length
            ? { kind: "rebook", lesson_id: last.id }
            : null;
      return {
        id: sorted[0].other_id,
        name: sorted[0].other_name,
        avatar_url: sorted[0].other_avatar,
        type: typeOf(sorted, now),
        completed: sorted.filter((l) => l.status === "completed").length,
        total: sorted.filter((l) => l.status !== "cancelled").length,
        next_at: upcoming[0]?.starts_at ?? null,
        last_at: last?.starts_at ?? null,
        action,
        current: upcoming.length > 0 || (!!last && now - startOf(last) < 60 * DAY_MS),
      };
    })
    .sort((a, b) => (a.next_at ?? "9999").localeCompare(b.next_at ?? "9999") || (b.last_at ?? "").localeCompare(a.last_at ?? ""));
}
