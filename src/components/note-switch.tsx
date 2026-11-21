"use client";

import { useTransition } from "react";
import { noteAction } from "@/app/actions";
import type { OfferNote } from "@/domain/types";
import { cn } from "@/lib/cn";

const OFFER_NOTES: { value: OfferNote | null; label: string }[] = [
  { value: null, label: "Sin nota" },
  { value: "bought", label: "La compré" },
  { value: "passed", label: "La dejé pasar" },
];

const BUNDLE_NOTES: { value: OfferNote | null; label: string }[] = [
  { value: null, label: "Sin nota" },
  { value: "bought", label: "Lo compré" },
  { value: "passed", label: "Lo dejé pasar" },
];

export function NoteSwitch({ kind, id, note }: { kind: "offer" | "bundle"; id: number; note: OfferNote | null }) {
  const [pending, start] = useTransition();
  const options = kind === "offer" ? OFFER_NOTES : BUNDLE_NOTES;
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label={kind === "offer" ? "Nota de la oferta" : "Nota del lote"}>
      {options.map((option) => (
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
