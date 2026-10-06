export function ConfigWarning({ missing }: { missing: string[] }) {
  if (!missing.length) return null;
  return (
    <div className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-semibold">Konfigurasi belum lengkap</p>
      <p className="mt-1">Isi variabel berikut di <code>.env.local</code> (lokal) atau Environment Variables di Vercel:</p>
      <ul className="mt-2 list-inside list-disc font-mono text-xs">
        {missing.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
    </div>
  );
}
