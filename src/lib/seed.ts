import { ObjectId } from "mongodb";
import type { Collections, FeedbackDoc, LessonDoc, ReviewDoc, TutorProfile } from "./db";
import { hashPassword } from "./password";

// Demo content inserted the first time the database is created.
// Every demo account uses the password below; the admin has its own.
export const DEMO_PASSWORD = "riya1234";
export const ADMIN_EMAIL = "admin@riya.africa";
export const ADMIN_PASSWORD = "admin1234";

const LANGUAGES = [
  {
    slug: "swahili", name: "Swahili", native_name: "Kiswahili", greeting: "Habari", greeting_meaning: "Comment ça va ?",
    region: "Afrique de l'Est", countries: "Kenya, Tanzanie, Ouganda, RD Congo, Rwanda", speakers: "≈ 200 M", family: "Bantoue",
    description: "Langue véhiculaire de toute l'Afrique de l'Est et langue officielle de l'Union africaine. Sa grammaire régulière et son alphabet latin en font une excellente porte d'entrée vers les langues bantoues.",
  },
  {
    slug: "yoruba", name: "Yoruba", native_name: "Èdè Yorùbá", greeting: "Ẹ n lẹ", greeting_meaning: "Bonjour",
    region: "Afrique de l'Ouest", countries: "Nigeria, Bénin, Togo", speakers: "≈ 45 M", family: "Nigéro-congolaise",
    description: "Langue tonale riche en proverbes, portée par une immense culture musicale, religieuse et cinématographique (Nollywood). Également vivante au Brésil et à Cuba à travers les traditions afro-descendantes.",
  },
  {
    slug: "wolof", name: "Wolof", native_name: "Wolof", greeting: "Na nga def ?", greeting_meaning: "Comment vas-tu ?",
    region: "Afrique de l'Ouest", countries: "Sénégal, Gambie, Mauritanie", speakers: "≈ 22 M", family: "Atlantique",
    description: "Langue de la vie quotidienne à Dakar et dans toute la Sénégambie. Indispensable pour comprendre le mbalax, la teranga sénégalaise et échanger au marché.",
  },
  {
    slug: "lingala", name: "Lingala", native_name: "Lingála", greeting: "Mbote", greeting_meaning: "Salut",
    region: "Afrique centrale", countries: "RD Congo, Congo-Brazzaville, Angola", speakers: "≈ 40 M", family: "Bantoue",
    description: "Langue de Kinshasa et de Brazzaville, popularisée dans toute l'Afrique par la rumba et le ndombolo congolais.",
  },
  {
    slug: "hausa", name: "Haoussa", native_name: "Harshen Hausa", greeting: "Sannu", greeting_meaning: "Bonjour",
    region: "Afrique de l'Ouest", countries: "Nigeria, Niger, Ghana, Cameroun, Tchad", speakers: "≈ 80 M", family: "Tchadique",
    description: "L'une des langues les plus parlées du continent, langue du commerce au Sahel. S'écrit en alphabet latin (boko) et en caractères arabes (ajami).",
  },
  {
    slug: "igbo", name: "Igbo", native_name: "Asụsụ Igbo", greeting: "Ndewo", greeting_meaning: "Bonjour",
    region: "Afrique de l'Ouest", countries: "Nigeria", speakers: "≈ 30 M", family: "Nigéro-congolaise",
    description: "Langue tonale du sud-est du Nigeria, langue de Chinua Achebe et d'une diaspora très active qui souhaite transmettre la langue aux nouvelles générations.",
  },
  {
    slug: "amharique", name: "Amharique", native_name: "አማርኛ", greeting: "ሰላም (Selam)", greeting_meaning: "Paix / Bonjour",
    region: "Corne de l'Afrique", countries: "Éthiopie", speakers: "≈ 60 M", family: "Sémitique",
    description: "Langue de travail de l'Éthiopie, écrite avec l'alphasyllabaire guèze (fidel), l'une des plus anciennes écritures encore utilisées au monde.",
  },
  {
    slug: "zoulou", name: "Zoulou", native_name: "isiZulu", greeting: "Sawubona", greeting_meaning: "Je te vois",
    region: "Afrique australe", countries: "Afrique du Sud, Eswatini, Zimbabwe", speakers: "≈ 28 M", family: "Bantoue",
    description: "Langue maternelle la plus répandue d'Afrique du Sud, réputée pour ses consonnes à clics et sa musicalité.",
  },
  {
    slug: "xhosa", name: "Xhosa", native_name: "isiXhosa", greeting: "Molo", greeting_meaning: "Bonjour",
    region: "Afrique australe", countries: "Afrique du Sud, Lesotho", speakers: "≈ 19 M", family: "Bantoue",
    description: "Langue de Nelson Mandela, célèbre pour ses nombreux clics. Proche du zoulou, avec lequel elle est en grande partie intercompréhensible.",
  },
  {
    slug: "twi", name: "Akan (Twi)", native_name: "Twi", greeting: "Akwaaba", greeting_meaning: "Bienvenue",
    region: "Afrique de l'Ouest", countries: "Ghana, Côte d'Ivoire", speakers: "≈ 20 M", family: "Kwa",
    description: "Langue la plus parlée du Ghana, au cœur des symboles adinkra, du kente et de l'highlife.",
  },
  {
    slug: "bambara", name: "Bambara", native_name: "Bamanankan", greeting: "I ni ce", greeting_meaning: "Salut / Merci",
    region: "Afrique de l'Ouest", countries: "Mali, Burkina Faso, Côte d'Ivoire", speakers: "≈ 15 M", family: "Mandé",
    description: "Langue véhiculaire du Mali, très proche du dioula et du malinké. Elle s'écrit en alphabet latin et en N'Ko.",
  },
  {
    slug: "kinyarwanda", name: "Kinyarwanda", native_name: "Ikinyarwanda", greeting: "Muraho", greeting_meaning: "Bonjour",
    region: "Afrique de l'Est", countries: "Rwanda, Ouganda, RD Congo", speakers: "≈ 12 M", family: "Bantoue",
    description: "Langue nationale du Rwanda, parlée par la quasi-totalité de la population et très proche du kirundi.",
  },
  {
    slug: "peul", name: "Peul", native_name: "Fulfulde / Pulaar", greeting: "Jam waali", greeting_meaning: "Bonjour (le matin)",
    region: "Afrique de l'Ouest", countries: "Guinée, Sénégal, Mali, Niger, Cameroun, Nigeria", speakers: "≈ 40 M", family: "Atlantique",
    description: "Parlée d'un bout à l'autre du Sahel, du Sénégal au Soudan. Elle s'écrit aussi avec l'alphabet Adlam, créé en Guinée dans les années 1980.",
  },
  {
    slug: "somali", name: "Somali", native_name: "Af-Soomaali", greeting: "Iska warran", greeting_meaning: "Quoi de neuf ?",
    region: "Corne de l'Afrique", countries: "Somalie, Djibouti, Éthiopie, Kenya", speakers: "≈ 22 M", family: "Couchitique",
    description: "Langue d'une grande tradition de poésie orale, parlée par une large diaspora en Europe et en Amérique du Nord.",
  },
  {
    slug: "malgache", name: "Malgache", native_name: "Malagasy", greeting: "Manao ahoana", greeting_meaning: "Bonjour",
    region: "Océan Indien", countries: "Madagascar", speakers: "≈ 25 M", family: "Austronésienne",
    description: "Langue austronésienne, cousine des langues d'Indonésie, enrichie d'apports bantous, arabes et français.",
  },
  {
    slug: "ewe", name: "Éwé", native_name: "Eʋegbe", greeting: "Woezɔ", greeting_meaning: "Bienvenue",
    region: "Afrique de l'Ouest", countries: "Togo, Ghana, Bénin", speakers: "≈ 7 M", family: "Kwa",
    description: "Langue tonale du sud du Togo et de l'est du Ghana, réputée pour ses chants et ses percussions.",
  },
];

type TutorSeed = {
  name: string; email: string; country: string; headline: string; about: string; rate: number; years: number;
  specialties: string; availability: string; speaks: string; approved: number; languages: [string, "native" | "fluent"][];
};

const TUTORS: TutorSeed[] = [
  {
    name: "Amani Njoroge", email: "amani@riya.africa", country: "Kenya", rate: 18, years: 6,
    headline: "Swahili vivant et pratique, de Nairobi à Zanzibar",
    about: "Jambo ! Je suis enseignante de swahili depuis 6 ans. J'ai accompagné des voyageurs, des humanitaires et des enfants de la diaspora. Mes cours mêlent conversation, chansons et situations réelles : marché, matatu, rencontres.",
    specialties: "debutants,conversation,voyage", availability: "matin,soir,week-end", speaks: "Anglais, Français (B1)", approved: 1,
    languages: [["swahili", "native"]],
  },
  {
    name: "Funmilayo Adeyemi", email: "funmi@riya.africa", country: "Nigeria", rate: 20, years: 8,
    headline: "Le yoruba et ses tons expliqués simplement",
    about: "Diplômée en linguistique de l'Université d'Ibadan. J'aide surtout les familles de la diaspora à renouer avec leur langue, et les passionnés de culture yoruba à comprendre proverbes, chants et cérémonies.",
    specialties: "diaspora,culture,enfants", availability: "apres-midi,soir", speaks: "Anglais", approved: 1,
    languages: [["yoruba", "native"]],
  },
  {
    name: "Fatou Diop", email: "fatou@riya.africa", country: "Sénégal", rate: 15, years: 4,
    headline: "Parlez wolof comme à Dakar",
    about: "Dakaroise et enseignante de français et de wolof, je propose des cours détendus, centrés sur l'oral. Idéal avant un voyage au Sénégal ou pour échanger avec votre belle-famille !",
    specialties: "conversation,voyage,debutants", availability: "matin,apres-midi,week-end", speaks: "Français, Anglais (B2)", approved: 1,
    languages: [["wolof", "native"], ["peul", "fluent"]],
  },
  {
    name: "Chukwuemeka Eze", email: "emeka@riya.africa", country: "Nigeria", rate: 17, years: 5,
    headline: "Igbo pour la diaspora et les curieux",
    about: "Ingénieur le jour, tuteur d'igbo passionné le soir. J'ai créé des supports illustrés pour apprendre l'alphabet, les tons et les expressions du quotidien.",
    specialties: "diaspora,ecriture,debutants", availability: "soir,week-end", speaks: "Anglais", approved: 1,
    languages: [["igbo", "native"]],
  },
  {
    name: "Grâce Mbuyi", email: "grace@riya.africa", country: "RD Congo", rate: 14, years: 3,
    headline: "Lingala et swahili congolais, en musique",
    about: "Kinoise, j'enseigne le lingala à travers les paroles de la rumba congolaise. Mes élèves apprennent vite à saluer, plaisanter et comprendre les chansons de Fally Ipupa ou de Papa Wemba.",
    specialties: "culture,conversation,debutants", availability: "matin,soir", speaks: "Français", approved: 1,
    languages: [["lingala", "native"], ["swahili", "fluent"]],
  },
  {
    name: "Hiwot Tesfaye", email: "hiwot@riya.africa", country: "Éthiopie", rate: 22, years: 7,
    headline: "Amharique et écriture guèze pas à pas",
    about: "Professeure à Addis-Abeba, je vous apprends à lire le fidel en quelques semaines, puis à tenir une vraie conversation. Je prépare aussi aux séjours professionnels en Éthiopie.",
    specialties: "ecriture,affaires,debutants", availability: "matin,apres-midi", speaks: "Anglais, Français (A2)", approved: 1,
    languages: [["amharique", "native"]],
  },
  {
    name: "Thandiwe Dlamini", email: "thandi@riya.africa", country: "Afrique du Sud", rate: 24, years: 9,
    headline: "Maîtrisez les clics du zoulou et du xhosa",
    about: "Originaire de Durban, j'enseigne le zoulou et le xhosa aux expatriés, aux étudiants et aux entreprises. Technique de prononciation des clics garantie !",
    specialties: "affaires,conversation,culture", availability: "apres-midi,soir", speaks: "Anglais, Afrikaans", approved: 1,
    languages: [["zoulou", "native"], ["xhosa", "fluent"]],
  },
  {
    name: "Kwame Asante", email: "kwame@riya.africa", country: "Ghana", rate: 16, years: 5,
    headline: "Akwaaba ! Twi et éwé avec un Kumasien",
    about: "J'enseigne le twi avec bonne humeur : proverbes, salutations, symboles adinkra et expressions de rue. Je parle aussi couramment l'éwé.",
    specialties: "conversation,culture,voyage", availability: "matin,week-end", speaks: "Anglais, Français (B1)", approved: 1,
    languages: [["twi", "native"], ["ewe", "fluent"]],
  },
  {
    name: "Aminata Traoré", email: "aminata@riya.africa", country: "Mali", rate: 13, years: 4,
    headline: "Bambara du quotidien, de Bamako à la diaspora",
    about: "Je propose des cours de bambara adaptés à tous les niveaux, avec une attention particulière aux enfants de la diaspora qui comprennent mais n'osent pas parler.",
    specialties: "enfants,diaspora,conversation", availability: "apres-midi,week-end", speaks: "Français", approved: 1,
    languages: [["bambara", "native"]],
  },
  {
    name: "Ibrahim Sani", email: "ibrahim@riya.africa", country: "Niger", rate: 15, years: 6,
    headline: "Haoussa en alphabet latin et ajami",
    about: "Enseignant à Niamey, je vous apprends le haoussa standard utilisé dans les médias et le commerce, ainsi que la lecture de l'ajami.",
    specialties: "ecriture,affaires,debutants", availability: "matin,apres-midi", speaks: "Français, Arabe", approved: 1,
    languages: [["hausa", "native"]],
  },
  {
    name: "Claudine Uwase", email: "claudine@riya.africa", country: "Rwanda", rate: 18, years: 3,
    headline: "Kinyarwanda clair et structuré",
    about: "Je vous guide à travers la grammaire du kinyarwanda (classes nominales, conjugaison) avec beaucoup d'exemples concrets et de dialogues.",
    specialties: "debutants,voyage", availability: "soir,week-end", speaks: "Anglais, Français", approved: 1,
    languages: [["kinyarwanda", "native"], ["swahili", "fluent"]],
  },
  {
    name: "Hodan Warsame", email: "hodan@riya.africa", country: "Djibouti", rate: 19, years: 5,
    headline: "Somali pour la famille et la diaspora",
    about: "J'aide les jeunes de la diaspora somalienne et les conjoints à communiquer avec leur famille, à travers la conversation et la poésie.",
    specialties: "diaspora,enfants,conversation", availability: "soir", speaks: "Français, Anglais, Arabe", approved: 1,
    languages: [["somali", "native"]],
  },
  {
    name: "Rivo Rakoto", email: "rivo@riya.africa", country: "Madagascar", rate: 15, years: 2,
    headline: "Malgache pour les voyageurs",
    about: "Guide touristique à Antananarivo, je propose des cours de malgache pour préparer votre voyage dans la Grande Île.",
    specialties: "voyage,debutants", availability: "matin", speaks: "Français", approved: 0,
    languages: [["malgache", "native"]],
  },
];

const STUDENTS = [
  { name: "Camille Martin", email: "camille@exemple.fr", country: "France" },
  { name: "Jordan Williams", email: "jordan@example.com", country: "États-Unis" },
  { name: "Moussa Keïta", email: "moussa@exemple.fr", country: "France" },
];

const REVIEW_COMMENTS = [
  "Cours très vivant, j'ai appris énormément en peu de temps. Merci !",
  "Patiente, organisée et très drôle. Je recommande à 100 %.",
  "Enfin quelqu'un qui explique les tons clairement !",
  "Parfait pour préparer mon voyage, je me sens beaucoup plus à l'aise.",
  "Excellent tuteur, des supports de qualité et beaucoup de bienveillance.",
];

// A few words per language, so finished demo lessons carry vocabulary, a quiz and
// grammar points, and the progress dashboards have something to show.
const DEMO_WORDS: Record<string, [string, string][]> = {
  swahili: [["asante", "merci"], ["rafiki", "ami"], ["maji", "eau"], ["nyumba", "maison"]],
  wolof: [["jërëjëf", "merci"], ["waaw", "oui"], ["ndox", "eau"], ["kër", "maison"]],
  yoruba: [["ẹ ṣé", "merci"], ["omi", "eau"], ["ilé", "maison"], ["ọ̀rẹ́", "ami"]],
  lingala: [["matondo", "merci"], ["mai", "eau"], ["ndako", "maison"], ["moninga", "ami"]],
  hausa: [["na gode", "merci"], ["ruwa", "eau"], ["gida", "maison"], ["aboki", "ami"]],
  igbo: [["daalụ", "merci"], ["mmiri", "eau"], ["ụlọ", "maison"], ["enyi", "ami"]],
  amharique: [["ameseginalehu", "merci"], ["wuha", "eau"], ["bet", "maison"], ["guadegna", "ami"]],
  zoulou: [["ngiyabonga", "merci"], ["amanzi", "eau"], ["indlu", "maison"], ["umngane", "ami"]],
  twi: [["medaase", "merci"], ["nsuo", "eau"], ["efie", "maison"], ["adamfo", "ami"]],
  bambara: [["i ni ce", "merci"], ["ji", "eau"], ["so", "maison"], ["teri", "ami"]],
  kinyarwanda: [["murakoze", "merci"], ["amazi", "eau"], ["inzu", "maison"], ["inshuti", "ami"]],
  somali: [["mahadsanid", "merci"], ["biyo", "eau"], ["guri", "maison"], ["saaxiib", "ami"]],
};
const DEMO_GRAMMAR = [["Les salutations selon le moment de la journée"], ["Les pronoms personnels", "Le présent des verbes courants"], ["Poser une question simple"]];

function demoLessonContent(lesson: LessonDoc, k: number): Pick<LessonDoc, "summary" | "quizzes"> {
  const words = DEMO_WORDS[lesson.languageSlug] ?? [];
  if (!words.length) return {};
  const picked = words.slice(k % 2, (k % 2) + 3);
  const [term, translation] = picked[0];
  const options = ["merci", "eau", "maison", "ami"];
  return {
    summary: {
      overview: "Cours de démonstration : salutations et vocabulaire du quotidien.",
      keyPoints: ["Saluer et remercier", "Mots de tous les jours"],
      vocabulary: picked.map(([t, tr]) => ({ term: t, translation: tr, example: "" })),
      grammar: DEMO_GRAMMAR[k % DEMO_GRAMMAR.length],
      practice: [],
      homework: "Revoir les mots du jour avec les cartes mémoire.",
      generatedAt: lesson.startsAt,
      model: "demo",
    },
    quizzes: [{
      question: `Que veut dire « ${term} » ?`,
      options,
      correctIndex: options.indexOf(translation),
      // One demo answer in three is wrong, so the success rate is realistic.
      answerIndex: k % 3 === 2 ? (options.indexOf(translation) + 1) % options.length : options.indexOf(translation),
      explanation: `« ${term} » signifie « ${translation} ».`,
    }],
  };
}

function inDays(days: number, hour: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
}

export async function seed(c: Collections) {
  const demoHash = hashPassword(DEMO_PASSWORD);
  const now = new Date();

  await c.languages.insertMany(
    LANGUAGES.map((l) => ({
      _id: new ObjectId(), slug: l.slug, name: l.name, nativeName: l.native_name, greeting: l.greeting, greetingMeaning: l.greeting_meaning,
      region: l.region, countries: l.countries, speakers: l.speakers, family: l.family, description: l.description,
    })),
  );

  const user = (name: string, email: string, role: "student" | "tutor" | "admin", country: string, passwordHash = demoHash) => ({
    _id: new ObjectId(), name, email, passwordHash, role, status: "active" as const, country, avatarUrl: "", favorites: [] as ObjectId[], createdAt: now,
  });

  const admin = user("Équipe Riya", ADMIN_EMAIL, "admin", "Sénégal", hashPassword(ADMIN_PASSWORD));
  const tutors = TUTORS.map((t) => ({
    ...user(t.name, t.email, "tutor", t.country),
    tutor: {
      headline: t.headline, about: t.about, hourlyRate: t.rate, yearsExperience: t.years,
      specialties: t.specialties.split(","), availability: t.availability.split(","), speaks: t.speaks,
      approved: t.approved === 1, languages: t.languages.map(([slug, level]) => ({ slug, level })),
      ratingSum: 0, ratingCount: 0, lessonCount: 0,
    } satisfies TutorProfile,
  }));
  const students = STUDENTS.map((s) => user(s.name, s.email, "student", s.country));
  const approved = tutors.filter((t) => t.tutor.approved);

  // Past lessons with reviews, so tutors have ratings out of the box.
  const lessons: LessonDoc[] = [];
  const reviews: ReviewDoc[] = [];
  const feedback: FeedbackDoc[] = [];
  approved.forEach((tutor, i) => {
    const reviewCount = 2 + (i % 3);
    for (let k = 0; k < reviewCount; k++) {
      const student = students[(i + k) % students.length];
      const startsAt = inDays(-7 * (k + 1) - i, 9 + k);
      const lesson: LessonDoc = {
        _id: new ObjectId(), studentId: student._id, tutorId: tutor._id, languageSlug: tutor.tutor.languages[0].slug, startsAt,
        durationMinutes: 50, price: tutor.tutor.hourlyRate, status: "completed", message: "", createdAt: startsAt,
      };
      Object.assign(lesson, demoLessonContent(lesson, k));
      const rating = (i + k) % 4 === 3 ? 4 : 5;
      lessons.push(lesson);
      reviews.push({ _id: new ObjectId(), lessonId: lesson._id, studentId: student._id, tutorId: tutor._id, rating, comment: REVIEW_COMMENTS[(i + k) % REVIEW_COMMENTS.length], createdAt: startsAt });
      feedback.push({
        _id: new ObjectId(), lessonId: lesson._id, studentId: student._id, tutorId: tutor._id, rating,
        criteria: { clarity: rating, interaction: k % 2 ? 4 : 5, content: 5, pace: rating === 5 ? 4 : 3 },
        liked: k === 0 ? "Les exemples tirés de la vie quotidienne." : "", improve: k === 1 ? "Un peu plus de temps pour parler." : "",
        createdAt: startsAt, updatedAt: startsAt,
      });
      tutor.tutor.ratingSum += rating;
      tutor.tutor.ratingCount += 1;
      tutor.tutor.lessonCount += 1;
    }
  });

  // Upcoming lessons for the first demo student, including one starting soon to try the classroom.
  const [camille] = students;
  const upcoming = (tutor: (typeof approved)[number], startsAt: Date, status: LessonDoc["status"], message: string): LessonDoc => ({
    _id: new ObjectId(), studentId: camille._id, tutorId: tutor._id, languageSlug: tutor.tutor.languages[0].slug, startsAt,
    durationMinutes: 50, price: tutor.tutor.hourlyRate, status, message, createdAt: now,
  });
  const soon = new Date(Math.ceil((now.getTime() + 10 * 60 * 1000) / (5 * 60 * 1000)) * 5 * 60 * 1000);
  lessons.push(
    upcoming(approved[0], soon, "confirmed", "Premier cours : les salutations."),
    upcoming(approved[0], inDays(2, 17), "confirmed", "J'aimerais travailler les nombres."),
    upcoming(approved[2], inDays(5, 10), "pending", "Je pars à Dakar en décembre !"),
  );

  await c.users.insertMany([admin, ...tutors, ...students]);
  await c.lessons.insertMany(lessons);
  await c.reviews.insertMany(reviews);
  await c.feedback.insertMany(feedback);

  await c.messages.insertMany([
    { _id: new ObjectId(), senderId: camille._id, recipientId: approved[0]._id, body: "Bonjour Amani, est-ce qu'on pourra voir les nombres pendant le prochain cours ?", readAt: now, createdAt: new Date(now.getTime() - 3600_000) },
    { _id: new ObjectId(), senderId: approved[0]._id, recipientId: camille._id, body: "Habari Camille ! Bien sûr, je prépare un petit jeu pour ça. Tutaonana !", readAt: null, createdAt: new Date(now.getTime() - 1800_000) },
  ]);

  const topic = (authorId: ObjectId, category: string, languageSlug: string | null, title: string, body: string, views: number) =>
    ({ _id: new ObjectId(), authorId, category, languageSlug, title, body, views, createdAt: now });
  const reply = (topicId: ObjectId, authorId: ObjectId, body: string) => ({ _id: new ObjectId(), topicId, authorId, body, createdAt: now });

  const t1 = topic(students[0]._id, "grammaire", "swahili", "Comment fonctionnent les classes nominales en swahili ?", "Je bloque sur les accords m-/wa-, ki-/vi-... Vous avez une astuce pour les mémoriser ?", 128);
  const t2 = topic(students[2]._id, "echange", "bambara", "Cherche partenaire d'échange bambara ↔ français", "Je suis né en France de parents maliens, je comprends le bambara mais je le parle mal. Quelqu'un pour pratiquer une fois par semaine ?", 64);
  const t3 = topic(students[1]._id, "ressources", null, "Vos podcasts et chaînes préférés pour apprendre une langue africaine ?", "Je cherche des ressources audio pour progresser entre les cours. Partagez vos favoris !", 211);
  const t4 = topic(approved[7]._id, "culture", "twi", "Que signifient les symboles adinkra ?", "Petit fil pour partager la signification des symboles adinkra : Gye Nyame, Sankofa, Dwennimmen... Lequel est votre préféré ?", 97);
  await c.topics.insertMany([t1, t2, t3, t4]);
  await c.replies.insertMany([
    reply(t1._id, approved[0]._id, "Commence par les classes 1/2 (personnes) et 7/8 (objets), ce sont les plus fréquentes. Apprends chaque nom avec son adjectif : mtoto mzuri, watoto wazuri !"),
    reply(t1._id, students[1]._id, "Merci, ça m'aide aussi beaucoup."),
    reply(t2._id, approved[8]._id, "Très belle démarche Moussa ! N'hésite pas à réserver un cours d'essai, on peut travailler exactement là-dessus."),
    reply(t3._id, approved[4]._id, "Pour le lingala, écoute la rumba avec les paroles sous les yeux, c'est imbattable."),
  ]);
}
