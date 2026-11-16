"use client";

import { Star } from "lucide-react";
import { useLocale } from "@/i18n/client";

// Average rating and number of reviews ("New" when there is none yet).
export function Rating({ value, count }: { value: number | null; count: number }) {
  const fr = useLocale() === "fr";
  if (!count || value === null) return <span className="chip bg-forest-100 text-forest-800">{fr ? "Nouveau" : "New"}</span>;
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold text-earth-900">
      <Star size={15} className="fill-ochre-400 text-ochre-400" />
      {value.toFixed(1)}
      <span className="font-normal text-earth-500">({count} {fr ? "avis" : count === 1 ? "review" : "reviews"})</span>
    </span>
  );
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const fr = useLocale() === "fr";
  return (
    <span className="inline-flex" aria-label={fr ? `${value} sur 5` : `${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= value ? "fill-ochre-400 text-ochre-400" : "text-sand-300"} />
      ))}
    </span>
  );
}
