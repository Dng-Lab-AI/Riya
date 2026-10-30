"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export function MobileMenu({ links, signedIn, children }: { links: { href: string; label: string }[]; signedIn: boolean; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="lg:hidden">
      <button onClick={() => setOpen((o) => !o)} className="btn-ghost" aria-expanded={open} aria-label="Menu">
        {open ? <X size={24} /> : <Menu size={24} />}
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full border-b border-sand-200 bg-sand-50 px-4 pb-6 pt-2 shadow-lg">
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
                <Link href="/inscription" onClick={close} className="btn-primary flex-1">Commencer</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
