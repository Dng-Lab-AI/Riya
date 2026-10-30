import "server-only";
import { revalidatePath } from "next/cache";

export type FormState = { error?: string; success?: string } | undefined;

export function text(formData: FormData, key: string, max = 2000): string {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

export function int(formData: FormData, key: string): number {
  const n = Number.parseInt(String(formData.get(key) ?? ""), 10);
  return Number.isFinite(n) ? n : NaN;
}

// Only allow same-site relative paths after login, never "//evil.com".
export function safeRedirectPath(value: FormDataEntryValue | null, fallback: string): string {
  const path = typeof value === "string" ? value : "";
  return path.startsWith("/") && !path.startsWith("//") ? path : fallback;
}

// Pages read straight from the database, so after a mutation we refresh every route.
export function refreshAll() {
  revalidatePath("/", "layout");
}
