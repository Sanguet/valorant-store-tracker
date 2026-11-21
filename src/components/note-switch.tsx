"use client";

import { useTransition } from "react";
import { noteAction } from "@/app/actions";
import type { OfferNote } from "@/domain/types";
import { cn } from "@/lib/cn";

const NOTES: { value: OfferNote; label: string }[] = [
  { value: "passed", label: "Skip" },
  { value: "bought", label: "Buy" },
];

export function NoteSwitch({ kind, id, note }: { kind: "offer" | "bundle"; id: number; note: OfferNote }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label={kind === "offer" ? "Nota de la oferta" : "Nota del lote"}>
      {NOTES.map((option) => (
        <button
          key={option.label}
          type="button"
          disabled={pending}
          aria-pressed={note === option.value}
          onClick={() => start(() => noteAction(kind, id, option.value))}
          className={cn(
            "rounded-full px-3 py-1 text-xs",
            note === option.value ? "bg-white text-zinc-950" : "bg-white/5 text-zinc-300 hover:bg-white/10",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
