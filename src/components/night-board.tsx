"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";
import { RevealCard } from "@/components/reveal-card";
import type { OfferView } from "@/domain/queries";
import { markIntroSeen, readReveal, revealOffer, type RevealRecord } from "@/domain/reveal";
import { formatRemaining, formatWhen } from "@/domain/text";
import { cn } from "@/lib/cn";

export interface NightFace {
  id: number;
  skinId: string | null;
  name: string;
  weaponName: string | null;
  edition: string | null;
  priceVp: number;
  priceText: string;
  listPriceText: string | null;
  discountLabel: string | null;
  trash: boolean;
  imageFile: string | null;
  wished: boolean;
  owned: boolean;
}

function toOffer(face: NightFace): OfferView {
  return {
    id: face.id,
    position: face.id,
    skinId: face.skinId,
    levelId: face.skinId ?? "",
    name: face.name,
    weaponName: face.weaponName,
    edition: face.edition,
    priceVp: face.priceVp,
    note: "passed",
    owned: face.owned,
    wished: face.wished,
    imageFile: face.imageFile,
    unresolved: false,
  };
}

function storageKey(accountPuuid: string) {
  return `valorant-mercado-revelado:${accountPuuid}`;
}

function loadRecord(revealId: number, key: string): RevealRecord {
  try {
    return readReveal(localStorage.getItem(key), revealId);
  } catch {
    return readReveal(null, revealId);
  }
}

function saveRecord(record: RevealRecord, key: string) {
  try {
    localStorage.setItem(key, JSON.stringify(record));
  } catch {
    // The reveal still works for this visit if the browser blocks storage.
  }
}

function prefersStillness() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function NightBoard({
  faces,
  revealId,
  accountPuuid,
  expiresAt,
  serverNow,
  hasReal,
  mode,
  empty,
}: {
  faces: NightFace[];
  revealId: number;
  accountPuuid: string;
  expiresAt: string | null;
  serverNow: number;
  hasReal: boolean;
  mode: "real" | "sim";
  empty: string | null;
}) {
  const key = storageKey(accountPuuid);
  const [record, setRecord] = useState<RevealRecord | null>(null);
  const [intro, setIntro] = useState(false);
  const [animatingId, setAnimatingId] = useState<number | null>(null);
  const [wishFlash, setWishFlash] = useState(false);

  useLayoutEffect(() => {
    const stored = loadRecord(revealId, key);
    setRecord(stored);
    setIntro(faces.length > 0 && !stored.introSeen);
    setAnimatingId(null);
  }, [revealId, key, faces.length]);

  useEffect(() => {
    if (!intro || !record) return;
    const timer = window.setTimeout(() => finishIntro(), prefersStillness() ? 700 : 1400);
    return () => window.clearTimeout(timer);
  }, [intro, record]);

  useEffect(() => {
    if (animatingId === null) return;
    const timer = window.setTimeout(() => {
      setAnimatingId(null);
      setWishFlash(false);
    }, 1300);
    return () => window.clearTimeout(timer);
  }, [animatingId]);

  function finishIntro() {
    setIntro(false);
    setRecord((current) => {
      if (!current) return current;
      const seen = markIntroSeen(current);
      saveRecord(seen, key);
      return seen;
    });
  }

  function reveal(offerId: number, wished: boolean) {
    if (intro || !record || record.offerIds.includes(offerId)) return;
    setRecord((current) => {
      if (!current || current.offerIds.includes(offerId)) return current;
      const next = revealOffer(current, offerId);
      saveRecord(next, key);
      return next;
    });
    if (prefersStillness()) return;
    setAnimatingId(offerId);
    if (wished) setWishFlash(true);
  }

  const ready = record !== null;
  const left = expiresAt ? new Date(expiresAt).getTime() - serverNow : 0;

  return (
    <section className="relative flex min-h-0 flex-1 flex-col gap-2">
      <h1 className="sr-only">Mercado negro</h1>
      {hasReal ? (
        <div className="flex shrink-0 gap-2 text-sm" role="tablist" aria-label="Qué mercado ver">
          <Link href="/mercado" aria-current={mode === "real" ? "page" : undefined} className={cn("rounded-full px-3 py-1", mode === "real" ? "bg-white text-zinc-950" : "text-zinc-300 hover:bg-white/10")}>
            El de hoy
          </Link>
          <Link href="/mercado?vista=simulador" aria-current={mode === "sim" ? "page" : undefined} className={cn("rounded-full px-3 py-1", mode === "sim" ? "bg-white text-zinc-950" : "text-zinc-300 hover:bg-white/10")}>
            Simulador
          </Link>
        </div>
      ) : null}
      {faces.length > 0 ? (
        <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-3 gap-2 sm:grid-cols-3 sm:grid-rows-2 sm:gap-3">
          {faces.map((face, index) => {
            const offer = toOffer(face);
            const open = record?.offerIds.includes(face.id) ?? false;
            return (
              <RevealCard
                key={face.id}
                offer={offer}
                open={open}
                animate={animatingId === face.id}
                enterIndex={index}
                showNotes={false}
                priceText={face.priceText}
                listPriceText={face.listPriceText}
                discountLabel={face.discountLabel}
                trash={face.trash}
                onReveal={() => reveal(face.id, face.wished)}
                locked={intro || !ready}
                onSettled={() => {
                  setAnimatingId((current) => (current === face.id ? null : current));
                  setWishFlash(false);
                }}
              />
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 items-center">
          <p className="max-w-xl text-sm text-zinc-300">{empty}</p>
        </div>
      )}
      {expiresAt ? (
        <p className="shrink-0 truncate text-xs text-zinc-400">
          Vence el {formatWhen(expiresAt)} · {formatRemaining(left)}
        </p>
      ) : null}
      {intro ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <p className="reveal-intro text-3xl font-semibold tracking-wide text-white sm:text-5xl" onAnimationEnd={finishIntro}>
            Mercado negro
          </p>
        </div>
      ) : null}
      {wishFlash ? <div className="reveal-flash pointer-events-none absolute inset-0 z-10" aria-hidden /> : null}
      {!ready && faces.length > 0 ? <div className="absolute inset-0 bg-[#090b10]" aria-hidden /> : null}
    </section>
  );
}
