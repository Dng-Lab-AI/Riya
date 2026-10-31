"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { bookLesson } from "@/lib/actions/lessons";
import { TIME_SLOTS } from "@/lib/constants";
import { METHODS, countryGroups, formatMoney, quoteFor } from "@/lib/payments/countries";
import { SubmitButton, useKeepValuesForm } from "./client";
import { FormAlert } from "./ui";

const DAYS_AHEAD = 14;
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
  busySlots: string[];
  priceEur: number;
  defaultCountry: string;
  rates: Record<string, number>;
};

export function BookingForm(props: BookingProps) {
  if (!useIsClient()) return <div className="h-96 animate-pulse rounded-xl bg-sand-100" />;
  return <BookingFormInner {...props} />;
}

function BookingFormInner({ tutorId, languages, busySlots, priceEur, defaultCountry, rates }: BookingProps) {
  const { state, pending, onSubmit } = useKeepValuesForm(bookLesson.bind(null, tutorId));
  const days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: DAYS_AHEAD }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      return { key: toLocalDayKey(d), date: d };
    });
  }, []);
  const [now] = useState(() => Date.now());
  const [day, setDay] = useState(days[1].key);
  const [startsAt, setStartsAt] = useState("");
  const [country, setCountry] = useState(defaultCountry);
  const quote = quoteFor(country, priceEur, rates);
  const total = formatMoney(quote.amount, quote.currency);

  const busy = useMemo(() => new Set(busySlots.map((iso) => new Date(iso).getTime())), [busySlots]);
  const slots = TIME_SLOTS.map((time) => {
    const date = new Date(`${day}T${time}`);
    const taken = busy.has(date.getTime()) || date.getTime() < now + 60 * 60 * 1000;
    return { time, iso: date.toISOString(), taken };
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="starts_at" value={startsAt} />

      {languages.length > 1 ? (
        <div>
          <label className="label" htmlFor="language">Langue du cours</label>
          <select id="language" name="language" className="input">
            {languages.map((l) => <option key={l.slug} value={l.slug}>{l.name}</option>)}
          </select>
        </div>
      ) : (
        <input type="hidden" name="language" value={languages[0]?.slug ?? ""} />
      )}

      <div>
        <p className="label">Jour</p>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
          {days.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => { setDay(d.key); setStartsAt(""); }}
              className={`flex w-14 shrink-0 flex-col items-center rounded-xl border px-2 py-2 text-xs transition ${
                d.key === day ? "border-clay-600 bg-clay-600 text-white" : "border-sand-300 bg-white hover:border-clay-500"
              }`}
            >
              <span className="capitalize">{d.date.toLocaleDateString("fr-FR", { weekday: "short" })}</span>
              <span className="text-base font-bold">{d.date.getDate()}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="label">Heure <span className="font-normal text-earth-500">(votre fuseau horaire)</span></p>
        <div className="grid grid-cols-4 gap-2">
          {slots.map((s) => (
            <button
              key={s.time}
              type="button"
              disabled={s.taken}
              onClick={() => setStartsAt(s.iso)}
              className={`rounded-lg border py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:border-sand-200 disabled:bg-sand-100 disabled:text-earth-400 disabled:line-through ${
                startsAt === s.iso ? "border-forest-600 bg-forest-600 text-white" : "border-sand-300 bg-white hover:border-forest-500"
              }`}
            >
              {s.time}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="message">Message au tuteur <span className="font-normal text-earth-500">(facultatif)</span></label>
        <textarea id="message" name="message" rows={3} className="input" placeholder="Votre niveau, vos objectifs…" />
      </div>

      <div className="rounded-2xl bg-sand-50 p-4">
        <label className="label" htmlFor="country">Vous payez depuis</label>
        <select id="country" name="country" value={country} onChange={(e) => setCountry(e.target.value)} className="input">
          {countryGroups().map(([group, names]) => (
            <optgroup key={group} label={group}>
              {names.map((name) => <option key={name} value={name}>{name}</option>)}
            </optgroup>
          ))}
        </select>
        <div className="mt-3 flex items-baseline justify-between gap-2">
          <span className="text-sm text-earth-600">Total</span>
          <span className="font-display text-2xl font-semibold">{total}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {quote.methods.map((id) => <span key={id} className="chip bg-white">{METHODS[id].label}</span>)}
        </div>
      </div>

      <FormAlert state={state} />
      <SubmitButton pending={pending} className="btn-primary w-full" disabled={!startsAt} pendingText="Redirection vers le paiement…">
        {startsAt ? `Réserver et payer ${total}` : "Choisissez un créneau"}
      </SubmitButton>
      <p className="text-center text-xs text-earth-500">Remboursé si le tuteur refuse. Annulation gratuite jusqu&apos;à 24 h avant le cours.</p>
    </form>
  );
}
