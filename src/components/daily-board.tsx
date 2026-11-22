"use client";

import { useEffect, useLayoutEffect, useState, type CSSProperties } from "react";
import { Remaining } from "@/components/countdown";
import { RefreshButton } from "@/components/refresh-on-open";
import { RevealCard } from "@/components/reveal-card";
import { tierColor } from "@/domain/catalog";
import type { CycleView } from "@/domain/queries";
import { markIntroSeen, readReveal, revealOffer, type RevealRecord } from "@/domain/reveal";
import { formatWhen } from "@/domain/text";

const STORAGE_KEY = "valorant-tienda-revelado";

function storageKey(accountPuuid: string) {
  return accountPuuid ? `${STORAGE_KEY}:${accountPuuid}` : STORAGE_KEY;
}

function loadRecord(cycleId: number, key: string): RevealRecord {
  try {
    const scoped = localStorage.getItem(key);
    if (scoped) return readReveal(scoped, cycleId);
    if (key !== STORAGE_KEY) {
      const legacy = readReveal(localStorage.getItem(STORAGE_KEY), cycleId);
      if (legacy.introSeen || legacy.offerIds.length > 0) return legacy;
    }
    return readReveal(null, cycleId);
  } catch {
    return readReveal(null, cycleId);
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

export function DailyBoard({
  cycle,
  serverNow,
  fixture,
  message,
  messageOk,
  accountPuuid = "",
  grades = [],
}: {
  cycle: CycleView;
  serverNow: number;
  fixture: boolean;
  message: string;
  messageOk: boolean;
  accountPuuid?: string;
  grades?: { skinId: string; grade: string }[];
}) {
  const key = storageKey(accountPuuid);
  const [record, setRecord] = useState<RevealRecord | null>(null);
  const [intro, setIntro] = useState(false);
  const [animatingId, setAnimatingId] = useState<number | null>(null);
  const [wishFlash, setWishFlash] = useState(false);
  const [wishColor, setWishColor] = useState("#fad663");

  useLayoutEffect(() => {
    const stored = loadRecord(cycle.id, key);
    setRecord(stored);
    setIntro(!stored.introSeen);
    setAnimatingId(null);
  }, [cycle.id, key]);

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

  function reveal(offerId: number, wished: boolean, rarity: string | null) {
    if (intro || !record || record.offerIds.includes(offerId)) return;
    setRecord((current) => {
      if (!current || current.offerIds.includes(offerId)) return current;
      const next = revealOffer(current, offerId);
      saveRecord(next, key);
      return next;
    });
    if (prefersStillness()) return;
    setAnimatingId(offerId);
    if (wished) {
      setWishColor(rarity ?? "#fad663");
      setWishFlash(true);
    }
  }

  const ready = record !== null;

  return (
    <section className="relative flex min-h-0 flex-1 flex-col gap-2">
      <h1 className="sr-only">Tienda de hoy</h1>
      <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2 p-2.5 sm:gap-3">
        {cycle.offers.slice(0, 4).map((offer, index) => {
          const open = record?.offerIds.includes(offer.id) ?? false;
          return (
            <RevealCard
              key={offer.id}
              offer={offer}
              open={open}
              animate={animatingId === offer.id}
              enterIndex={index}
              grade={offer.skinId ? grades.find((item) => item.skinId === offer.skinId)?.grade ?? null : null}
              onReveal={() => reveal(offer.id, offer.wished, tierColor(offer.edition))}
              locked={intro || !ready}
              onSettled={() => {
                setAnimatingId((current) => (current === offer.id ? null : current));
                setWishFlash(false);
              }}
            />
          );
        })}
      </div>
      <div className="flex shrink-0 items-start justify-between gap-3 text-xs text-zinc-400">
        <div className="min-w-0">
          <p className="truncate">
            {fixture ? "Ejemplo · " : null}
            Vence el {formatWhen(cycle.expiresAt)} · <Remaining expiresAt={cycle.expiresAt} serverNow={serverNow} />
            {message && messageOk ? ` · ${message}` : null}
          </p>
          {message && !messageOk ? <p className="line-clamp-2 text-[#ffb4bc]">{message}</p> : null}
        </div>
        <RefreshButton variant="quiet" />
      </div>
      {intro ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <p
            className="reveal-intro text-3xl font-semibold tracking-wide text-white sm:text-5xl"
            onAnimationEnd={finishIntro}
          >
            Tienda nueva
          </p>
        </div>
      ) : null}
      {wishFlash ? <div className="reveal-flash pointer-events-none absolute inset-0 z-10" style={{ "--rarity": wishColor } as CSSProperties} aria-hidden /> : null}
      {!ready ? <div className="absolute inset-0 bg-[#090b10]" aria-hidden /> : null}
    </section>
  );
}
