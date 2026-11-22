"use client";

import { useTransition } from "react";
import { removeWishlistAction, wishlistAction } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function WishlistButton({ skinId, name, wished, compact = false }: { skinId: string; name: string; wished: boolean; compact?: boolean }) {
  const [pending, start] = useTransition();
  const label = wished ? `Sacar ${name} de la lista` : `Sumar ${name} a deseados`;
  return (
    <Button
      variant="quiet"
      className={compact ? "min-w-0 shrink truncate px-2 py-1 text-xs" : undefined}
      aria-label={label}
      aria-disabled={pending || undefined}
      aria-busy={pending || undefined}
      onClick={() => {
        if (pending) return;
        start(() => wishlistAction(skinId, name, wished));
      }}
    >
      <span className="wish-label-long">{wished ? "Sacar de la lista" : "Sumar a deseados"}</span>
      {compact ? <span className="wish-label-short">{wished ? "Sacar" : "Deseo"}</span> : null}
    </Button>
  );
}

export function RemoveWishlistButton({ id, name }: { id: number; name: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="quiet"
      aria-label={`Sacar ${name} de la lista`}
      aria-disabled={pending || undefined}
      aria-busy={pending || undefined}
      onClick={() => {
        if (pending) return;
        start(() => removeWishlistAction(id));
      }}
    >
      Sacar
    </Button>
  );
}
