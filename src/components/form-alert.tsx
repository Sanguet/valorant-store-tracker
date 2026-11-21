"use client";

import { useEffect, useRef } from "react";

export function FormAlert({ children }: { children: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, [children]);
  return (
    <p ref={ref} tabIndex={-1} role="alert" className="rounded-2xl border border-[#ff4655]/40 bg-[#ff4655]/10 px-4 py-3 text-sm">
      {children}
    </p>
  );
}
