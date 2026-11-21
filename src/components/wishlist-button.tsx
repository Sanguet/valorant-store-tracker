"use client";

import { useTransition } from "react";
import { removeWishlistAction, wishlistAction } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function WishlistButton({ skinId, name, wished }: { skinId: string; name: string; wished: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button variant="ghost" disabled={pending} onClick={() => start(() => wishlistAction(skinId, name, wished))}>
      {wished ? "Sacar de la lista" : "Sumar a deseados"}
    </Button>
  );
}

export function RemoveWishlistButton({ id }: { id: number }) {
  const [pending, start] = useTransition();
  return (
    <Button variant="quiet" disabled={pending} onClick={() => start(() => removeWishlistAction(id))}>
      Sacar
    </Button>
  );
}
