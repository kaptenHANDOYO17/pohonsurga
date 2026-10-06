import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { loadFamily } from "@/lib/data";
import { SITE_TITLE } from "@/lib/env";
import { createUserClient } from "@/lib/supabase/server";
import type { AuditEntry } from "@/lib/types";
import AdminDashboard, { type AdminIntent } from "./AdminDashboard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const one = (v: string | string[] | undefined) => (typeof v === "string" && UUID.test(v) ? v : null);

export default async function AdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireAdmin();
  // klien atas nama admin → RLS tetap memeriksa hak admin di database
  const db = await createUserClient();
  const [{ members, marriages }, logsRes] = await Promise.all([
    loadFamily(db, true),
    db.from("audit_logs").select("id, action, table_name, summary, created_at").order("created_at", { ascending: false }).limit(30),
  ]);

  const sp = await searchParams;
  const n = sp.new;
  const intent: AdminIntent = {
    edit: one(sp.edit),
    newType: n === "anak" || n === "pasangan" || n === "bawaan" ? n : n !== undefined ? "anak" : null,
    parent: one(sp.parent),
    of: one(sp.of),
  };

  return (
    <AdminDashboard
      data={{ members, marriages }}
      email={admin.email}
      logs={(logsRes.data ?? []) as AuditEntry[]}
      intent={intent}
      title={SITE_TITLE}
    />
  );
}
