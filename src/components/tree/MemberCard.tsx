"use client";

import { memo } from "react";
import { BookOpen, CalendarDays, MapPin } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { LeafIcon } from "@/components/ui/Ornaments";
import type { Member } from "@/lib/types";
import { CARD_H, CARD_W } from "@/lib/layout";

export type CardState = "normal" | "dim" | "glow";

function roleTag(m: Member) {
  if (m.member_type === "pasangan") return m.gender === "P" ? "Istri · Menantu" : m.gender === "L" ? "Suami · Menantu" : "Menantu";
  if (m.member_type === "bawaan") return "Anak bawaan";
  return null;
}

export const MemberCard = memo(function MemberCard({
  m,
  x,
  y,
  state,
  isMe,
  pulse,
  onSelect,
}: {
  m: Member;
  x: number;
  y: number;
  state: CardState;
  isMe: boolean;
  pulse: boolean;
  onSelect: (id: string) => void;
}) {
  const dry = m.is_deceased;
  const tag = roleTag(m);
  return (
    <button
      type="button"
      onClick={() => onSelect(m.id)}
      data-member={m.id}
      aria-label={`${m.full_name}${dry ? " (almarhum/ah)" : ""}`}
      className={[
        "leaf-card leaf-vein absolute flex flex-col items-center px-3 pt-4 text-center",
        dry ? "leaf-dry" : "leaf-fresh",
        m.member_type === "pasangan" ? "leaf-spouse" : "",
        state === "dim" ? "is-dim" : "",
        state === "glow" ? "is-glow" : "",
        isMe && state !== "dim" ? "is-me" : "",
        pulse ? "is-pulse" : "",
      ].join(" ")}
      style={{ left: x, top: y, width: CARD_W, height: CARD_H }}
    >
      <LeafIcon dry={dry} className="absolute right-3 top-2.5 h-5 w-5" />
      {isMe && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-forest px-3 py-0.5 text-[11px] font-bold tracking-wide text-gold-pale shadow">
          ANDA
        </span>
      )}
      <Avatar name={m.full_name} url={m.photo_url} size={74} deceased={dry} />
      <p className="mt-2.5 line-clamp-2 text-[13px] font-bold leading-tight text-ink">{m.full_name}</p>
      {m.nickname && <p className="mt-0.5 truncate text-[11.5px] italic text-ink-soft">“{m.nickname}”</p>}
      <div className="mt-auto w-full space-y-0.5 pb-3 text-[11px] text-ink-soft">
        <p className="flex items-center justify-center gap-1 truncate">
          <MapPin className="h-3 w-3 shrink-0 text-leaf" />
          <span className="truncate">{m.domicile ?? "—"}</span>
        </p>
        <p className="flex items-center justify-center gap-1">
          <CalendarDays className="h-3 w-3 shrink-0 text-gold" />
          {m.birth_year ?? "—"}
          {dry && <span className="ml-1 rounded-full bg-dry/15 px-1.5 text-[10px] font-semibold text-dry">{m.gender === "P" ? "Almh." : "Alm."}</span>}
        </p>
        <div className="flex min-h-[18px] flex-wrap items-center justify-center gap-1 pt-0.5">
          {!!m.hafalan_juz && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-gold-pale px-1.5 py-px text-[10px] font-bold text-[#7a5b14]">
              <BookOpen className="h-2.5 w-2.5" /> {m.hafalan_juz} juz
            </span>
          )}
          {tag && <span className="rounded-full bg-white/70 px-1.5 py-px text-[10px] font-semibold text-ink-soft">{tag}</span>}
        </div>
      </div>
    </button>
  );
});
