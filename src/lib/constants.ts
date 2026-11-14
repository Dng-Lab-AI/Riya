// Shared, client-safe constants and helpers.

import type { Locale } from "@/i18n";
import { formatMoney } from "./payments/countries";

export const SITE = {
  name: "Riya",
  tagline: "Les langues d'Afrique, avec celles et ceux qui les parlent",
  description:
    "Apprenez le swahili, le wolof, le yoruba, le lingala et bien d'autres langues africaines avec des tuteurs natifs, en cours particuliers en ligne.",
  currency: "€",
  lessonMinutes: 50,
};

export const SITE_TEXT: Record<Locale, { tagline: string; description: string }> = {
  en: {
    tagline: "African languages, with the people who speak them",
    description: "Learn Swahili, Wolof, Yoruba, Lingala and many more African languages with native tutors, in private online lessons.",
  },
  fr: { tagline: SITE.tagline, description: SITE.description },
};

// Region names are stored in French in the database (see regionLabel in @/i18n/catalog).
export const REGIONS = [
  "Afrique de l'Ouest",
  "Afrique centrale",
  "Afrique de l'Est",
  "Afrique australe",
  "Corne de l'Afrique",
  "Océan Indien",
] as const;

// Choices stored by value; `label` is French, `en` English.
export type Choice = { value: string; label: string; en: string };

export const SPECIALTIES = [
  { value: "debutants", label: "Débutants", en: "Beginners" },
  { value: "conversation", label: "Conversation", en: "Conversation" },
  { value: "enfants", label: "Enfants", en: "Children" },
  { value: "diaspora", label: "Diaspora & héritage", en: "Diaspora & heritage" },
  { value: "voyage", label: "Voyage", en: "Travel" },
  { value: "affaires", label: "Affaires", en: "Business" },
  { value: "culture", label: "Culture & musique", en: "Culture & music" },
  { value: "ecriture", label: "Écriture & alphabet", en: "Writing & alphabet" },
] as const satisfies readonly Choice[];

export const AVAILABILITY = [
  { value: "matin", label: "Matin (6h – 12h)", en: "Morning (6am – 12pm)" },
  { value: "apres-midi", label: "Après-midi (12h – 18h)", en: "Afternoon (12pm – 6pm)" },
  { value: "soir", label: "Soir (18h – 23h)", en: "Evening (6pm – 11pm)" },
  { value: "week-end", label: "Week-end", en: "Weekend" },
] as const satisfies readonly Choice[];

export const FORUM_CATEGORIES = [
  { value: "general", label: "Discussions générales", en: "General discussion" },
  { value: "grammaire", label: "Grammaire & vocabulaire", en: "Grammar & vocabulary" },
  { value: "echange", label: "Échange linguistique", en: "Language exchange" },
  { value: "ressources", label: "Ressources", en: "Resources" },
  { value: "culture", label: "Culture & traditions", en: "Culture & traditions" },
] as const satisfies readonly Choice[];

export const LESSON_STATUS: Record<string, { label: Record<Locale, string>; className: string }> = {
  pending: { label: { en: "Pending", fr: "En attente" }, className: "bg-ochre-100 text-ochre-800" },
  confirmed: { label: { en: "Confirmed", fr: "Confirmé" }, className: "bg-forest-100 text-forest-800" },
  completed: { label: { en: "Completed", fr: "Terminé" }, className: "bg-sand-200 text-earth-800" },
  cancelled: { label: { en: "Cancelled", fr: "Annulé" }, className: "bg-clay-100 text-clay-800" },
};

// The fictional student of a tutor's practice classroom (the first word is used as a first name).
export const DEMO_STUDENT_NAME: Record<Locale, string> = { en: "Kofi (demo student)", fr: "Kofi (élève de démonstration)" };

// Start times offered when booking a lesson (local time of the student).
export const TIME_SLOTS = Array.from({ length: 16 }, (_, i) => `${String(i + 7).padStart(2, "0")}:00`);

export function labelFor(list: readonly Choice[], value: string, locale: Locale) {
  const item = list.find((choice) => choice.value === value);
  return item ? (locale === "en" ? item.en : item.label) : value;
}

// The choices with the label of the current language, for forms.
export function choicesFor(list: readonly Choice[], locale: Locale) {
  return list.map((choice) => ({ value: choice.value, label: locale === "en" ? choice.en : choice.label }));
}

export function splitList(value: string | null | undefined): string[] {
  return (value ?? "").split(",").map((v) => v.trim()).filter(Boolean);
}

// Tutor prices are in euros: "€15" / "15 €".
export function formatPrice(amount: number, locale: Locale = "en") {
  return formatMoney(amount, "EUR", locale);
}

// SQLite datetime('now') yields "YYYY-MM-DD HH:MM:SS" in UTC; turn it into ISO 8601.
export function toIso(value: string) {
  return value.includes("T") ? value : value.replace(" ", "T") + "Z";
}

// "3 days ago" / "il y a 3 jours".
export function timeAgo(value: string, locale: Locale) {
  const date = new Date(toIso(value));
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  const units: [number, string, string, string][] = [
    [60 * 60 * 24 * 365, "an", "ans", "year"],
    [60 * 60 * 24 * 30, "mois", "mois", "month"],
    [60 * 60 * 24 * 7, "semaine", "semaines", "week"],
    [60 * 60 * 24, "jour", "jours", "day"],
    [60 * 60, "heure", "heures", "hour"],
    [60, "minute", "minutes", "minute"],
  ];
  for (const [size, one, many, en] of units) {
    const n = Math.floor(seconds / size);
    if (n >= 1) return locale === "en" ? `${n} ${en}${n > 1 ? "s" : ""} ago` : `il y a ${n} ${n > 1 ? many : one}`;
  }
  return locale === "en" ? "just now" : "à l'instant";
}

// searchParams values can be arrays; we only ever use the first one.
export function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

// French elision for language names: "le swahili" / "l'amharique", "de wolof" / "d'igbo".
const startsWithVowel = (word: string) => /^[aeiouyéèêàâîôûœ]/i.test(word);
export function withLe(language: string) {
  const name = language.toLowerCase();
  return startsWithVowel(name) ? `l'${name}` : `le ${name}`;
}
export function withDe(language: string) {
  const name = language.toLowerCase();
  return startsWithVowel(name) ? `d'${name}` : `de ${name}`;
}

// "Swahili lesson" / "Cours de swahili".
export function lessonOf(language: string, locale: Locale) {
  return locale === "en" ? `${language} lesson` : `Cours ${withDe(language)}`;
}

// Files a tutor can share in a lesson (PDF, images, audio, office documents, text).
export const LESSON_FILE_TYPES: Record<string, string> = {
  "application/pdf": "PDF",
  "image/png": "Image",
  "image/jpeg": "Image",
  "image/webp": "Image",
  "image/gif": "Image",
  "audio/mpeg": "Audio",
  "audio/mp4": "Audio",
  "audio/wav": "Audio",
  "audio/ogg": "Audio",
  "text/plain": "TXT",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PowerPoint",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel",
};
export const LESSON_FILE_MAX_BYTES = 15 * 1024 * 1024;

export function formatBytes(bytes: number, locale: Locale) {
  const [b, kb, mb] = locale === "en" ? ["B", "KB", "MB"] : ["o", "Ko", "Mo"];
  if (bytes < 1024) return `${bytes} ${b}`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} ${kb}`;
  return `${(bytes / 1024 / 1024).toFixed(1)} ${mb}`;
}

// Tutor notes store vocabulary one entry per line: "mot = traduction".
export function parseVocabulary(text: string): { term: string; translation: string }[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [term, ...rest] = line.split(/\s*[=:–-]\s*/);
      return { term: term.trim(), translation: rest.join(" – ").trim() };
    });
}

// The lesson ends on its own at its end time; the tutor can extend it by this many minutes in total.
export const MAX_EXTRA_MINUTES = 5;

// Live classroom: quick reactions and whiteboard pen colours.
export const REACTIONS = ["👏", "❤️", "😂", "🔥", "👍", "🎉", "🤔", "😮"];
export const BOARD_COLORS = ["#22180f", "#b84e28", "#e09a1e", "#22623a", "#2563eb", "#ffffff"];

// Speech recognition languages offered by browsers (Chrome / Edge), by lesson language.
export type SpeechLang = { code: string; label: Record<Locale, string> };
export const SPEECH_LANGS: Record<string, SpeechLang> = {
  swahili: { code: "sw-TZ", label: { en: "Swahili", fr: "Swahili" } },
  zoulou: { code: "zu-ZA", label: { en: "Zulu", fr: "Zoulou" } },
  amharique: { code: "am-ET", label: { en: "Amharic", fr: "Amharique" } },
};
export const BASE_SPEECH_LANGS: SpeechLang[] = [
  { code: "en-US", label: { en: "English", fr: "Anglais" } },
  { code: "fr-FR", label: { en: "French", fr: "Français" } },
];

// Anchor id for a region section on /langues, e.g. "Afrique de l'Ouest" -> "afrique-de-l-ouest".
export function regionId(region: string) {
  return region.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
