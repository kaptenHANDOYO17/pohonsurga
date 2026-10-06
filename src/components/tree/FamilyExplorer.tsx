"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpDown,
  ChevronsDownUp,
  ChevronsUpDown,
  List,
  LocateFixed,
  LogOut,
  Maximize2,
  Network,
  Search,
  ShieldCheck,
  Sparkles,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { logout } from "@/app/actions/auth";
import { Avatar } from "@/components/ui/Avatar";
import { searchMembers } from "@/components/ui/MemberPicker";
import { LeafIcon, Logo, RingsIcon } from "@/components/ui/Ornaments";
import { buildIndex, childrenOf, RELATION_GROUPS, relationGroups, roleDescription, spousesOf, type RelationKey } from "@/lib/kinship";
import { allUnitIds, computeLayout, type Direction } from "@/lib/layout";
import { callName } from "@/lib/names";
import type { FamilyData } from "@/lib/types";
import ListView from "./ListView";
import MemberDetail from "./MemberDetail";
import RelationPanel from "./RelationPanel";
import TreeCanvas, { type CanvasHandle } from "./TreeCanvas";

type ViewerProp = { kind: "admin"; email: string } | { kind: "member"; memberId: string };

export default function FamilyExplorer({
  data,
  viewer,
  title,
  subtitle,
}: {
  data: FamilyData;
  viewer: ViewerProp;
  title: string;
  subtitle: string;
}) {
  const idx = useMemo(() => buildIndex(data.members, data.marriages), [data]);
  const isAdmin = viewer.kind === "admin";

  const [view, setView] = useState<"tree" | "list">("tree");
  const [direction, setDirection] = useState<Direction>("up");
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [viewAs, setViewAs] = useState<string | null>(null);
  const [active, setActive] = useState<RelationKey | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [pulseId, setPulseId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false); // HP
  const [sideOpen, setSideOpen] = useState(true); // desktop
  const [zoomPct, setZoomPct] = useState(50);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const canvas = useRef<CanvasHandle>(null);

  const meId = viewer.kind === "member" ? viewer.memberId : viewAs;
  const me = meId ? idx.byId.get(meId) : undefined;
  const layout = useMemo(() => computeLayout(idx, collapsed, direction), [idx, collapsed, direction]);
  const groups = useMemo(() => (meId ? relationGroups(idx, meId) : null), [idx, meId]);
  const highlight = useMemo(() => (active && groups ? new Set(groups[active]) : null), [active, groups]);

  /* ---------- pastikan seseorang terlihat (buka cabang leluhurnya) ---------- */
  const lineAncestors = useCallback(
    (id: string) => {
      const out: string[] = [];
      let cur = idx.byId.get(id);
      if (cur?.member_type === "pasangan") {
        const partner = (idx.spouses.get(cur.id) ?? [])[0];
        cur = partner ? idx.byId.get(partner.id) : undefined;
      }
      let guard = 0;
      while (cur?.parent_id && guard++ < 50) {
        const p = idx.byId.get(cur.parent_id);
        if (!p) break;
        // parent pasangan (anak bawaan) → unitnya milik pasangan garis keluarga
        const lineP = p.member_type === "pasangan" ? idx.byId.get((idx.spouses.get(p.id) ?? [])[0]?.id ?? "") : p;
        if (!lineP) break;
        out.push(lineP.id);
        cur = lineP;
      }
      return out;
    },
    [idx],
  );

  const ensureVisible = useCallback(
    (ids: string[]) => {
      const need = new Set(ids.flatMap(lineAncestors));
      setCollapsed((prev) => {
        if (![...need].some((n) => prev.has(n))) return prev;
        const next = new Set(prev);
        need.forEach((n) => next.delete(n));
        return next;
      });
    },
    [lineAncestors],
  );

  const focusOn = useCallback(
    (id: string) => {
      ensureVisible([id]);
      setView("tree");
      setPanelOpen(false);
      setPulseId(null);
      // tunggu layout dihitung ulang
      setTimeout(() => {
        canvas.current?.focus(id, window.innerWidth < 640 ? 0.6 : 0.95);
        setPulseId(id);
      }, 60);
    },
    [ensureVisible],
  );

  /* ---------- tampilan awal ---------- */
  const didInit = useRef(false);
  const initRef = useRef({ meId, layout });
  useEffect(() => {
    const t = setTimeout(() => {
      if (didInit.current) return;
      didInit.current = true;
      const { meId: id, layout: l } = initRef.current;
      if (id && l.cards.has(id)) canvas.current?.focus(id, window.innerWidth < 640 ? 0.55 : 0.8);
      else canvas.current?.fit();
    }, 80);
    return () => clearTimeout(t);
  }, []);

  /* ---------- sorot relasi ---------- */
  // Saat menyorot, cabang yang tidak berisi orang tersorot diringkas agar pohon tidak terlalu lebar.
  const savedCollapsed = useRef<Set<string> | null>(null);
  const pruneFor = useCallback(
    (targets: Set<string>) => {
      const memo = new Map<string, boolean>();
      const kidsOf = (id: string) =>
        [id, ...spousesOf(idx, id)].flatMap((m) => childrenOf(idx, m)).filter((c) => idx.byId.get(c)?.member_type !== "pasangan");
      const has = (id: string): boolean => {
        if (memo.has(id)) return memo.get(id)!;
        memo.set(id, false);
        let r = false;
        for (const c of kidsOf(id)) {
          const sub = has(c);
          if (sub || targets.has(c) || spousesOf(idx, c).some((s) => targets.has(s))) r = true;
        }
        memo.set(id, r);
        return r;
      };
      return new Set(allUnitIds(idx).filter((u) => !has(u.id)).map((u) => u.id));
    },
    [idx],
  );

  const chooseRelation = useCallback(
    (k: RelationKey | null) => {
      setActive(k);
      setPanelOpen(false);
      if (k && groups) {
        const ids = groups[k];
        if (!savedCollapsed.current) savedCollapsed.current = collapsed;
        setCollapsed(pruneFor(new Set(meId ? [...ids, meId] : ids)));
        if (view === "tree") setTimeout(() => canvas.current?.fit(meId ? [...ids, meId] : ids, 0.14), 80);
      } else if (savedCollapsed.current) {
        setCollapsed(savedCollapsed.current);
        savedCollapsed.current = null;
      }
    },
    [groups, view, meId, collapsed, pruneFor],
  );

  useEffect(() => {
    setActive(null);
    savedCollapsed.current = null;
  }, [meId]);

  const toggleUnit = useCallback((unitId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });
  }, []);

  const collapseFrom = (depth: number) => setCollapsed(new Set(allUnitIds(idx).filter((u) => u.depth >= depth).map((u) => u.id)));
  const allCollapsed = collapsed.size > 0;

  const results = useMemo(() => (query.trim() ? searchMembers(idx, query, undefined, 8) : []), [idx, query]);
  const pickResult = (id: string) => {
    setQuery("");
    setSearchOpen(false);
    if (view === "list") setDetailId(id);
    else focusOn(id);
  };

  const activeLabel = active ? RELATION_GROUPS.find((g) => g.key === active)?.label : null;

  const panel = (
    <RelationPanel
      idx={idx}
      meId={meId}
      groups={groups}
      active={active}
      onActive={chooseRelation}
      onFocus={(id) => (view === "tree" ? focusOn(id) : setDetailId(id))}
      isAdmin={isAdmin}
      onViewAs={setViewAs}
    />
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-parchment">
      {/* ===================== HEADER ===================== */}
      <header className="islamic-pattern-dark relative z-30 flex items-center gap-2 px-3 py-2.5 text-parchment shadow-lg sm:gap-3 sm:px-5">
        <Link href="/pohon" className="flex min-w-0 items-center gap-2.5" aria-label="Beranda pohon keluarga">
          <Logo className="h-10 w-10 shrink-0" />
          <div className={`min-w-0 ${searchOpen ? "hidden sm:block" : ""}`}>
            <p className="truncate font-display text-base leading-tight sm:text-lg">{title}</p>
            <p className="hidden truncate text-[11px] text-parchment/70 md:block">{subtitle}</p>
          </div>
        </Link>

        <div className="flex-1" />

        {/* pencarian */}
        <div className={`relative ${searchOpen ? "flex-1 sm:max-w-sm sm:flex-none" : ""}`}>
          <div className={`items-center rounded-full bg-white/10 ring-1 ring-white/15 focus-within:bg-white/15 ${searchOpen ? "flex" : "hidden sm:flex"}`}>
            <Search className="ml-3 h-4 w-4 text-parchment/70" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={(e) => e.key === "Enter" && results[0] && pickResult(results[0].id)}
              placeholder="Cari nama…"
              className="h-10 w-full min-w-0 bg-transparent px-2 text-sm text-parchment outline-none placeholder:text-parchment/50 sm:w-56"
              aria-label="Cari anggota keluarga"
            />
            {(query || searchOpen) && (
              <button
                onClick={() => {
                  setQuery("");
                  setSearchOpen(false);
                }}
                className="mr-1 grid h-8 w-8 place-items-center rounded-full hover:bg-white/10"
                aria-label="Tutup pencarian"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {!searchOpen && (
            <button onClick={() => setSearchOpen(true)} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 sm:hidden" aria-label="Cari">
              <Search className="h-5 w-5" />
            </button>
          )}
          {results.length > 0 && (
            <ul className="fade-in absolute right-0 top-12 z-50 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-gold/30 bg-white py-1 text-ink shadow-[var(--shadow-float)]">
              {results.map((m) => (
                <li key={m.id}>
                  <button onClick={() => pickResult(m.id)} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-leaf-pale">
                    <Avatar name={m.full_name} url={m.photo_url} size={36} deceased={m.is_deceased} ring={false} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{m.full_name}</span>
                      <span className="block truncate text-xs text-ink-soft">{roleDescription(idx, m.id)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ganti tampilan */}
        <div className={`rounded-full bg-white/10 p-1 ring-1 ring-white/15 ${searchOpen ? "hidden sm:flex" : "flex"}`} role="tablist">
          {(
            [
              ["tree", "Pohon", Network],
              ["list", "Daftar", List],
            ] as const
          ).map(([k, label, Icon]) => (
            <button
              key={k}
              role="tab"
              aria-selected={view === k}
              onClick={() => setView(k)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                view === k ? "bg-parchment text-forest shadow" : "text-parchment/80 hover:text-parchment"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* pengguna */}
        <div className={`items-center gap-1.5 ${searchOpen ? "hidden md:flex" : "flex"}`}>
          {isAdmin && (
            <Link href="/admin" className="hidden items-center gap-1.5 rounded-full bg-gold px-3 py-2 text-sm font-bold text-forest-deep hover:bg-gold-bright sm:flex">
              <ShieldCheck className="h-4 w-4" /> Admin
            </Link>
          )}
          {me && viewer.kind === "member" && (
            <span className="hidden items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-3 lg:flex">
              <Avatar name={me.full_name} url={me.photo_url} size={30} ring={false} />
              <span className="max-w-[120px] truncate text-sm">{callName(me)}</span>
            </span>
          )}
          <form action={logout}>
            <button className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Keluar" title="Keluar">
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </header>

      {/* ===================== BODY ===================== */}
      <div className="relative flex min-h-0 flex-1">
        {/* panel samping (desktop) */}
        <aside
          className={`islamic-pattern relative z-20 hidden shrink-0 border-r border-gold/25 transition-[width] duration-300 lg:block ${
            sideOpen ? "w-[340px]" : "w-0"
          }`}
        >
          <div className={`h-full w-[340px] ${sideOpen ? "" : "invisible"}`}>{panel}</div>
          <button
            onClick={() => setSideOpen((s) => !s)}
            className="absolute -right-4 top-5 z-30 grid h-8 w-8 place-items-center rounded-full border border-gold/40 bg-white text-forest shadow"
            aria-label={sideOpen ? "Sembunyikan panel relasi" : "Tampilkan panel relasi"}
          >
            <Sparkles className="h-4 w-4" />
          </button>
        </aside>

        <main className="relative min-w-0 flex-1">
          {view === "tree" ? (
            <TreeCanvas
              handleRef={canvas}
              idx={idx}
              layout={layout}
              direction={direction}
              highlight={highlight}
              meId={meId}
              pulseId={pulseId}
              onSelect={setDetailId}
              onToggle={toggleUnit}
              onZoomChange={setZoomPct}
            />
          ) : (
            <ListView idx={idx} highlight={highlight} meId={meId} onOpen={setDetailId} />
          )}

          {/* sorotan aktif */}
          {activeLabel && (
            <div className="fade-in pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center px-3">
              <div className="glass pointer-events-auto flex items-center gap-2 rounded-full border border-gold/50 py-1.5 pl-4 pr-1.5 text-sm shadow-[var(--shadow-float)]">
                <Sparkles className="h-4 w-4 text-gold" />
                <span>
                  Menyorot <b className="text-forest">{activeLabel}</b> ({highlight?.size ?? 0})
                </span>
                {view === "tree" && (
                  <button onClick={() => setView("list")} className="rounded-full border border-forest/30 bg-white px-2.5 py-1 text-xs font-semibold text-forest">
                    Lihat daftar
                  </button>
                )}
                <button onClick={() => chooseRelation(null)} className="grid h-7 w-7 place-items-center rounded-full bg-forest text-parchment" aria-label="Hapus sorotan">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {view === "tree" && (
            <>
              {/* kontrol zoom */}
              <div className="absolute bottom-4 right-3 z-20 flex flex-col gap-2 sm:right-5">
                <div className="glass flex flex-col overflow-hidden rounded-2xl border border-gold/30 shadow-[var(--shadow-float)]">
                  <CtrlBtn label="Perbesar" onClick={() => canvas.current?.zoomBy(1.3)}>
                    <ZoomIn className="h-5 w-5" />
                  </CtrlBtn>
                  <span className="py-0.5 text-center text-[10px] font-bold text-ink-soft">{zoomPct}%</span>
                  <CtrlBtn label="Perkecil" onClick={() => canvas.current?.zoomBy(1 / 1.3)}>
                    <ZoomOut className="h-5 w-5" />
                  </CtrlBtn>
                </div>
                <div className="glass flex flex-col overflow-hidden rounded-2xl border border-gold/30 shadow-[var(--shadow-float)]">
                  <CtrlBtn label="Lihat seluruh pohon" onClick={() => canvas.current?.fit()}>
                    <Maximize2 className="h-5 w-5" />
                  </CtrlBtn>
                  {meId && (
                    <CtrlBtn label="Pusatkan ke saya" onClick={() => focusOn(meId)}>
                      <LocateFixed className="h-5 w-5" />
                    </CtrlBtn>
                  )}
                  <CtrlBtn
                    label={direction === "up" ? "Balik: leluhur di atas" : "Balik: akar di bawah"}
                    onClick={() => {
                      setDirection((d) => (d === "up" ? "down" : "up"));
                      setTimeout(() => (meId ? canvas.current?.focus(meId) : canvas.current?.fit()), 80);
                    }}
                  >
                    <ArrowUpDown className="h-5 w-5" />
                  </CtrlBtn>
                  <CtrlBtn
                    label={allCollapsed ? "Buka semua cabang" : "Ringkas: tampilkan sampai cucu"}
                    onClick={() => {
                      if (allCollapsed) setCollapsed(new Set());
                      else collapseFrom(2);
                      setTimeout(() => canvas.current?.fit(), 80);
                    }}
                  >
                    {allCollapsed ? <ChevronsUpDown className="h-5 w-5" /> : <ChevronsDownUp className="h-5 w-5" />}
                  </CtrlBtn>
                </div>
              </div>

              {/* legenda */}
              <div className="absolute bottom-4 left-3 z-20 sm:left-5">
                <button
                  onClick={() => setLegendOpen((o) => !o)}
                  className="glass flex items-center gap-2 rounded-full border border-gold/30 px-3 py-2 text-xs font-semibold text-forest shadow-[var(--shadow-float)] lg:hidden"
                >
                  <LeafIcon className="h-4 w-4" /> Keterangan
                </button>
                <div className={`glass mt-2 rounded-2xl border border-gold/30 p-3 text-xs shadow-[var(--shadow-float)] lg:mt-0 lg:block ${legendOpen ? "block" : "hidden"}`}>
                  <p className="flex items-center gap-2">
                    <LeafIcon className="h-4 w-4" /> Daun hijau: masih hidup
                  </p>
                  <p className="mt-1 flex items-center gap-2">
                    <LeafIcon dry className="h-4 w-4" /> Daun coklat: sudah wafat
                  </p>
                  <p className="mt-1 flex items-center gap-2">
                    <RingsIcon className="h-4 w-5" /> Pasangan (garis putus = menantu)
                  </p>
                  <p className="mt-1 flex items-center gap-2">
                    <span className="inline-block h-0.5 w-5 border-t-2 border-dotted border-[#b08a5a]" /> Anak bawaan
                  </p>
                  <p className="mt-1.5 text-[11px] text-ink-soft">Seret = geser · Scroll/cubit = zoom</p>
                </div>
              </div>
            </>
          )}

          {/* tombol relasi (HP / tablet) */}
          <button
            onClick={() => setPanelOpen(true)}
            className={`fixed left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-forest px-5 py-3 text-sm font-bold text-parchment shadow-[var(--shadow-float)] ring-2 ring-gold/40 lg:hidden ${
              view === "tree" ? "bottom-4" : "bottom-5"
            }`}
          >
            <Sparkles className="h-4 w-4 text-gold-bright" /> Relasi Pintar
          </button>
        </main>
      </div>

      {/* panel relasi versi HP (bottom sheet) */}
      {panelOpen && (
        <div className="fixed inset-0 z-40 flex items-end lg:hidden" role="dialog" aria-modal="true">
          <button className="absolute inset-0 bg-forest-deep/40" aria-label="Tutup" onClick={() => setPanelOpen(false)} />
          <div className="islamic-pattern sheet-in relative h-[82dvh] w-full overflow-hidden rounded-t-[28px] shadow-2xl">
            <RelationPanel
              idx={idx}
              meId={meId}
              groups={groups}
              active={active}
              onActive={chooseRelation}
              onFocus={(id) => (view === "tree" ? focusOn(id) : (setPanelOpen(false), setDetailId(id)))}
              isAdmin={isAdmin}
              onViewAs={setViewAs}
              onClose={() => setPanelOpen(false)}
            />
          </div>
        </div>
      )}

      <MemberDetail
        idx={idx}
        id={detailId}
        meId={meId}
        isAdmin={isAdmin}
        onClose={() => setDetailId(null)}
        onOpen={setDetailId}
        onShowInTree={(id) => {
          setDetailId(null);
          focusOn(id);
        }}
      />
    </div>
  );
}

function CtrlBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={label} aria-label={label} className="grid h-11 w-11 place-items-center text-forest transition hover:bg-leaf-pale">
      {children}
    </button>
  );
}
