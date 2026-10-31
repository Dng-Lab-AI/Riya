// Shared, client-safe constants and helpers.

export const SITE = {
  name: "Riya",
  tagline: "Les langues d'Afrique, avec celles et ceux qui les parlent",
  description:
    "Apprenez le swahili, le wolof, le yoruba, le lingala et bien d'autres langues africaines avec des tuteurs natifs, en cours particuliers en ligne.",
  currency: "€",
  lessonMinutes: 50,
};

export const REGIONS = [
  "Afrique de l'Ouest",
  "Afrique centrale",
  "Afrique de l'Est",
  "Afrique australe",
  "Corne de l'Afrique",
  "Océan Indien",
] as const;

export const SPECIALTIES = [
  { value: "debutants", label: "Débutants" },
  { value: "conversation", label: "Conversation" },
  { value: "enfants", label: "Enfants" },
  { value: "diaspora", label: "Diaspora & héritage" },
  { value: "voyage", label: "Voyage" },
  { value: "affaires", label: "Affaires" },
  { value: "culture", label: "Culture & musique" },
  { value: "ecriture", label: "Écriture & alphabet" },
] as const;

export const AVAILABILITY = [
  { value: "matin", label: "Matin (6h – 12h)" },
  { value: "apres-midi", label: "Après-midi (12h – 18h)" },
  { value: "soir", label: "Soir (18h – 23h)" },
  { value: "week-end", label: "Week-end" },
] as const;

export const FORUM_CATEGORIES = [
  { value: "general", label: "Discussions générales" },
  { value: "grammaire", label: "Grammaire & vocabulaire" },
  { value: "echange", label: "Échange linguistique" },
  { value: "ressources", label: "Ressources" },
  { value: "culture", label: "Culture & traditions" },
] as const;

export const LESSON_STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-ochre-100 text-ochre-800" },
  confirmed: { label: "Confirmé", className: "bg-forest-100 text-forest-800" },
  completed: { label: "Terminé", className: "bg-sand-200 text-earth-800" },
  cancelled: { label: "Annulé", className: "bg-clay-100 text-clay-800" },
};

// Start times offered when booking a lesson (local time of the student).
export const TIME_SLOTS = Array.from({ length: 16 }, (_, i) => `${String(i + 7).padStart(2, "0")}:00`);

export function labelFor(list: readonly { value: string; label: string }[], value: string) {
  return list.find((item) => item.value === value)?.label ?? value;
}

export function splitList(value: string | null | undefined): string[] {
  return (value ?? "").split(",").map((v) => v.trim()).filter(Boolean);
}

export function formatPrice(amount: number) {
  return `${amount} ${SITE.currency}`;
}

// SQLite datetime('now') yields "YYYY-MM-DD HH:MM:SS" in UTC; turn it into ISO 8601.
export function toIso(value: string) {
  return value.includes("T") ? value : value.replace(" ", "T") + "Z";
}

export function timeAgo(value: string) {
  const date = new Date(toIso(value));
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  const units: [number, string][] = [
    [60 * 60 * 24 * 365, "an"],
    [60 * 60 * 24 * 30, "mois"],
    [60 * 60 * 24 * 7, "semaine"],
    [60 * 60 * 24, "jour"],
    [60 * 60, "heure"],
    [60, "minute"],
  ];
  for (const [size, unit] of units) {
    const n = Math.floor(seconds / size);
    if (n >= 1) return `il y a ${n} ${unit}${n > 1 && unit !== "mois" ? "s" : ""}`;
  }
  return "à l'instant";
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
  "text/plain": "Texte",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PowerPoint",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel",
};
export const LESSON_FILE_MAX_BYTES = 15 * 1024 * 1024;

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
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

// Live classroom: quick reactions and whiteboard pen colours.
export const REACTIONS = ["👏", "❤️", "😂", "🔥", "👍", "🎉", "🤔", "😮"];
export const BOARD_COLORS = ["#22180f", "#b84e28", "#e09a1e", "#22623a", "#2563eb", "#ffffff"];

// Speech recognition languages offered by browsers (Chrome / Edge), by lesson language.
export const SPEECH_LANGS: Record<string, { code: string; label: string }> = {
  swahili: { code: "sw-TZ", label: "Swahili" },
  zoulou: { code: "zu-ZA", label: "Zoulou" },
  amharique: { code: "am-ET", label: "Amharique" },
};
export const BASE_SPEECH_LANGS = [
  { code: "fr-FR", label: "Français" },
  { code: "en-US", label: "Anglais" },
];

// Anchor id for a region section on /langues, e.g. "Afrique de l'Ouest" -> "afrique-de-l-ouest".
export function regionId(region: string) {
  return region.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
