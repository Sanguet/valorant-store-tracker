"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createProfileAction } from "@/app/actions";
import { calendarDay, NIGHT_SEEN_KEY, nightMenuGlows } from "@/domain/night-market";
import { SubmitButton } from "@/components/submit-button";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/", label: "Hoy", glow: false },
  { href: "/historial", label: "Historial", glow: false },
  { href: "/lotes", label: "Lotes", glow: false },
  { href: "/deseos", label: "Deseos", glow: false },
  { href: "/mercado", label: "Mercado negro", glow: true },
];

export function Header({ account, offer = null }: { account: string; offer?: { puuid: string; label: string } | null }) {
  const pathname = usePathname();
  const viewingNight = pathname.startsWith("/mercado");
  const [glows, setGlows] = useState(false);
  useEffect(() => {
    const today = calendarDay(new Date());
    if (viewingNight) localStorage.setItem(NIGHT_SEEN_KEY, today);
    setGlows(nightMenuGlows(localStorage.getItem(NIGHT_SEEN_KEY), today, viewingNight));
  }, [viewingNight]);
  return (
    <header className="border-b border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="h-8 w-1.5 rounded-full bg-[#ff4655]" aria-hidden />
          <div>
            <Link href="/" className="text-lg font-semibold tracking-tight" aria-label="Valorant Store Tracker">
              <span className="md:hidden">VST</span>
              <span className="hidden md:inline">Valorant Store Tracker</span>
            </Link>
            <p className="text-xs text-zinc-400">{account}</p>
          </div>
        </div>
        <nav className="flex max-w-full flex-wrap items-center gap-x-2 gap-y-2 px-2 py-2 text-sm">
          {LINKS.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn("nav-view inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 whitespace-nowrap", active ? "bg-white text-zinc-950" : "text-zinc-300 hover:bg-white/10")}
              >
                {link.glow ? (
                  <span className={cn("inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#ff4655]/20 text-[#ff4655]", glows && "night-glow", active && "text-zinc-950")} aria-hidden>
                    <svg viewBox="0 0 16 16" className="h-3 w-3 fill-current">
                      <path d="M10.5 2.2A6 6 0 1 0 13.8 10 5 5 0 0 1 10.5 2.2z" />
                    </svg>
                  </span>
                ) : null}
                {link.label}
              </Link>
            );
          })}
          <Link href="/conexion" aria-current={pathname.startsWith("/conexion") ? "page" : undefined} className={cn("nav-view inline-flex items-center rounded-full px-3 py-1.5 whitespace-nowrap", pathname.startsWith("/conexion") ? "bg-white text-zinc-950" : "text-zinc-300 hover:bg-white/10")}>
            Conexión
          </Link>
        </nav>
      </div>
      {offer ? (
        <form action={createProfileAction} className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 border-t border-white/10 px-4 py-2">
          <p className="text-sm text-zinc-200">
            El Riot Client está en {offer.label}. Crear un perfil no borra {account}.
          </p>
          <SubmitButton idle="Crear perfil" pending="Creando…" variant="primary" />
        </form>
      ) : null}
    </header>
  );
}
