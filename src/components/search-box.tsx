"use client";

import { parseAsString, useQueryState } from "nuqs";
import { useEffect, useState } from "react";

export function SearchBox() {
  const [q, setQ] = useQueryState("q", parseAsString.withDefault("").withOptions({ shallow: false, history: "replace" }));
  const [draft, setDraft] = useState(q);
  useEffect(() => setDraft(q), [q]);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (draft !== q) void setQ(draft || null);
    }, 250);
    return () => clearTimeout(timer);
  }, [draft, q, setQ]);
  return (
    <form role="search" className="grid gap-2" onSubmit={(event) => event.preventDefault()}>
      <label htmlFor="q" className="text-sm text-zinc-300">
        Nombre de la skin o del arma
      </label>
      <input
        id="q"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Vándalo, cuchillo, Prime…"
        className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-base outline-none ring-[#ff4655] focus:ring-2"
      />
    </form>
  );
}
