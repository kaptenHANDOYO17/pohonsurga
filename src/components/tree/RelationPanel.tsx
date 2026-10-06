"use client";

import { Eye, Sparkles, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { MemberPicker } from "@/components/ui/MemberPicker";
import { Divider } from "@/components/ui/Ornaments";
import {
  RELATION_GROUPS,
  branchName,
  generationTitle,
  identitySentence,
  relationBetween,
  type FamilyIndex,
  type RelationKey,
} from "@/lib/kinship";
import { callName } from "@/lib/names";

export default function RelationPanel({
  idx,
  meId,
  groups,
  active,
  onActive,
  onFocus,
  isAdmin,
  onViewAs,
  onClose,
}: {
  idx: FamilyIndex;
  meId: string | null;
  groups: Record<RelationKey, string[]> | null;
  active: RelationKey | null;
  onActive: (k: RelationKey | null) => void;
  onFocus: (id: string) => void;
  isAdmin: boolean;
  onViewAs: (id: string | null) => void;
  onClose?: () => void;
}) {
  const me = meId ? idx.byId.get(meId) : undefined;
  const activeIds = active && groups ? groups[active] : [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2 px-5 pt-5">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em] text-gold">
            <Sparkles className="h-3.5 w-3.5" /> Relasi Pintar
          </p>
          <h2 className="mt-1 font-display text-xl text-forest">{me ? `Assalamu'alaikum, ${callName(me)}` : "Lihat dari sudut pandang"}</h2>
        </div>
        {onClose && (
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-white/80 text-ink-soft" aria-label="Tutup panel">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto px-5 pb-6">
        {isAdmin && (
          <div className="mt-3">
            <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-ink-soft">
              <Eye className="h-3.5 w-3.5" /> Admin: lihat sebagai anggota
            </label>
            <MemberPicker idx={idx} value={meId} onChange={onViewAs} allowNone noneLabel="— Pilih anggota —" placeholder="Pilih anggota…" />
          </div>
        )}

        {me ? (
          <>
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-leaf/25 bg-leaf-pale/60 p-3">
              <Avatar name={me.full_name} url={me.photo_url} size={52} deceased={me.is_deceased} />
              <div className="min-w-0">
                <p className="text-sm leading-snug text-ink">{identitySentence(idx, me.id)}</p>
                <p className="mt-1 text-xs font-semibold text-forest">{generationTitle(idx.depth.get(me.id) ?? 0)}</p>
                {branchName(idx, me.id) && <p className="truncate text-[11px] text-ink-soft">{branchName(idx, me.id)}</p>}
              </div>
            </div>

            <Divider className="my-4" />
            <p className="mb-2 text-xs text-ink-soft">Ketuk salah satu relasi untuk menyorot mereka di pohon:</p>
            <div className="grid grid-cols-2 gap-2">
              {RELATION_GROUPS.map((g) => {
                const n = groups?.[g.key].length ?? 0;
                const on = active === g.key;
                return (
                  <button
                    key={g.key}
                    disabled={!n}
                    onClick={() => onActive(on ? null : g.key)}
                    className={`flex items-center justify-between gap-1 rounded-2xl border px-3 py-2.5 text-left text-[13px] font-semibold transition ${
                      on
                        ? "border-gold bg-gradient-to-br from-gold-pale to-white text-forest shadow-[0_0_0_3px_rgba(212,168,67,0.25)]"
                        : n
                          ? "border-gold/25 bg-white/80 text-ink hover:border-leaf hover:bg-leaf-pale"
                          : "border-transparent bg-white/40 text-ink-soft/50"
                    }`}
                  >
                    <span className="leading-tight">{g.label}</span>
                    <span className={`rounded-full px-2 text-xs ${on ? "bg-forest text-parchment" : "bg-parchment text-ink-soft"}`}>{n}</span>
                  </button>
                );
              })}
            </div>

            {active && (
              <div className="fade-in mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-forest">{RELATION_GROUPS.find((g) => g.key === active)?.label}</h3>
                  <button onClick={() => onActive(null)} className="text-xs font-semibold text-gold hover:underline">
                    Hapus sorotan
                  </button>
                </div>
                <ul className="space-y-1.5">
                  {activeIds.map((id) => {
                    const p = idx.byId.get(id)!;
                    const r = relationBetween(idx, me.id, id);
                    return (
                      <li key={id}>
                        <button
                          onClick={() => onFocus(id)}
                          className="flex w-full items-center gap-2.5 rounded-xl bg-white/70 p-2 text-left transition hover:bg-leaf-pale"
                        >
                          <Avatar name={p.full_name} url={p.photo_url} size={36} deceased={p.is_deceased} ring={false} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">{p.full_name}</span>
                            <span className="block truncate text-xs text-ink-soft">{r.label}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className="mt-4 rounded-2xl bg-white/60 p-4 text-sm text-ink-soft">
            Pilih seorang anggota di atas untuk melihat pohon dari sudut pandangnya — lengkap dengan sorotan paman/bibi,
            sepupu, keponakan, dan ipar.
          </p>
        )}
      </div>
    </div>
  );
}
