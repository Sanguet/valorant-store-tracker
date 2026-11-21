"use client";

import { useTransition } from "react";
import { removeWishlistAction, wishlistAction } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function WishlistButton({ skinId, name, wished }: { skinId: string; name: string; wished: boolean }) {
  const [pending, start] = useTransition();
  const label = wished ? `Sacar ${name} de la lista` : `Sumar ${name} a deseados`;
  return (
    <Button
      variant="quiet"
      aria-label={label}
      aria-disabled={pending || undefined}
      aria-busy={pending || undefined}
      onClick={() => {
        if (pending) return;
        start(() => wishlistAction(skinId, name, wished));
      }}
    >
      {wished ? "Sacar de la lista" : "Sumar a deseados"}
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
