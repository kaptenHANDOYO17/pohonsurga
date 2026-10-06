import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { serviceClient } from "./supabase/service";

const WINDOW_MIN = 15;
const MAX_FAILURES = 8;

/** Hash IP (bukan IP mentah) agar log percobaan login tidak menyimpan data pribadi. */
export async function clientKey(scope: string): Promise<string> {
  const h = await headers();
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return createHash("sha256")
    .update(`${scope}|${ip}|${process.env.SESSION_SECRET ?? ""}`)
    .digest("hex")
    .slice(0, 40);
}

export async function isRateLimited(key: string): Promise<boolean> {
  const db = serviceClient();
  const since = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString();
  const { count } = await db
    .from("login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", key)
    .gte("created_at", since);
  return (count ?? 0) >= MAX_FAILURES;
}

export async function recordFailure(key: string) {
  const db = serviceClient();
  await db.from("login_attempts").insert({ ip_hash: key });
  // bersih-bersih log lama (>1 hari) sesekali
  if (Math.random() < 0.05) {
    await db.from("login_attempts").delete().lt("created_at", new Date(Date.now() - 86_400_000).toISOString());
  }
}

export async function clearFailures(key: string) {
  await serviceClient().from("login_attempts").delete().eq("ip_hash", key);
}

/** Jeda kecil agar respons gagal/sukses tidak mudah dibedakan dari waktunya. */
export const smallDelay = () => new Promise((r) => setTimeout(r, 350 + Math.random() * 250));
