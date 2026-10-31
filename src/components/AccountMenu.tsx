"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, LogOut } from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { Avatar } from "./ui";

// Closes a popup when the user clicks or taps anywhere outside it, or presses Escape.
export function useDismiss<T extends HTMLElement>(open: boolean, close: () => void) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  return ref;
}

export function AccountMenu({ name, avatarUrl, links }: { name: string; avatarUrl: string; links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss<HTMLDivElement>(open, useCallback(() => setOpen(false), []));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 hover:bg-sand-100"
      >
        <Avatar name={name} src={avatarUrl} size={34} />
        <span className="text-sm font-semibold">{name.split(" ")[0]}</span>
        <ChevronDown size={16} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div role="menu" className="card absolute right-0 mt-2 w-56 overflow-hidden p-1.5 shadow-lg">
          {links.map((item) => (
            <Link key={item.href} href={item.href} role="menuitem" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-sand-100">
              {item.label}
            </Link>
          ))}
          <form action={logout} className="mt-1.5 border-t border-sand-200 pt-1.5">
            <button role="menuitem" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-clay-700 hover:bg-clay-50">
              <LogOut size={16} /> Se déconnecter
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
