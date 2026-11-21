"use client";

import { useEffect, useState } from "react";
import { formatRemaining } from "@/domain/text";

export function Remaining({ expiresAt, serverNow }: { expiresAt: string; serverNow: number }) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const left = new Date(expiresAt).getTime() - now;
  if (left <= 0) return <span>Venció</span>;
  return <span>quedan {formatRemaining(left)}</span>;
}
