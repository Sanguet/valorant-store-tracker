"use client";

import { useEffect, useState } from "react";
import { formatRemaining } from "@/domain/text";

export function Countdown({ expiresAt }: { expiresAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  return <span>{formatRemaining(new Date(expiresAt).getTime() - now)}</span>;
}
