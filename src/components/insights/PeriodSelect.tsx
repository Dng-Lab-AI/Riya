"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { useLocale } from "@/i18n/client";

// "Last 90 days" picker: changes one search parameter of the page, keeps the others.
export function PeriodSelect({ name, value, options, label }: { name: string; value: number; options: readonly number[]; label: string }) {
  const en = useLocale() === "en";
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const change = (next: string) => {
    const query = new URLSearchParams(params.toString());
    query.set(name, next);
    router.push(`${pathname}?${query}`, { scroll: false });
  };

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <CalendarDays size={17} className="pointer-events-none absolute left-3.5 text-earth-500" />
      <select value={value} onChange={(e) => change(e.target.value)} className="input w-auto cursor-pointer py-2.5 pl-10 pr-9 font-medium">
        {options.map((days) => (
          <option key={days} value={days}>{en ? `Last ${days} days` : `${days} derniers jours`}</option>
        ))}
      </select>
    </label>
  );
}
