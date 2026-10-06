/** Konfigurasi publik (aman dibaca di browser). */
export const SITE_TITLE = process.env.NEXT_PUBLIC_SITE_TITLE || "Bani H. Kholid Ismail Noer";
export const SITE_SUBTITLE =
  process.env.NEXT_PUBLIC_SITE_SUBTITLE || "Keluarga Besar Bapatua H. Syafi'i – Matua Juhairiyah";
export const PHOTO_BUCKET = "family-photos";
export const SESSION_COOKIE = "bk_session";

export function supabaseUrl(): string {
  const v = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!v) throw new Error("NEXT_PUBLIC_SUPABASE_URL belum diisi (lihat .env.example)");
  return v;
}
export function supabaseAnonKey(): string {
  const v = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!v) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY belum diisi (lihat .env.example)");
  return v;
}
