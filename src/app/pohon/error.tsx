"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="islamic-pattern grid h-dvh place-items-center p-6 text-center">
      <div className="max-w-md">
        <h1 className="font-display text-2xl text-forest">Gagal memuat pohon keluarga</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Periksa koneksi internet, atau pastikan database Supabase sudah disiapkan (01_schema.sql &amp; 02_seed.sql).
        </p>
        {error.digest && <p className="mt-2 font-mono text-xs text-ink-soft">Kode: {error.digest}</p>}
        <button onClick={reset} className="mt-5 rounded-full bg-forest px-6 py-3 font-semibold text-parchment">
          Coba lagi
        </button>
      </div>
    </div>
  );
}
