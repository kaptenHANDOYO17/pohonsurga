"use client";

import { useMemo, useState } from "react";
import { BookOpen, CalendarDays, MapPin } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { LeafIcon } from "@/components/ui/Ornaments";
import { generationTitle, relationBetween, roleDescription, type FamilyIndex } from "@/lib/kinship";
import type { Member } from "@/lib/types";

type Filter = "semua" | "hidup" | "wafat" | "huffadz" | "menantu";
const FILTERS: [Filter, string][] = [
  ["semua", "Semua"],
  ["hidup", "Masih hidup"],
  ["wafat", "Sudah wafat"],
  ["huffadz", "Penghafal Qur'an"],
  ["menantu", "Menantu"],
];

export default function ListView({
  idx,
  highlight,
  meId,
  onOpen,
}: {
  idx: FamilyIndex;
  highlight: Set<string> | null;
  meId: string | null;
  onOpen: (id: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>("semua");
  const all = useMemo(() => [...idx.byId.values()], [idx]);

  const stats = useMemo(
    () => ({
      total: all.length,
      alive: all.filter((m) => !m.is_deceased).length,
      dead: all.filter((m) => m.is_deceased).length,
      huffadz: all.filter((m) => (m.hafalan_juz ?? 0) > 0).length,
      gens: idx.maxDepth + 1,
    }),
    [all, idx.maxDepth],
  );

  const groups = useMemo(() => {
    const pass = (m: Member) => {
      if (highlight && highlight.size && !highlight.has(m.id)) return false;
      if (filter === "hidup") return !m.is_deceased;
      if (filter === "wafat") return m.is_deceased;
      if (filter === "huffadz") return (m.hafalan_juz ?? 0) > 0;
      if (filter === "menantu") return m.member_type === "pasangan";
      return true;
    };
    const map = new Map<number, Member[]>();
    for (const m of all) {
      if (!pass(m)) continue;
      const d = idx.depth.get(m.id) ?? 0;
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(m);
    }
    const sorted = [...map.entries()].sort((a, b) => a[0] - b[0]);
    for (const [, list] of sorted)
      list.sort((a, b) =>
        filter === "huffadz"
          ? (b.hafalan_juz ?? 0) - (a.hafalan_juz ?? 0)
          : (a.birth_year ?? 9999) - (b.birth_year ?? 9999) || a.full_name.localeCompare(b.full_name),
      );
    return sorted;
  }, [all, idx, filter, highlight]);

  return (
    <div className="scrollbar-thin h-full overflow-y-auto">
      <div className="mx-auto max-w-7xl px-4 pb-28 pt-4 sm:px-6">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3">
          {[
            ["Total anggota", stats.total, "text-forest"],
            ["Masih hidup", stats.alive, "text-leaf"],
            ["Sudah wafat", stats.dead, "text-dry"],
            ["Penghafal Qur'an", stats.huffadz, "text-gold"],
            ["Generasi", stats.gens, "text-bark"],
          ].map(([label, n, cls]) => (
            <div key={label as string} className="rounded-2xl border border-gold/20 bg-white/70 p-2.5 text-center sm:p-3">
              <p className={`font-display text-2xl sm:text-3xl ${cls}`}>{n as number}</p>
              <p className="text-[11px] leading-tight text-ink-soft sm:text-xs">{label as string}</p>
            </div>
          ))}
        </div>

        <div className="scrollbar-thin -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {FILTERS.map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                filter === k ? "border-forest bg-forest text-parchment" : "border-gold/30 bg-white/70 text-ink hover:bg-leaf-pale"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {groups.map(([depth, list]) => (
          <section key={depth} className="mt-7">
            <div className="sticky top-0 z-10 -mx-4 mb-3 flex items-center gap-3 bg-parchment/90 px-4 py-2 backdrop-blur sm:mx-0 sm:px-0">
              <h2 className="font-display text-lg text-forest">{generationTitle(depth)}</h2>
              <span className="h-px flex-1 bg-gradient-to-r from-gold/50 to-transparent" />
              <span className="text-xs font-semibold text-ink-soft">{list.length} orang</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {list.map((m) => {
                const rel = meId && m.id !== meId ? relationBetween(idx, meId, m.id).label : m.id === meId ? "Anda" : null;
                return (
                  <button
                    key={m.id}
                    onClick={() => onOpen(m.id)}
                    className={`leaf-card leaf-vein relative flex flex-col items-center gap-2 px-2.5 pb-3 pt-4 text-center sm:p-4 ${
                      m.is_deceased ? "leaf-dry" : "leaf-fresh"
                    } ${m.member_type === "pasangan" ? "leaf-spouse" : ""} ${m.id === meId ? "is-me" : ""}`}
                  >
                    <LeafIcon dry={m.is_deceased} className="absolute right-3 top-2.5 h-4 w-4" />
                    <Avatar name={m.full_name} url={m.photo_url} size={60} deceased={m.is_deceased} />
                    <div className="w-full min-w-0">
                      <p className="line-clamp-2 text-[13px] font-bold leading-tight sm:text-sm">{m.full_name}</p>
                      {m.nickname && <p className="truncate text-xs italic text-ink-soft">“{m.nickname}”</p>}
                      <p className="mt-1 line-clamp-2 text-[11px] text-forest">{roleDescription(idx, m.id)}</p>
                      <p className="mt-1 flex flex-wrap items-center justify-center gap-x-2 text-[11px] text-ink-soft">
                        <span className="inline-flex min-w-0 items-center gap-0.5">
                          <MapPin className="h-3 w-3 shrink-0 text-leaf" />
                          <span className="truncate">{m.domicile ?? "—"}</span>
                        </span>
                        <span className="inline-flex items-center gap-0.5">
                          <CalendarDays className="h-3 w-3 text-gold" />
                          {m.birth_year ?? "—"}
                        </span>
                      </p>
                      <div className="mt-1.5 flex flex-wrap justify-center gap-1">
                        {rel && <span className="rounded-full bg-gold-pale px-2 py-0.5 text-[10px] font-bold text-[#7a5b14]">{rel}</span>}
                        {!!m.hafalan_juz && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-leaf/10 px-2 py-0.5 text-[10px] font-bold text-leaf">
                            <BookOpen className="h-2.5 w-2.5" /> {m.hafalan_juz} juz
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
        {!groups.length && <p className="mt-16 text-center text-ink-soft">Tidak ada anggota yang cocok dengan filter ini.</p>}
      </div>
    </div>
  );
}
