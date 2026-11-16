"use client";

import { createContext, useContext } from "react";
import { DEFAULT_LOCALE, type Locale } from ".";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

// Set once in the root layout, so every client component knows the interface language.
export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}
