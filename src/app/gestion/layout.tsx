import { AdminNav } from "@/components/admin/AdminNav";
import { getCurrentUser } from "@/lib/auth";
import { getUnreadCount } from "@/lib/queries";
import { publicOrigin } from "@/lib/site";
import { countTutorsToReview } from "@/lib/tutor-review";
import { countOpenReports } from "@/lib/admin-ops";

// Admin site (admin.<domain>): its own shell, without the public header and footer.
// Signed-out visitors only see the login page (each page checks the administrator itself).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return <main className="flex min-h-screen items-center justify-center bg-forest-900 p-4">{children}</main>;
  }
  const [toReview, unread, reports, publicUrl] = await Promise.all([countTutorsToReview(), getUnreadCount(user._id), countOpenReports(), publicOrigin()]);

  return (
    <div className="min-h-screen bg-sand-50 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="bg-forest-900 p-4 lg:sticky lg:top-0 lg:h-screen lg:p-6">
        <AdminNav name={user.name} toReview={toReview} unread={unread} reports={reports} publicUrl={publicUrl} />
      </aside>
      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}
