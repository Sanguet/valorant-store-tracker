"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { Remaining } from "@/components/countdown";
import { RefreshButton } from "@/components/refresh-on-open";
import { RevealCard } from "@/components/reveal-card";
import type { CycleView } from "@/domain/queries";
import { markIntroSeen, readReveal, revealOffer, type RevealRecord } from "@/domain/reveal";
import { formatWhen } from "@/domain/text";

const STORAGE_KEY = "valorant-tienda-revelado";

function loadRecord(cycleId: number): RevealRecord {
  try {
    return readReveal(localStorage.getItem(STORAGE_KEY), cycleId);
  } catch {
    return readReveal(null, cycleId);
  }
}

function saveRecord(record: RevealRecord) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
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
}: {
  cycle: CycleView;
  serverNow: number;
  fixture: boolean;
  message: string;
  messageOk: boolean;
}) {
  const [record, setRecord] = useState<RevealRecord | null>(null);
  const [intro, setIntro] = useState(false);
  const [animatingId, setAnimatingId] = useState<number | null>(null);
  const [wishFlash, setWishFlash] = useState(false);

  useLayoutEffect(() => {
    const stored = loadRecord(cycle.id);
    setRecord(stored);
    setIntro(!stored.introSeen);
    setAnimatingId(null);
  }, [cycle.id]);

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
      saveRecord(seen);
      return seen;
    });
  }

  function reveal(offerId: number, wished: boolean) {
    if (intro || !record || record.offerIds.includes(offerId)) return;
    setRecord((current) => {
      if (!current || current.offerIds.includes(offerId)) return current;
      const next = revealOffer(current, offerId);
      saveRecord(next);
      return next;
    });
    if (prefersStillness()) return;
    setAnimatingId(offerId);
    if (wished) setWishFlash(true);
  }

  const ready = record !== null;

  return (
    <section className="relative flex min-h-0 flex-1 flex-col gap-2">
      <h1 className="sr-only">Tienda de hoy</h1>
      <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2 sm:gap-3">
        {cycle.offers.slice(0, 4).map((offer, index) => {
          const open = record?.offerIds.includes(offer.id) ?? false;
          return (
            <RevealCard
              key={offer.id}
              offer={offer}
              open={open}
              animate={animatingId === offer.id}
              enterIndex={index}
              onReveal={() => reveal(offer.id, offer.wished)}
              locked={intro || !ready}
              onSettled={() => {
                setAnimatingId((current) => (current === offer.id ? null : current));
                setWishFlash(false);
              }}
            />
          );
        })}
      </div>
      <div className="flex shrink-0 items-center justify-between gap-3 text-xs text-zinc-400">
        <p className="min-w-0 truncate">
          {fixture ? "Ejemplo · " : null}
          Vence el {formatWhen(cycle.expiresAt)} · <Remaining expiresAt={cycle.expiresAt} serverNow={serverNow} />
          {message ? <span className={messageOk ? "" : "text-[#ffb4bc]"}> · {message}</span> : null}
        </p>
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
      {wishFlash ? <div className="reveal-flash pointer-events-none absolute inset-0 z-10" aria-hidden /> : null}
      {!ready ? <div className="absolute inset-0 bg-[#090b10]" aria-hidden /> : null}
    </section>
  );
}
