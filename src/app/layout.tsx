import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { defineMessages } from "@/i18n";
import { LocaleProvider } from "@/i18n/client";
import { getLocale } from "@/i18n/server";
import { SITE } from "@/lib/constants";

const body = DM_Sans({ variable: "--font-body", subsets: ["latin", "latin-ext"] });
const display = Fraunces({ variable: "--font-display-face", subsets: ["latin", "latin-ext"] });

const M = defineMessages({
  en: {
    title: "Learn African languages with native tutors",
    description: "Learn Swahili, Wolof, Yoruba, Lingala and many more African languages with native tutors, in private online lessons.",
  },
  fr: {
    title: "Apprenez les langues africaines avec des tuteurs natifs",
    description: SITE.description,
  },
});

export async function generateMetadata(): Promise<Metadata> {
  const t = M[await getLocale()];
  return { title: { default: `${SITE.name} · ${t.title}`, template: `%s · ${SITE.name}` }, description: t.description };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${body.variable} ${display.variable}`}>
      <body className="flex min-h-screen flex-col antialiased">
        <LocaleProvider locale={locale}>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </LocaleProvider>
      </body>
    </html>
  );
}
