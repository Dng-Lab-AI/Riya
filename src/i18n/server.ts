import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from ".";

// The visitor's interface language: chosen with the EN / FR switch (cookie), English otherwise.
export const getLocale = cache(async (): Promise<Locale> => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
});

// Page title in the visitor's language: `export const generateMetadata = () => titled({ en: "…", fr: "…" });`
export async function titled(title: Record<Locale, string>): Promise<{ title: string }> {
  return { title: title[await getLocale()] };
}
