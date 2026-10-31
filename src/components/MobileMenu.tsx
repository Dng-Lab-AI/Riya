"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useDismiss } from "./AccountMenu";

export function MobileMenu({ links, signedIn, children }: { links: { href: string; label: string }[]; signedIn: boolean; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss<HTMLDivElement>(open, close);

  return (
    <div ref={ref} className="lg:hidden">
      <button onClick={() => setOpen((o) => !o)} className="btn-ghost" aria-expanded={open} aria-label="Menu">
        {open ? <X size={24} /> : <Menu size={24} />}
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full mt-2 rounded-3xl border border-earth-900/10 bg-white px-4 pb-5 pt-3 shadow-xl">
          <nav className="flex flex-col">
            {links.map((item) => (
              <Link key={item.href} href={item.href} onClick={close} className="rounded-lg px-3 py-2.5 font-medium text-earth-800 hover:bg-sand-100">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 border-t border-sand-200 pt-3">
            {signedIn ? (
              children
            ) : (
              <div className="flex gap-2">
                <Link href="/connexion" onClick={close} className="btn-outline flex-1">Se connecter</Link>
                <Link href="/inscription" onClick={close} className="btn-dark flex-1">Commencer</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
