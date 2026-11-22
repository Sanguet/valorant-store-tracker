import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Montserrat } from "next/font/google";
import { Header } from "@/components/header";
import { accountLabel } from "@/domain/text";
import { getAccount } from "@/domain/store";
import { currentProfileOffer, getSql } from "@/server/db";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-montserrat",
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tienda de Valorant",
  description: "La tienda diaria, los lotes destacados y la lista de deseos, en esta máquina.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const sql = await getSql();
  const account = getAccount(sql);
  const offer = currentProfileOffer();
  return (
    <html lang="es" className={`${montserrat.variable} ${montserrat.className}`}>
      <body className="antialiased">
        <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-zinc-950">
          Saltar al contenido
        </a>
        <div className="flex h-dvh flex-col">
          <Header account={accountLabel(account)} offer={offer} />
          <main id="contenido" className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col overflow-y-auto px-4 py-3">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
