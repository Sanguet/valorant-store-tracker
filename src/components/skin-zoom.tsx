"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { SkinImage } from "@/components/skin-image";
import { tierColor } from "@/domain/catalog";
import { cn } from "@/lib/cn";

export function ZoomableSkin({
  name,
  edition = null,
  detail = null,
  imageFile = null,
  imageSrc = null,
  className,
  children,
}: {
  name: string;
  edition?: string | null;
  detail?: string | null;
  imageFile?: string | null;
  imageSrc?: string | null;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={cn("block w-full cursor-zoom-in border-0 bg-transparent p-0 text-left", className)} aria-label={`Ampliar ${name}`} onClick={() => setOpen(true)}>
        {children}
      </button>
      {open ? <SkinZoom name={name} edition={edition} detail={detail} imageFile={imageFile} imageSrc={imageSrc} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function SkinZoom({
  name,
  edition = null,
  detail = null,
  imageFile = null,
  imageSrc = null,
  onClose,
}: {
  name: string;
  edition?: string | null;
  detail?: string | null;
  imageFile?: string | null;
  imageSrc?: string | null;
  onClose: () => void;
}) {
  const color = tierColor(edition);
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <article className="tier-detail relative grid max-h-[90dvh] w-full max-w-3xl gap-3 overflow-y-auto rounded-3xl border-2 bg-[#090b10] p-4" style={{ borderColor: color ?? "rgba(255,255,255,0.2)" }} onClick={(event) => event.stopPropagation()}>
        <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute top-3 left-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/70 text-xl text-white">
          ×
        </button>
        <div className="cursor-zoom-out" onClick={onClose}>
          {imageSrc ? <img src={imageSrc} alt="" className="h-72 w-full bg-black/25 object-contain object-center sm:h-80" /> : <SkinImage file={imageFile} name={name} large />}
        </div>
        <div>
          <h2 className="text-xl font-semibold">{name}</h2>
          {detail ? <p className="text-sm text-zinc-400">{detail}</p> : null}
        </div>
      </article>
    </div>,
    document.body,
  );
}
