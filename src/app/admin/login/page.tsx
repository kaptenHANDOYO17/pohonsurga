import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { ConfigWarning } from "@/components/ui/ConfigWarning";
import { Divider } from "@/components/ui/Ornaments";
import { getAdmin } from "@/lib/auth";
import { missingConfig } from "@/lib/config-status";
import AdminLoginForm from "./AdminLoginForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Login Admin" };

export default async function AdminLoginPage() {
  const missing = missingConfig();
  if (!missing.length && (await getAdmin())) redirect("/admin");
  return (
    <main className="islamic-pattern grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <ConfigWarning missing={missing} />
        <div className="arch border border-gold/30 bg-white/85 px-6 pb-8 pt-12 shadow-[var(--shadow-float)] sm:px-9">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-forest text-gold-bright shadow-lg">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-center font-display text-2xl text-forest">Ruang Admin</h1>
          <p className="mt-1 text-center text-sm text-ink-soft">Khusus pengelola data silsilah keluarga.</p>
          <Divider className="my-6" />
          <AdminLoginForm />
        </div>
        <p className="mt-6 text-center text-xs text-ink-soft">
          <Link href="/" className="font-semibold text-forest hover:underline">
            ← Kembali ke halaman anggota
          </Link>
        </p>
      </div>
    </main>
  );
}
