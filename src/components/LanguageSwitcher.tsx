"use client";

import { useTransition } from "react";
import { Globe } from "lucide-react";
import { LOCALES, LOCALE_LABELS } from "@/i18n";
import { useLocale } from "@/i18n/client";
import { setLocale } from "@/lib/actions/locale";

// EN | FR switch, shown in the header and the footer.
export function LanguageSwitcher({ dark = false }: { dark?: boolean }) {
  const current = useLocale();
  const [pending, start] = useTransition();
  return (
    <div
      role="group"
      aria-label={current === "fr" ? "Langue du site" : "Site language"}
      className={`flex items-center gap-0.5 rounded-full p-0.5 text-xs font-semibold ${dark ? "bg-white/10" : "bg-sand-100"} ${pending ? "opacity-60" : ""}`}
    >
      <Globe size={14} className={`mx-1 ${dark ? "text-sand-300" : "text-earth-500"}`} aria-hidden />
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          lang={locale}
          title={LOCALE_LABELS[locale]}
          aria-pressed={current === locale}
          disabled={pending}
          onClick={() => current !== locale && start(() => setLocale(locale))}
          className={`rounded-full px-2 py-1 uppercase transition ${
            current === locale ? (dark ? "bg-sand-50 text-earth-900" : "bg-white text-earth-900 shadow-sm") : dark ? "text-sand-200 hover:text-white" : "text-earth-500 hover:text-earth-900"
          }`}
        >
          {locale}
        </button>
      ))}
    </div>
  );
}
