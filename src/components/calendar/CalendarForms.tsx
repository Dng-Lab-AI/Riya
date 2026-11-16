"use client";

import { useEffect, useState, useTransition } from "react";
import { Copy, Plus, Trash2, X } from "lucide-react";
import { defineMessages } from "@/i18n";
import { useLocale } from "@/i18n/client";
import { addExtraSlots, addTimeOff, saveAvailability, scheduleLesson } from "@/lib/actions/calendar";
import { WEEKDAYS, minutesToLabel, offsetMinutes, shiftWeeklyRanges } from "@/lib/timezone";

type FormState = { error?: string; success?: string } | undefined;
type Range = { day: number; start: number; end: number };

const STEP = 30;

const M = defineMessages({
  en: {
    close: "Close", saved: "Saved.", cancel: "Cancel", saving: "Saving…",
    noStudents: "You don't have any students yet. As soon as a student writes to you or books a lesson, you'll be able to propose lessons to them from your calendar.",
    student: "Student", chooseStudent: "Choose a student", language: "Language", day: "Day", time: "Time", repeat: "Repeat", once: "One-off lesson",
    weekly: (n: number) => `Every week, for ${n} weeks`, message: "Message for the student", optional: "(optional)",
    messagePlaceholder: "What we'll work on, the materials to bring…",
    proposalNote: "The student receives the proposal in “My lessons” and confirms it by paying. The slot stays blocked for you while waiting for their answer.",
    propose: "Propose the lesson", offDates: "Enter the dates of your time off.", offOrder: "The end of the time off must be after its start.",
    offIntro: "During time off, students can't book, even during your usual hours. Your weekly availability doesn't change.",
    allDay: "Whole day(s)", from: "From", to: "To", note: "Note", onlyYou: "(visible to you only)", notePlaceholder: "Holidays, appointment…",
    addOff: "Add the time off", slotOrder: "The end time must be after the start time.",
    extraIntro: "Open hours outside your usual availability, as an exception: students will be able to book them.", fromTime: "From", toTime: "To",
    openSlot: "Open this slot", rangeOrder: (day: string) => `${day}: the end time must be after the start time.`,
    availabilityIntro: "Students can book these hours every week, from midnight to midnight. You can always add extra slots or time off.",
    timeZone: "Time zone:", otherZone: (zone: string) => `(your hours, set for ${zone}, are shown in your device's time)`,
    fromProfile: ". These hours come from your profile: adjust them, then save.", unavailable: "Unavailable",
    removeRange: (day: string) => `Remove this range on ${day}`, addRange: "Add a range", applyAll: "Apply to every day", saveAvailability: "Save my availability",
  },
  fr: {
    close: "Fermer", saved: "Enregistré.", cancel: "Annuler", saving: "Enregistrement…",
    noStudents: "Vous n'avez pas encore d'élève. Dès qu'un élève vous écrit ou réserve un cours, vous pourrez lui proposer des cours depuis votre calendrier.",
    student: "Élève", chooseStudent: "Choisissez un élève", language: "Langue", day: "Jour", time: "Heure", repeat: "Répétition", once: "Cours ponctuel",
    weekly: (n: number) => `Chaque semaine, pendant ${n} semaines`, message: "Message pour l'élève", optional: "(facultatif)",
    messagePlaceholder: "Ce que nous travaillerons, le matériel à prévoir…",
    proposalNote: "L'élève reçoit la proposition dans « Mes cours » et la confirme en payant. Le créneau reste bloqué pour vous en attendant sa réponse.",
    propose: "Proposer le cours", offDates: "Indiquez les dates de votre absence.", offOrder: "La fin de l'absence doit être après son début.",
    offIntro: "Pendant une absence, les élèves ne peuvent pas réserver, même sur vos horaires habituels. Vos disponibilités hebdomadaires ne changent pas.",
    allDay: "Journée(s) entière(s)", from: "Du", to: "Au", note: "Note", onlyYou: "(visible par vous seul)", notePlaceholder: "Vacances, rendez-vous…",
    addOff: "Ajouter l'absence", slotOrder: "L'heure de fin doit être après l'heure de début.",
    extraIntro: "Ouvrez exceptionnellement des horaires en dehors de vos disponibilités habituelles : les élèves pourront les réserver.", fromTime: "De", toTime: "À",
    openSlot: "Ouvrir ce créneau", rangeOrder: (day: string) => `${day} : l'heure de fin doit être après l'heure de début.`,
    availabilityIntro: "Les élèves peuvent réserver ces horaires chaque semaine, de minuit à minuit. Vous pourrez toujours ajouter des créneaux supplémentaires ou des absences.",
    timeZone: "Fuseau horaire :", otherZone: (zone: string) => `(vos horaires, définis pour ${zone}, sont affichés à l'heure de votre appareil)`,
    fromProfile: ". Ces horaires sont repris de votre profil : ajustez-les puis enregistrez.", unavailable: "Indisponible",
    removeRange: (day: string) => `Retirer cette plage du ${day.toLowerCase()}`, addRange: "Ajouter une plage", applyAll: "Appliquer à tous les jours", saveAvailability: "Enregistrer mes disponibilités",
  },
});
export const START_OPTIONS = Array.from({ length: (24 * 60) / STEP }, (_, i) => i * STEP);
const END_OPTIONS = START_OPTIONS.map((m) => m + STEP);

export const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
export const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Local date + minutes after midnight -> instant (minutes may be 1440 for "24:00").
function localInstant(date: string, minutes: number) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d, 0, minutes);
}

export function Modal({ title, onClose, wide = false, children }: { title: string; onClose: () => void; wide?: boolean; children: React.ReactNode }) {
  const t = M[useLocale()];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-earth-900/40 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-[1.75rem] bg-white p-6 shadow-2xl sm:rounded-[1.75rem] ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"}`}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="font-display text-2xl font-semibold leading-tight">{title}</h2>
          <button type="button" onClick={onClose} className="btn-ghost -mr-2 -mt-1" aria-label={t.close}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Calls a server action with the form's data; `prepare` can add computed fields or return an error.
function useRunner(action: (prev: FormState, formData: FormData) => Promise<FormState>, onDone: (message: string) => void) {
  const t = M[useLocale()];
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const submit = (event: React.FormEvent<HTMLFormElement>, prepare?: (formData: FormData) => string | void) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const problem = prepare?.(formData);
    if (problem) return setError(problem);
    setError(undefined);
    start(async () => {
      const result = await action(undefined, formData);
      if (result?.error) setError(result.error);
      else onDone(result?.success ?? t.saved);
    });
  };
  return { error, pending, submit };
}

function Footer({ error, pending, label, onCancel }: { error?: string; pending: boolean; label: string; onCancel: () => void }) {
  const t = M[useLocale()];
  return (
    <div className="mt-6 space-y-3">
      {error && <p role="alert" className="rounded-xl bg-clay-50 px-4 py-3 text-sm font-medium text-clay-800">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-outline">{t.cancel}</button>
        <button type="submit" disabled={pending} className="btn-primary">{pending ? t.saving : label}</button>
      </div>
    </div>
  );
}

function TimeSelect({ name, value, onChange, options, id }: { name?: string; value: number; onChange?: (v: number) => void; options: number[]; id?: string }) {
  return (
    <select id={id} name={name} value={value} onChange={(e) => onChange?.(Number(e.target.value))} className="input">
      {options.map((m) => <option key={m} value={m}>{minutesToLabel(m)}</option>)}
    </select>
  );
}

// ── Schedule a lesson ────────────────────────────────────────────────

export function ScheduleLessonForm({
  students, languages, defaults, onDone, onCancel,
}: {
  students: { id: string; name: string }[];
  languages: { slug: string; name: string }[];
  defaults: { date: string; minutes: number; studentId?: string };
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const t = M[useLocale()];
  const { error, pending, submit } = useRunner(scheduleLesson, onDone);
  const [minutes, setMinutes] = useState(defaults.minutes);

  if (!students.length) {
    return (
      <div className="space-y-4 text-sm text-earth-700">
        <p>{t.noStudents}</p>
        <div className="flex justify-end"><button type="button" onClick={onCancel} className="btn-outline">{t.close}</button></div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) =>
        submit(e, (fd) => {
          fd.set("time", minutesToLabel(minutes));
          fd.set("time_zone", browserTimeZone());
        })
      }
      className="space-y-4"
    >
      <div>
        <label className="label" htmlFor="schedule-student">{t.student}</label>
        <select id="schedule-student" name="student_id" required defaultValue={defaults.studentId ?? ""} className="input">
          <option value="" disabled>{t.chooseStudent}</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      {languages.length > 1 ? (
        <div>
          <label className="label" htmlFor="schedule-language">{t.language}</label>
          <select id="schedule-language" name="language" className="input">
            {languages.map((l) => <option key={l.slug} value={l.slug}>{l.name}</option>)}
          </select>
        </div>
      ) : (
        <input type="hidden" name="language" value={languages[0]?.slug ?? ""} />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="schedule-date">{t.day}</label>
          <input id="schedule-date" name="date" type="date" required min={ymd(new Date())} defaultValue={defaults.date} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="schedule-time">{t.time} <span className="font-normal text-earth-500">(50 min)</span></label>
          <TimeSelect id="schedule-time" value={minutes} onChange={setMinutes} options={START_OPTIONS} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="schedule-weeks">{t.repeat}</label>
        <select id="schedule-weeks" name="weeks" defaultValue="1" className="input">
          <option value="1">{t.once}</option>
          {[2, 4, 6, 8, 12].map((n) => <option key={n} value={n}>{t.weekly(n)}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="schedule-message">{t.message} <span className="font-normal text-earth-500">{t.optional}</span></label>
        <textarea id="schedule-message" name="message" rows={2} maxLength={1000} className="input" placeholder={t.messagePlaceholder} />
      </div>
      <p className="rounded-2xl bg-sand-50 p-3 text-xs text-earth-600">
        {t.proposalNote}
      </p>
      <Footer error={error} pending={pending} label={t.propose} onCancel={onCancel} />
    </form>
  );
}

// ── Time off ─────────────────────────────────────────────────────────

export function TimeOffForm({ defaults, onDone, onCancel }: { defaults: { date: string }; onDone: (message: string) => void; onCancel: () => void }) {
  const t = M[useLocale()];
  const { error, pending, submit } = useRunner(addTimeOff, onDone);
  const [allDay, setAllDay] = useState(true);
  const [startDate, setStartDate] = useState(defaults.date);
  const [endDate, setEndDate] = useState(defaults.date);
  const [start, setStart] = useState(9 * 60);
  const [end, setEnd] = useState(12 * 60);

  return (
    <form
      onSubmit={(e) =>
        submit(e, (fd) => {
          if (!startDate || !endDate) return t.offDates;
          const from = localInstant(startDate, allDay ? 0 : start);
          const to = localInstant(endDate, allDay ? 24 * 60 : end);
          if (to <= from) return t.offOrder;
          fd.set("starts_at", from.toISOString());
          fd.set("ends_at", to.toISOString());
        })
      }
      className="space-y-4"
    >
      <p className="text-sm text-earth-600">{t.offIntro}</p>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="h-4 w-4 accent-clay-600" /> {t.allDay}
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="off-start-date">{t.from}</label>
          <input id="off-start-date" type="date" required min={ymd(new Date())} value={startDate} onChange={(e) => { setStartDate(e.target.value); if (e.target.value > endDate) setEndDate(e.target.value); }} className="input" />
          {!allDay && <div className="mt-2"><TimeSelect value={start} onChange={setStart} options={START_OPTIONS} /></div>}
        </div>
        <div>
          <label className="label" htmlFor="off-end-date">{t.to}</label>
          <input id="off-end-date" type="date" required min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" />
          {!allDay && <div className="mt-2"><TimeSelect value={end} onChange={setEnd} options={END_OPTIONS} /></div>}
        </div>
      </div>
      <div>
        <label className="label" htmlFor="off-note">{t.note} <span className="font-normal text-earth-500">{t.onlyYou}</span></label>
        <input id="off-note" name="note" maxLength={200} className="input" placeholder={t.notePlaceholder} />
      </div>
      <Footer error={error} pending={pending} label={t.addOff} onCancel={onCancel} />
    </form>
  );
}

// ── Extra slots ──────────────────────────────────────────────────────

export function ExtraSlotsForm({ defaults, onDone, onCancel }: { defaults: { date: string; minutes: number }; onDone: (message: string) => void; onCancel: () => void }) {
  const t = M[useLocale()];
  const { error, pending, submit } = useRunner(addExtraSlots, onDone);
  const [date, setDate] = useState(defaults.date);
  const [start, setStart] = useState(defaults.minutes);
  const [end, setEnd] = useState(Math.min(defaults.minutes + 120, 24 * 60));

  return (
    <form
      onSubmit={(e) =>
        submit(e, (fd) => {
          if (end <= start) return t.slotOrder;
          fd.set("starts_at", localInstant(date, start).toISOString());
          fd.set("ends_at", localInstant(date, end).toISOString());
        })
      }
      className="space-y-4"
    >
      <p className="text-sm text-earth-600">{t.extraIntro}</p>
      <div>
        <label className="label" htmlFor="extra-date">{t.day}</label>
        <input id="extra-date" type="date" required min={ymd(new Date())} value={date} onChange={(e) => setDate(e.target.value)} className="input" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="extra-start">{t.fromTime}</label>
          <TimeSelect id="extra-start" value={start} onChange={setStart} options={START_OPTIONS} />
        </div>
        <div>
          <label className="label" htmlFor="extra-end">{t.toTime}</label>
          <TimeSelect id="extra-end" value={end} onChange={setEnd} options={END_OPTIONS} />
        </div>
      </div>
      <Footer error={error} pending={pending} label={t.openSlot} onCancel={onCancel} />
    </form>
  );
}

// ── Weekly availability ──────────────────────────────────────────────

export function AvailabilityForm({
  schedule, onDone, onCancel,
}: {
  schedule: { time_zone: string; ranges: Range[]; custom: boolean };
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const locale = useLocale();
  const t = M[locale];
  const weekdays = WEEKDAYS[locale];
  const { error, pending, submit } = useRunner(saveAvailability, onDone);
  const timeZone = browserTimeZone();
  // Hours saved for another time zone are shown on this device's clock (same real hours),
  // rounded to the 30-minute grid.
  const [ranges, setRanges] = useState<Range[]>(() => {
    if (schedule.time_zone === timeZone) return schedule.ranges;
    const delta = Math.round((offsetMinutes(timeZone) - offsetMinutes(schedule.time_zone)) / STEP) * STEP;
    return shiftWeeklyRanges(schedule.ranges, delta);
  });
  const ofDay = (day: number) => ranges.map((r, index) => ({ ...r, index })).filter((r) => r.day === day).sort((a, b) => a.start - b.start);

  const update = (index: number, patch: Partial<Range>) => setRanges((list) => list.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const remove = (index: number) => setRanges((list) => list.filter((_, i) => i !== index));
  const add = (day: number) =>
    setRanges((list) => {
      const last = list.filter((r) => r.day === day).sort((a, b) => a.end - b.end).at(-1);
      const start = last ? Math.min(last.end + 60, 23 * 60) : 9 * 60;
      return [...list, { day, start, end: Math.min(start + 3 * 60, 24 * 60) }];
    });
  const toggleDay = (day: number, on: boolean) => (on ? add(day) : setRanges((list) => list.filter((r) => r.day !== day)));
  const copyToAll = (day: number) => {
    const model = ranges.filter((r) => r.day === day);
    setRanges([0, 1, 2, 3, 4, 5, 6].flatMap((d) => model.map((r) => ({ ...r, day: d }))));
  };

  return (
    <form
      onSubmit={(e) =>
        submit(e, (fd) => {
          const invalid = ranges.find((r) => r.end <= r.start);
          if (invalid) return t.rangeOrder(weekdays[invalid.day]);
          fd.set("ranges", JSON.stringify(ranges));
          fd.set("time_zone", timeZone);
        })
      }
      className="space-y-4"
    >
      <p className="text-sm text-earth-600">
        {t.availabilityIntro}
      </p>
      <p className="rounded-2xl bg-sand-50 p-3 text-xs text-earth-600">
        {t.timeZone} <strong>{timeZone}</strong>
        {schedule.time_zone !== timeZone && <> {t.otherZone(schedule.time_zone)}</>}
        {!schedule.custom && t.fromProfile}
      </p>

      <ul className="divide-y divide-sand-200 rounded-2xl border border-sand-200">
        {weekdays.map((label, day) => {
          const list = ofDay(day);
          return (
            <li key={label} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-start">
              <label className="flex w-32 shrink-0 items-center gap-2 pt-2.5 text-sm font-semibold">
                <input type="checkbox" checked={list.length > 0} onChange={(e) => toggleDay(day, e.target.checked)} className="h-4 w-4 accent-forest-600" />
                {label}
              </label>
              <div className="flex-1 space-y-2">
                {list.length === 0 && <p className="pt-2.5 text-sm text-earth-500">{t.unavailable}</p>}
                {list.map((r) => (
                  <div key={r.index} className="flex items-center gap-2">
                    <TimeSelect value={r.start} onChange={(v) => update(r.index, { start: v })} options={START_OPTIONS} />
                    <span className="text-earth-500">–</span>
                    <TimeSelect value={r.end} onChange={(v) => update(r.index, { end: v })} options={END_OPTIONS} />
                    <button type="button" onClick={() => remove(r.index)} className="btn-ghost shrink-0 px-2 text-clay-700" aria-label={t.removeRange(label)}><Trash2 size={16} /></button>
                  </div>
                ))}
                <div className="flex flex-wrap gap-1">
                  <button type="button" onClick={() => add(day)} className="btn-ghost px-2 py-1 text-xs"><Plus size={14} /> {t.addRange}</button>
                  {list.length > 0 && (
                    <button type="button" onClick={() => copyToAll(day)} className="btn-ghost px-2 py-1 text-xs"><Copy size={14} /> {t.applyAll}</button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <Footer error={error} pending={pending} label={t.saveAvailability} onCancel={onCancel} />
    </form>
  );
}
