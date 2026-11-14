"use client";

import { useSyncExternalStore } from "react";
import { defineMessages, intlLocale } from "@/i18n";
import { useLocale } from "@/i18n/client";

// Parts of the tutor home that depend on the visitor's clock and time zone.

const noopSubscribe = () => () => {};
const useIsClient = () => useSyncExternalStore(noopSubscribe, () => true, () => false);

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

const M = defineMessages({
  en: {
    morning: "Good morning", afternoon: "Good afternoon", evening: "Good evening", hello: "Hello",
    none: "No lessons today. Ready to plan what's next? 📚",
    some: (n: number) => `You have ${n} lesson${n > 1 ? "s" : ""} today. Enjoy! 🎉`,
    today: "today, ", tomorrow: "tomorrow, ",
  },
  fr: {
    morning: "Bonjour", afternoon: "Bon après-midi", evening: "Bonsoir", hello: "Bonjour",
    none: "Aucun cours aujourd'hui. Prêt·e à planifier la suite ? 📚",
    some: (n: number) => `Vous avez ${n} cours aujourd'hui. Bonne séance ! 🎉`,
    today: "aujourd'hui, ", tomorrow: "demain, ",
  },
});

export function TutorGreeting({ firstName, lessonStarts }: { firstName: string; lessonStarts: string[] }) {
  const t = M[useLocale()];
  const client = useIsClient();
  if (!client) {
    return (
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">{t.hello}, {firstName}</h1>
        <p className="mt-1.5 h-6" />
      </div>
    );
  }
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour >= 5 && hour < 12 ? t.morning : hour >= 12 && hour < 18 ? t.afternoon : t.evening;
  // Lessons of the day not over yet (a lesson lasts under an hour).
  const today = lessonStarts.filter((iso) => {
    const start = new Date(iso);
    return dayKey(start) === dayKey(now) && start.getTime() > now.getTime() - 60 * 60 * 1000;
  }).length;
  return (
    <div className="mb-6">
      <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">{greeting}, {firstName}</h1>
      <p className="mt-1.5 text-earth-600">{today === 0 ? t.none : t.some(today)}</p>
    </div>
  );
}

// "Today, 14 Nov · 11:00 – 11:50", in the visitor's time zone.
export function LessonWhen({ iso, minutes }: { iso: string; minutes: number }) {
  const locale = useLocale();
  const t = M[locale];
  const client = useIsClient();
  if (!client) return <span className="inline-block h-4 w-40 animate-pulse rounded bg-sand-100 align-middle" />;
  const lang = intlLocale(locale);
  const start = new Date(iso);
  const end = new Date(start.getTime() + minutes * 60 * 1000);
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const prefix =
    dayKey(start) === dayKey(now) ? t.today : dayKey(start) === dayKey(tomorrow) ? t.tomorrow : `${start.toLocaleDateString(lang, { weekday: "long" })} `;
  const day = start.toLocaleDateString(lang, { day: "numeric", month: "short" });
  const time = (d: Date) => d.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" });
  return (
    <time dateTime={iso}>
      {prefix[0].toUpperCase() + prefix.slice(1)}{day} · {time(start)} – {time(end)}
    </time>
  );
}
