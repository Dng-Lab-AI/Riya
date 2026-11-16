import type { NextRequest } from "next/server";
import { getLocale } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { EARNINGS_PERIODS, earningsRows, periodFrom } from "@/lib/insights";

// Earnings of the signed-in tutor as a CSV file (opens in Excel or Google Sheets).
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "tutor") return new Response("Forbidden", { status: 403 });
  const days = periodFrom(request.nextUrl.searchParams.get("jours") ?? "", EARNINGS_PERIODS, 30);
  const locale = await getLocale();
  const fr = locale === "fr";
  const rows = await earningsRows(user._id, days, locale);

  const cell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const header = fr
    ? ["Date", "Élève", "Langue", "Minutes", "Prix (EUR)", "Net reçu (EUR)"]
    : ["Date", "Student", "Language", "Minutes", "Price (EUR)", "Net earned (EUR)"];
  const lines = [header, ...rows.map((r) => [r.date.slice(0, 16).replace("T", " "), r.student, r.language, r.minutes, r.price, r.net])];
  // Byte order mark, so Excel reads accents correctly.
  const csv = "﻿" + lines.map((line) => line.map(cell).join(fr ? ";" : ",")).join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="riya-${fr ? "revenus" : "earnings"}-${days}${fr ? "j" : "d"}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
