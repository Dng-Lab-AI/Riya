// Languages of the interface. English is the main one; French is the second.
// Texts live next to the code that shows them: `const M = defineMessages({ en: {...}, fr: {...} })`,
// then `M[locale]` (server: `await getLocale()`, client: `useLocale()`).

export const LOCALES = ["en", "fr"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "riya_lang";
export const LOCALE_LABELS: Record<Locale, string> = { en: "English", fr: "Français" };

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "fr";
}

// Both languages must have exactly the same texts (the French object is checked against the English one).
export function defineMessages<T>(messages: { en: T; fr: NoInfer<T> }): Record<Locale, T> {
  return messages;
}

// Locale used to format dates, times and numbers.
export function intlLocale(locale: Locale) {
  return locale === "fr" ? "fr-FR" : "en-GB";
}

// "1 lesson" / "2 lessons", "1 cours" / "2 cours".
export function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 || (n === 0 && one === many) ? one : many}`;
}
