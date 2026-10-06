import type { Marriage, Member } from "./types";
import { shortName } from "./names";

/* =====================================================================
 *  Indeks keluarga + mesin "Relasi Pintar" (kekerabatan Indonesia/Jawa)
 * ===================================================================== */

export interface SpouseLink {
  id: string;
  order: number;
  status: Marriage["status"];
}

export interface FamilyIndex {
  byId: Map<string, Member>;
  children: Map<string, string[]>; // anak (lewat parent_id ATAU co_parent_id)
  spouses: Map<string, SpouseLink[]>; // dua arah
  depth: Map<string, number>; // 0 = akar
  branchHead: Map<string, string>; // id kepala bani (generasi 1)
  roots: string[];
  maxDepth: number;
}

const byOrder = (idx: { byId: Map<string, Member> }) => (a: string, b: string) => {
  const A = idx.byId.get(a)!;
  const B = idx.byId.get(b)!;
  const oa = A.birth_order ?? 99;
  const ob = B.birth_order ?? 99;
  if (A.parent_id === B.parent_id && oa !== ob) return oa - ob;
  const ya = A.birth_date ?? String(A.birth_year ?? 9999);
  const yb = B.birth_date ?? String(B.birth_year ?? 9999);
  if (ya !== yb) return ya < yb ? -1 : 1;
  if (oa !== ob) return oa - ob;
  return A.full_name.localeCompare(B.full_name);
};

export function buildIndex(members: Member[], marriages: Marriage[]): FamilyIndex {
  const byId = new Map(members.map((m) => [m.id, m]));
  const children = new Map<string, string[]>();
  const spouses = new Map<string, SpouseLink[]>();
  const push = <T,>(map: Map<string, T[]>, k: string, v: T) => {
    const arr = map.get(k);
    if (arr) arr.push(v);
    else map.set(k, [v]);
  };

  for (const m of members) {
    if (m.parent_id && byId.has(m.parent_id)) push(children, m.parent_id, m.id);
    if (m.co_parent_id && byId.has(m.co_parent_id) && m.co_parent_id !== m.parent_id)
      push(children, m.co_parent_id, m.id);
  }
  for (const mar of marriages) {
    if (!byId.has(mar.member_id) || !byId.has(mar.spouse_id)) continue;
    push(spouses, mar.member_id, { id: mar.spouse_id, order: mar.marriage_order, status: mar.status });
    push(spouses, mar.spouse_id, { id: mar.member_id, order: mar.marriage_order, status: mar.status });
  }
  const tmp = { byId };
  for (const [k, arr] of children) children.set(k, [...new Set(arr)].sort(byOrder(tmp)));
  for (const arr of spouses.values()) arr.sort((a, b) => a.order - b.order);

  // Kedalaman (generasi): BFS dari akar
  const depth = new Map<string, number>();
  const branchHead = new Map<string, string>();
  const isRoot = (m: Member) =>
    m.member_type !== "pasangan" && (!m.parent_id || !byId.has(m.parent_id));
  const roots = members
    .filter(isRoot)
    .filter((m) => !(m.member_type === "pasangan"))
    .map((m) => m.id)
    .sort(byOrder(tmp));
  // pasangan tanpa pernikahan & tanpa orang tua juga jadi akar
  for (const m of members) {
    if (m.member_type === "pasangan" && !spouses.has(m.id)) roots.push(m.id);
  }

  const queue: string[] = [];
  for (const r of roots) {
    depth.set(r, 0);
    queue.push(r);
  }
  const setDepth = (id: string, d: number, head: string | undefined) => {
    if (depth.has(id)) return false;
    depth.set(id, d);
    if (head) branchHead.set(id, head);
    queue.push(id);
    return true;
  };
  while (queue.length) {
    const id = queue.shift()!;
    const d = depth.get(id)!;
    const head = branchHead.get(id);
    for (const s of spouses.get(id) ?? []) setDepth(s.id, d, head);
    for (const c of children.get(id) ?? []) {
      const childHead = d === 0 ? c : head;
      setDepth(c, d + 1, childHead);
    }
  }
  // Data yatim (tidak terhubung) tetap diberi kedalaman 0
  for (const m of members) if (!depth.has(m.id)) depth.set(m.id, 0);
  // kepala bani menunjuk ke dirinya sendiri; pasangannya ke kepala tsb
  for (const [id, d] of depth) {
    if (d === 1 && byId.get(id)?.member_type !== "pasangan") branchHead.set(id, id);
  }
  for (const [id, d] of depth) {
    if (d === 1 && byId.get(id)?.member_type === "pasangan") {
      const partner = (spouses.get(id) ?? []).find((s) => byId.get(s.id)?.member_type !== "pasangan");
      if (partner) branchHead.set(id, partner.id);
    }
  }

  let maxDepth = 0;
  for (const d of depth.values()) maxDepth = Math.max(maxDepth, d);
  return { byId, children, spouses, depth, branchHead, roots, maxDepth };
}

/* ------------------------- helper relasi dasar ------------------------- */

export const parentsOf = (idx: FamilyIndex, id: string): string[] => {
  const m = idx.byId.get(id);
  if (!m) return [];
  return [m.parent_id, m.co_parent_id].filter(
    (p, i, arr): p is string => !!p && idx.byId.has(p) && arr.indexOf(p) === i,
  );
};
export const spousesOf = (idx: FamilyIndex, id: string) => (idx.spouses.get(id) ?? []).map((s) => s.id);
export const childrenOf = (idx: FamilyIndex, id: string) => idx.children.get(id) ?? [];

/** Orang tua sambung: pasangan dari orang tua yang bukan orang tua kandung. */
export const stepParentsOf = (idx: FamilyIndex, id: string): string[] => {
  const ps = parentsOf(idx, id);
  const out = new Set<string>();
  for (const p of ps) for (const s of spousesOf(idx, p)) if (!ps.includes(s)) out.add(s);
  return [...out];
};

export const siblingsOf = (idx: FamilyIndex, id: string): string[] => {
  const out = new Set<string>();
  for (const p of parentsOf(idx, id))
    for (const c of childrenOf(idx, p)) if (c !== id && idx.byId.get(c)?.member_type !== "pasangan") out.add(c);
  return [...out].sort(byOrder(idx));
};

/** true = a lebih tua dari b, false = lebih muda, null = tidak diketahui */
export function isOlder(idx: FamilyIndex, a: string, b: string): boolean | null {
  const A = idx.byId.get(a);
  const B = idx.byId.get(b);
  if (!A || !B) return null;
  if (A.parent_id && A.parent_id === B.parent_id && A.birth_order && B.birth_order && A.birth_order !== B.birth_order)
    return A.birth_order < B.birth_order;
  if (A.birth_date && B.birth_date && A.birth_date !== B.birth_date) return A.birth_date < B.birth_date;
  if (A.birth_year && B.birth_year && A.birth_year !== B.birth_year) return A.birth_year < B.birth_year;
  if (A.birth_order && B.birth_order && A.birth_order !== B.birth_order) return A.birth_order < B.birth_order;
  return null;
}

/* ------------------------- label generasi ------------------------- */

const GEN_NAMES = ["Leluhur", "Kepala Bani", "Anak", "Cucu", "Buyut", "Canggah", "Wareng", "Udeg-udeg"];
export function generationName(depth: number): string {
  return GEN_NAMES[depth] ?? `Generasi ke-${depth}`;
}
export function generationTitle(depth: number): string {
  if (depth === 0) return "Leluhur · Akar Pohon";
  return `Generasi ${depth} · ${generationName(depth)}`;
}

export function branchName(idx: FamilyIndex, id: string): string | null {
  const head = idx.branchHead.get(id);
  if (!head) return null;
  const people = [head, ...spousesOf(idx, head)]
    .map((p) => idx.byId.get(p)!)
    .filter(Boolean)
    .sort((a, b) => (a.gender === "L" ? -1 : 0) - (b.gender === "L" ? -1 : 0));
  return "Bani " + people.slice(0, 2).map((p) => p.full_name).join(" – ");
}

/* ------------------------- label relasi ------------------------- */

export interface RelationLabel {
  label: string;
  detail?: string;
}

interface AncInfo {
  depth: number;
  step: boolean;
  via: string | null; // anak dari leluhur ini yang berada di jalur menuju orang tsb
}

function ancestors(idx: FamilyIndex, id: string): Map<string, AncInfo> {
  const out = new Map<string, AncInfo>([[id, { depth: 0, step: false, via: null }]]);
  const queue = [id];
  while (queue.length) {
    const cur = queue.shift()!;
    const info = out.get(cur)!;
    if (info.depth > 12) continue;
    const links: [string, boolean][] = [
      ...parentsOf(idx, cur).map((p) => [p, false] as [string, boolean]),
      ...stepParentsOf(idx, cur).map((p) => [p, true] as [string, boolean]),
    ];
    for (const [p, step] of links) {
      const cand: AncInfo = { depth: info.depth + 1, step: info.step || step, via: cur };
      const prev = out.get(p);
      if (!prev || prev.depth > cand.depth || (prev.depth === cand.depth && prev.step && !cand.step)) {
        out.set(p, cand);
        queue.push(p);
      }
    }
  }
  return out;
}

interface Path {
  anc: string;
  a: number; // generasi dari penonton ke leluhur bersama
  b: number; // generasi dari target ke leluhur bersama
  step: boolean;
  viaA: string | null;
  viaB: string | null;
}

function bloodPath(idx: FamilyIndex, a: string, b: string): Path | null {
  const A = ancestors(idx, a);
  const B = ancestors(idx, b);
  let best: (Path & { score: number }) | null = null;
  for (const [anc, ia] of A) {
    const ib = B.get(anc);
    if (!ib) continue;
    const step = ia.step || ib.step;
    const score = ia.depth + ib.depth + (step ? 0.5 : 0);
    if (!best || score < best.score)
      best = { anc, a: ia.depth, b: ib.depth, step, viaA: ia.via, viaB: ib.via, score };
  }
  return best;
}

function pick(g: Member["gender"], l: string, p: string, n: string) {
  return g === "L" ? l : g === "P" ? p : n;
}

function fromPath(idx: FamilyIndex, viewer: string, target: string, path: Path): RelationLabel {
  const T = idx.byId.get(target)!;
  const g = T.gender;
  const { a, b, step } = path;
  const sambung = step ? " (sambung)" : "";
  const anc = idx.byId.get(path.anc);

  if (a === 0) {
    const names = ["", "Anak", "Cucu", "Cicit (Buyut)", "Canggah", "Wareng"];
    return { label: (names[b] ?? `Keturunan generasi ke-${b}`) + sambung };
  }
  if (b === 0) {
    const names = [
      "",
      pick(g, "Ayah", "Ibu", "Orang tua"),
      pick(g, "Kakek", "Nenek", "Kakek/Nenek"),
      pick(g, "Kakek buyut", "Nenek buyut", "Buyut"),
      pick(g, "Mbah canggah", "Mbah canggah", "Canggah"),
    ];
    return { label: (names[a] ?? `Leluhur (${a} generasi di atas)`) + sambung };
  }
  if (a === 1 && b === 1) {
    if (step) return { label: "Saudara tiri", detail: `Melalui ${anc ? shortName(anc) : "orang tua"}` };
    const older = isOlder(idx, target, viewer);
    let label =
      older === true ? pick(g, "Kakak (Mas)", "Kakak (Mbak)", "Kakak") : older === false ? "Adik" : "Saudara kandung";
    const V = idx.byId.get(viewer)!;
    if (V.co_parent_id && T.co_parent_id && V.co_parent_id !== T.co_parent_id && V.parent_id === T.parent_id) {
      const shared = idx.byId.get(V.parent_id!);
      label += shared?.gender === "P" ? " seibu" : " seayah";
    }
    return { label, detail: "Saudara kandung" };
  }
  if (a === 2 && b === 1) {
    const parentVia = path.viaA ? idx.byId.get(path.viaA) : undefined;
    const older = path.viaA ? isOlder(idx, target, path.viaA) : null;
    const label =
      older === true
        ? pick(g, "Pakde", "Bude", "Pakde/Bude")
        : older === false
          ? pick(g, "Om", "Tante", "Om/Tante")
          : pick(g, "Paman", "Bibi", "Paman/Bibi");
    return {
      label: label + sambung,
      detail: parentVia ? `Saudara dari ${parentVia.gender === "P" ? "ibu" : "ayah"} Anda (${shortName(parentVia)})` : undefined,
    };
  }
  if (a === 1 && b === 2) return { label: "Keponakan" + sambung, detail: "Anak dari saudara Anda" };
  if (a === 2 && b === 2) return { label: "Sepupu" + sambung, detail: "Anak dari pakde/bude/om/tante Anda" };
  if (a === 3 && b === 1)
    return { label: pick(g, "Kakek", "Nenek", "Kakek/Nenek") + sambung, detail: "Saudara dari kakek/nenek Anda" };
  if (a === 1 && b === 3) return { label: "Cucu keponakan" + sambung, detail: "Cucu dari saudara Anda" };
  if (a === 3 && b === 2)
    return { label: pick(g, "Om", "Tante", "Om/Tante") + sambung, detail: "Sepupu dari orang tua Anda" };
  if (a === 2 && b === 3) return { label: "Keponakan" + sambung, detail: "Anak dari sepupu Anda" };
  if (a === 2 && b === 4) return { label: "Cucu keponakan" + sambung, detail: "Cucu dari sepupu Anda" };
  if (a === 4 && b === 2) return { label: pick(g, "Kakek", "Nenek", "Kakek/Nenek") + sambung, detail: "Sepupu dari kakek/nenek Anda" };
  if (a === 3 && b === 3) return { label: "Sepupu dua kali (mindoan)" + sambung };
  if (a === 4 && b === 4) return { label: "Sepupu tiga kali" + sambung };
  const diff = a - b;
  return {
    label:
      diff > 0 ? `Kerabat ${diff} generasi di atas Anda` : diff < 0 ? `Kerabat ${-diff} generasi di bawah Anda` : "Kerabat segenerasi",
    detail: anc ? `Leluhur bersama: ${anc.full_name}` : undefined,
  };
}

/** Label hubungan antara penonton (viewer) dan target. */
export function relationBetween(idx: FamilyIndex, viewer: string, target: string, depthGuard = 0): RelationLabel {
  if (viewer === target) return { label: "Anda sendiri" };
  const V = idx.byId.get(viewer);
  const T = idx.byId.get(target);
  if (!V || !T) return { label: "—" };

  const p = bloodPath(idx, viewer, target);
  if (p) return fromPath(idx, viewer, target, p);

  // Target adalah pasangan dari seseorang yang punya hubungan darah dengan penonton
  if (T.member_type === "pasangan") {
    let best: { r: string; path: Path } | null = null;
    for (const r of spousesOf(idx, target)) {
      const pr = r === viewer ? ({ anc: r, a: 0, b: 0, step: false, viaA: null, viaB: null } as Path) : bloodPath(idx, viewer, r);
      if (pr && (!best || pr.a + pr.b < best.path.a + best.path.b)) best = { r, path: pr };
    }
    if (best) {
      const R = idx.byId.get(best.r)!;
      const { a, b } = best.path;
      const g = T.gender;
      const via = `Pasangan dari ${shortName(R)}`;
      if (a === 0 && b === 0) return { label: pick(g, "Suami Anda", "Istri Anda", "Pasangan Anda") };
      if (a === 0 && b === 1) return { label: "Menantu", detail: via };
      if (a === 0 && b === 2) return { label: "Cucu menantu", detail: via };
      if (a === 0 && b === 3) return { label: "Cicit menantu", detail: via };
      if (a === 1 && b === 0) return { label: pick(g, "Ayah sambung", "Ibu sambung", "Orang tua sambung"), detail: via };
      if (a === 2 && b === 0) return { label: pick(g, "Kakek", "Nenek", "Kakek/Nenek"), detail: via };
      if (a === 3 && b === 0) return { label: pick(g, "Kakek buyut", "Nenek buyut", "Buyut"), detail: via };
      if (a === 1 && b === 1) return { label: pick(g, "Kakak/adik ipar", "Kakak/adik ipar", "Ipar"), detail: via };
      if (a === 2 && b === 1) {
        const older = best.path.viaA ? isOlder(idx, best.r, best.path.viaA) : null;
        const label =
          older === true ? pick(g, "Pakde", "Bude", "Pakde/Bude") : older === false ? pick(g, "Om", "Tante", "Om/Tante") : pick(g, "Paman", "Bibi", "Paman/Bibi");
        return { label, detail: via };
      }
      if (a === 1 && b === 2) return { label: "Pasangan keponakan", detail: via };
      if (a === 2 && b === 2) return { label: "Pasangan sepupu", detail: via };
      const inner = fromPath(idx, viewer, best.r, best.path);
      return { label: `Pasangan ${inner.label.toLowerCase()}`, detail: via };
    }
  }

  // Penonton adalah pasangan (menantu): hitung lewat suami/istrinya
  if (V.member_type === "pasangan" && depthGuard === 0) {
    for (const s of spousesOf(idx, viewer)) {
      if (s === target) return { label: pick(T.gender, "Suami Anda", "Istri Anda", "Pasangan Anda") };
      const ps = bloodPath(idx, s, target);
      const side = "Dari pihak pasangan Anda";
      if (ps) {
        const g = T.gender;
        if (ps.a === 1 && ps.b === 0) return { label: pick(g, "Bapak mertua", "Ibu mertua", "Mertua"), detail: side };
        if (ps.a === 2 && ps.b === 0) return { label: pick(g, "Kakek mertua", "Nenek mertua", "Kakek/Nenek mertua"), detail: side };
        if (ps.a === 1 && ps.b === 1) return { label: pick(g, "Kakak/adik ipar", "Kakak/adik ipar", "Ipar"), detail: side };
        if (ps.a === 0 && ps.b === 1) return { label: "Anak sambung", detail: side };
        if (ps.a === 0 && ps.b === 2) return { label: "Cucu", detail: side };
        const inner = fromPath(idx, s, target, ps);
        return { label: inner.label, detail: inner.detail ? `${inner.detail} · dari pihak pasangan Anda` : side };
      }
      const viaSpouse = relationBetween(idx, s, target, depthGuard + 1);
      if (viaSpouse.label !== "Kerabat jauh" && viaSpouse.label !== "—") {
        return { label: viaSpouse.label.replace(/ Anda$/, ""), detail: side };
      }
    }
  }
  return { label: "Kerabat jauh" };
}

/* ------------------------- kelompok relasi (filter) ------------------------- */

export const RELATION_GROUPS = [
  { key: "parents", label: "Orang Tua" },
  { key: "siblings", label: "Saudara Kandung" },
  { key: "spouses", label: "Pasangan" },
  { key: "children", label: "Anak" },
  { key: "grandchildren", label: "Cucu" },
  { key: "grandparents", label: "Kakek & Nenek" },
  { key: "unclesAunts", label: "Pakde · Bude · Om · Tante" },
  { key: "cousins", label: "Sepupu" },
  { key: "nephews", label: "Keponakan" },
  { key: "inlaws", label: "Ipar" },
  { key: "parentsInLaw", label: "Mertua" },
] as const;
export type RelationKey = (typeof RELATION_GROUPS)[number]["key"];

export function relationGroups(idx: FamilyIndex, viewer: string): Record<RelationKey, string[]> {
  const uniq = (ids: Iterable<string>, exclude: Iterable<string> = []) => {
    const ex = new Set([viewer, ...exclude]);
    return [...new Set(ids)].filter((i) => !ex.has(i) && idx.byId.has(i));
  };
  const flat = (ids: string[], fn: (id: string) => string[]) => ids.flatMap(fn);

  const parentsBlood = parentsOf(idx, viewer);
  const parents = uniq([...parentsBlood, ...stepParentsOf(idx, viewer)]);
  const gp = flat(parents, (p) => parentsOf(idx, p));
  const grandparents = uniq([...gp, ...flat(gp, (g) => spousesOf(idx, g))], parents);
  const siblings = siblingsOf(idx, viewer);
  const spouses = spousesOf(idx, viewer);
  const children = uniq(childrenOf(idx, viewer));
  const grandchildren = uniq(flat(children, (c) => childrenOf(idx, c)));

  const parentSiblings = uniq(flat(parentsBlood, (p) => siblingsOf(idx, p)), siblings);
  const unclesAunts = uniq([...parentSiblings, ...flat(parentSiblings, (u) => spousesOf(idx, u))], parents);
  const cousins = uniq(flat(parentSiblings, (u) => childrenOf(idx, u)), siblings);

  const spouseSiblings = uniq(flat(spouses, (s) => siblingsOf(idx, s)));
  const nephews = uniq([
    ...flat(siblings, (s) => childrenOf(idx, s)),
    ...flat(cousins, (c) => childrenOf(idx, c)),
    ...flat(spouseSiblings, (s) => childrenOf(idx, s)),
  ], children);
  const inlaws = uniq([
    ...flat(siblings, (s) => spousesOf(idx, s)),
    ...spouseSiblings,
    ...flat(spouseSiblings, (s) => spousesOf(idx, s)),
  ], spouses);
  const parentsInLaw = uniq(flat(spouses, (s) => parentsOf(idx, s)));

  return {
    parents,
    siblings,
    spouses,
    children,
    grandchildren,
    grandparents,
    unclesAunts,
    cousins,
    nephews,
    inlaws,
    parentsInLaw,
  };
}

/** Kalimat identitas: "Anda adalah anak ke-2 dari ..." */
export function identitySentence(idx: FamilyIndex, viewer: string): string {
  const m = idx.byId.get(viewer);
  if (!m) return "";
  const nm = (id: string) => idx.byId.get(id)?.full_name ?? "";
  if (m.member_type === "pasangan") {
    const partners = spousesOf(idx, viewer);
    if (!partners.length) return "Anda tercatat sebagai pasangan dalam keluarga ini.";
    const p = idx.byId.get(partners[0])!;
    const role = pick(m.gender, "suami", "istri", "pasangan");
    const inLaws = parentsOf(idx, p.id);
    return `Anda adalah ${role} dari ${p.full_name}` + (inLaws.length ? `, menantu dari ${inLaws.map(nm).join(" & ")}.` : ".");
  }
  const ps = parentsOf(idx, viewer);
  if (!ps.length) return "Anda adalah leluhur (akar) dari pohon keluarga ini.";
  const order = m.birth_order ? `anak ke-${m.birth_order}` : "anak";
  if (m.member_type === "bawaan") {
    const step = stepParentsOf(idx, viewer);
    return `Anda adalah ${order} dari ${ps.map(nm).join(" & ")}` + (step.length ? ` (anak sambung ${step.map(nm).join(" & ")}).` : ".");
  }
  return `Anda adalah ${order} dari ${ps.map(nm).join(" & ")}.`;
}

/** Deskripsi singkat peran seseorang, mis. "Anak ke-2 dari Slamet & Salamah" */
export function roleDescription(idx: FamilyIndex, id: string): string {
  const m = idx.byId.get(id);
  if (!m) return "";
  const nm = (x: string) => shortName(idx.byId.get(x)!);
  if (m.member_type === "pasangan") {
    const p = spousesOf(idx, id);
    return p.length ? `${pick(m.gender, "Suami", "Istri", "Pasangan")} dari ${p.map(nm).join(" & ")}` : "Pasangan";
  }
  const ps = parentsOf(idx, id);
  if (!ps.length) return "Leluhur / akar pohon";
  const prefix = m.member_type === "bawaan" ? "Anak bawaan" : m.birth_order ? `Anak ke-${m.birth_order}` : "Anak";
  return `${prefix} dari ${ps.map(nm).join(" & ")}`;
}
