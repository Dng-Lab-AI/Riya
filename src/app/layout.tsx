import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SITE } from "@/lib/constants";

const body = DM_Sans({ variable: "--font-body", subsets: ["latin", "latin-ext"] });
const display = Fraunces({ variable: "--font-display-face", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: { default: `${SITE.name} · Apprenez les langues africaines avec des tuteurs natifs`, template: `%s · ${SITE.name}` },
  description: SITE.description,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${body.variable} ${display.variable}`}>
      <body className="flex min-h-screen flex-col antialiased">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
