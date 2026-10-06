"use client";

import { useActionState, useMemo } from "react";
import { CircleAlert, KeyRound, Loader2 } from "lucide-react";
import { loginMember, type LoginState } from "./actions/auth";

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export default function LoginForm({ needCode }: { needCode: boolean }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginMember, undefined);
  const years = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: now - 1899 }, (_, i) => now - i);
  }, []);
  const f = state?.fields;
  const selectCls =
    "h-14 w-full appearance-none rounded-2xl border border-gold/40 bg-parchment/60 px-3 text-base font-medium text-ink outline-none transition focus:border-leaf focus:bg-white focus:ring-4 focus:ring-leaf/15";

  return (
    <form action={action} className="space-y-5" noValidate>
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-semibold text-forest">
          Nama lengkap
        </label>
        <input
          id="name"
          name="name"
          required
          autoComplete="name"
          defaultValue={f?.name}
          placeholder="mis. Slamet Saiful Muslimin"
          className="h-14 w-full rounded-2xl border border-gold/40 bg-parchment/60 px-4 text-lg text-ink outline-none transition placeholder:text-ink-soft/50 focus:border-leaf focus:bg-white focus:ring-4 focus:ring-leaf/15"
        />
        <p className="mt-1 text-xs text-ink-soft">Gelar (H., Hj., Drs., S.E., dst.) tidak perlu ditulis. Nama panggilan juga bisa.</p>
      </div>

      <fieldset>
        <legend className="mb-1.5 block text-sm font-semibold text-forest">Tanggal lahir</legend>
        <div className="grid grid-cols-[0.8fr_1.4fr_1fr] gap-2">
          <select name="day" aria-label="Tanggal" defaultValue={f?.day ?? ""} className={selectCls} required>
            <option value="" disabled>
              Tgl
            </option>
            {Array.from({ length: 31 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {String(i + 1).padStart(2, "0")}
              </option>
            ))}
          </select>
          <select name="month" aria-label="Bulan" defaultValue={f?.month ?? ""} className={selectCls} required>
            <option value="" disabled>
              Bulan
            </option>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select name="year" aria-label="Tahun" defaultValue={f?.year ?? ""} className={selectCls} required>
            <option value="" disabled>
              Tahun
            </option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      {needCode && (
        <div>
          <label htmlFor="code" className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-forest">
            <KeyRound className="h-4 w-4" /> Kode keluarga
          </label>
          <input
            id="code"
            name="code"
            type="password"
            autoComplete="off"
            placeholder="Kode dari grup keluarga"
            className="h-14 w-full rounded-2xl border border-gold/40 bg-parchment/60 px-4 text-lg outline-none transition focus:border-leaf focus:bg-white focus:ring-4 focus:ring-leaf/15"
          />
        </div>
      )}

      {state?.error && (
        <div role="alert" className="fade-in flex gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="group relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-forest text-lg font-semibold text-parchment shadow-lg shadow-forest/30 transition hover:bg-forest-deep disabled:opacity-70"
      >
        <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-bright to-transparent" />
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
        {pending ? "Memeriksa…" : "Masuk ke Pohon Keluarga"}
      </button>
      <p className="text-center text-xs text-ink-soft">
        Data Anda hanya dapat dilihat oleh anggota keluarga yang sudah masuk.
      </p>
    </form>
  );
}
