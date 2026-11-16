"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { defineMessages, intlLocale } from "@/i18n";
import { countryGroupLabel, countryName, methodText } from "@/i18n/catalog";
import { useLocale } from "@/i18n/client";
import { bookLesson } from "@/lib/actions/lessons";
import { bookingStarted } from "@/lib/actions/notifications";
import { METHODS, countryGroups, formatMoney, quoteFor } from "@/lib/payments/countries";
import { SubmitButton, useKeepValuesForm } from "./client";
import { FormAlert } from "./ui";

const DAYS_AHEAD = 14;

const M = defineMessages({
  en: {
    language: "Lesson language", day: "Day", noSlotDay: "No free slot that day", freeSlots: (n: number) => `${n} free slot${n > 1 ? "s" : ""}`,
    time: "Time", yourZone: "(your time zone)", noSlots: "This tutor has no free slot in the next two weeks. Write to them to agree on a time.",
    noSlotsDay: "No free slot that day. Choose another day.", message: "Message to the tutor", optional: "(optional)",
    messagePlaceholder: "Your level, your goals…", payFrom: "You're paying from", total: "Total", redirecting: "Redirecting to payment…",
    bookAndPay: (total: string) => `Book and pay ${total}`, choose: "Choose a time slot",
    refund: "Refunded if the tutor declines. Free cancellation up to 24 hours before the lesson.",
  },
  fr: {
    language: "Langue du cours", day: "Jour", noSlotDay: "Aucun créneau libre ce jour-là", freeSlots: (n: number) => `${n} créneau${n > 1 ? "x" : ""} libre${n > 1 ? "s" : ""}`,
    time: "Heure", yourZone: "(votre fuseau horaire)", noSlots: "Ce tuteur n'a aucun créneau libre dans les deux prochaines semaines. Écrivez-lui pour convenir d'un horaire.",
    noSlotsDay: "Aucun créneau libre ce jour-là. Choisissez un autre jour.", message: "Message au tuteur", optional: "(facultatif)",
    messagePlaceholder: "Votre niveau, vos objectifs…", payFrom: "Vous payez depuis", total: "Total", redirecting: "Redirection vers le paiement…",
    bookAndPay: (total: string) => `Réserver et payer ${total}`, choose: "Choisissez un créneau",
    refund: "Remboursé si le tuteur refuse. Annulation gratuite jusqu'à 24 h avant le cours.",
  },
});
const noopSubscribe = () => () => {};

// Slots depend on the visitor's clock and time zone, so they are only rendered in the browser.
function useIsClient() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

function toLocalDayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type BookingProps = {
  tutorId: string;
  languages: { slug: string; name: string }[];
  // Bookable start times (ISO), computed from the tutor's availability.
  slots: string[];
  priceEur: number;
  defaultCountry: string;
  rates: Record<string, number>;
};

export function BookingForm(props: BookingProps) {
  if (!useIsClient()) return <div className="h-96 animate-pulse rounded-xl bg-sand-100" />;
  return <BookingFormInner {...props} />;
}

function BookingFormInner({ tutorId, languages, slots, priceEur, defaultCountry, rates }: BookingProps) {
  const locale = useLocale();
  const t = M[locale];
  const lang = intlLocale(locale);
  const { state, pending, onSubmit } = useKeepValuesForm(bookLesson.bind(null, tutorId));
  // The tutor's free start times, grouped by day in the student's own time zone.
  const byDay = useMemo(() => {
    const map = new Map<string, { iso: string; time: string }[]>();
    for (const iso of slots) {
      const date = new Date(iso);
      const key = toLocalDayKey(date);
      map.set(key, [...(map.get(key) ?? []), { iso, time: date.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" }) }]);
    }
    return map;
  }, [slots, lang]);
  const days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: DAYS_AHEAD }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      return { key: toLocalDayKey(d), date: d, count: byDay.get(toLocalDayKey(d))?.length ?? 0 };
    });
  }, [byDay]);
  const [day, setDay] = useState(() => days.find((d) => d.count > 0)?.key ?? days[0].key);
  const [startsAt, setStartsAt] = useState("");
  // Picking a slot starts a booking: if it is not finished, the tutor gets a reminder to reach out.
  const reported = useRef(false);
  const pick = (iso: string) => {
    setStartsAt(iso);
    if (!reported.current) {
      reported.current = true;
      bookingStarted(tutorId).catch(() => {});
    }
  };
  const [country, setCountry] = useState(defaultCountry);
  const quote = quoteFor(country, priceEur, rates);
  const total = formatMoney(quote.amount, quote.currency, locale);
  const daySlots = byDay.get(day) ?? [];

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="starts_at" value={startsAt} />

      {languages.length > 1 ? (
        <div>
          <label className="label" htmlFor="language">{t.language}</label>
          <select id="language" name="language" className="input">
            {languages.map((l) => <option key={l.slug} value={l.slug}>{l.name}</option>)}
          </select>
        </div>
      ) : (
        <input type="hidden" name="language" value={languages[0]?.slug ?? ""} />
      )}

      <div>
        <p className="label">{t.day}</p>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
          {days.map((d) => (
            <button
              key={d.key}
              type="button"
              disabled={d.count === 0}
              title={d.count === 0 ? t.noSlotDay : t.freeSlots(d.count)}
              onClick={() => { setDay(d.key); setStartsAt(""); }}
              className={`flex w-14 shrink-0 flex-col items-center rounded-xl border px-2 py-2 text-xs transition disabled:cursor-not-allowed disabled:border-sand-200 disabled:bg-sand-100 disabled:text-earth-400 ${
                d.key === day ? "border-clay-600 bg-clay-600 text-white" : "border-sand-300 bg-white hover:border-clay-500"
              }`}
            >
              <span className="capitalize">{d.date.toLocaleDateString(lang, { weekday: "short" })}</span>
              <span className="text-base font-bold">{d.date.getDate()}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="label">{t.time} <span className="font-normal text-earth-500">{t.yourZone}</span></p>
        {slots.length === 0 ? (
          <p className="rounded-xl bg-sand-50 p-3 text-sm text-earth-600">{t.noSlots}</p>
        ) : daySlots.length === 0 ? (
          <p className="rounded-xl bg-sand-50 p-3 text-sm text-earth-600">{t.noSlotsDay}</p>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {daySlots.map((s) => (
              <button
                key={s.iso}
                type="button"
                onClick={() => pick(s.iso)}
                className={`rounded-lg border py-2 text-sm font-medium transition ${
                  startsAt === s.iso ? "border-forest-600 bg-forest-600 text-white" : "border-sand-300 bg-white hover:border-forest-500"
                }`}
              >
                {s.time}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="label" htmlFor="message">{t.message} <span className="font-normal text-earth-500">{t.optional}</span></label>
        <textarea id="message" name="message" rows={3} className="input" placeholder={t.messagePlaceholder} />
      </div>

      <div className="rounded-2xl bg-sand-50 p-4">
        <label className="label" htmlFor="country">{t.payFrom}</label>
        <select id="country" name="country" value={country} onChange={(e) => setCountry(e.target.value)} className="input">
          {countryGroups().map(([group, names]) => (
            <optgroup key={group} label={countryGroupLabel(group, locale)}>
              {names.map((name) => <option key={name} value={name}>{countryName(name, locale)}</option>)}
            </optgroup>
          ))}
        </select>
        <div className="mt-3 flex items-baseline justify-between gap-2">
          <span className="text-sm text-earth-600">{t.total}</span>
          <span className="font-display text-2xl font-semibold">{total}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {quote.methods.map((id) => <span key={id} className="chip bg-white">{methodText(id, METHODS[id], locale).label}</span>)}
        </div>
      </div>

      <FormAlert state={state} />
      <SubmitButton pending={pending} className="btn-primary w-full" disabled={!startsAt} pendingText={t.redirecting}>
        {startsAt ? t.bookAndPay(total) : t.choose}
      </SubmitButton>
      <p className="text-center text-xs text-earth-500">{t.refund}</p>
    </form>
  );
}
