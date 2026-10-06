"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { nameMatches } from "@/lib/names";
import { clearFailures, clientKey, isRateLimited, recordFailure, smallDelay } from "@/lib/rate-limit";
import { clearMemberSession, createMemberSession } from "@/lib/session";
import { serviceClient } from "@/lib/supabase/service";
import { createUserClient } from "@/lib/supabase/server";

export type LoginState = { error?: string; fields?: { name: string; day: string; month: string; year: string } } | undefined;

const GENERIC = "Nama atau tanggal lahir belum cocok. Periksa kembali ejaan nama dan tanggal lahir Anda, atau hubungi admin keluarga.";

function safeEqual(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export async function loginMember(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const name = String(fd.get("name") ?? "").slice(0, 120).trim();
  const day = String(fd.get("day") ?? "");
  const month = String(fd.get("month") ?? "");
  const year = String(fd.get("year") ?? "");
  const code = String(fd.get("code") ?? "").slice(0, 100).trim();
  const fields = { name, day, month, year };

  const d = Number(day), m = Number(month), y = Number(year);
  if (name.length < 2) return { error: "Silakan isi nama lengkap Anda.", fields };
  if (!Number.isInteger(d) || !Number.isInteger(m) || !Number.isInteger(y) || !d || !m || !y)
    return { error: "Silakan pilih tanggal, bulan, dan tahun lahir.", fields };
  const iso = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const check = new Date(iso + "T00:00:00Z");
  if (Number.isNaN(check.getTime()) || check.toISOString().slice(0, 10) !== iso)
    return { error: "Tanggal lahir tidak valid (cek jumlah hari pada bulan tersebut).", fields };

  const key = await clientKey("member-login");
  if (await isRateLimited(key))
    return { error: "Terlalu banyak percobaan login. Demi keamanan, silakan coba lagi 15 menit lagi.", fields };

  const requiredCode = process.env.FAMILY_ACCESS_CODE?.trim();
  if (requiredCode && !safeEqual(code, requiredCode)) {
    await recordFailure(key);
    await smallDelay();
    return { error: "Kode keluarga salah. Tanyakan kode terbaru di grup keluarga.", fields };
  }

  const { data, error } = await serviceClient()
    .from("members")
    .select("id, full_name, nickname")
    .eq("birth_date", iso)
    .limit(50);
  if (error) return { error: "Server sedang bermasalah, coba beberapa saat lagi.", fields };

  const matches = (data ?? []).filter((r) => nameMatches(name, r.full_name, r.nickname));
  await smallDelay();
  if (matches.length !== 1) {
    await recordFailure(key);
    return {
      error: matches.length > 1 ? "Ada lebih dari satu anggota yang cocok. Tulis nama lengkap Anda." : GENERIC,
      fields,
    };
  }

  await clearFailures(key);
  await createMemberSession(matches[0].id);
  redirect("/pohon");
}

export async function logout() {
  await clearMemberSession();
  try {
    const supabase = await createUserClient();
    await supabase.auth.signOut();
  } catch {
    /* abaikan */
  }
  redirect("/");
}
