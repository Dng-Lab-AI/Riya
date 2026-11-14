// English versions of the reference data stored in French in the database:
// languages taught, regions, countries and payment methods. Client-safe.

import type { Locale } from ".";

export const REGION_EN: Record<string, string> = {
  "Afrique de l'Ouest": "West Africa",
  "Afrique centrale": "Central Africa",
  "Afrique de l'Est": "East Africa",
  "Afrique australe": "Southern Africa",
  "Corne de l'Afrique": "Horn of Africa",
  "Océan Indien": "Indian Ocean",
};

export function regionLabel(region: string, locale: Locale) {
  return locale === "en" ? (REGION_EN[region] ?? region) : region;
}

// Country names are stored in French (tutor profiles, payment country).
export const COUNTRY_EN: Record<string, string> = {
  Cameroun: "Cameroon", Gabon: "Gabon", "Congo-Brazzaville": "Republic of the Congo", Tchad: "Chad", Centrafrique: "Central African Republic",
  "Guinée équatoriale": "Equatorial Guinea", "Côte d'Ivoire": "Côte d'Ivoire", Sénégal: "Senegal", Mali: "Mali", "Burkina Faso": "Burkina Faso",
  Bénin: "Benin", Togo: "Togo", Niger: "Niger", "Guinée-Bissau": "Guinea-Bissau", Nigeria: "Nigeria", Ghana: "Ghana", Kenya: "Kenya",
  Ouganda: "Uganda", Rwanda: "Rwanda", Tanzanie: "Tanzania", "Afrique du Sud": "South Africa", "RD Congo": "DR Congo", Algérie: "Algeria",
  Maroc: "Morocco", Tunisie: "Tunisia", Égypte: "Egypt", Éthiopie: "Ethiopia", Djibouti: "Djibouti", Somalie: "Somalia", Madagascar: "Madagascar",
  Maurice: "Mauritius", Guinée: "Guinea", Mauritanie: "Mauritania", Gambie: "Gambia", Zimbabwe: "Zimbabwe", Zambie: "Zambia", Angola: "Angola",
  Mozambique: "Mozambique", Burundi: "Burundi", France: "France", Belgique: "Belgium", Suisse: "Switzerland", Allemagne: "Germany", Italie: "Italy",
  Espagne: "Spain", Portugal: "Portugal", "Pays-Bas": "Netherlands", Luxembourg: "Luxembourg", "Royaume-Uni": "United Kingdom", Irlande: "Ireland",
  Suède: "Sweden", Norvège: "Norway", Canada: "Canada", "États-Unis": "United States", Brésil: "Brazil", Haïti: "Haiti", Guadeloupe: "Guadeloupe",
  Martinique: "Martinique", Guyane: "French Guiana", "Émirats arabes unis": "United Arab Emirates", Chine: "China", Japon: "Japan",
  "Autre pays": "Other country", Eswatini: "Eswatini", Lesotho: "Lesotho",
};

export function countryName(name: string, locale: Locale) {
  return locale === "en" ? (COUNTRY_EN[name] ?? name) : name;
}

const COUNTRY_GROUP_EN: Record<string, string> = {
  "Afrique centrale (FCFA)": "Central Africa (CFA franc)",
  "Afrique de l'Ouest (FCFA)": "West Africa (CFA franc)",
  "Autres pays d'Afrique": "Other African countries",
  Europe: "Europe",
  Amériques: "Americas",
  "Autres pays": "Other countries",
};

export function countryGroupLabel(group: string, locale: Locale) {
  return locale === "en" ? (COUNTRY_GROUP_EN[group] ?? group) : group;
}

const METHOD_EN: Record<string, { label: string; hint: string }> = {
  bank: { label: "Bank transfer", hint: "From your bank" },
  ussd: { label: "USSD", hint: "Dial a code" },
  card: { label: "Bank card", hint: "Visa, Mastercard" },
  wallet: { label: "Apple Pay / Google Pay", hint: "From your phone" },
};

export function methodText(id: string, fr: { label: string; hint: string }, locale: Locale) {
  if (locale === "fr") return fr;
  return METHOD_EN[id] ?? { label: fr.label, hint: fr.hint === "Validez sur votre téléphone" ? "Confirm on your phone" : fr.hint };
}

// The languages taught on Riya, in English (the database keeps the French texts).
export const LANGUAGE_EN: Record<string, { name: string; greeting_meaning: string; countries: string; family: string; description: string }> = {
  swahili: {
    name: "Swahili", greeting_meaning: "How are you?", countries: "Kenya, Tanzania, Uganda, DR Congo, Rwanda", family: "Bantu",
    description: "The lingua franca of East Africa and an official language of the African Union. Its regular grammar and Latin alphabet make it an excellent gateway to the Bantu languages.",
  },
  yoruba: {
    name: "Yoruba", greeting_meaning: "Hello", countries: "Nigeria, Benin, Togo", family: "Niger-Congo",
    description: "A tonal language rich in proverbs, carried by a huge musical, religious and film culture (Nollywood). Also alive in Brazil and Cuba through Afro-descendant traditions.",
  },
  wolof: {
    name: "Wolof", greeting_meaning: "How are you?", countries: "Senegal, Gambia, Mauritania", family: "Atlantic",
    description: "The everyday language of Dakar and all of Senegambia. Essential to understand mbalax and Senegalese teranga, and to chat at the market.",
  },
  lingala: {
    name: "Lingala", greeting_meaning: "Hi", countries: "DR Congo, Republic of the Congo, Angola", family: "Bantu",
    description: "The language of Kinshasa and Brazzaville, made popular across Africa by Congolese rumba and ndombolo.",
  },
  hausa: {
    name: "Hausa", greeting_meaning: "Hello", countries: "Nigeria, Niger, Ghana, Cameroon, Chad", family: "Chadic",
    description: "One of the most widely spoken languages on the continent and the language of trade in the Sahel. Written in the Latin alphabet (boko) and in Arabic script (ajami).",
  },
  igbo: {
    name: "Igbo", greeting_meaning: "Hello", countries: "Nigeria", family: "Niger-Congo",
    description: "A tonal language of south-eastern Nigeria, the language of Chinua Achebe and of a very active diaspora eager to pass it on to new generations.",
  },
  amharique: {
    name: "Amharic", greeting_meaning: "Peace / Hello", countries: "Ethiopia", family: "Semitic",
    description: "The working language of Ethiopia, written with the Ge'ez abugida (fidel), one of the oldest scripts still in use in the world.",
  },
  zoulou: {
    name: "Zulu", greeting_meaning: "I see you", countries: "South Africa, Eswatini, Zimbabwe", family: "Bantu",
    description: "The most widely spoken first language in South Africa, known for its click consonants and its musicality.",
  },
  xhosa: {
    name: "Xhosa", greeting_meaning: "Hello", countries: "South Africa, Lesotho", family: "Bantu",
    description: "The language of Nelson Mandela, famous for its many clicks. Close to Zulu, with which it is largely mutually intelligible.",
  },
  twi: {
    name: "Akan (Twi)", greeting_meaning: "Welcome", countries: "Ghana, Côte d'Ivoire", family: "Kwa",
    description: "The most widely spoken language of Ghana, at the heart of adinkra symbols, kente cloth and highlife music.",
  },
  bambara: {
    name: "Bambara", greeting_meaning: "Hi / Thank you", countries: "Mali, Burkina Faso, Côte d'Ivoire", family: "Mande",
    description: "The lingua franca of Mali, very close to Dioula and Malinke. It is written in the Latin alphabet and in N'Ko.",
  },
  kinyarwanda: {
    name: "Kinyarwanda", greeting_meaning: "Hello", countries: "Rwanda, Uganda, DR Congo", family: "Bantu",
    description: "The national language of Rwanda, spoken by almost the whole population and very close to Kirundi.",
  },
  peul: {
    name: "Fula", greeting_meaning: "Good morning", countries: "Guinea, Senegal, Mali, Niger, Cameroon, Nigeria", family: "Atlantic",
    description: "Spoken from one end of the Sahel to the other, from Senegal to Sudan. It is also written with the Adlam alphabet, created in Guinea in the 1980s.",
  },
  somali: {
    name: "Somali", greeting_meaning: "What's new?", countries: "Somalia, Djibouti, Ethiopia, Kenya", family: "Cushitic",
    description: "A language with a great tradition of oral poetry, spoken by a large diaspora in Europe and North America.",
  },
  malgache: {
    name: "Malagasy", greeting_meaning: "Hello", countries: "Madagascar", family: "Austronesian",
    description: "An Austronesian language, a cousin of the languages of Indonesia, enriched by Bantu, Arabic and French influences.",
  },
  ewe: {
    name: "Ewe", greeting_meaning: "Welcome", countries: "Togo, Ghana, Benin", family: "Kwa",
    description: "A tonal language of southern Togo and eastern Ghana, known for its songs and drumming.",
  },
};

export function languageName(slug: string, frName: string, locale: Locale) {
  return locale === "en" ? (LANGUAGE_EN[slug]?.name ?? frName) : frName;
}
