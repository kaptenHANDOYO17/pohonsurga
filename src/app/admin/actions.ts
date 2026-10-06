"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import { PHOTO_BUCKET } from "@/lib/env";
import { clearFailures, clientKey, isRateLimited, recordFailure, smallDelay } from "@/lib/rate-limit";
import { createUserClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { firstIssue, memberInputSchema, uuidSchema, type MemberInput } from "@/lib/validation";

/* ============================ LOGIN ADMIN ============================ */

export type AdminLoginState = { error?: string; email?: string } | undefined;

export async function adminSignIn(_prev: AdminLoginState, fd: FormData): Promise<AdminLoginState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const password = String(fd.get("password") ?? "").slice(0, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 6)
    return { error: "Isi email dan password dengan benar.", email };

  const key = await clientKey("admin-login");
  if (await isRateLimited(key)) return { error: "Terlalu banyak percobaan. Coba lagi 15 menit lagi.", email };

  const supabase = await createUserClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    await recordFailure(key);
    await smallDelay();
    return { error: "Email atau password salah.", email };
  }
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) {
    await supabase.auth.signOut();
    await recordFailure(key);
    return { error: "Akun ini bukan admin. Hubungi pengelola website.", email };
  }
  await clearFailures(key);
  redirect("/admin");
}

export async function adminSignOut() {
  const supabase = await createUserClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

/* ============================ HELPER ============================ */

async function adminDb() {
  const admin = await getAdmin();
  if (!admin) return null;
  return createUserClient();
}

function dbError(e: { code?: string; message?: string } | null | undefined): string {
  if (!e) return "Terjadi kesalahan.";
  if (e.code === "23503") return "Data masih terhubung dengan anggota lain (mis. masih memiliki anak).";
  if (e.code === "23505") return "Data yang sama sudah ada.";
  if (e.code === "23514") return "Ada isian yang tidak memenuhi aturan (cek panjang teks / angka).";
  if (e.code === "42501") return "Akses ditolak. Pastikan Anda login sebagai admin.";
  if (e.message?.includes("melingkar")) return e.message;
  return "Gagal menyimpan: " + (e.message ?? "kesalahan tidak dikenal");
}

function refresh() {
  revalidatePath("/pohon");
  revalidatePath("/admin");
}

/* ============================ SIMPAN ANGGOTA ============================ */

export async function saveMember(input: MemberInput): Promise<ActionResult<{ id: string }>> {
  const db = await adminDb();
  if (!db) return { ok: false, error: "Sesi admin berakhir. Silakan login ulang." };

  const parsed = memberInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const v = parsed.data;

  // --- validasi relasi ---
  const refIds = [v.parent_id, v.co_parent_id, v.spouse_of].filter((x): x is string => !!x);
  const refs = new Map<string, { id: string; member_type: string; full_name: string }>();
  if (refIds.length) {
    const { data, error } = await db.from("members").select("id, member_type, full_name").in("id", refIds);
    if (error) return { ok: false, error: dbError(error) };
    for (const r of data ?? []) refs.set(r.id, r);
  }
  for (const r of refIds) if (!refs.has(r)) return { ok: false, error: "Anggota yang dipilih sebagai relasi tidak ditemukan." };

  const isSpouse = v.member_type === "pasangan";
  if (isSpouse && v.spouse_of && refs.get(v.spouse_of)?.member_type === "pasangan")
    return { ok: false, error: "Pilih anggota garis keluarga (bukan sesama menantu) sebagai pasangannya." };
  if (v.member_type === "keturunan" && v.parent_id && refs.get(v.parent_id)?.member_type === "pasangan" && !v.co_parent_id)
    return {
      ok: false,
      error: "Orang tua yang dipilih adalah menantu. Untuk anak kandung, pilih orang tua dari garis keluarga; untuk anak dari pernikahan sebelumnya pilih jenis 'Anak Bawaan'.",
    };

  let previousType: string | null = null;
  if (v.id) {
    const { data: prev, error } = await db.from("members").select("member_type").eq("id", v.id).maybeSingle();
    if (error) return { ok: false, error: dbError(error) };
    if (!prev) return { ok: false, error: "Anggota tidak ditemukan." };
    previousType = prev.member_type;
  }

  const row = {
    full_name: v.full_name,
    nickname: v.nickname,
    gender: v.gender,
    birth_date: v.birth_date,
    birth_year: v.birth_date ? Number(v.birth_date.slice(0, 4)) : v.birth_year,
    domicile: v.domicile,
    is_deceased: v.is_deceased,
    bio: v.bio,
    member_type: v.member_type,
    parent_id: isSpouse ? null : v.parent_id,
    co_parent_id: isSpouse ? null : v.co_parent_id,
    birth_order: isSpouse ? null : v.birth_order,
    hafalan_juz: v.hafalan_juz,
  };

  let id = v.id ?? null;
  if (id) {
    const { error } = await db.from("members").update(row).eq("id", id);
    if (error) return { ok: false, error: dbError(error) };
  } else {
    const { data, error } = await db.from("members").insert(row).select("id").single();
    if (error || !data) return { ok: false, error: dbError(error) };
    id = data.id as string;
  }

  // --- pernikahan ---
  if (isSpouse && v.spouse_of) {
    const { data: existing, error } = await db.from("marriages").select("id, member_id").eq("spouse_id", id);
    if (error) return { ok: false, error: dbError(error) };
    let order = v.marriage_order;
    if (!order) {
      const { data: others } = await db.from("marriages").select("spouse_id").eq("member_id", v.spouse_of);
      order = Math.min(10, (others ?? []).filter((o) => o.spouse_id !== id).length + 1);
    }
    const payload = { member_id: v.spouse_of, spouse_id: id, marriage_order: order, status: v.marriage_status };
    const res = existing && existing.length
      ? await db.from("marriages").update(payload).eq("id", existing[0].id)
      : await db.from("marriages").insert(payload);
    if (res.error) return { ok: false, error: dbError(res.error) };
  } else if (previousType === "pasangan" && !isSpouse) {
    await db.from("marriages").delete().eq("spouse_id", id);
  }

  refresh();
  return { ok: true, data: { id }, message: v.id ? "Data berhasil diperbarui." : "Anggota baru berhasil ditambahkan." };
}

/* ============================ HAPUS ANGGOTA ============================ */

export async function deleteMember(id: string): Promise<ActionResult> {
  const db = await adminDb();
  if (!db) return { ok: false, error: "Sesi admin berakhir. Silakan login ulang." };
  if (!uuidSchema.safeParse(id).success) return { ok: false, error: "ID tidak valid." };

  const { count } = await db.from("members").select("id", { count: "exact", head: true }).eq("parent_id", id);
  if ((count ?? 0) > 0)
    return {
      ok: false,
      error: `Tidak bisa dihapus: masih memiliki ${count} anak di pohon. Hapus atau pindahkan anak-anaknya terlebih dahulu.`,
    };

  const { data: m } = await db.from("members").select("photo_path").eq("id", id).maybeSingle();
  const { error } = await db.from("members").delete().eq("id", id);
  if (error) return { ok: false, error: dbError(error) };
  if (m?.photo_path) await db.storage.from(PHOTO_BUCKET).remove([m.photo_path]);
  refresh();
  return { ok: true, message: "Anggota telah dihapus." };
}

/* ============================ PERNIKAHAN ============================ */

export async function updateMarriage(
  marriageId: string,
  status: "menikah" | "cerai" | "wafat" | null,
  order: number,
): Promise<ActionResult> {
  const db = await adminDb();
  if (!db) return { ok: false, error: "Sesi admin berakhir. Silakan login ulang." };
  if (!uuidSchema.safeParse(marriageId).success) return { ok: false, error: "ID tidak valid." };
  if (status !== null && !["menikah", "cerai", "wafat"].includes(status)) return { ok: false, error: "Status tidak valid." };
  if (!Number.isInteger(order) || order < 1 || order > 10) return { ok: false, error: "Urutan tidak valid." };
  const { error } = await db.from("marriages").update({ status, marriage_order: order }).eq("id", marriageId);
  if (error) return { ok: false, error: dbError(error) };
  refresh();
  return { ok: true };
}

/* ============================ FOTO (maks. 1 per anggota) ============================ */

const MAX_BYTES = 2 * 1024 * 1024;

function sniffImage(buf: Uint8Array): { mime: string; ext: string } | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { mime: "image/png", ext: "png" };
  const ascii = (a: number, b: number) => String.fromCharCode(...buf.slice(a, b));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { mime: "image/webp", ext: "webp" };
  return null;
}

export async function uploadPhoto(fd: FormData): Promise<ActionResult<{ url: string | null }>> {
  const db = await adminDb();
  if (!db) return { ok: false, error: "Sesi admin berakhir. Silakan login ulang." };

  const id = String(fd.get("memberId") ?? "");
  const file = fd.get("photo");
  if (!uuidSchema.safeParse(id).success) return { ok: false, error: "Anggota tidak valid." };
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Pilih file foto terlebih dahulu." };
  if (file.size > MAX_BYTES) return { ok: false, error: "Ukuran foto maksimal 2 MB." };

  const buf = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(buf);
  if (!kind) return { ok: false, error: "Format foto harus JPG, PNG, atau WEBP." };

  const { data: m, error: findErr } = await db.from("members").select("photo_path").eq("id", id).maybeSingle();
  if (findErr) return { ok: false, error: dbError(findErr) };
  if (!m) return { ok: false, error: "Anggota tidak ditemukan." };

  const path = `${id}/${Date.now()}.${kind.ext}`;
  const up = await db.storage.from(PHOTO_BUCKET).upload(path, buf, {
    contentType: kind.mime,
    upsert: false,
    cacheControl: "31536000",
  });
  if (up.error) return { ok: false, error: "Gagal mengunggah foto: " + up.error.message };

  const { error: updErr } = await db.from("members").update({ photo_path: path }).eq("id", id);
  if (updErr) {
    await db.storage.from(PHOTO_BUCKET).remove([path]);
    return { ok: false, error: dbError(updErr) };
  }
  // hanya 1 foto per anggota: hapus foto lama
  if (m.photo_path && m.photo_path !== path) await db.storage.from(PHOTO_BUCKET).remove([m.photo_path]);

  const { data: signed } = await db.storage.from(PHOTO_BUCKET).createSignedUrl(path, 60 * 60 * 6);
  refresh();
  return { ok: true, data: { url: signed?.signedUrl ?? null }, message: "Foto berhasil disimpan." };
}

export async function removePhoto(id: string): Promise<ActionResult> {
  const db = await adminDb();
  if (!db) return { ok: false, error: "Sesi admin berakhir. Silakan login ulang." };
  if (!uuidSchema.safeParse(id).success) return { ok: false, error: "ID tidak valid." };
  const { data: m } = await db.from("members").select("photo_path").eq("id", id).maybeSingle();
  if (!m?.photo_path) return { ok: true };
  const { error } = await db.from("members").update({ photo_path: null }).eq("id", id);
  if (error) return { ok: false, error: dbError(error) };
  await db.storage.from(PHOTO_BUCKET).remove([m.photo_path]);
  refresh();
  return { ok: true, message: "Foto dihapus." };
}
