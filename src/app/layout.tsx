import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Header } from "@/components/header";
import { SessionChoice } from "@/components/session-choice";
import { accountLabel } from "@/domain/text";
import { getAccount, getSettings, needsSessionChoice } from "@/domain/store";
import { getSql } from "@/server/db";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tienda de Valorant",
  description: "La tienda diaria, los lotes destacados y la lista de deseos, en esta máquina.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const sql = await getSql();
  const account = getAccount(sql);
  const askSession = needsSessionChoice(getSettings(sql).reader, process.env.VALORANT_READER === "fixture");
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">
        <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-zinc-950">
          Saltar al contenido
        </a>
        {askSession ? (
          <SessionChoice />
        ) : (
          <>
            <Header account={accountLabel(account)} />
            <main id="contenido" className="mx-auto max-w-6xl px-4 py-6">{children}</main>
          </>
        )}
      </body>
    </html>
  );
}
