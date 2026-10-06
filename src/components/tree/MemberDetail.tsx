"use client";

import Link from "next/link";
import { BookOpen, CalendarDays, HeartHandshake, LocateFixed, MapPin, Pencil, Sparkles, UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { LeafIcon } from "@/components/ui/Ornaments";
import {
  branchName,
  childrenOf,
  generationTitle,
  parentsOf,
  relationBetween,
  roleDescription,
  siblingsOf,
  spousesOf,
  type FamilyIndex,
} from "@/lib/kinship";
import { shortName } from "@/lib/names";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

function PersonChips({ idx, ids, onOpen }: { idx: FamilyIndex; ids: string[]; onOpen: (id: string) => void }) {
  if (!ids.length) return <p className="text-sm text-ink-soft/70">—</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {ids.map((id) => {
        const p = idx.byId.get(id);
        if (!p) return null;
        return (
          <button
            key={id}
            onClick={() => onOpen(id)}
            className="flex items-center gap-2 rounded-full border border-gold/30 bg-white/80 py-1 pl-1 pr-3 text-sm font-medium text-ink transition hover:border-leaf hover:bg-leaf-pale"
          >
            <Avatar name={p.full_name} url={p.photo_url} size={28} deceased={p.is_deceased} ring={false} />
            <span className="max-w-[150px] truncate">{shortName(p)}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function MemberDetail({
  idx,
  id,
  meId,
  isAdmin,
  onClose,
  onOpen,
  onShowInTree,
}: {
  idx: FamilyIndex;
  id: string | null;
  meId: string | null;
  isAdmin: boolean;
  onClose: () => void;
  onOpen: (id: string) => void;
  onShowInTree: (id: string) => void;
}) {
  const m = id ? idx.byId.get(id) : undefined;
  if (!m || !id) return <Modal open={false} onClose={onClose}>{null}</Modal>;

  const rel = meId ? relationBetween(idx, meId, id) : null;
  const depth = idx.depth.get(id) ?? 0;
  const bani = branchName(idx, id);
  const now = new Date().getFullYear();
  const age = m.birth_year && !m.is_deceased ? now - m.birth_year : null;
  const isLine = m.member_type !== "pasangan";
  const doaAr = m.gender === "P" ? "اَللّٰهُمَّ اغْفِرْ لَهَا وَارْحَمْهَا" : "اَللّٰهُمَّ اغْفِرْ لَهُ وَارْحَمْهُ";
  const doaLatin = m.gender === "P" ? "Allahummaghfirlaha warhamha" : "Allahummaghfirlahu warhamhu";

  const sections: [string, string[]][] = [
    ["Orang tua", parentsOf(idx, id)],
    ["Pasangan", spousesOf(idx, id)],
    ["Anak", childrenOf(idx, id)],
    ["Saudara kandung", isLine ? siblingsOf(idx, id) : []],
  ];

  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={<span className="text-base text-ink-soft">{generationTitle(depth)}</span>}
      footer={
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onShowInTree(id)}
            className="inline-flex items-center gap-2 rounded-full bg-forest px-4 py-2.5 text-sm font-semibold text-parchment hover:bg-forest-deep"
          >
            <LocateFixed className="h-4 w-4" /> Lihat di pohon
          </button>
          {isAdmin && (
            <>
              <Link href={`/admin?edit=${id}`} className="inline-flex items-center gap-2 rounded-full border border-forest/30 bg-white px-4 py-2.5 text-sm font-semibold text-forest hover:bg-leaf-pale">
                <Pencil className="h-4 w-4" /> Edit data & foto
              </Link>
              <Link href={`/admin?new=anak&parent=${id}`} className="inline-flex items-center gap-2 rounded-full border border-forest/30 bg-white px-4 py-2.5 text-sm font-semibold text-forest hover:bg-leaf-pale">
                <UserPlus className="h-4 w-4" /> Tambah anak
              </Link>
              {isLine && (
                <Link href={`/admin?new=pasangan&of=${id}`} className="inline-flex items-center gap-2 rounded-full border border-forest/30 bg-white px-4 py-2.5 text-sm font-semibold text-forest hover:bg-leaf-pale">
                  <HeartHandshake className="h-4 w-4" /> Tambah pasangan
                </Link>
              )}
            </>
          )}
        </div>
      }
    >
      <div className="fade-in" key={id}>
        <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:gap-6 sm:text-left">
          <div className={`relative rounded-full p-1.5 ${m.is_deceased ? "bg-dry-pale" : "bg-leaf-pale"}`}>
            <Avatar name={m.full_name} url={m.photo_url} size={124} deceased={m.is_deceased} />
            <LeafIcon dry={m.is_deceased} className="absolute -right-1 bottom-2 h-9 w-9 drop-shadow" />
          </div>
          <div className="mt-4 min-w-0 flex-1 sm:mt-1">
            <h2 className="font-display text-2xl leading-tight text-ink sm:text-[28px]">{m.full_name}</h2>
            {m.nickname && <p className="mt-1 italic text-ink-soft">Panggilan: “{m.nickname}”</p>}
            <p className="mt-2 text-sm font-medium text-forest">{roleDescription(idx, id)}</p>
            {bani && <p className="mt-0.5 text-xs text-ink-soft">{bani}</p>}
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${m.is_deceased ? "bg-dry/15 text-dry" : "bg-leaf/15 text-leaf"}`}>
                <LeafIcon dry={m.is_deceased} className="h-3.5 w-3.5" />
                {m.is_deceased ? (m.gender === "P" ? "Almarhumah" : "Almarhum") : "Masih hidup"}
              </span>
              {!!m.hafalan_juz && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-pale px-3 py-1 text-xs font-bold text-[#7a5b14]">
                  <BookOpen className="h-3.5 w-3.5" /> Hafalan {m.hafalan_juz} juz
                </span>
              )}
            </div>
          </div>
        </div>

        {rel && (
          <div className="mt-5 rounded-2xl border border-gold/40 bg-gradient-to-r from-gold-pale/80 to-white p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#7a5b14]">
              <Sparkles className="h-3.5 w-3.5" /> Hubungan dengan Anda
            </p>
            <p className="mt-1 font-display text-2xl text-forest">{rel.label}</p>
            {rel.detail && <p className="text-sm text-ink-soft">{rel.detail}</p>}
          </div>
        )}

        {m.is_deceased && (
          <div className="mt-4 rounded-2xl bg-forest/[0.04] p-4 text-center">
            <p className="font-arabic text-2xl text-forest" lang="ar" dir="rtl">
              {doaAr}
            </p>
            <p className="mt-1 text-xs italic text-ink-soft">{doaLatin} — semoga Allah mengampuni dan merahmatinya.</p>
          </div>
        )}

        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/70 p-3">
            <dt className="flex items-center gap-1 text-xs text-ink-soft">
              <MapPin className="h-3.5 w-3.5 text-leaf" /> Domisili
            </dt>
            <dd className="mt-0.5 font-semibold">{m.domicile ?? "—"}</dd>
          </div>
          <div className="rounded-2xl bg-white/70 p-3">
            <dt className="flex items-center gap-1 text-xs text-ink-soft">
              <CalendarDays className="h-3.5 w-3.5 text-gold" /> Tahun lahir
            </dt>
            <dd className="mt-0.5 font-semibold">
              {m.birth_year ?? "—"}
              {age !== null && <span className="ml-1 text-xs font-normal text-ink-soft">(± {age} th)</span>}
            </dd>
          </div>
          {isAdmin && m.birth_date && (
            <div className="rounded-2xl bg-white/70 p-3">
              <dt className="text-xs text-ink-soft">Tanggal lahir (admin)</dt>
              <dd className="mt-0.5 font-semibold">{fmtDate(m.birth_date)}</dd>
            </div>
          )}
        </dl>

        {m.bio && (
          <div className="mt-5">
            <h3 className="mb-1.5 text-sm font-bold text-forest">Cerita singkat</h3>
            <p className="whitespace-pre-line leading-relaxed text-ink">{m.bio}</p>
          </div>
        )}

        <div className="mt-5 space-y-4">
          {sections.map(([label, ids]) =>
            ids.length || label === "Orang tua" ? (
              <section key={label}>
                <h3 className="mb-2 text-sm font-bold text-forest">
                  {label} {ids.length > 0 && <span className="font-normal text-ink-soft">({ids.length})</span>}
                </h3>
                <PersonChips idx={idx} ids={ids} onOpen={onOpen} />
              </section>
            ) : null,
          )}
        </div>
      </div>
    </Modal>
  );
}
