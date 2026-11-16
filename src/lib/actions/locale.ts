"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, isLocale } from "@/i18n";
import { getCurrentUser } from "../auth";
import { getDb } from "../db";
import { refreshAll } from "./shared";

// The EN / FR switch: remembered in a cookie for a year, and on the account (for e-mails and lesson summaries).
export async function setLocale(locale: string) {
  if (!isLocale(locale)) return;
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 365 * 24 * 60 * 60, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  const user = await getCurrentUser();
  if (user) await (await getDb()).users.updateOne({ _id: user._id }, { $set: { locale } });
  refreshAll();
}
