import { EspaceNav } from "@/components/espace/EspaceNav";
import { Avatar } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { getUnreadCount } from "@/lib/queries";

const ROLE_LABELS: Record<string, string> = { student: "Élève", tutor: "Tuteur", admin: "Équipe Riya" };

// Personal space: a sidebar with every zone (lessons, messages, profile…) next to the page.
export default async function EspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  // Each page sends signed-out visitors to the login page with the right return path.
  if (!user) return children;
  const unread = await getUnreadCount(user._id);

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-8 lg:px-8 lg:py-8">
      <aside className="min-w-0 lg:sticky lg:top-20 lg:h-fit">
        <div className="mb-4 hidden items-center gap-3 rounded-[1.5rem] bg-sand-100 p-4 lg:flex">
          <Avatar name={user.name} src={user.avatar_url} size={48} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{user.name}</p>
            <p className="truncate text-xs text-earth-500">{ROLE_LABELS[user.role] ?? user.role}{user.country && ` · ${user.country}`}</p>
          </div>
        </div>
        <EspaceNav role={user.role} userId={user.id} unread={unread} />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
