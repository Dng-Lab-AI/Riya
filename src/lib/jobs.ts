import "server-only";
import { sendLessonMails } from "./lesson-mails";
import { sendBookingReminders } from "./notifications";

// Background tasks (booking reminders to tutors, lesson e-mails). They run when members use the site,
// at most once a minute per server; in production, /api/cron can also be called every few minutes.
const globalForJobs = globalThis as unknown as { riyaJobsAt?: number };

export async function runScheduledJobs(force = false) {
  const now = Date.now();
  if (!force && now - (globalForJobs.riyaJobsAt ?? 0) < 60 * 1000) return;
  globalForJobs.riyaJobsAt = now;
  await Promise.all([
    sendBookingReminders().catch((err) => console.error("Booking reminders", err)),
    sendLessonMails().catch((err) => console.error("Lesson e-mails", err)),
  ]);
}
