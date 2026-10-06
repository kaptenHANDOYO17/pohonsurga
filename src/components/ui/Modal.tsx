"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

/** Dialog: bottom-sheet di HP, kotak tengah di layar besar. */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
  footer?: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6" role="dialog" aria-modal="true">
      <button aria-label="Tutup" className="absolute inset-0 bg-forest-deep/45 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panel}
        tabIndex={-1}
        className={`sheet-in relative flex max-h-[92dvh] w-full min-w-0 max-w-full flex-col overflow-hidden rounded-t-[28px] bg-parchment shadow-2xl outline-none md:rounded-[28px] ${
          wide ? "md:max-w-3xl" : "md:max-w-lg"
        }`}
      >
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-ink/15 md:hidden" />
        <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-3 md:px-7 md:pt-5">
          <div className="min-w-0 font-display text-xl text-forest">{title}</div>
          <button
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/80 text-ink-soft transition hover:bg-white hover:text-ink"
            aria-label="Tutup dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="scrollbar-thin min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-5 pb-6 md:px-7">{children}</div>
        {footer && <div className="border-t border-gold/20 bg-white/60 px-5 py-3 md:px-7">{footer}</div>}
      </div>
    </div>
  );
}
