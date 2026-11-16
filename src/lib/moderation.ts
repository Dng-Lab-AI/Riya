import "server-only";
import { defineMessages, intlLocale, type Locale } from "@/i18n";
import type { UserDoc } from "./db";

// What a suspended or blocked member reads when they try to log in.

const M = defineMessages({
  en: {
    suspended: "This account has been suspended. Please contact the Riya team.",
    suspendedUntil: (date: string) => `This account is suspended until ${date}. Please contact the Riya team if you have any questions.`,
    blocked: "This account has been blocked by the Riya team.",
    reason: (reason: string) => ` Reason: ${reason}`,
  },
  fr: {
    suspended: "Ce compte a été suspendu. Contactez l'équipe Riya.",
    suspendedUntil: (date: string) => `Ce compte est suspendu jusqu'au ${date}. Contactez l'équipe Riya pour toute question.`,
    blocked: "Ce compte a été bloqué par l'équipe Riya.",
    reason: (reason: string) => ` Motif : ${reason}`,
  },
});

export function moderationMessage(user: Pick<UserDoc, "status" | "suspendedUntil" | "moderation">, locale: Locale) {
  const t = M[locale];
  const base =
    user.status === "blocked"
      ? t.blocked
      : user.suspendedUntil
        ? t.suspendedUntil(user.suspendedUntil.toLocaleDateString(intlLocale(locale), { day: "numeric", month: "long", year: "numeric" }))
        : t.suspended;
  return user.moderation?.reason ? base + t.reason(user.moderation.reason) : base;
}
