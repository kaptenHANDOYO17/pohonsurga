"use client";

import { useMemo, useState, useTransition } from "react";
import { Baby, CircleAlert, HeartHandshake, Loader2, Sprout } from "lucide-react";
import { MemberPicker } from "@/components/ui/MemberPicker";
import { Modal } from "@/components/ui/Modal";
import { childrenOf, generationTitle, spousesOf, type FamilyIndex } from "@/lib/kinship";
import type { Marriage, Member, MemberType } from "@/lib/types";
import { saveMember, uploadPhoto } from "./actions";
import PhotoUploader from "./PhotoUploader";

export interface FormPreset {
  type?: MemberType;
  parentId?: string | null;
  spouseOf?: string | null;
}

const ROLES: { type: MemberType; title: string; desc: string; Icon: typeof Sprout }[] = [
  { type: "keturunan", title: "Anak / Keturunan", desc: "Anak kandung dari anggota keluarga", Icon: Sprout },
  { type: "pasangan", title: "Pasangan / Menantu", desc: "Suami atau istri anggota keluarga", Icon: HeartHandshake },
  { type: "bawaan", title: "Anak Bawaan", desc: "Anak dari pernikahan sebelumnya (anak sambung)", Icon: Baby },
];

const input =
  "w-full rounded-2xl border border-gold/40 bg-white px-4 py-3 text-base outline-none transition focus:border-leaf focus:ring-4 focus:ring-leaf/15";
const label = "mb-1.5 block text-sm font-semibold text-forest";

export default function MemberForm({
  idx,
  marriages,
  editing,
  preset,
  onClose,
  onSaved,
  onPhotoChanged,
}: {
  idx: FamilyIndex;
  marriages: Marriage[];
  editing: Member | null;
  preset: FormPreset;
  onClose: () => void;
  onSaved: (msg: string) => void;
  onPhotoChanged?: (msg: string, ok: boolean) => void;
}) {
  const existingMarriage = editing ? marriages.find((m) => m.spouse_id === editing.id) : undefined;
  const [type, setType] = useState<MemberType>(editing?.member_type ?? preset.type ?? "keturunan");
  const [fullName, setFullName] = useState(editing?.full_name ?? "");
  const [nickname, setNickname] = useState(editing?.nickname ?? "");
  const [gender, setGender] = useState<"L" | "P" | null>(editing?.gender ?? null);
  const [birthDate, setBirthDate] = useState(editing?.birth_date ?? "");
  const [birthYear, setBirthYear] = useState<string>(editing?.birth_date ? "" : editing?.birth_year?.toString() ?? "");
  const [domicile, setDomicile] = useState(editing?.domicile ?? "");
  const [deceased, setDeceased] = useState(editing?.is_deceased ?? false);
  const [bio, setBio] = useState(editing?.bio ?? "");
  const [juz, setJuz] = useState<string>(editing?.hafalan_juz?.toString() ?? "");
  const [parentId, setParentId] = useState<string | null>(editing?.parent_id ?? preset.parentId ?? null);
  const [coParentId, setCoParentId] = useState<string | null>(() => {
    if (editing) return editing.co_parent_id;
    const sp = preset.parentId ? spousesOf(idx, preset.parentId) : [];
    return sp.length === 1 ? sp[0] : null;
  });
  const [birthOrder, setBirthOrder] = useState<string>(() => {
    if (editing?.birth_order) return String(editing.birth_order);
    if (preset.parentId) return String(childrenOf(idx, preset.parentId).length + 1);
    return "";
  });
  const [spouseOf, setSpouseOf] = useState<string | null>(existingMarriage?.member_id ?? preset.spouseOf ?? null);
  const [marriageOrder, setMarriageOrder] = useState<string>(() => {
    if (existingMarriage) return String(existingMarriage.marriage_order);
    if (preset.spouseOf) return String(spousesOf(idx, preset.spouseOf).length + 1);
    return "";
  });
  const [marriageStatus, setMarriageStatus] = useState<string>(existingMarriage?.status ?? "menikah");
  const [pendingPhoto, setPendingPhoto] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  // tidak boleh memilih keturunan sendiri sebagai orang tua
  const forbidden = useMemo(() => {
    const s = new Set<string>();
    if (!editing) return s;
    const walk = (id: string) => {
      s.add(id);
      childrenOf(idx, id).forEach((c) => !s.has(c) && walk(c));
    };
    walk(editing.id);
    return s;
  }, [editing, idx]);

  const parent = parentId ? idx.byId.get(parentId) : undefined;
  const parentSpouses = parentId ? spousesOf(idx, parentId) : [];

  const onParentChange = (id: string | null) => {
    setParentId(id);
    const sp = id ? spousesOf(idx, id) : [];
    setCoParentId(type === "keturunan" && sp.length === 1 ? sp[0] : null);
    if (id && !editing) setBirthOrder(String(childrenOf(idx, id).length + 1));
  };
  const onSpouseOfChange = (id: string | null) => {
    setSpouseOf(id);
    if (id && !existingMarriage) setMarriageOrder(String(spousesOf(idx, id).length + 1));
  };

  const preview = useMemo(() => {
    const nm = fullName.trim() || "Anggota ini";
    const n = (id: string | null) => (id ? idx.byId.get(id)?.full_name : undefined);
    if (type === "pasangan") {
      if (!spouseOf) return null;
      const role = gender === "P" ? "istri" : gender === "L" ? "suami" : "pasangan";
      return `${nm} akan tercatat sebagai ${role} dari ${n(spouseOf)} (${generationTitle(idx.depth.get(spouseOf) ?? 0)}).`;
    }
    if (!parentId) return type === "keturunan" ? `${nm} akan menjadi akar/leluhur baru (tanpa orang tua).` : null;
    const ps = [n(parentId), n(coParentId)].filter(Boolean).join(" & ");
    const ord = birthOrder ? `anak ke-${birthOrder}` : "anak";
    const gen = generationTitle((idx.depth.get(parentId) ?? 0) + 1);
    return type === "bawaan"
      ? `${nm} akan tercatat sebagai anak bawaan (${ord}) dari ${ps} — ${gen}.`
      : `${nm} akan tercatat sebagai ${ord} dari ${ps} — ${gen}.`;
  }, [fullName, type, spouseOf, parentId, coParentId, birthOrder, gender, idx]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startSaving(async () => {
      const res = await saveMember({
        id: editing?.id ?? null,
        full_name: fullName,
        nickname,
        gender,
        birth_date: birthDate || null,
        birth_year: !birthDate && birthYear ? Number(birthYear) : null,
        domicile,
        is_deceased: deceased,
        bio,
        member_type: type,
        parent_id: type === "pasangan" ? null : parentId,
        co_parent_id: type === "keturunan" ? coParentId : null,
        birth_order: type === "pasangan" || !birthOrder ? null : Number(birthOrder),
        hafalan_juz: juz ? Number(juz) : null,
        spouse_of: type === "pasangan" ? spouseOf : null,
        marriage_order: type === "pasangan" && marriageOrder ? Number(marriageOrder) : null,
        marriage_status: type === "pasangan" ? ((marriageStatus || null) as "menikah" | "cerai" | "wafat" | null) : null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      let msg = res.message ?? "Tersimpan.";
      if (!editing && pendingPhoto && res.data?.id) {
        const fd = new FormData();
        fd.append("memberId", res.data.id);
        fd.append("photo", pendingPhoto, pendingPhoto.type === "image/webp" ? "foto.webp" : "foto.jpg");
        const up = await uploadPhoto(fd);
        msg += up.ok ? " Foto juga tersimpan." : ` (Foto gagal: ${up.error})`;
      }
      onSaved(msg);
    });
  };

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={editing ? `Edit: ${editing.full_name}` : "Tambah anggota keluarga"}
      footer={
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full px-5 py-2.5 text-sm font-semibold text-ink-soft hover:bg-parchment">
            Batal
          </button>
          <button
            form="member-form"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-forest px-6 py-2.5 text-sm font-bold text-parchment shadow hover:bg-forest-deep disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editing ? "Simpan perubahan" : "Tambahkan"}
          </button>
        </div>
      }
    >
      <form id="member-form" onSubmit={submit} className="space-y-6 pb-2">
        {/* 1. Peran */}
        <section>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-gold">1 · Sebagai apa dia di keluarga?</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {ROLES.map(({ type: t, title, desc, Icon }) => (
              <button
                type="button"
                key={t}
                onClick={() => setType(t)}
                className={`rounded-2xl border p-3 text-left transition ${
                  type === t ? "border-forest bg-leaf-pale shadow-[0_0_0_3px_rgba(61,124,58,0.2)]" : "border-gold/30 bg-white hover:border-leaf"
                }`}
                aria-pressed={type === t}
              >
                <Icon className={`h-5 w-5 ${type === t ? "text-forest" : "text-gold"}`} />
                <p className="mt-1 text-sm font-bold">{title}</p>
                <p className="text-xs text-ink-soft">{desc}</p>
              </button>
            ))}
          </div>
        </section>

        {/* 2. Hubungan */}
        <section className="rounded-3xl border border-gold/25 bg-white/60 p-4">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-gold">2 · Hubungannya ke siapa?</h3>
          {type === "pasangan" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_120px_160px]">
              <div>
                <label className={label}>Pasangan dari *</label>
                <MemberPicker
                  idx={idx}
                  value={spouseOf}
                  onChange={onSpouseOfChange}
                  filter={(m) => m.member_type !== "pasangan" && m.id !== editing?.id}
                  placeholder="Pilih suami / istrinya…"
                />
              </div>
              <div>
                <label className={label} htmlFor="morder">Pernikahan ke-</label>
                <input id="morder" type="number" min={1} max={10} value={marriageOrder} onChange={(e) => setMarriageOrder(e.target.value)} className={input} />
              </div>
              <div>
                <label className={label} htmlFor="mstatus">Status</label>
                <select id="mstatus" value={marriageStatus} onChange={(e) => setMarriageStatus(e.target.value)} className={input}>
                  <option value="menikah">Menikah</option>
                  <option value="wafat">Berpisah (wafat)</option>
                  <option value="cerai">Bercerai</option>
                  <option value="">Tidak dicantumkan</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_110px]">
              <div>
                <label className={label}>{type === "bawaan" ? "Anak dari (orang tua kandungnya) *" : "Anak dari"}</label>
                <MemberPicker
                  idx={idx}
                  value={parentId}
                  onChange={onParentChange}
                  filter={(m) => !forbidden.has(m.id) && (type === "bawaan" || m.member_type !== "pasangan")}
                  allowNone={type === "keturunan"}
                  noneLabel="— Tidak ada (akar / leluhur) —"
                  placeholder={type === "bawaan" ? "Pilih ayah/ibu kandungnya…" : "Pilih ayah/ibu dari garis keluarga…"}
                />
              </div>
              {type === "keturunan" && (
                <div>
                  <label className={label} htmlFor="coparent">Dengan pasangan (ayah/ibu lainnya)</label>
                  <select
                    id="coparent"
                    value={coParentId ?? ""}
                    onChange={(e) => setCoParentId(e.target.value || null)}
                    disabled={!parent}
                    className={input}
                  >
                    <option value="">{parent ? "— Tidak dicantumkan —" : "Pilih orang tua dulu"}</option>
                    {parentSpouses.map((s) => (
                      <option key={s} value={s}>
                        {idx.byId.get(s)?.full_name}
                      </option>
                    ))}
                  </select>
                  {parent && !parentSpouses.length && (
                    <p className="mt-1 text-xs text-ink-soft">Pasangan {parent.full_name} belum dicatat. Tambahkan lewat “Pasangan / Menantu”.</p>
                  )}
                </div>
              )}
              <div className={type === "bawaan" ? "sm:col-span-2 sm:max-w-[140px]" : ""}>
                <label className={label} htmlFor="order">Anak ke-</label>
                <input id="order" type="number" min={1} max={60} value={birthOrder} onChange={(e) => setBirthOrder(e.target.value)} className={input} />
              </div>
            </div>
          )}
          {preview && (
            <p className="mt-3 rounded-2xl bg-leaf-pale/70 px-4 py-2.5 text-sm text-forest">
              <b>Pratinjau:</b> {preview}
            </p>
          )}
        </section>

        {/* 3. Data diri */}
        <section>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-gold">3 · Data diri</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={label} htmlFor="fn">Nama lengkap (boleh dengan gelar) *</label>
              <input id="fn" required minLength={2} maxLength={120} value={fullName} onChange={(e) => setFullName(e.target.value)} className={input} placeholder="mis. H. Abdul Aziz, SE" />
            </div>
            <div>
              <label className={label} htmlFor="nick">Nama panggilan</label>
              <input id="nick" maxLength={40} value={nickname} onChange={(e) => setNickname(e.target.value)} className={input} placeholder="mis. Aziz" />
            </div>
            <div>
              <span className={label}>Jenis kelamin</span>
              <div className="grid grid-cols-3 gap-1 rounded-2xl border border-gold/40 bg-white p-1">
                {([["L", "Laki-laki"], ["P", "Perempuan"], [null, "—"]] as const).map(([v, t]) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setGender(v)}
                    className={`rounded-xl py-2 text-sm font-semibold ${gender === v ? "bg-forest text-parchment" : "text-ink-soft hover:bg-parchment"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={label} htmlFor="bd">Tanggal lahir</label>
              <input id="bd" type="date" value={birthDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setBirthDate(e.target.value)} className={input} />
              <p className="mt-1 text-xs text-ink-soft">Dipakai anggota untuk login (bersama nama). Tidak ditampilkan ke anggota lain.</p>
            </div>
            <div>
              <label className={label} htmlFor="by">Tahun lahir (jika tanggal tidak diketahui)</label>
              <input id="by" type="number" min={1800} max={2200} disabled={!!birthDate} value={birthDate ? birthDate.slice(0, 4) : birthYear} onChange={(e) => setBirthYear(e.target.value)} className={input} />
            </div>
            <div>
              <label className={label} htmlFor="dom">Domisili (kota / kecamatan)</label>
              <input id="dom" maxLength={80} value={domicile} onChange={(e) => setDomicile(e.target.value)} className={input} placeholder="mis. Slawi, Tegal" />
            </div>
            <div>
              <span className={label}>Status</span>
              <div className="grid grid-cols-2 gap-1 rounded-2xl border border-gold/40 bg-white p-1">
                <button type="button" onClick={() => setDeceased(false)} className={`rounded-xl py-2 text-sm font-semibold ${!deceased ? "bg-leaf text-white" : "text-ink-soft hover:bg-parchment"}`}>
                  🌿 Masih hidup
                </button>
                <button type="button" onClick={() => setDeceased(true)} className={`rounded-xl py-2 text-sm font-semibold ${deceased ? "bg-dry text-white" : "text-ink-soft hover:bg-parchment"}`}>
                  🍂 Sudah wafat
                </button>
              </div>
            </div>
            <div>
              <label className={label} htmlFor="juz">Hafalan Al-Qur&apos;an (juz)</label>
              <input id="juz" type="number" min={0} max={30} value={juz} onChange={(e) => setJuz(e.target.value)} className={input} placeholder="0" />
            </div>
            <div className="sm:col-span-2">
              <label className={label} htmlFor="bio">Cerita singkat</label>
              <textarea id="bio" rows={3} maxLength={1500} value={bio} onChange={(e) => setBio(e.target.value)} className={input} placeholder="Riwayat, pekerjaan, kenangan, prestasi…" />
            </div>
          </div>
        </section>

        {/* 4. Foto */}
        <section>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-gold">4 · Foto</h3>
          <PhotoUploader
            memberId={editing?.id ?? null}
            name={fullName}
            currentUrl={editing?.photo_url ?? null}
            deceased={deceased}
            onPending={setPendingPhoto}
            onChanged={onPhotoChanged}
          />
        </section>

        {error && (
          <div role="alert" className="flex gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </div>
        )}
      </form>
    </Modal>
  );
}
