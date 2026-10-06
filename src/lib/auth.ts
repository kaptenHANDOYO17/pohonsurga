import "server-only";
import { redirect } from "next/navigation";
import { createUserClient } from "./supabase/server";
import { serviceClient } from "./supabase/service";
import { readMemberSession } from "./session";

export type Viewer =
  | { kind: "admin"; userId: string; email: string }
  | { kind: "member"; memberId: string; name: string };

/** Admin = user Supabase Auth yang terdaftar di tabel public.admins */
export async function getAdmin(): Promise<{ userId: string; email: string } | null> {
  try {
    const supabase = await createUserClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    const { data: isAdmin, error } = await supabase.rpc("is_admin");
    if (error || isAdmin !== true) return null;
    return { userId: data.user.id, email: data.user.email ?? "" };
  } catch {
    return null;
  }
}

export async function getViewer(): Promise<Viewer | null> {
  const admin = await getAdmin();
  if (admin) return { kind: "admin", ...admin };
  const memberId = await readMemberSession();
  if (!memberId) return null;
  // pastikan anggota masih ada (mis. belum dihapus admin)
  const { data } = await serviceClient().from("members").select("id, full_name").eq("id", memberId).maybeSingle();
  if (!data) return null;
  return { kind: "member", memberId: data.id, name: data.full_name };
}

export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
