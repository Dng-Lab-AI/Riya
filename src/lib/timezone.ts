// Time zone arithmetic with the built-in Intl API (no dependency), usable on the server and in the browser.
// Weekdays are numbered from Monday (0) to Sunday (6), like the tutor's weekly schedule.

export const WEEKDAYS: Record<"en" | "fr", readonly string[]> = {
  en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  fr: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"],
};

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string) {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
    formatters.set(timeZone, f);
  }
  return f;
}

export function isValidTimeZone(timeZone: string) {
  try {
    formatterFor(timeZone);
    return true;
  } catch {
    return false;
  }
}

// Calendar date and wall-clock time of an instant in a time zone.
export function zonedParts(date: Date, timeZone: string) {
  const parts = Object.fromEntries(formatterFor(timeZone).formatToParts(date).map((p) => [p.type, p.value]));
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const hour = Number(parts.hour) % 24;
  const minute = Number(parts.minute);
  const second = Number(parts.second);
  return { year, month, day, hour, minute, second, weekday: (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7 };
}

// Offset of the time zone from UTC at that instant, in milliseconds.
function offsetMs(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(date.getTime() / 1000) * 1000;
}

export function offsetMinutes(timeZone: string, at = new Date()) {
  return Math.round(offsetMs(at, timeZone) / 60000);
}

// Weekly ranges moved by `delta` minutes (another time zone), split where they cross midnight.
export function shiftWeeklyRanges<T extends { day: number; start: number; end: number }>(ranges: T[], delta: number) {
  const WEEK = 7 * 24 * 60;
  const out: { day: number; start: number; end: number }[] = [];
  for (const r of ranges) {
    let s = (((r.day * 1440 + r.start + delta) % WEEK) + WEEK) % WEEK;
    const e = s + (r.end - r.start);
    while (s < e) {
      const dayStart = Math.floor(s / 1440) * 1440;
      const segmentEnd = Math.min(e, dayStart + 1440);
      out.push({ day: (dayStart / 1440) % 7, start: s - dayStart, end: segmentEnd - dayStart });
      s = segmentEnd;
    }
  }
  return out;
}

// The instant at which the clock of `timeZone` shows that date and time (minutes after midnight, may exceed 1440).
export function zonedTimeToUtc(year: number, month: number, day: number, minutes: number, timeZone: string): Date {
  const guess = Date.UTC(year, month - 1, day, 0, minutes);
  const first = offsetMs(new Date(guess), timeZone);
  const second = offsetMs(new Date(guess - first), timeZone);
  return new Date(guess - second);
}

export function minutesToLabel(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

// "09:30" -> 570; null when malformed. "24:00" is allowed as the end of the day.
export function labelToMinutes(label: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(label.trim());
  if (!m) return null;
  const minutes = Number(m[1]) * 60 + Number(m[2]);
  return minutes >= 0 && minutes <= 24 * 60 && Number(m[2]) < 60 ? minutes : null;
}

// ── Intervals (milliseconds since the epoch, end excluded) ─────────────

export type Interval = [number, number];

export function mergeIntervals(list: Interval[]): Interval[] {
  const sorted = list.filter(([s, e]) => e > s).sort((a, b) => a[0] - b[0]);
  const out: Interval[] = [];
  for (const [s, e] of sorted) {
    const last = out.at(-1);
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
}

export function subtractIntervals(from: Interval[], remove: Interval[]): Interval[] {
  let result = mergeIntervals(from);
  for (const [rs, re] of mergeIntervals(remove)) {
    result = result.flatMap(([s, e]): Interval[] => {
      if (re <= s || rs >= e) return [[s, e]];
      return [...(rs > s ? [[s, rs] as Interval] : []), ...(re < e ? [[re, e] as Interval] : [])];
    });
  }
  return result;
}

export const overlaps = (a: Interval, b: Interval) => a[0] < b[1] && b[0] < a[1];
