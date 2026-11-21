"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/", label: "Hoy" },
  { href: "/historial", label: "Historial" },
  { href: "/lotes", label: "Lotes" },
  { href: "/deseos", label: "Deseos" },
];

export function Header({ account }: { account: string }) {
  const pathname = usePathname();
  return (
    <header className="border-b border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="h-8 w-1.5 rounded-full bg-[#ff4655]" aria-hidden />
          <div>
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Tienda
            </Link>
            <p className="text-xs text-zinc-400">{account}</p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto text-sm">
          {LINKS.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn("rounded-full px-3 py-1.5 whitespace-nowrap", active ? "bg-white text-zinc-950" : "text-zinc-300 hover:bg-white/10")}
              >
                {link.label}
              </Link>
            );
          })}
          <Link href="/conexion" className={cn("rounded-full px-3 py-1.5 whitespace-nowrap", pathname.startsWith("/conexion") ? "bg-white text-zinc-950" : "text-zinc-300 hover:bg-white/10")}>
            Conexión
          </Link>
        </nav>
      </div>
    </header>
  );
}
