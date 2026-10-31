import Link from "next/link";
import { ChevronDown, LogOut, MessageCircle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getUnreadCount } from "@/lib/queries";
import { logout } from "@/lib/actions/auth";
import { Avatar, Logo } from "./ui";
import { MobileMenu } from "./MobileMenu";

const NAV = [
  { href: "/langues", label: "Langues" },
  { href: "/tuteurs", label: "Trouver un tuteur" },
  { href: "/forum", label: "Communauté" },
  { href: "/devenir-tuteur", label: "Devenir tuteur" },
];

export async function Header() {
  const user = await getCurrentUser();
  const unread = user ? await getUnreadCount(user._id) : 0;
  const accountLinks = user
    ? [
        { href: "/tableau-de-bord", label: "Mes cours" },
        { href: "/messages", label: unread ? `Messages (${unread})` : "Messages" },
        { href: "/profil", label: "Mon profil" },
        ...(user.role === "admin" ? [{ href: "/admin", label: "Administration" }] : []),
      ]
    : [];

  return (
    <header className="sticky top-0 z-40 px-3 pt-2 sm:px-4">
      <div className="relative mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 rounded-full border border-earth-900/10 bg-white/85 pl-4 pr-2 shadow-[0_8px_30px_-12px_rgb(34_24_15/0.25)] backdrop-blur-md sm:pl-5">
        <div className="flex items-center gap-6">
          <Link href="/" aria-label="Accueil Riya"><Logo /></Link>
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-full px-3.5 py-2 text-sm font-medium text-earth-700 transition hover:bg-forest-800 hover:text-sand-50">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <>
              <Link href="/messages" className="btn-ghost relative" aria-label="Messages">
                <MessageCircle size={20} />
                {unread > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-clay-600 px-1 text-[10px] font-bold text-white">{unread}</span>
                )}
              </Link>
              <details className="group relative">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full py-1 pl-1 pr-3 hover:bg-sand-100">
                  <Avatar name={user.name} src={user.avatar_url} size={34} />
                  <span className="text-sm font-semibold">{user.name.split(" ")[0]}</span>
                  <ChevronDown size={16} className="transition group-open:rotate-180" />
                </summary>
                <div className="card absolute right-0 mt-2 w-56 overflow-hidden p-1.5 shadow-lg">
                  {accountLinks.map((item) => (
                    <Link key={item.href} href={item.href} className="block rounded-lg px-3 py-2 text-sm hover:bg-sand-100">{item.label}</Link>
                  ))}
                  <form action={logout} className="border-t border-sand-200 pt-1.5 mt-1.5">
                    <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-clay-700 hover:bg-clay-50">
                      <LogOut size={16} /> Se déconnecter
                    </button>
                  </form>
                </div>
              </details>
            </>
          ) : (
            <>
              <Link href="/connexion" className="btn-ghost">Se connecter</Link>
              <Link href="/inscription" className="btn-dark">Commencer gratuitement</Link>
            </>
          )}
        </div>

        <MobileMenu links={[...NAV, ...accountLinks]} signedIn={!!user}>
          {user && (
            <form action={logout}>
              <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left font-medium text-clay-700"><LogOut size={18} /> Se déconnecter</button>
            </form>
          )}
        </MobileMenu>
      </div>
    </header>
  );
}
