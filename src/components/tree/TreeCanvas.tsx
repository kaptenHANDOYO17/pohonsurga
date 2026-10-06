"use client";

import { memo, useCallback, useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { Minus, Plus } from "lucide-react";
import type { FamilyIndex } from "@/lib/kinship";
import { CARD_H, CARD_W, type Direction, type LayoutResult } from "@/lib/layout";
import { RingsIcon } from "@/components/ui/Ornaments";
import { MemberCard, type CardState } from "./MemberCard";

export interface CanvasHandle {
  zoomBy: (factor: number) => void;
  fit: (ids?: string[] | null, minZoom?: number) => void;
  focus: (id: string, zoom?: number) => void;
}

interface Props {
  idx: FamilyIndex;
  layout: LayoutResult;
  direction: Direction;
  highlight: Set<string> | null;
  meId: string | null;
  pulseId: string | null;
  onSelect: (id: string) => void;
  onToggle: (unitId: string) => void;
  onZoomChange?: (pct: number) => void;
  handleRef: Ref<CanvasHandle>;
}

const MIN_K = 0.06;
const MAX_K = 2.2;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export default function TreeCanvas(props: Props) {
  const { layout, handleRef, onZoomChange } = props;
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const t = useRef({ x: 0, y: 0, k: 0.5 });
  const raf = useRef(0);

  const apply = useCallback(
    (animate = false) => {
      const el = inner.current;
      if (!el) return;
      el.style.transition = animate ? "transform 650ms cubic-bezier(.2,.8,.2,1)" : "none";
      el.style.transform = `translate3d(${t.current.x}px, ${t.current.y}px, 0) scale(${t.current.k})`;
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => onZoomChange?.(Math.round(t.current.k * 100)));
    },
    [onZoomChange],
  );

  const zoomAt = useCallback(
    (factor: number, cx: number, cy: number, animate = false) => {
      const { x, y, k } = t.current;
      const nk = clamp(k * factor, MIN_K, MAX_K);
      t.current = { k: nk, x: cx - (cx - x) * (nk / k), y: cy - (cy - y) * (nk / k) };
      apply(animate);
    },
    [apply],
  );

  const fit = useCallback(
    (ids?: string[] | null, minZoom = MIN_K) => {
      const el = outer.current;
      if (!el) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      let minX = 0, minY = 0, maxX = layout.width, maxY = layout.height;
      const pts = (ids ?? []).map((id) => layout.cards.get(id)).filter(Boolean) as { x: number; y: number }[];
      if (pts.length) {
        minX = Math.min(...pts.map((p) => p.x)) - 60;
        minY = Math.min(...pts.map((p) => p.y)) - 60;
        maxX = Math.max(...pts.map((p) => p.x + CARD_W)) + 60;
        maxY = Math.max(...pts.map((p) => p.y + CARD_H)) + 60;
      }
      const bw = maxX - minX;
      const bh = maxY - minY;
      const k = clamp(Math.min(w / bw, h / bh), minZoom, pts.length ? 1.05 : 1);
      t.current = { k, x: (w - bw * k) / 2 - minX * k, y: (h - bh * k) / 2 - minY * k };
      apply(true);
    },
    [apply, layout],
  );

  const focus = useCallback(
    (id: string, zoom?: number) => {
      const el = outer.current;
      const p = layout.cards.get(id);
      if (!el || !p) return;
      const k = clamp(zoom ?? Math.max(t.current.k, 0.85), MIN_K, MAX_K);
      t.current = { k, x: el.clientWidth / 2 - (p.x + CARD_W / 2) * k, y: el.clientHeight / 2 - (p.y + CARD_H / 2) * k };
      apply(true);
    },
    [apply, layout],
  );

  useImperativeHandle(
    handleRef,
    () => ({
      zoomBy: (f: number) => {
        const el = outer.current;
        if (el) zoomAt(f, el.clientWidth / 2, el.clientHeight / 2, true);
      },
      fit,
      focus,
    }),
    [fit, focus, zoomAt],
  );

  /* ---------- roda mouse / trackpad ---------- */
  useEffect(() => {
    const el = outer.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      // trackpad dua jari (tanpa ctrl) → geser; pinch / roda mouse → zoom
      const isTrackpadPan = !e.ctrlKey && Math.abs(e.deltaX) > 0 && e.deltaMode === 0 && Math.abs(e.deltaY) < 40;
      if (isTrackpadPan) {
        t.current.x -= e.deltaX;
        t.current.y -= e.deltaY;
        apply();
        return;
      }
      const speed = e.ctrlKey ? 0.012 : 0.0018;
      zoomAt(Math.exp(-e.deltaY * speed * (e.deltaMode === 1 ? 16 : 1)), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [apply, zoomAt]);

  /* ---------- seret & cubit (pointer events: mouse + sentuh) ---------- */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ moved: false, sx: 0, sy: 0, dist: 0, k: 1, mx: 0, my: 0 });

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (pointers.current.size === 1) {
      g.moved = false;
      g.sx = e.clientX;
      g.sy = e.clientY;
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const r = outer.current!.getBoundingClientRect();
      g.dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      g.k = t.current.k;
      g.mx = (a.x + b.x) / 2 - r.left;
      g.my = (a.y + b.y) / 2 - r.top;
      g.moved = true;
      try {
        outer.current?.setPointerCapture(e.pointerId);
      } catch {}
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, cur);
    const g = gesture.current;
    if (pointers.current.size === 1) {
      if (!g.moved && Math.hypot(cur.x - g.sx, cur.y - g.sy) < 6) return;
      if (!g.moved) {
        g.moved = true;
        try {
          outer.current?.setPointerCapture(e.pointerId);
        } catch {}
      }
      t.current.x += cur.x - prev.x;
      t.current.y += cur.y - prev.y;
      apply();
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const r = outer.current!.getBoundingClientRect();
      const mx = (a.x + b.x) / 2 - r.left;
      const my = (a.y + b.y) / 2 - r.top;
      t.current.x += mx - g.mx;
      t.current.y += my - g.my;
      g.mx = mx;
      g.my = my;
      const target = clamp((g.k * Math.hypot(a.x - b.x, a.y - b.y)) / g.dist, MIN_K, MAX_K);
      zoomAt(target / t.current.k, mx, my);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 1) {
      const [p] = [...pointers.current.values()];
      gesture.current.sx = p.x;
      gesture.current.sy = p.y;
    }
  };

  const onClickCapture = (e: React.MouseEvent) => {
    if (gesture.current.moved) {
      e.stopPropagation();
      e.preventDefault();
      gesture.current.moved = false;
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName !== "DIV") return;
    const step = 80;
    const el = outer.current!;
    if (e.key === "+" || e.key === "=") zoomAt(1.2, el.clientWidth / 2, el.clientHeight / 2, true);
    else if (e.key === "-") zoomAt(1 / 1.2, el.clientWidth / 2, el.clientHeight / 2, true);
    else if (e.key === "0") fit();
    else if (e.key === "ArrowLeft") (t.current.x += step), apply(true);
    else if (e.key === "ArrowRight") (t.current.x -= step), apply(true);
    else if (e.key === "ArrowUp") (t.current.y += step), apply(true);
    else if (e.key === "ArrowDown") (t.current.y -= step), apply(true);
    else return;
    e.preventDefault();
  };

  return (
    <div
      ref={outer}
      className="tree-canvas absolute inset-0 overflow-hidden outline-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={onClickCapture}
      onKeyDown={onKeyDown}
      tabIndex={0}
      aria-label="Kanvas pohon keluarga. Seret untuk menggeser, cubit atau scroll untuk zoom."
    >
      <div ref={inner} className="tree-inner absolute left-0 top-0" style={{ width: layout.width, height: layout.height }}>
        <TreeContent {...props} />
      </div>
    </div>
  );
}

/* ===================================================================== */

const TreeContent = memo(function TreeContent({ idx, layout, direction, highlight, meId, pulseId, onSelect, onToggle }: Props) {
  const hasHL = !!highlight && highlight.size > 0;
  const stateOf = (id: string): CardState => (!hasHL ? "normal" : highlight!.has(id) ? "glow" : id === meId ? "normal" : "dim");

  return (
    <>
      <svg width={layout.width} height={layout.height} className="pointer-events-none absolute left-0 top-0" aria-hidden="true">
        <defs>
          <linearGradient id="bark-v" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8a5d36" />
            <stop offset="1" stopColor="#5a3a21" />
          </linearGradient>
          <linearGradient id="gold-h" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#c99a2e" stopOpacity=".2" />
            <stop offset=".5" stopColor="#d4a843" />
            <stop offset="1" stopColor="#c99a2e" stopOpacity=".2" />
          </linearGradient>
          <radialGradient id="soil" cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="#6a4628" stopOpacity=".35" />
            <stop offset="1" stopColor="#6a4628" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Akar: leluhur di dasar pohon */}
        {direction === "up" &&
          layout.roots.map((r, i) => {
            const y0 = r.y + 2;
            const spread = Math.max(220, r.w * 0.9);
            return (
              <g key={i}>
                <ellipse cx={r.x} cy={y0 + 120} rx={spread * 1.2} ry={70} fill="url(#soil)" />
                <g stroke="url(#bark-v)" strokeLinecap="round" fill="none" opacity=".9">
                  <path d={`M ${r.x} ${y0} L ${r.x} ${y0 + 40}`} strokeWidth="16" />
                  <path d={`M ${r.x - 4} ${y0 + 36} C ${r.x - 30} ${y0 + 80}, ${r.x - spread * 0.5} ${y0 + 90}, ${r.x - spread} ${y0 + 150}`} strokeWidth="9" />
                  <path d={`M ${r.x + 4} ${y0 + 36} C ${r.x + 30} ${y0 + 80}, ${r.x + spread * 0.5} ${y0 + 92}, ${r.x + spread} ${y0 + 146}`} strokeWidth="9" />
                  <path d={`M ${r.x - 2} ${y0 + 40} C ${r.x - 14} ${y0 + 90}, ${r.x - spread * 0.25} ${y0 + 120}, ${r.x - spread * 0.45} ${y0 + 175}`} strokeWidth="6" />
                  <path d={`M ${r.x + 2} ${y0 + 40} C ${r.x + 14} ${y0 + 90}, ${r.x + spread * 0.25} ${y0 + 120}, ${r.x + spread * 0.42} ${y0 + 178}`} strokeWidth="6" />
                  <path d={`M ${r.x} ${y0 + 40} L ${r.x} ${y0 + 180}`} strokeWidth="4" />
                  <path d={`M ${r.x - spread * 0.62} ${y0 + 104} C ${r.x - spread * 0.7} ${y0 + 130}, ${r.x - spread * 0.78} ${y0 + 150}, ${r.x - spread * 0.85} ${y0 + 180}`} strokeWidth="3" />
                  <path d={`M ${r.x + spread * 0.6} ${y0 + 104} C ${r.x + spread * 0.7} ${y0 + 128}, ${r.x + spread * 0.76} ${y0 + 152}, ${r.x + spread * 0.82} ${y0 + 182}`} strokeWidth="3" />
                </g>
                <text x={r.x} y={y0 + 196} textAnchor="middle" fontSize="15" letterSpacing="5" fill="#8a5d36" fontWeight="700">
                  AKAR · LELUHUR
                </text>
              </g>
            );
          })}

        {/* Dahan: garis keturunan */}
        {layout.edges.map((e) => {
          const lit = !hasHL || highlight!.has(e.childId);
          const w = Math.max(2.2, 11 - e.depth * 1.8);
          return (
            <path
              key={e.key}
              d={e.d}
              fill="none"
              stroke={e.step ? "#b08a5a" : "url(#bark-v)"}
              strokeWidth={w}
              strokeLinecap="round"
              strokeDasharray={e.step ? "2 9" : undefined}
              opacity={lit ? 0.92 : 0.18}
            />
          );
        })}

        {/* Garis pasangan */}
        {layout.rings.map((r) => (
          <line key={r.key} x1={r.x - 26} x2={r.x + 26} y1={r.y} y2={r.y} stroke="url(#gold-h)" strokeWidth="3" />
        ))}
      </svg>

      {layout.rings.map((r) => (
        <div
          key={r.key}
          className="pointer-events-none absolute grid h-8 w-8 place-items-center rounded-full border border-gold/50 bg-white shadow-sm"
          style={{ left: r.x - 16, top: r.y - 16, opacity: hasHL ? 0.5 : 1 }}
          title={r.status === "cerai" ? "Bercerai" : r.status === "wafat" ? "Berpisah karena wafat" : "Pasangan"}
        >
          <RingsIcon className="h-4 w-6" muted={r.status === "cerai"} />
        </div>
      ))}

      {[...layout.cards.values()].map((p) => {
        const m = idx.byId.get(p.id);
        if (!m) return null;
        return (
          <MemberCard
            key={p.id}
            m={m}
            x={p.x}
            y={p.y}
            state={stateOf(p.id)}
            isMe={p.id === meId}
            pulse={p.id === pulseId}
            onSelect={onSelect}
          />
        );
      })}

      {layout.toggles.map((tg) => (
        <button
          key={tg.unitId}
          type="button"
          onClick={() => onToggle(tg.unitId)}
          className={`absolute flex h-7 -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full border px-2 text-[11px] font-bold shadow-sm transition hover:scale-110 ${
            tg.collapsed ? "border-gold bg-gold-pale text-[#7a5b14]" : "border-leaf/40 bg-white text-forest"
          }`}
          style={{ left: tg.x, top: tg.y, opacity: hasHL ? 0.35 : 1 }}
          aria-label={tg.collapsed ? `Buka ${tg.hidden} keturunan` : "Tutup cabang"}
          title={tg.collapsed ? `Buka ${tg.hidden} anggota` : "Tutup cabang ini"}
        >
          {tg.collapsed ? <Plus className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
          {tg.collapsed && tg.hidden}
        </button>
      ))}
    </>
  );
});
