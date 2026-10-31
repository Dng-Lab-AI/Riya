// Client-safe: which currency and payment methods a student gets, based on the
// country they live in. Prices are stored in euros (the tutors' currency); the
// student is charged in their own currency when we can convert it safely.

export type MethodId = "mtn" | "orange" | "moov" | "mpesa" | "airtel" | "momo" | "bank" | "ussd" | "card" | "wallet";

export const METHODS: Record<MethodId, { label: string; hint: string }> = {
  mtn: { label: "MTN Mobile Money", hint: "Validez sur votre téléphone" },
  orange: { label: "Orange Money", hint: "Validez sur votre téléphone" },
  moov: { label: "Moov Money", hint: "Validez sur votre téléphone" },
  mpesa: { label: "M-Pesa", hint: "Validez sur votre téléphone" },
  airtel: { label: "Airtel Money", hint: "Validez sur votre téléphone" },
  momo: { label: "Mobile Money", hint: "MTN, Telecel, AirtelTigo…" },
  bank: { label: "Virement bancaire", hint: "Depuis votre banque" },
  ussd: { label: "USSD", hint: "Code à composer" },
  card: { label: "Carte bancaire", hint: "Visa, Mastercard" },
  wallet: { label: "Apple Pay / Google Pay", hint: "Depuis votre téléphone" },
};

// Currencies pegged to the euro: conversion is exact and never needs updating.
const PEGGED: Record<string, number> = { EUR: 1, XAF: 655.957, XOF: 655.957 };

type Zone = { currency: string; methods: MethodId[] };

const CEMAC: Zone = { currency: "XAF", methods: ["mtn", "orange", "card"] };
const UEMOA: Zone = { currency: "XOF", methods: ["orange", "mtn", "moov", "card"] };
const INTERNATIONAL: Zone = { currency: "EUR", methods: ["card", "wallet"] };

export type Country = { name: string; group: string } & Zone;

const c = (group: string, zone: Zone, ...names: string[]): Country[] => names.map((name) => ({ name, group, ...zone }));

// The first entry is the launch country, offered first in every country picker.
export const COUNTRIES: Country[] = [
  ...c("Afrique centrale (FCFA)", CEMAC, "Cameroun", "Gabon", "Congo-Brazzaville", "Tchad", "Centrafrique", "Guinée équatoriale"),
  ...c("Afrique de l'Ouest (FCFA)", UEMOA, "Côte d'Ivoire", "Sénégal", "Mali", "Burkina Faso", "Bénin", "Togo", "Niger", "Guinée-Bissau"),
  ...c("Autres pays d'Afrique", { currency: "NGN", methods: ["card", "bank", "ussd"] }, "Nigeria"),
  ...c("Autres pays d'Afrique", { currency: "GHS", methods: ["momo", "card"] }, "Ghana"),
  ...c("Autres pays d'Afrique", { currency: "KES", methods: ["mpesa", "card"] }, "Kenya"),
  ...c("Autres pays d'Afrique", { currency: "UGX", methods: ["mtn", "airtel", "card"] }, "Ouganda"),
  ...c("Autres pays d'Afrique", { currency: "RWF", methods: ["mtn", "airtel", "card"] }, "Rwanda"),
  ...c("Autres pays d'Afrique", { currency: "TZS", methods: ["mpesa", "airtel", "card"] }, "Tanzanie"),
  ...c("Autres pays d'Afrique", { currency: "ZAR", methods: ["card"] }, "Afrique du Sud"),
  ...c("Autres pays d'Afrique", { currency: "CDF", methods: ["card"] }, "RD Congo"),
  ...c("Autres pays d'Afrique", INTERNATIONAL, "Algérie", "Maroc", "Tunisie", "Égypte", "Éthiopie", "Djibouti", "Somalie", "Madagascar", "Maurice", "Guinée", "Mauritanie", "Gambie", "Zimbabwe", "Zambie", "Angola", "Mozambique", "Burundi"),
  ...c("Europe", INTERNATIONAL, "France", "Belgique", "Suisse", "Allemagne", "Italie", "Espagne", "Portugal", "Pays-Bas", "Luxembourg", "Royaume-Uni", "Irlande", "Suède", "Norvège"),
  ...c("Amériques", INTERNATIONAL, "Canada", "États-Unis", "Brésil", "Haïti", "Guadeloupe", "Martinique", "Guyane"),
  ...c("Autres pays", INTERNATIONAL, "Émirats arabes unis", "Chine", "Japon", "Autre pays"),
];

export const LAUNCH_COUNTRY = COUNTRIES[0].name;

const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");
const ALIASES: Record<string, string> = { cameroon: "Cameroun", senegal: "Sénégal", ivorycoast: "Côte d'Ivoire", usa: "États-Unis", unitedstates: "États-Unis", uk: "Royaume-Uni", congo: "Congo-Brazzaville", rdc: "RD Congo" };

// Accepts what older accounts typed freely ("cameroon", "Senegal"…). Unknown → international.
export function findCountry(name: string | undefined | null): Country {
  const key = normalize(name ?? "");
  const alias = ALIASES[key];
  return COUNTRIES.find((country) => normalize(country.name) === key || country.name === alias) ?? { name: name ?? "", group: "Autres pays", ...INTERNATIONAL };
}

export function isKnownCountry(name: string) {
  return COUNTRIES.some((country) => country.name === name);
}

export type Quote = { country: string; currency: string; amount: number; methods: MethodId[] };

// What the student pays for a lesson priced `priceEur`. `rates` holds extra euro
// exchange rates (e.g. { NGN: 1650 }); without one, that country pays by card in euros.
export function quoteFor(countryName: string, priceEur: number, rates: Record<string, number> = {}): Quote {
  const country = findCountry(countryName);
  const rate = PEGGED[country.currency] ?? rates[country.currency];
  if (!rate) return { country: country.name, currency: "EUR", amount: priceEur, methods: INTERNATIONAL.methods };
  const decimals = country.currency === "EUR" ? 2 : 0;
  const amount = Math.ceil(priceEur * rate * 10 ** decimals) / 10 ** decimals;
  return { country: country.name, currency: country.currency, amount, methods: country.methods };
}

export function formatMoney(amount: number, currency: string) {
  const whole = Number.isInteger(amount);
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 }).format(amount);
}

export function countryGroups() {
  const groups = new Map<string, string[]>();
  for (const country of COUNTRIES) groups.set(country.group, [...(groups.get(country.group) ?? []), country.name]);
  return [...groups.entries()];
}
