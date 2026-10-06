export type Gender = "L" | "P" | null;
export type MemberType = "keturunan" | "pasangan" | "bawaan";
export type MarriageStatus = "menikah" | "cerai" | "wafat" | null;

export interface Member {
  id: string;
  full_name: string;
  nickname: string | null;
  gender: Gender;
  /** Hanya dikirim ke admin. Untuk anggota biasa selalu null (tanggal lahir = kunci login). */
  birth_date: string | null;
  birth_year: number | null;
  domicile: string | null;
  is_deceased: boolean;
  photo_url: string | null;
  bio: string | null;
  member_type: MemberType;
  parent_id: string | null;
  co_parent_id: string | null;
  birth_order: number | null;
  hafalan_juz: number | null;
}

export interface Marriage {
  id: string;
  member_id: string;
  spouse_id: string;
  marriage_order: number;
  status: MarriageStatus;
}

export interface FamilyData {
  members: Member[];
  marriages: Marriage[];
}

export type ViewerInfo =
  | { kind: "admin"; email: string }
  | { kind: "member"; memberId: string };

export interface AuditEntry {
  id: number;
  action: string;
  table_name: string;
  summary: string | null;
  created_at: string;
}

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string };
