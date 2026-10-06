import Link from "next/link";
import { redirect } from "next/navigation";
import { Bismillah, Divider, LeafIcon, Logo, TreeIllustration } from "@/components/ui/Ornaments";
import { ConfigWarning } from "@/components/ui/ConfigWarning";
import { getViewer } from "@/lib/auth";
import { missingConfig } from "@/lib/config-status";
import { SITE_SUBTITLE, SITE_TITLE } from "@/lib/env";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const missing = missingConfig();
  if (!missing.length) {
    const viewer = await getViewer();
    if (viewer) redirect("/pohon");
  }
  const needCode = !!process.env.FAMILY_ACCESS_CODE?.trim();

  return (
    <main className="min-h-dvh lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* ---------- Panel hero ---------- */}
      <section className="islamic-pattern-dark relative overflow-hidden px-6 pb-10 pt-8 text-parchment lg:min-h-dvh lg:px-12 lg:py-12">
        {[12, 38, 64, 86].map((left, i) => (
          <span key={left} className="float-leaf pointer-events-none absolute top-0" style={{ left: `${left}%`, animationDelay: `${i * 2.3}s` }}>
            <LeafIcon dry={i % 2 === 1} className="h-5 w-5 opacity-70" />
          </span>
        ))}
        <div className="relative mx-auto flex max-w-xl flex-col items-center text-center lg:h-full lg:justify-center">
          <Bismillah className="text-2xl text-gold-bright sm:text-3xl" />
          <TreeIllustration className="mt-4 h-44 w-auto drop-shadow-[0_10px_30px_rgba(0,0,0,0.35)] sm:h-56 lg:mt-8 lg:h-80" />
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.35em] text-gold-bright/90">Silsilah Keluarga Besar</p>
          <h1 className="mt-2 font-display text-3xl leading-tight sm:text-4xl lg:text-5xl">{SITE_TITLE}</h1>
          <p className="mt-3 max-w-md text-sm text-parchment/80 sm:text-base">{SITE_SUBTITLE}</p>
          <div className="mt-8 hidden w-full max-w-md lg:block">
            <Divider />
            <p className="mt-5 font-arabic text-2xl leading-loose text-gold-pale" lang="ar" dir="rtl">
              رَبِّ اجْعَلْنِي مُقِيمَ الصَّلَاةِ وَمِنْ ذُرِّيَّتِي ۚ رَبَّنَا وَتَقَبَّلْ دُعَاءِ
            </p>
            <p className="mt-2 text-sm italic text-parchment/75">
              “Ya Tuhanku, jadikanlah aku dan anak cucuku orang yang tetap mendirikan salat. Ya Tuhan kami, perkenankanlah doaku.”
              <span className="not-italic text-gold-bright"> — QS. Ibrahim: 40</span>
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Panel login ---------- */}
      <section className="islamic-pattern flex items-start justify-center px-4 py-8 sm:px-6 lg:items-center lg:py-12">
        <div className="w-full max-w-md">
          <ConfigWarning missing={missing} />
          <div className="arch relative border border-gold/30 bg-white/80 px-6 pb-8 pt-12 shadow-[var(--shadow-float)] sm:px-9">
            <Logo className="absolute -top-7 left-1/2 h-14 w-14 -translate-x-1/2 drop-shadow" />
            <h2 className="text-center font-display text-2xl text-forest sm:text-3xl">Assalamu&apos;alaikum</h2>
            <p className="mt-2 text-center text-sm text-ink-soft">
              Masuk dengan <b>nama</b> dan <b>tanggal lahir</b> Anda untuk melihat pohon keluarga dan hubungan kekerabatan Anda.
            </p>
            <Divider className="my-6" />
            <LoginForm needCode={needCode} />
          </div>
          <p className="mt-6 text-center text-xs text-ink-soft">
            Mengelola data keluarga?{" "}
            <Link href="/admin/login" className="font-semibold text-forest underline-offset-4 hover:underline">
              Masuk sebagai admin
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
