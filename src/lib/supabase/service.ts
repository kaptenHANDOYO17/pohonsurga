import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl } from "../env";

let cached: SupabaseClient | null = null;

/**
 * Klien SERVICE ROLE — melewati RLS. HANYA dipakai di server setelah
 * pemeriksaan otorisasi (sesi anggota / admin) sudah lolos.
 */
export function serviceClient(): SupabaseClient {
  if (cached) return cached;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY belum diisi (lihat .env.example)");
  cached = createClient(supabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return cached;
}
