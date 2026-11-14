"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { CalendarCog, CalendarPlus, CalendarX2, ChevronLeft, ChevronRight, CircleCheck, Hourglass, MessageCircle, NotebookText, Plus, Trash2, Video } from "lucide-react";
import { deleteCalendarBlock } from "@/lib/actions/calendar";
import { updateLesson } from "@/lib/actions/lessons";
import type { CalendarBlock, CalendarLesson, LessonKind, TutorCalendarData } from "@/lib/calendar";
import { Avatar } from "../ui";
import { AvailabilityForm, ExtraSlotsForm, Modal, ScheduleLessonForm, TimeOffForm, ymd } from "./CalendarForms";

const HOUR_PX = 44;
const HOUR_MS = 60 * 60 * 1000;

// Colours of the lesson tags, so the tutor tells their lessons apart at a glance.
export const KIND_STYLES: Record<LessonKind, { label: string; swatch: string; box: string }> = {
  first: { label: "Premier cours", swatch: "bg-forest-600", box: "border-forest-600 bg-forest-100 text-forest-900" },
  single: { label: "Cours ponctuel", swatch: "bg-sky-600", box: "border-sky-600 bg-sky-100 text-sky-950" },
  weekly: { label: "Cours hebdomadaire", swatch: "bg-clay-600", box: "border-clay-600 bg-clay-100 text-clay-800" },
};
const TIME_OFF_STYLE = "border-ochre-500 bg-ochre-100 text-ochre-800";
const STRIPES = "repeating-linear-gradient(135deg, rgb(237 179 58 / 0.25) 0 6px, transparent 6px 12px)";

type Dialog =
  | { type: "schedule"; date: string; minutes: number; studentId?: string }
  | { type: "time_off"; date: string }
  | { type: "extra"; date: string; minutes: number }
  | { type: "availability" }
  | { type: "lesson"; lesson: CalendarLesson }
  | { type: "block"; block: CalendarBlock }
  | null;

const noopSubscribe = () => () => {};
const useIsClient = () => useSyncExternalStore(noopSubscribe, () => true, () => false);

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const mondayOf = (d: Date) => addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), -((d.getDay() + 6) % 7));
const parseYmd = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const timeLabel = (ms: number) => new Date(ms).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const ms = (iso: string) => new Date(iso).getTime();
const lessonEnd = (l: CalendarLesson) => ms(l.starts_at) + l.duration_minutes * 60 * 1000;

function weekLabel(monday: Date) {
  const sunday = addDays(monday, 6);
  const month = (d: Date, year = false) => d.toLocaleDateString("fr-FR", { month: "short", ...(year ? { year: "numeric" } : {}) });
  return monday.getMonth() === sunday.getMonth()
    ? `${monday.getDate()} – ${sunday.getDate()} ${month(sunday, true)}`
    : `${monday.getDate()} ${month(monday)} – ${sunday.getDate()} ${month(sunday, true)}`;
}

// Where an interval falls inside one day column, in pixels; null when it is not on that day.
function place(start: number, end: number, day: Date) {
  const dayStart = day.getTime();
  const dayEnd = addDays(day, 1).getTime();
  const s = Math.max(start, dayStart);
  const e = Math.min(end, dayEnd);
  if (e <= s) return null;
  return { top: ((s - dayStart) / HOUR_MS) * HOUR_PX, height: ((e - s) / HOUR_MS) * HOUR_PX };
}

function statusLabel(l: CalendarLesson) {
  if (l.awaiting_student) return "En attente de l'élève";
  if (l.awaiting_tutor) return "À confirmer";
  return l.status === "completed" ? "Terminé" : "Confirmé";
}

export function TutorCalendar(props: { week: string | null; data: TutorCalendarData; preselectStudent: string }) {
  if (!useIsClient()) return <div className="h-[40rem] animate-pulse rounded-[1.75rem] bg-sand-100" />;
  return <CalendarView {...props} />;
}

function CalendarView({ week, data, preselectStudent }: { week: string | null; data: TutorCalendarData; preselectStudent: string }) {
  const monday = useMemo(() => mondayOf(week ? parseYmd(week) : new Date()), [week]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(monday, i)), [monday]);
  const [view, setView] = useState<"week" | "agenda">("week");
  const [modal, setModal] = useState<Dialog>(() =>
    preselectStudent ? { type: "schedule", date: ymd(addDays(new Date(), 1)), minutes: 10 * 60, studentId: preselectStudent } : null,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const close = useCallback(() => setModal(null), []);
  const done = useCallback((message: string) => {
    setModal(null);
    setNotice(message);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const weekStart = monday.getTime();
  const weekEnd = addDays(monday, 7).getTime();
  const lessons = data.lessons.filter((l) => ms(l.starts_at) < weekEnd && lessonEnd(l) > weekStart);
  const blocks = data.blocks.filter((b) => ms(b.starts_at) < weekEnd && ms(b.ends_at) > weekStart);
  const today = ymd(new Date(now));
  const defaultDate = ymd(days.find((d) => ymd(d) >= today) ?? addDays(new Date(), 1));

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setModal({ type: "schedule", date: defaultDate, minutes: 10 * 60 })} className="btn-primary"><Plus size={16} /> Planifier un cours</button>
        <button type="button" onClick={() => setModal({ type: "time_off", date: defaultDate })} className="btn-outline"><CalendarX2 size={16} /> Ajouter une absence</button>
        <button type="button" onClick={() => setModal({ type: "extra", date: defaultDate, minutes: 18 * 60 })} className="btn-outline"><CalendarPlus size={16} /> Créneaux supplémentaires</button>
        <button type="button" onClick={() => setModal({ type: "availability" })} className="btn-outline"><CalendarCog size={16} /> Mes disponibilités</button>
      </div>

      {notice && (
        <p role="status" className="flex items-start justify-between gap-3 rounded-2xl bg-forest-100 px-4 py-3 text-sm font-medium text-forest-800">
          {notice}
          <button type="button" onClick={() => setNotice(null)} className="shrink-0 underline">OK</button>
        </p>
      )}

      <section className="overflow-hidden rounded-[1.75rem] border border-sand-200 bg-white">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand-200 p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <div className="flex overflow-hidden rounded-full border border-earth-900/15">
              <Link href={`/calendrier?semaine=${ymd(addDays(monday, -7))}`} className="px-3 py-2 hover:bg-sand-100" aria-label="Semaine précédente"><ChevronLeft size={18} /></Link>
              <Link href={`/calendrier?semaine=${ymd(addDays(monday, 7))}`} className="border-l border-earth-900/15 px-3 py-2 hover:bg-sand-100" aria-label="Semaine suivante"><ChevronRight size={18} /></Link>
            </div>
            <h2 className="font-display text-xl font-semibold sm:text-2xl">{weekLabel(monday)}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/calendrier" className="btn-outline px-4 py-2">Aujourd&apos;hui</Link>
            <div className="flex rounded-full bg-sand-100 p-1 text-sm font-medium" role="tablist" aria-label="Affichage">
              {(["week", "agenda"] as const).map((v) => (
                <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`rounded-full px-4 py-1.5 transition ${view === v ? "bg-white shadow-sm" : "text-earth-600"}`}>
                  {v === "week" ? "Semaine" : "Agenda"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {view === "week" ? (
          <WeekGrid days={days} data={data} lessons={lessons} blocks={blocks} now={now} onOpen={setModal} />
        ) : (
          <Agenda days={days} lessons={lessons} blocks={blocks} onOpen={setModal} />
        )}
      </section>

      <Legend />

      {modal?.type === "schedule" && (
        <Modal title="Planifier un cours" onClose={close}>
          <ScheduleLessonForm students={data.students} languages={data.languages} defaults={modal} onDone={done} onCancel={close} />
        </Modal>
      )}
      {modal?.type === "time_off" && (
        <Modal title="Ajouter une absence" onClose={close}>
          <TimeOffForm defaults={modal} onDone={done} onCancel={close} />
        </Modal>
      )}
      {modal?.type === "extra" && (
        <Modal title="Ajouter des créneaux supplémentaires" onClose={close}>
          <ExtraSlotsForm defaults={modal} onDone={done} onCancel={close} />
        </Modal>
      )}
      {modal?.type === "availability" && (
        <Modal title="Mes disponibilités hebdomadaires" onClose={close} wide>
          <AvailabilityForm schedule={data.schedule} onDone={done} onCancel={close} />
        </Modal>
      )}
      {modal?.type === "lesson" && <LessonDetails lesson={modal.lesson} now={now} onClose={close} onDone={done} />}
      {modal?.type === "block" && <BlockDetails block={modal.block} onClose={close} onDone={done} />}
    </div>
  );
}

function WeekGrid({
  days, data, lessons, blocks, now, onOpen,
}: {
  days: Date[];
  data: TutorCalendarData;
  lessons: CalendarLesson[];
  blocks: CalendarBlock[];
  now: number;
  onOpen: (m: Dialog) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const today = ymd(new Date(now));

  // Start the view a little before the first lesson of the week (or at 8:00).
  useEffect(() => {
    const hours = lessons.map((l) => new Date(l.starts_at).getHours());
    const first = hours.length ? Math.min(...hours) : 8;
    scroller.current?.scrollTo({ top: Math.max(0, first - 1) * HOUR_PX });
    // Only when the week changes, not on every refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days[0].getTime()]);

  // Clicking a free spot proposes to schedule a lesson at that time.
  const onColumnClick = (day: Date, event: React.MouseEvent<HTMLDivElement>) => {
    const y = event.clientY - event.currentTarget.getBoundingClientRect().top;
    const minutes = Math.min(23 * 60 + 30, Math.max(0, Math.floor((y / HOUR_PX) * 2) * 30));
    onOpen({ type: "schedule", date: ymd(day), minutes });
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[44rem]">
        <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b border-sand-200 text-center text-sm">
          <div />
          {days.map((d) => {
            const isToday = ymd(d) === today;
            return (
              <div key={d.getTime()} className={`py-2.5 ${isToday ? "font-semibold text-earth-900" : "text-earth-600"}`}>
                <span className="capitalize">{d.toLocaleDateString("fr-FR", { weekday: "short" })}</span>{" "}
                <span className={isToday ? "rounded-full bg-clay-600 px-2 py-0.5 text-white" : ""}>{d.getDate()}</span>
              </div>
            );
          })}
        </div>

        <div ref={scroller} className="max-h-[36rem] overflow-y-auto">
          <div className="relative grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]" style={{ height: 24 * HOUR_PX }}>
            <div className="relative">
              {Array.from({ length: 24 }, (_, h) => (
                <span key={h} className="absolute right-2 -translate-y-1/2 text-[11px] text-earth-400" style={{ top: h * HOUR_PX }}>
                  {h > 0 && `${String(h).padStart(2, "0")}:00`}
                </span>
              ))}
            </div>

            {days.map((day) => {
              const isToday = ymd(day) === today;
              const nowLine = isToday ? place(now, now + 1, day) : null;
              return (
                <div
                  key={day.getTime()}
                  onClick={(e) => onColumnClick(day, e)}
                  className="relative cursor-pointer border-l border-sand-200 bg-sand-100/70"
                  style={{ backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 ${HOUR_PX - 1}px, var(--color-sand-200) ${HOUR_PX - 1}px ${HOUR_PX}px)` }}
                >
                  {/* Bookable hours (weekly schedule and extra slots, minus time off). */}
                  {data.open.map((o) => {
                    const pos = place(ms(o.start), ms(o.end), day);
                    return pos && <div key={o.start} className="absolute inset-x-0 bg-white" style={{ ...pos, backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 ${HOUR_PX - 1}px, var(--color-sand-200) ${HOUR_PX - 1}px ${HOUR_PX}px)`, backgroundPositionY: -pos.top }} />;
                  })}

                  {blocks.map((b) => {
                    const pos = place(ms(b.starts_at), ms(b.ends_at), day);
                    if (!pos) return null;
                    const timeOff = b.kind === "time_off";
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onOpen({ type: "block", block: b }); }}
                        className={`absolute inset-x-0.5 z-10 overflow-hidden rounded-md border-l-4 px-1.5 py-0.5 text-left text-[11px] font-semibold ${timeOff ? TIME_OFF_STYLE : "border-dashed border-forest-500 bg-forest-100/40 text-forest-800"}`}
                        style={{ ...pos, ...(timeOff ? { backgroundImage: STRIPES } : {}) }}
                      >
                        {timeOff ? "Absence" : "Créneau ajouté"}
                      </button>
                    );
                  })}

                  {lessons.map((l) => {
                    const pos = place(ms(l.starts_at), lessonEnd(l), day);
                    if (!pos) return null;
                    const style = KIND_STYLES[l.kind];
                    const Icon = l.status === "pending" ? Hourglass : CircleCheck;
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onOpen({ type: "lesson", lesson: l }); }}
                        className={`absolute inset-x-1 z-20 overflow-hidden rounded-lg border-l-4 px-1.5 py-1 text-left text-[11px] leading-tight shadow-sm transition hover:shadow-md ${style.box} ${l.status === "completed" ? "opacity-70" : ""} ${l.status === "pending" ? "border-dashed" : ""}`}
                        style={pos}
                        title={`${l.student_name} · ${style.label} · ${statusLabel(l)}`}
                      >
                        <span className="flex items-center gap-1 font-semibold"><Icon size={11} className="shrink-0" /> <span className="truncate">{l.student_name}</span></span>
                        {pos.height > 30 && <span className="block truncate">{timeLabel(ms(l.starts_at))} – {timeLabel(lessonEnd(l))}</span>}
                      </button>
                    );
                  })}

                  {nowLine && (
                    <div className="pointer-events-none absolute inset-x-0 z-30 flex items-center" style={{ top: nowLine.top }}>
                      <span className="-ml-1 h-2.5 w-2.5 rounded-full bg-clay-600" />
                      <span className="h-0.5 flex-1 bg-clay-600" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Agenda({ days, lessons, blocks, onOpen }: { days: Date[]; lessons: CalendarLesson[]; blocks: CalendarBlock[]; onOpen: (m: Dialog) => void }) {
  const items = days.map((day) => {
    const start = day.getTime();
    const end = addDays(day, 1).getTime();
    return {
      day,
      lessons: lessons.filter((l) => ms(l.starts_at) >= start && ms(l.starts_at) < end),
      blocks: blocks.filter((b) => ms(b.starts_at) < end && ms(b.ends_at) > start),
    };
  });
  if (items.every((i) => !i.lessons.length && !i.blocks.length)) {
    return <p className="p-8 text-center text-earth-600">Rien de prévu cette semaine.</p>;
  }
  return (
    <ul className="divide-y divide-sand-200">
      {items.filter((i) => i.lessons.length || i.blocks.length).map(({ day, lessons, blocks }) => (
        <li key={day.getTime()} className="grid gap-3 p-4 sm:grid-cols-[9rem_1fr]">
          <p className="font-semibold capitalize">{day.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" })}</p>
          <div className="space-y-2">
            {blocks.map((b) => (
              <button key={b.id} type="button" onClick={() => onOpen({ type: "block", block: b })} className={`block w-full rounded-xl border-l-4 px-3 py-2 text-left text-sm ${b.kind === "time_off" ? TIME_OFF_STYLE : "border-dashed border-forest-500 bg-forest-100/40 text-forest-800"}`}>
                <span className="font-semibold">{b.kind === "time_off" ? "Absence" : "Créneau supplémentaire"}</span> · {timeLabel(ms(b.starts_at))} – {timeLabel(ms(b.ends_at))}
                {b.note && <span className="text-earth-600"> · {b.note}</span>}
              </button>
            ))}
            {lessons.map((l) => (
              <button key={l.id} type="button" onClick={() => onOpen({ type: "lesson", lesson: l })} className={`flex w-full items-center gap-3 rounded-xl border-l-4 px-3 py-2 text-left text-sm ${KIND_STYLES[l.kind].box}`}>
                <span className="w-28 shrink-0 font-semibold">{timeLabel(ms(l.starts_at))} – {timeLabel(lessonEnd(l))}</span>
                <span className="min-w-0 flex-1 truncate">{l.student_name} · {l.language_name}</span>
                <span className="hidden text-xs sm:inline">{statusLabel(l)}</span>
              </button>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Legend() {
  return (
    <div className="grid gap-4 rounded-[1.75rem] border border-sand-200 bg-white p-5 text-sm sm:grid-cols-2">
      <div>
        <p className="mb-2 font-semibold">Étiquettes</p>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {Object.values(KIND_STYLES).map((k) => (
            <li key={k.label} className="flex items-center gap-2"><span className={`h-4 w-1.5 rounded-full ${k.swatch}`} /> {k.label}</li>
          ))}
          <li className="flex items-center gap-2"><span className="h-4 w-1.5 rounded-full bg-ochre-500" /> Absence</li>
          <li className="flex items-center gap-2"><span className="h-4 w-1.5 rounded-full border border-dashed border-forest-500" /> Créneau supplémentaire</li>
        </ul>
      </div>
      <div>
        <p className="mb-2 font-semibold">Statut et disponibilité</p>
        <ul className="space-y-1.5">
          <li className="flex items-center gap-2"><Hourglass size={15} /> En attente de confirmation</li>
          <li className="flex items-center gap-2"><CircleCheck size={15} /> Cours confirmé</li>
          <li className="flex items-center gap-2"><span className="h-4 w-4 rounded border border-sand-200 bg-white" /> Réservable par les élèves <span className="ml-2 h-4 w-4 rounded bg-sand-100" /> Indisponible</li>
        </ul>
      </div>
    </div>
  );
}

function LessonDetails({ lesson, now, onClose, onDone }: { lesson: CalendarLesson; now: number; onClose: () => void; onDone: (m: string) => void }) {
  const start = ms(lesson.starts_at);
  const end = lessonEnd(lesson);
  const upcoming = start > now;
  const joinable = lesson.status === "confirmed" && end + 30 * 60 * 1000 > now;
  const style = KIND_STYLES[lesson.kind];
  const run = (action: Parameters<typeof updateLesson>[1], message: string) => async () => {
    await updateLesson(lesson.id, action);
    onDone(message);
  };

  return (
    <Modal title={lesson.student_name} onClose={onClose}>
      <div className="flex items-start gap-4">
        <Avatar name={lesson.student_name} src={lesson.student_avatar} size={56} />
        <div className="min-w-0 space-y-1 text-sm">
          <div className="flex flex-wrap gap-1.5">
            <span className={`chip border-l-4 ${style.box}`}>{style.label}</span>
            <span className="chip">{statusLabel(lesson)}</span>
          </div>
          <p className="font-semibold capitalize">
            {new Date(start).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} · {timeLabel(start)} – {timeLabel(end)}
          </p>
          <p className="text-earth-600">{lesson.language_name} · {lesson.duration_minutes} min</p>
          {lesson.message && <p className="italic text-earth-500">« {lesson.message} »</p>}
        </div>
      </div>

      {lesson.awaiting_student && <p className="mt-4 rounded-2xl bg-ochre-100 p-3 text-sm text-ochre-800">Vous avez proposé ce cours : il sera confirmé dès que l&apos;élève l&apos;aura accepté et payé.</p>}

      <div className="mt-5 flex flex-wrap gap-2">
        {joinable && <Link href={`/classe/${lesson.id}`} className="btn-dark"><Video size={16} /> Entrer en classe</Link>}
        <Link href={`/messages/${lesson.student_id}`} className="btn-outline"><MessageCircle size={16} /> Message</Link>
        {["confirmed", "completed"].includes(lesson.status) && <Link href={`/cours/${lesson.id}`} className="btn-outline"><NotebookText size={16} /> Notes et résumé</Link>}
        {lesson.awaiting_tutor && upcoming && (
          <>
            <form action={run("confirm", "Cours accepté.")}><button className="btn-primary">Accepter</button></form>
            <form action={run("decline", "Demande refusée : l'élève est remboursé.")}><button className="btn-outline">Refuser</button></form>
          </>
        )}
        {upcoming && (lesson.awaiting_student || lesson.status === "confirmed") && (
          <form
            action={run("cancel", lesson.awaiting_student ? "Proposition annulée." : "Cours annulé : l'élève est remboursé.")}
            onSubmit={(e) => { if (!window.confirm(lesson.awaiting_student ? "Annuler cette proposition ?" : "Annuler ce cours ? L'élève sera remboursé.")) e.preventDefault(); }}
          >
            <button className="btn-ghost text-clay-700">{lesson.awaiting_student ? "Annuler la proposition" : "Annuler le cours"}</button>
          </form>
        )}
      </div>
    </Modal>
  );
}

function BlockDetails({ block, onClose, onDone }: { block: CalendarBlock; onClose: () => void; onDone: (m: string) => void }) {
  const timeOff = block.kind === "time_off";
  const when = (iso: string) => new Date(iso).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  return (
    <Modal title={timeOff ? "Absence" : "Créneau supplémentaire"} onClose={onClose}>
      <p className="text-sm">Du <strong>{when(block.starts_at)}</strong><br />au <strong>{when(block.ends_at)}</strong></p>
      {block.note && <p className="mt-2 text-sm italic text-earth-600">« {block.note} »</p>}
      <p className="mt-3 text-sm text-earth-600">
        {timeOff ? "Les élèves ne peuvent pas réserver pendant cette période." : "Les élèves peuvent réserver ce créneau en plus de vos horaires habituels."}
      </p>
      <form
        className="mt-5 flex justify-end"
        action={async () => {
          await deleteCalendarBlock(block.id);
          onDone(timeOff ? "Absence supprimée." : "Créneau supprimé.");
        }}
      >
        <button className="btn-outline text-clay-700"><Trash2 size={16} /> Supprimer</button>
      </form>
    </Modal>
  );
}
