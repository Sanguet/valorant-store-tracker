"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { ReactNode } from "react";

export function AnimateList({ className, children }: { className?: string; children: ReactNode }) {
  const [parent] = useAutoAnimate();
  return (
    <ul ref={parent} className={className}>
      {children}
    </ul>
  );
}
