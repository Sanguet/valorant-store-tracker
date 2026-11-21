"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { refreshAction } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function RefreshOnOpen({ enabled, refreshedAt }: { enabled: boolean; refreshedAt: string | null }) {
  const router = useRouter();
  const started = useRef(false);
  useEffect(() => {
    if (!enabled || started.current) return;
    const recent = refreshedAt ? Date.now() - new Date(refreshedAt).getTime() < 20000 : false;
    if (recent) return;
    started.current = true;
    void refreshAction().then(() => router.refresh());
  }, [enabled, refreshedAt, router]);
  return null;
}

export function RefreshButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="primary"
      disabled={pending}
      onClick={() => start(async () => {
        await refreshAction();
        router.refresh();
      })}
    >
      {pending ? "Leyendo…" : "Actualizar"}
    </Button>
  );
}
