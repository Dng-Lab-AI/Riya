import Link from "next/link";
import { LogOut } from "lucide-react";
import { defineMessages } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { getUnreadCount } from "@/lib/queries";
import { logout } from "@/lib/actions/auth";
import { Logo } from "./ui";
import { AccountMenu } from "./AccountMenu";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { LiveMessageBadge } from "./LiveMessageBadge";
import { MobileMenu } from "./MobileMenu";

const M = defineMessages({
  en: {
    languages: "Languages", findTutor: "Find a tutor", community: "Community", becomeTutor: "Become a tutor", home: "Riya home",
    tutorHome: "Home", calendar: "Calendar", lessons: "My lessons", tutors: "My tutors", progressTutor: "My progress", progressStudent: "My progress",
    messages: "Messages", profile: "My profile", admin: "Admin", signIn: "Log in", start: "Get started for free", logout: "Log out",
  },
  fr: {
    languages: "Langues", findTutor: "Trouver un tuteur", community: "Communauté", becomeTutor: "Devenir tuteur", home: "Accueil Riya",
    tutorHome: "Accueil", calendar: "Calendrier", lessons: "Mes cours", tutors: "Mes tuteurs", progressTutor: "Mon évolution", progressStudent: "Ma progression",
    messages: "Messages", profile: "Mon profil", admin: "Administration", signIn: "Se connecter", start: "Commencer gratuitement", logout: "Se déconnecter",
  },
});

export async function Header() {
  const [user, locale] = await Promise.all([getCurrentUser(), getLocale()]);
  const t = M[locale];
  const unread = user ? await getUnreadCount(user._id) : 0;
  // "Become a tutor" only speaks to visitors and students: tutors (and the team) already are.
  const nav = [
    { href: "/langues", label: t.languages },
    { href: "/tuteurs", label: t.findTutor },
    { href: "/forum", label: t.community },
    ...(!user || user.role === "student" ? [{ href: "/devenir-tuteur", label: t.becomeTutor }] : []),
  ];
  const accountLinks = user
    ? [
        ...(user.role === "tutor" ? [{ href: "/accueil", label: t.tutorHome }, { href: "/calendrier", label: t.calendar }] : []),
        { href: "/tableau-de-bord", label: t.lessons },
        ...(user.role === "student" ? [{ href: "/mes-tuteurs", label: t.tutors }] : []),
        { href: "/progression", label: user.role === "tutor" ? t.progressTutor : t.progressStudent },
        { href: "/messages", label: unread ? `${t.messages} (${unread})` : t.messages },
        { href: "/profil", label: t.profile },
        ...(user.role === "admin" ? [{ href: "/admin", label: t.admin }] : []),
      ]
    : [];

  return (
    <header className="sticky top-0 z-40 px-3 pt-2 sm:px-4">
      <div className="relative mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 rounded-full border border-earth-900/10 bg-white/85 pl-4 pr-2 shadow-[0_8px_30px_-12px_rgb(34_24_15/0.25)] backdrop-blur-md sm:pl-5">
        <div className="flex items-center gap-6">
          <Link href="/" aria-label={t.home}><Logo /></Link>
          <nav className="hidden items-center gap-1 lg:flex">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-full px-3.5 py-2 text-sm font-medium text-earth-700 transition hover:bg-forest-800 hover:text-sand-50">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <LanguageSwitcher />
          {user ? (
            <>
              <LiveMessageBadge initialUnread={unread} />
              <AccountMenu name={user.name} avatarUrl={user.avatar_url} links={accountLinks} />
            </>
          ) : (
            <>
              <Link href="/connexion" className="btn-ghost">{t.signIn}</Link>
              <Link href="/inscription" className="btn-dark">{t.start}</Link>
            </>
          )}
        </div>

        <MobileMenu links={[...nav, ...accountLinks]} signedIn={!!user}>
          {user && (
            <form action={logout}>
              <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left font-medium text-clay-700"><LogOut size={18} /> {t.logout}</button>
            </form>
          )}
        </MobileMenu>
      </div>
    </header>
  );
}
