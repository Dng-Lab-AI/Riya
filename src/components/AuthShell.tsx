import Image from "next/image";
import { PHOTOS } from "@/lib/images";
import { Logo } from "./ui";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="grid min-h-[calc(100vh-4rem)] gap-6 p-3 sm:p-4 lg:grid-cols-2">
      <div className="relative hidden overflow-hidden rounded-[2rem] lg:block">
        <Image src={PHOTOS.portraitLagos.src} alt={PHOTOS.portraitLagos.alt} fill preload sizes="50vw" placeholder="blur" className="object-cover object-top" />
        <div className="photo-shade absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-sand-50">
          <p className="font-display text-4xl font-semibold leading-tight">« Akwaaba. Karibu. Dalal ak jàmm. »</p>
          <p className="mt-3 text-sand-200">Bienvenue, en twi, en swahili et en wolof.</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Logo />
          <h1 className="mt-8 font-display text-4xl font-semibold">{title}</h1>
          <p className="mt-1 text-earth-600">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-6 text-center text-sm text-earth-600">{footer}</div>
        </div>
      </div>
    </div>
  );
}
