"use client";

import { useSyncExternalStore } from "react";

// Parts of the tutor home that depend on the visitor's clock and time zone.

const noopSubscribe = () => () => {};
const useIsClient = () => useSyncExternalStore(noopSubscribe, () => true, () => false);

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

function greetingFor(hour: number) {
  if (hour >= 5 && hour < 12) return "Bonjour";
  if (hour >= 12 && hour < 18) return "Bon après-midi";
  return "Bonsoir";
}

export function TutorGreeting({ firstName, lessonStarts }: { firstName: string; lessonStarts: string[] }) {
  const client = useIsClient();
  if (!client) {
    return (
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">Bonjour, {firstName}</h1>
        <p className="mt-1.5 h-6" />
      </div>
    );
  }
  const now = new Date();
  // Lessons of the day not over yet (a lesson lasts under an hour).
  const today = lessonStarts.filter((iso) => {
    const start = new Date(iso);
    return dayKey(start) === dayKey(now) && start.getTime() > now.getTime() - 60 * 60 * 1000;
  }).length;
  return (
    <div className="mb-6">
      <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">{greetingFor(now.getHours())}, {firstName}</h1>
      <p className="mt-1.5 text-earth-600">
        {today === 0
          ? "Aucun cours aujourd'hui. Prêt·e à planifier la suite ? 📚"
          : `Vous avez ${today} cours aujourd'hui. Bonne séance ! 🎉`}
      </p>
    </div>
  );
}

// "Aujourd'hui, 14 nov. · 11:00 – 11:50", in the visitor's time zone.
export function LessonWhen({ iso, minutes }: { iso: string; minutes: number }) {
  const client = useIsClient();
  if (!client) return <span className="inline-block h-4 w-40 animate-pulse rounded bg-sand-100 align-middle" />;
  const start = new Date(iso);
  const end = new Date(start.getTime() + minutes * 60 * 1000);
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const prefix =
    dayKey(start) === dayKey(now) ? "aujourd'hui, " : dayKey(start) === dayKey(tomorrow) ? "demain, " : `${start.toLocaleDateString("fr-FR", { weekday: "long" })} `;
  const day = start.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  const time = (d: Date) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return (
    <time dateTime={iso}>
      {prefix[0].toUpperCase() + prefix.slice(1)}{day} · {time(start)} – {time(end)}
    </time>
  );
}
