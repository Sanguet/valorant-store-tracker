import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Header } from "@/components/header";
import { accountLabel } from "@/domain/text";
import { getAccount } from "@/domain/store";
import { getSql } from "@/server/db";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tienda de Valorant",
  description: "La tienda diaria, los lotes destacados y la lista de deseos, en esta máquina.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const account = getAccount(await getSql());
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">
        <NuqsAdapter>
          <Header account={accountLabel(account)} />
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        </NuqsAdapter>
      </body>
    </html>
  );
}
