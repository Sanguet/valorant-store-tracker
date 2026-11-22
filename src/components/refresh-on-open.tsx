"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { refreshAction } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function RefreshOnOpen({ enabled, refreshedAt, overlay = false }: { enabled: boolean; refreshedAt: string | null; overlay?: boolean }) {
  const router = useRouter();
  const started = useRef(false);
  const [reading, setReading] = useState(false);
  useEffect(() => {
    if (!enabled || started.current) return;
    const recent = refreshedAt ? Date.now() - new Date(refreshedAt).getTime() < 20000 : false;
    if (recent) return;
    started.current = true;
    setReading(true);
    void refreshAction().finally(() => {
      setReading(false);
      router.refresh();
    });
  }, [enabled, refreshedAt, router]);
  if (!reading) return null;
  return (
    <p role="status" aria-live="polite" className={overlay ? "pointer-events-none absolute top-2 left-2 z-30 text-sm text-zinc-300" : "text-sm text-zinc-300"}>
      Leyendo la tienda…
    </p>
  );
}

export function RefreshButton({ variant = "primary" }: { variant?: "primary" | "quiet" }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant={variant}
      aria-disabled={pending || undefined}
      aria-busy={pending || undefined}
      onClick={() => {
        if (pending) return;
        start(async () => {
          await refreshAction();
          router.refresh();
        });
      }}
    >
      {pending ? "Leyendo…" : "Actualizar"}
    </Button>
  );
}
