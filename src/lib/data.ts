import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PHOTO_BUCKET } from "./env";
import type { FamilyData, Marriage, Member } from "./types";

const COLS =
  "id, full_name, nickname, gender, birth_date, birth_year, domicile, is_deceased, photo_path, bio, member_type, parent_id, co_parent_id, birth_order, hafalan_juz";

type Row = Omit<Member, "photo_url"> & { photo_path: string | null };

/**
 * Memuat seluruh anggota + pernikahan.
 * includePrivate=false → tanggal lahir lengkap TIDAK dikirim ke browser
 * (karena tanggal lahir dipakai sebagai kunci login).
 */
export async function loadFamily(db: SupabaseClient, includePrivate: boolean): Promise<FamilyData & { photoPaths: Record<string, string> }> {
  const [mem, mar] = await Promise.all([
    db.from("members").select(COLS).order("birth_date", { ascending: true, nullsFirst: true }).range(0, 9999),
    db.from("marriages").select("id, member_id, spouse_id, marriage_order, status").range(0, 9999),
  ]);
  if (mem.error) throw new Error("Gagal memuat anggota: " + mem.error.message);
  if (mar.error) throw new Error("Gagal memuat pernikahan: " + mar.error.message);
  const rows = (mem.data ?? []) as Row[];

  const paths = rows.map((r) => r.photo_path).filter((p): p is string => !!p);
  const urlByPath = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await db.storage.from(PHOTO_BUCKET).createSignedUrls(paths, 60 * 60 * 6);
    for (const s of signed ?? []) if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
  }

  const photoPaths: Record<string, string> = {};
  const members: Member[] = rows.map((r) => {
    if (r.photo_path) photoPaths[r.id] = r.photo_path;
    return {
      id: r.id,
      full_name: r.full_name,
      nickname: r.nickname,
      gender: r.gender,
      birth_date: includePrivate ? r.birth_date : null,
      birth_year: r.birth_year,
      domicile: r.domicile,
      is_deceased: r.is_deceased,
      photo_url: r.photo_path ? urlByPath.get(r.photo_path) ?? null : null,
      bio: r.bio,
      member_type: r.member_type,
      parent_id: r.parent_id,
      co_parent_id: r.co_parent_id,
      birth_order: r.birth_order,
      hafalan_juz: r.hafalan_juz,
    };
  });
  return { members, marriages: (mar.data ?? []) as Marriage[], photoPaths: includePrivate ? photoPaths : {} };
}
