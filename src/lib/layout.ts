import type { FamilyIndex } from "./kinship";
import { childrenOf } from "./kinship";

/* =====================================================================
 *  Tata letak pohon: setiap "unit" = anggota garis keluarga + pasangannya.
 *  Anak-anak digantung di bawah (atau di atas, bila pohon tumbuh ke atas).
 * ===================================================================== */

export const CARD_W = 168;
export const CARD_H = 218;
export const COUPLE_GAP = 44;
export const SIB_GAP = 26;
export const ROOT_GAP = 140;
export const LEVEL_GAP = 120;
export const PAD = 80;
export const ROOT_SPACE = 200; // ruang dekorasi akar (mode tumbuh ke atas)

export type Direction = "up" | "down";

export interface CardPos {
  id: string;
  x: number;
  y: number;
  depth: number;
  unitId: string;
  isSpouse: boolean;
}
export interface EdgePath {
  key: string;
  d: string;
  depth: number;
  childId: string;
  step: boolean;
}
export interface Ring {
  key: string;
  x: number;
  y: number;
  status: string | null;
}
export interface Toggle {
  unitId: string;
  x: number;
  y: number;
  collapsed: boolean;
  hidden: number;
}
export interface LayoutResult {
  cards: Map<string, CardPos>;
  edges: EdgePath[];
  rings: Ring[];
  toggles: Toggle[];
  roots: { x: number; y: number; w: number }[];
  width: number;
  height: number;
}

interface Unit {
  id: string;
  members: string[];
  children: Unit[];
  depth: number;
  selfW: number;
  w: number;
  x: number;
  descendants: number;
}

export function computeLayout(idx: FamilyIndex, collapsed: Set<string>, direction: Direction): LayoutResult {
  const placed = new Set<string>();
  const marriageStatus = new Map<string, string | null>();
  for (const [a, list] of idx.spouses) for (const s of list) marriageStatus.set(`${a}|${s.id}`, s.status);

  const build = (lineId: string, depth: number): Unit => {
    placed.add(lineId);
    const spouses = (idx.spouses.get(lineId) ?? [])
      .map((s) => s.id)
      .filter((s) => idx.byId.get(s)?.member_type === "pasangan" && !placed.has(s));
    spouses.forEach((s) => placed.add(s));
    const members = spouses.length === 0 ? [lineId] : spouses.length === 1 ? [lineId, spouses[0]] : [spouses[0], lineId, ...spouses.slice(1)];

    const anchorIdx = (childId: string) => {
      const c = idx.byId.get(childId)!;
      const pi = c.parent_id ? members.indexOf(c.parent_id) : -1;
      const ci = c.co_parent_id ? members.indexOf(c.co_parent_id) : -1;
      if (pi >= 0 && ci >= 0) return (pi + ci) / 2;
      if (pi >= 0 && members.length === 2 && members[pi] === lineId) return 0.5;
      return pi >= 0 ? pi : ci >= 0 ? ci : 0;
    };
    const kids: string[] = [];
    for (const m of members)
      for (const c of childrenOf(idx, m))
        if (!placed.has(c) && !kids.includes(c) && idx.byId.get(c)?.member_type !== "pasangan") kids.push(c);
    const order = new Map(kids.map((k, i) => [k, i]));
    kids.sort((a, b) => anchorIdx(a) - anchorIdx(b) || order.get(a)! - order.get(b)!);
    kids.forEach((k) => placed.add(k));

    const children = kids.map((k) => {
      placed.delete(k); // build() akan menandainya lagi
      return build(k, depth + 1);
    });
    const descendants = children.reduce((s, c) => s + c.members.length + c.descendants, 0);
    return { id: lineId, members, children, depth, selfW: 0, w: 0, x: 0, descendants };
  };

  const rootUnits: Unit[] = [];
  for (const r of idx.roots) if (!placed.has(r)) rootUnits.push(build(r, 0));
  // anggota yang belum tertempatkan (data tidak terhubung)
  for (const id of idx.byId.keys()) {
    const m = idx.byId.get(id)!;
    if (!placed.has(id) && m.member_type !== "pasangan") rootUnits.push(build(id, 0));
  }
  for (const id of idx.byId.keys()) if (!placed.has(id)) rootUnits.push(build(id, 0));

  const measure = (u: Unit): number => {
    u.selfW = u.members.length * CARD_W + (u.members.length - 1) * COUPLE_GAP;
    if (collapsed.has(u.id) || u.children.length === 0) {
      u.w = u.selfW;
      u.children.forEach(measure);
      return u.w;
    }
    const cw = u.children.reduce((s, c) => s + measure(c), 0) + SIB_GAP * (u.children.length - 1);
    u.w = Math.max(u.selfW, cw);
    return u.w;
  };
  let maxDepth = 0;
  const visible: Unit[] = [];
  const place = (u: Unit, left: number) => {
    visible.push(u);
    maxDepth = Math.max(maxDepth, u.depth);
    if (collapsed.has(u.id) || u.children.length === 0) {
      u.x = left + (u.w - u.selfW) / 2;
      return;
    }
    const cw = u.children.reduce((s, c) => s + c.w, 0) + SIB_GAP * (u.children.length - 1);
    let cx = left + (u.w - cw) / 2;
    for (const c of u.children) {
      place(c, cx);
      cx += c.w + SIB_GAP;
    }
    // pusatkan pasangan di atas rentang anak-anaknya
    const first = u.children[0];
    const last = u.children[u.children.length - 1];
    const span = (first.x + last.x + last.selfW) / 2;
    u.x = Math.min(Math.max(span - u.selfW / 2, left), left + u.w - u.selfW);
  };

  let cursor = PAD;
  for (const r of rootUnits) {
    measure(r);
    place(r, cursor);
    cursor += r.w + ROOT_GAP;
  }
  const width = cursor - ROOT_GAP + PAD;
  const levelH = CARD_H + LEVEL_GAP;
  const yOf = (depth: number) => PAD + (direction === "down" ? depth : maxDepth - depth) * levelH;
  const height = PAD * 2 + (maxDepth + 1) * levelH - LEVEL_GAP + (direction === "up" ? ROOT_SPACE : 0);

  const cards = new Map<string, CardPos>();
  const rings: Ring[] = [];
  const toggles: Toggle[] = [];
  for (const u of visible) {
    const y = yOf(u.depth);
    u.members.forEach((m, i) => {
      cards.set(m, { id: m, x: u.x + i * (CARD_W + COUPLE_GAP), y, depth: u.depth, unitId: u.id, isSpouse: m !== u.id });
      if (i > 0) {
        const a = u.members[i - 1];
        const st = marriageStatus.get(`${a}|${m}`) ?? marriageStatus.get(`${m}|${a}`) ?? null;
        rings.push({ key: `${a}-${m}`, x: u.x + i * (CARD_W + COUPLE_GAP) - COUPLE_GAP / 2, y: y + 58, status: st });
      }
    });
    if (u.children.length) {
      toggles.push({
        unitId: u.id,
        x: u.x + u.selfW / 2,
        y: direction === "down" ? y + CARD_H + 18 : y - 18,
        collapsed: collapsed.has(u.id),
        hidden: u.descendants,
      });
    }
  }

  const edges: EdgePath[] = [];
  for (const u of visible) {
    if (collapsed.has(u.id) || !u.children.length) continue;
    const y = yOf(u.depth);
    for (const c of u.children) {
      const child = idx.byId.get(c.id)!;
      const pc = child.parent_id ? cards.get(child.parent_id) : undefined;
      const cc = child.co_parent_id ? cards.get(child.co_parent_id) : undefined;
      const center = (p: CardPos) => p.x + CARD_W / 2;
      let ax: number;
      if (pc && cc && pc.unitId === u.id && cc.unitId === u.id) ax = (center(pc) + center(cc)) / 2;
      else if (pc && pc.unitId === u.id && u.members.length === 2 && child.parent_id === u.id)
        ax = u.x + u.selfW / 2;
      else if (pc && pc.unitId === u.id) ax = center(pc);
      else ax = u.x + u.selfW / 2;
      const cp = cards.get(c.id)!;
      const cx = center(cp);
      const down = direction === "down";
      const ay = down ? y + CARD_H + 2 : y - 2;
      const cy = down ? cp.y - 2 : cp.y + CARD_H + 2;
      const dir = down ? 1 : -1;
      const y1 = ay + dir * 34;
      const y2 = cy - dir * 18;
      const mid = (y1 + y2) / 2;
      edges.push({
        key: `${u.id}-${c.id}`,
        d: `M ${ax} ${ay} L ${ax} ${y1} C ${ax} ${mid}, ${cx} ${mid}, ${cx} ${y2} L ${cx} ${cy}`,
        depth: u.depth,
        childId: c.id,
        step: child.member_type === "bawaan",
      });
    }
  }

  const roots = rootUnits
    .filter((r) => r.depth === 0)
    .map((r) => ({ x: r.x + r.selfW / 2, y: yOf(0) + CARD_H, w: r.selfW }));

  return { cards, edges, rings, toggles, roots, width, height };
}

/** Semua id unit (untuk tombol buka/tutup semua) beserta kedalamannya */
export function allUnitIds(idx: FamilyIndex): { id: string; depth: number }[] {
  const out: { id: string; depth: number }[] = [];
  for (const [id, m] of idx.byId) {
    if (m.member_type === "pasangan") continue;
    if (childrenOf(idx, id).length || (idx.spouses.get(id) ?? []).some((s) => childrenOf(idx, s.id).length))
      out.push({ id, depth: idx.depth.get(id) ?? 0 });
  }
  return out;
}
