import Link from "next/link";
import { LeafIcon } from "@/components/ui/Ornaments";

export default function NotFound() {
  return (
    <main className="islamic-pattern grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <LeafIcon dry className="mx-auto h-14 w-14" />
        <h1 className="mt-4 font-display text-3xl text-forest">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-ink-soft">Daun yang Anda cari mungkin sudah gugur dari dahannya.</p>
        <Link href="/" className="mt-6 inline-block rounded-full bg-forest px-6 py-3 font-semibold text-parchment">
          Kembali ke beranda
        </Link>
      </div>
    </main>
  );
}
