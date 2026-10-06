import type { Metadata } from "next";
import { redirect } from "next/navigation";
import FamilyExplorer from "@/components/tree/FamilyExplorer";
import { getViewer } from "@/lib/auth";
import { loadFamily } from "@/lib/data";
import { SITE_SUBTITLE, SITE_TITLE } from "@/lib/env";
import { serviceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pohon Keluarga" };

export default async function PohonPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/");

  // Anggota biasa TIDAK menerima tanggal lahir lengkap (kunci login) — hanya tahun.
  const { members, marriages } = await loadFamily(serviceClient(), viewer.kind === "admin");

  return (
    <FamilyExplorer
      data={{ members, marriages }}
      viewer={viewer.kind === "admin" ? { kind: "admin", email: viewer.email } : { kind: "member", memberId: viewer.memberId }}
      title={SITE_TITLE}
      subtitle={SITE_SUBTITLE}
    />
  );
}
