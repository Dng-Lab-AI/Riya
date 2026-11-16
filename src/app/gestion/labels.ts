import type { Locale } from "@/i18n";
import type { AdminLogAction, Role, UserDoc } from "@/lib/db";

// Labels shared by the pages of the admin site.

export const ROLE_LABELS: Record<Locale, Record<Role, string>> = {
  en: { student: "Student", tutor: "Tutor", admin: "Admin" },
  fr: { student: "Élève", tutor: "Tuteur", admin: "Admin" },
};

export const STATUS_LABELS: Record<Locale, Record<UserDoc["status"], string>> = {
  en: { active: "Active", suspended: "Suspended", blocked: "Blocked" },
  fr: { active: "Actif", suspended: "Suspendu", blocked: "Bloqué" },
};

export const STATUS_STYLE: Record<UserDoc["status"], string> = {
  active: "bg-forest-100 text-forest-800",
  suspended: "bg-ochre-100 text-ochre-800",
  blocked: "bg-clay-100 text-clay-800",
};

export const ROLE_STYLE: Record<Role, string> = {
  student: "bg-sand-100 text-earth-700",
  tutor: "bg-forest-100 text-forest-800",
  admin: "bg-ochre-100 text-ochre-800",
};

export const ACTION_LABELS: Record<Locale, Record<AdminLogAction, string>> = {
  en: {
    approve: "Tutor approved", hide: "Hidden from search", ask_changes: "Changes asked", suspend: "Suspended", block: "Blocked",
    reactivate: "Reactivated", delete: "Account deleted", role: "Role changed", message: "Message sent",
    admin_add: "Made administrator", admin_remove: "Administrator rights removed",
  },
  fr: {
    approve: "Tuteur validé", hide: "Masqué de la recherche", ask_changes: "Modifications demandées", suspend: "Suspendu", block: "Bloqué",
    reactivate: "Réactivé", delete: "Compte supprimé", role: "Rôle modifié", message: "Message envoyé",
    admin_add: "Nommé administrateur", admin_remove: "Droits d'administrateur retirés",
  },
};
