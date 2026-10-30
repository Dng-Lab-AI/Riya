import { Star } from "lucide-react";

// Small presentational building blocks shared across pages (server-safe).

const AVATAR_COLORS = ["bg-clay-500", "bg-forest-600", "bg-ochre-500", "bg-earth-700", "bg-clay-700", "bg-forest-800"];

export function Avatar({ name, src, size = 48, className = "" }: { name: string; src?: string; size?: number; className?: string }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- user-provided URLs from any host
    return <img src={src} alt={name} style={style} className={`shrink-0 rounded-full object-cover ${className}`} />;
  }
  const initials = name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  const color = AVATAR_COLORS[[...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
  return (
    <span style={style} className={`inline-flex shrink-0 items-center justify-center rounded-full font-display font-semibold text-white ${color} ${className}`} aria-hidden>
      {initials}
    </span>
  );
}

export function Rating({ value, count }: { value: number | null; count: number }) {
  if (!count || value === null) return <span className="chip bg-forest-100 text-forest-800">Nouveau</span>;
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold text-earth-900">
      <Star size={15} className="fill-ochre-400 text-ochre-400" />
      {value.toFixed(1)}
      <span className="font-normal text-earth-500">({count} avis)</span>
    </span>
  );
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex" aria-label={`${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= value ? "fill-ochre-400 text-ochre-400" : "text-sand-300"} />
      ))}
    </span>
  );
}

export function FormAlert({ state }: { state: { error?: string; success?: string } | undefined }) {
  if (state?.error) return <p role="alert" className="rounded-xl bg-clay-50 px-4 py-3 text-sm font-medium text-clay-800">{state.error}</p>;
  if (state?.success && state.success !== "sent") return <p role="status" className="rounded-xl bg-forest-100 px-4 py-3 text-sm font-medium text-forest-800">{state.success}</p>;
  return null;
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="pattern-bogolan border-b border-sand-200">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-clay-600">{eyebrow}</p>}
        <h1 className="font-display text-3xl font-semibold text-earth-900 sm:text-4xl">{title}</h1>
        {children && <div className="mt-3 max-w-2xl text-earth-600">{children}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="card pattern-bogolan px-6 py-12 text-center">
      <p className="font-display text-xl font-semibold text-earth-900">{title}</p>
      {children && <div className="mt-2 text-sm text-earth-600">{children}</div>}
    </div>
  );
}

// Riya mark: a speech bubble (a language is spoken) holding an "R", with an ochre
// diamond borrowed from kente weaving as the dot of the "i".
export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <circle cx="24" cy="23" r="19" className="fill-clay-600" />
      <path d="M8.5 31.5 4 44l13.5-4.5Z" className="fill-clay-600" />
      <path d="M18 34V14h7.5a6 6 0 0 1 0 12H18m7 0 6.5 8" fill="none" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" className="stroke-sand-50" />
      <path d="M38 3.5 43 8.5 38 13.5 33 8.5Z" strokeWidth="2" className="fill-ochre-400 stroke-sand-50" />
    </svg>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2" aria-label="Riya">
      <LogoMark />
      <span aria-hidden className={`font-display text-[1.7rem] font-semibold leading-none tracking-tight ${light ? "text-sand-50" : "text-earth-900"}`}>
        r<span className="relative inline-block">ı<span className="absolute left-1/2 top-[0.02em] h-[0.19em] w-[0.19em] -translate-x-1/2 rotate-45 bg-ochre-400" /></span>ya
      </span>
    </span>
  );
}
