"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  Camera,
  CircleAlert,
  CircleCheck,
  HeartHandshake,
  History,
  Loader2,
  LogOut,
  Network,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserPlus,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { searchMembers } from "@/components/ui/MemberPicker";
import { Modal } from "@/components/ui/Modal";
import { LeafIcon, Logo } from "@/components/ui/Ornaments";
import { buildIndex, childrenOf, generationTitle, roleDescription, spousesOf } from "@/lib/kinship";
import type { AuditEntry, FamilyData, Member } from "@/lib/types";
import { adminSignOut, deleteMember } from "./actions";
import MemberForm, { type FormPreset } from "./MemberForm";
import PhotoUploader from "./PhotoUploader";

export interface AdminIntent {
  edit?: string | null;
  newType?: "anak" | "pasangan" | "bawaan" | null;
  parent?: string | null;
  of?: string | null;
}

type TypeFilter = "semua" | "keturunan" | "pasangan" | "bawaan" | "tanpa-foto" | "tanpa-tgl";

export default function AdminDashboard({
  data,
  email,
  logs,
  intent,
  title,
}: {
  data: FamilyData;
  email: string;
  logs: AuditEntry[];
  intent: AdminIntent;
  title: string;
}) {
  const router = useRouter();
  const idx = useMemo(() => buildIndex(data.members, data.marriages), [data]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<TypeFilter>("semua");
  const [limit, setLimit] = useState(40);
  const [form, setForm] = useState<{ editing: Member | null; preset: FormPreset } | null>(null);
  const [photoFor, setPhotoFor] = useState<string | null>(null);
  const [delFor, setDelFor] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [deleting, startDelete] = useTransition();

  const notify = useCallback(
    (msg: string, ok = true) => {
      setToast({ msg, ok });
      router.refresh();
    },
    [router],
  );
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  // buka form dari tautan (mis. tombol "Edit" di halaman pohon)
  useEffect(() => {
    if (intent.edit && idx.byId.has(intent.edit)) setForm({ editing: idx.byId.get(intent.edit)!, preset: {} });
    else if (intent.newType === "anak" && intent.parent) {
      const p = idx.byId.get(intent.parent);
      setForm({
        editing: null,
        preset: p?.member_type === "pasangan" ? { type: "bawaan", parentId: p.id } : { type: "keturunan", parentId: intent.parent },
      });
    } else if (intent.newType === "pasangan" && intent.of) setForm({ editing: null, preset: { type: "pasangan", spouseOf: intent.of } });
    else if (intent.newType) setForm({ editing: null, preset: {} });
    if (intent.edit || intent.newType) router.replace("/admin", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const all = data.members;
  const stats = useMemo(
    () => ({
      total: all.length,
      foto: all.filter((m) => m.photo_url).length,
      tgl: all.filter((m) => m.birth_date).length,
      wafat: all.filter((m) => m.is_deceased).length,
    }),
    [all],
  );

  const list = useMemo(() => {
    const base = q.trim() ? searchMembers(idx, q, undefined, 500) : [...all].sort((a, b) => (idx.depth.get(a.id)! - idx.depth.get(b.id)!) || (a.birth_date ?? "9").localeCompare(b.birth_date ?? "9"));
    return base.filter((m) => {
      if (filter === "semua") return true;
      if (filter === "tanpa-foto") return !m.photo_url;
      if (filter === "tanpa-tgl") return !m.birth_date && !m.is_deceased;
      return m.member_type === filter;
    });
  }, [q, filter, idx, all]);

  const del = delFor ? idx.byId.get(delFor) : undefined;
  const delKids = delFor ? childrenOf(idx, delFor).filter((c) => idx.byId.get(c)?.parent_id === delFor) : [];
  const delSpouses = delFor ? spousesOf(idx, delFor) : [];
  const photoMember = photoFor ? idx.byId.get(photoFor) : undefined;

  return (
    <div className="islamic-pattern min-h-dvh">
      <header className="islamic-pattern-dark sticky top-0 z-30 text-parchment shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <Logo className="h-10 w-10" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg leading-tight">Ruang Admin</p>
            <p className="truncate text-[11px] text-parchment/70">
              {title} · {email}
            </p>
          </div>
          <Link href="/pohon" className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20">
            <Network className="h-4 w-4" /> <span className="hidden sm:inline">Lihat Pohon</span>
          </Link>
          <form action={adminSignOut}>
            <button className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Keluar" title="Keluar">
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-24 pt-5 sm:px-6">
        {/* statistik */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Total anggota", stats.total, ""],
            ["Sudah ada foto", `${stats.foto}`, `${Math.round((stats.foto / Math.max(1, stats.total)) * 100)}%`],
            ["Punya tgl lahir (bisa login)", stats.tgl, ""],
            ["Sudah wafat", stats.wafat, ""],
          ].map(([l, n, sub]) => (
            <div key={l as string} className="rounded-3xl border border-gold/25 bg-white/75 p-4">
              <p className="font-display text-3xl text-forest">
                {n} {sub && <span className="text-base text-gold">{sub}</span>}
              </p>
              <p className="text-xs text-ink-soft">{l}</p>
            </div>
          ))}
        </div>

        {/* toolbar */}
        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex flex-1 items-center rounded-2xl border border-gold/30 bg-white px-3 focus-within:ring-4 focus-within:ring-leaf/15">
            <Search className="h-4 w-4 text-ink-soft" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setLimit(40);
              }}
              placeholder="Cari nama, panggilan, domisili…"
              className="h-12 flex-1 bg-transparent px-2 outline-none"
              aria-label="Cari anggota"
            />
          </div>
          <button
            onClick={() => setForm({ editing: null, preset: {} })}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-forest px-5 font-bold text-parchment shadow-lg shadow-forest/25 hover:bg-forest-deep"
          >
            <Plus className="h-5 w-5" /> Tambah anggota
          </button>
        </div>
        <div className="scrollbar-thin -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
          {(
            [
              ["semua", "Semua"],
              ["keturunan", "Keturunan"],
              ["pasangan", "Menantu / pasangan"],
              ["bawaan", "Anak bawaan"],
              ["tanpa-foto", "Belum ada foto"],
              ["tanpa-tgl", "Belum ada tgl lahir"],
            ] as [TypeFilter, string][]
          ).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${
                filter === k ? "border-forest bg-forest text-parchment" : "border-gold/30 bg-white/80 hover:bg-leaf-pale"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        <p className="mt-4 text-sm text-ink-soft">{list.length} anggota</p>

        {/* daftar anggota */}
        <ul className="mt-2 grid grid-cols-1 gap-2.5">
          {list.slice(0, limit).map((m) => (
            <li key={m.id} className="flex min-w-0 flex-col gap-3 rounded-3xl border border-gold/20 bg-white/80 p-3 sm:flex-row sm:items-center sm:p-4">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <button onClick={() => setPhotoFor(m.id)} className="group relative" aria-label={`Atur foto ${m.full_name}`}>
                  <Avatar name={m.full_name} url={m.photo_url} size={56} deceased={m.is_deceased} />
                  <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-forest text-parchment shadow ring-2 ring-white transition group-hover:scale-110">
                    <Camera className="h-3 w-3" />
                  </span>
                </button>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate font-bold">
                    <LeafIcon dry={m.is_deceased} className="h-4 w-4 shrink-0" />
                    <span className="truncate">{m.full_name}</span>
                    {m.nickname && <span className="truncate font-normal text-ink-soft">· {m.nickname}</span>}
                  </p>
                  <p className="truncate text-sm text-forest">{roleDescription(idx, m.id)}</p>
                  <p className="truncate text-xs text-ink-soft">
                    {generationTitle(idx.depth.get(m.id) ?? 0)} · {m.birth_date ?? m.birth_year ?? "tgl lahir belum ada"}
                    {m.domicile ? ` · ${m.domicile}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:justify-end">
                <ActionBtn onClick={() => setForm({ editing: m, preset: {} })} icon={<Pencil className="h-4 w-4" />} label="Edit" />
                <ActionBtn onClick={() => setPhotoFor(m.id)} icon={<Camera className="h-4 w-4" />} label="Foto" />
                {m.member_type !== "pasangan" && (
                  <>
                    <ActionBtn
                      onClick={() => setForm({ editing: null, preset: { type: "keturunan", parentId: m.id } })}
                      icon={<UserPlus className="h-4 w-4" />}
                      label="Anak"
                    />
                    <ActionBtn
                      onClick={() => setForm({ editing: null, preset: { type: "pasangan", spouseOf: m.id } })}
                      icon={<HeartHandshake className="h-4 w-4" />}
                      label="Pasangan"
                    />
                  </>
                )}
                {m.member_type === "pasangan" && (
                  <ActionBtn
                    onClick={() => setForm({ editing: null, preset: { type: "bawaan", parentId: m.id } })}
                    icon={<UserPlus className="h-4 w-4" />}
                    label="Anak bawaan"
                  />
                )}
                <button
                  onClick={() => setDelFor(m.id)}
                  className="grid h-10 w-10 place-items-center rounded-full border border-red-200 text-red-700 hover:bg-red-50"
                  aria-label={`Hapus ${m.full_name}`}
                  title="Hapus"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
        {list.length > limit && (
          <div className="mt-4 text-center">
            <button onClick={() => setLimit((l) => l + 60)} className="rounded-full border border-gold/40 bg-white px-6 py-3 text-sm font-semibold text-forest hover:bg-leaf-pale">
              Tampilkan lebih banyak ({list.length - limit} lagi)
            </button>
          </div>
        )}

        {/* riwayat */}
        <details className="mt-10 rounded-3xl border border-gold/25 bg-white/70 p-4">
          <summary className="flex cursor-pointer items-center gap-2 font-semibold text-forest">
            <History className="h-4 w-4" /> Riwayat perubahan terakhir
          </summary>
          <ul className="mt-3 divide-y divide-gold/15 text-sm">
            {logs.length === 0 && <li className="py-2 text-ink-soft">Belum ada perubahan.</li>}
            {logs.map((l) => (
              <li key={l.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>
                  <b className={l.action === "DELETE" ? "text-red-700" : l.action === "INSERT" ? "text-leaf" : "text-gold"}>
                    {l.action === "INSERT" ? "Tambah" : l.action === "UPDATE" ? "Ubah" : "Hapus"}
                  </b>{" "}
                  {l.table_name === "marriages" ? "data pernikahan" : l.summary}
                </span>
                <time className="text-xs text-ink-soft">{new Date(l.created_at).toLocaleString("id-ID")}</time>
              </li>
            ))}
          </ul>
        </details>
      </main>

      {/* ---------- modal ---------- */}
      {form && (
        <MemberForm
          key={form.editing?.id ?? "new"}
          idx={idx}
          marriages={data.marriages}
          editing={form.editing}
          preset={form.preset}
          onClose={() => setForm(null)}
          onSaved={(msg) => {
            setForm(null);
            notify(msg);
          }}
          onPhotoChanged={(msg, ok) => notify(msg, ok)}
        />
      )}

      <Modal open={!!photoMember} onClose={() => setPhotoFor(null)} title={photoMember ? `Foto: ${photoMember.full_name}` : ""}>
        {photoMember && (
          <PhotoUploader
            key={photoMember.id}
            memberId={photoMember.id}
            name={photoMember.full_name}
            currentUrl={photoMember.photo_url}
            deceased={photoMember.is_deceased}
            onChanged={(msg, ok) => notify(msg, ok)}
          />
        )}
      </Modal>

      <Modal
        open={!!del}
        onClose={() => setDelFor(null)}
        title="Hapus anggota?"
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={() => setDelFor(null)} className="rounded-full px-5 py-2.5 text-sm font-semibold text-ink-soft hover:bg-parchment">
              Batal
            </button>
            <button
              disabled={deleting || delKids.length > 0}
              onClick={() =>
                startDelete(async () => {
                  const res = await deleteMember(delFor!);
                  setDelFor(null);
                  notify(res.ok ? res.message ?? "Dihapus." : res.error, res.ok);
                })
              }
              className="inline-flex items-center gap-2 rounded-full bg-red-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-50"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />} Ya, hapus permanen
            </button>
          </div>
        }
      >
        {del && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <Avatar name={del.full_name} url={del.photo_url} size={52} deceased={del.is_deceased} />
              <div>
                <p className="font-bold">{del.full_name}</p>
                <p className="text-forest">{roleDescription(idx, del.id)}</p>
              </div>
            </div>
            {delKids.length > 0 ? (
              <p className="rounded-2xl bg-amber-50 p-3 text-amber-900">
                Tidak bisa dihapus karena masih memiliki <b>{delKids.length} anak</b> di pohon. Hapus atau pindahkan anak-anaknya terlebih dahulu.
              </p>
            ) : (
              <p className="rounded-2xl bg-red-50 p-3 text-red-800">
                Data dan fotonya akan dihapus permanen.
                {delSpouses.length > 0 && " Data pasangannya tidak ikut terhapus."}
              </p>
            )}
          </div>
        )}
      </Modal>

      {toast && (
        <div className="fade-in fixed inset-x-0 bottom-5 z-[60] flex justify-center px-4" role="status">
          <div
            className={`flex max-w-md items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-[var(--shadow-float)] ${
              toast.ok ? "bg-forest text-parchment" : "bg-red-700 text-white"
            }`}
          >
            {toast.ok ? <CircleCheck className="h-5 w-5 text-gold-bright" /> : <CircleAlert className="h-5 w-5" />}
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}

function ActionBtn({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex h-10 items-center gap-1.5 rounded-full border border-gold/30 bg-white px-3 text-sm font-semibold text-forest hover:border-leaf hover:bg-leaf-pale"
    >
      {icon}
      {label}
    </button>
  );
}
