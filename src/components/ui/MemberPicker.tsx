"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { Avatar } from "./Avatar";
import { roleDescription, type FamilyIndex } from "@/lib/kinship";
import type { Member } from "@/lib/types";

export function searchMembers(idx: FamilyIndex, q: string, filter?: (m: Member) => boolean, limit = 40): Member[] {
  const needle = q
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
  const all = [...idx.byId.values()].filter((m) => !filter || filter(m));
  if (!needle) return all.slice(0, limit);
  const words = needle.split(/\s+/);
  const scored: [Member, number][] = [];
  for (const m of all) {
    const hay = `${m.full_name} ${m.nickname ?? ""} ${m.domicile ?? ""}`.toLowerCase();
    if (!words.every((w) => hay.includes(w))) continue;
    const nick = (m.nickname ?? "").toLowerCase();
    const score = nick === needle ? 0 : nick.startsWith(needle) ? 1 : m.full_name.toLowerCase().includes(needle) ? 2 : 3;
    scored.push([m, score]);
  }
  return scored
    .sort((a, b) => a[1] - b[1] || a[0].full_name.localeCompare(b[0].full_name))
    .slice(0, limit)
    .map(([m]) => m);
}

export function MemberPicker({
  idx,
  value,
  onChange,
  placeholder = "Pilih anggota…",
  filter,
  allowNone = false,
  noneLabel = "— Tidak ada —",
  disabled = false,
  id,
}: {
  idx: FamilyIndex;
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
  filter?: (m: Member) => boolean;
  allowNone?: boolean;
  noneLabel?: string;
  disabled?: boolean;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const selected = value ? idx.byId.get(value) : undefined;
  const results = useMemo(() => (open ? searchMembers(idx, q, filter) : []), [idx, q, filter, open]);

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-12 w-full items-center gap-2 rounded-2xl border border-gold/40 bg-white px-3 py-2 text-left outline-none transition hover:border-leaf focus:ring-4 focus:ring-leaf/15 disabled:opacity-60"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected ? (
          <>
            <Avatar name={selected.full_name} url={selected.photo_url} size={32} deceased={selected.is_deceased} ring={false} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{selected.full_name}</span>
              <span className="block truncate text-xs text-ink-soft">{roleDescription(idx, selected.id)}</span>
            </span>
          </>
        ) : (
          <span className="flex-1 text-sm text-ink-soft">{value === null && allowNone ? noneLabel : placeholder}</span>
        )}
        {selected && allowNone && !disabled ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="grid h-7 w-7 place-items-center rounded-full text-ink-soft hover:bg-parchment"
            aria-label="Kosongkan"
          >
            <X className="h-4 w-4" />
          </span>
        ) : (
          <ChevronDown className="h-4 w-4 text-ink-soft" />
        )}
      </button>

      {open && (
        <div className="fade-in absolute left-0 right-0 z-40 mt-2 overflow-hidden rounded-2xl border border-gold/30 bg-white shadow-[var(--shadow-float)]">
          <div className="flex items-center gap-2 border-b border-gold/20 px-3">
            <Search className="h-4 w-4 text-ink-soft" />
            <input
              ref={input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ketik nama atau panggilan…"
              className="h-11 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <ul role="listbox" className="scrollbar-thin max-h-72 overflow-y-auto py-1">
            {allowNone && (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-ink-soft hover:bg-parchment"
                >
                  {noneLabel}
                </button>
              </li>
            )}
            {results.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={m.id === value}
                  onClick={() => {
                    onChange(m.id);
                    setOpen(false);
                    setQ("");
                  }}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-leaf-pale ${m.id === value ? "bg-leaf-pale" : ""}`}
                >
                  <Avatar name={m.full_name} url={m.photo_url} size={32} deceased={m.is_deceased} ring={false} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {m.full_name}
                      {m.nickname && <span className="font-normal text-ink-soft"> · {m.nickname}</span>}
                    </span>
                    <span className="block truncate text-xs text-ink-soft">{roleDescription(idx, m.id)}</span>
                  </span>
                </button>
              </li>
            ))}
            {!results.length && <li className="px-4 py-6 text-center text-sm text-ink-soft">Tidak ditemukan</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
