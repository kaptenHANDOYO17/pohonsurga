/* Ornamen visual: logo, daun, cincin, kaligrafi, ilustrasi pohon (semua SVG orisinal). */

export function LeafIcon({ dry = false, className = "" }: { dry?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M20.5 3.5C12 3.2 5.2 7.4 4.2 14.6c-.3 2 .2 4 1.2 5.6C7 18 9.6 15 13 12.6c-2.8 2.9-5 5.8-6.4 8.6 1.4.6 3 .8 4.6.6 7.1-1 10.1-9.2 9.3-18.3Z"
        fill={dry ? "#b5763a" : "#4e9145"}
      />
      <path d="M6.6 21.2C9 16.6 12.6 12.4 17 8.6" stroke={dry ? "#7a4a20" : "#2b5e2a"} strokeWidth="1.1" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function RingsIcon({ className = "", muted = false }: { className?: string; muted?: boolean }) {
  const c = muted ? "#a99a7a" : "#c99a2e";
  return (
    <svg viewBox="0 0 32 20" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="7" fill="none" stroke={c} strokeWidth="2.4" />
      <circle cx="21" cy="11" r="7" fill="none" stroke={c} strokeWidth="2.4" />
      <path d="M21 1.5l1.6 2-1.6 1.6-1.6-1.6z" fill={muted ? c : "#fff3c4"} stroke={c} strokeWidth=".8" />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="lg-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d4a843" />
          <stop offset="1" stopColor="#9a7020" />
        </linearGradient>
      </defs>
      <path d="M8 44V22C8 10 24 4 24 4s16 6 16 18v22" fill="#1d4a2c" stroke="url(#lg-g)" strokeWidth="2" />
      <path d="M24 40V24M24 30l-6-5M24 27l6-6" stroke="#d4a843" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="17" cy="23" r="4" fill="#5fa052" />
      <circle cx="31" cy="19" r="4.5" fill="#5fa052" />
      <circle cx="24" cy="16" r="5" fill="#3d7c3a" />
      <path d="M18 44c2-3 4-4 6-4s4 1 6 4" stroke="#d4a843" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function Bismillah({ className = "" }: { className?: string }) {
  return (
    <p className={`font-arabic leading-relaxed ${className}`} lang="ar" dir="rtl">
      بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ
    </p>
  );
}

/** Garis pemisah bergaya ornamen */
export function Divider({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`} aria-hidden="true">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/50 to-gold/70" />
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-gold">
        <path d="M12 2l2.6 6.9L22 12l-7.4 3.1L12 22l-2.6-6.9L2 12l7.4-3.1z" fill="currentColor" opacity=".85" />
      </svg>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent via-gold/50 to-gold/70" />
    </div>
  );
}

/** Ilustrasi pohon kehidupan di dalam lengkung mihrab (hero halaman login) */
export function TreeIllustration({ className = "" }: { className?: string }) {
  const leaves: [number, number, number, string][] = [
    [96, 128, -30, "#5fa052"], [118, 98, 10, "#3d7c3a"], [142, 78, -20, "#6fb35e"], [168, 70, 25, "#4e9145"],
    [194, 82, -10, "#5fa052"], [218, 102, 30, "#3d7c3a"], [236, 130, -25, "#6fb35e"], [84, 160, 15, "#4e9145"],
    [248, 162, -15, "#5fa052"], [110, 150, 40, "#7cbf68"], [222, 146, -40, "#7cbf68"], [160, 104, 0, "#2f6b2f"],
    [134, 124, 35, "#5fa052"], [190, 118, -35, "#4e9145"], [150, 52, 15, "#7cbf68"], [182, 48, -25, "#5fa052"],
    [72, 194, -20, "#b5763a"], [258, 196, 20, "#c98b45"], [100, 186, 30, "#6fb35e"], [232, 184, -30, "#4e9145"],
  ];
  return (
    <svg viewBox="0 0 330 360" className={className} role="img" aria-label="Ilustrasi pohon keluarga">
      <defs>
        <linearGradient id="ti-bark" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4e321c" />
          <stop offset=".5" stopColor="#7a5232" />
          <stop offset="1" stopColor="#43291a" />
        </linearGradient>
        <linearGradient id="ti-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e7c46a" />
          <stop offset="1" stopColor="#9a7020" />
        </linearGradient>
        <radialGradient id="ti-glow" cx=".5" cy=".38" r=".55">
          <stop offset="0" stopColor="#fff8df" />
          <stop offset="1" stopColor="#fff8df" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d="M30 352V160C30 64 165 14 165 14s135 50 135 146v192" fill="url(#ti-glow)" stroke="url(#ti-gold)" strokeWidth="2.5" />
      <path d="M44 352V164C44 80 165 32 165 32s121 48 121 132v188" fill="none" stroke="#d4a843" strokeOpacity=".35" strokeWidth="1" />
      {/* bulan sabit & bintang */}
      <path d="M248 64a14 14 0 1 0 10 24 11 11 0 1 1-10-24z" fill="#d4a843" opacity=".8" />
      <path d="M270 58l1.6 4.2 4.4.3-3.4 2.8 1.1 4.3-3.7-2.4-3.7 2.4 1.1-4.3-3.4-2.8 4.4-.3z" fill="#d4a843" opacity=".8" />
      {/* tanah */}
      <ellipse cx="165" cy="300" rx="118" ry="12" fill="#6a4628" opacity=".18" />
      {/* akar */}
      <g stroke="url(#ti-bark)" strokeLinecap="round" fill="none">
        <path d="M158 286c-14 14-38 22-66 26" strokeWidth="6" />
        <path d="M172 286c16 14 40 20 70 22" strokeWidth="6" />
        <path d="M162 292c-6 18-18 32-34 44" strokeWidth="4.5" />
        <path d="M168 292c8 18 20 30 38 40" strokeWidth="4.5" />
        <path d="M165 294v46" strokeWidth="3.5" />
        <path d="M110 306c-12 6-22 14-30 24" strokeWidth="2.5" />
        <path d="M222 304c12 6 22 14 28 24" strokeWidth="2.5" />
      </g>
      {/* batang & dahan */}
      <g className="sway">
        <path d="M150 292c4-40-2-72 4-112h22c6 40 0 72 4 112z" fill="url(#ti-bark)" />
        <g stroke="url(#ti-bark)" strokeLinecap="round" fill="none">
          <path d="M160 190c-18-16-40-28-64-34" strokeWidth="8" />
          <path d="M170 186c18-18 40-30 66-34" strokeWidth="8" />
          <path d="M164 180c-4-30-6-62-4-96" strokeWidth="7" />
          <path d="M128 168c-12-22-14-44-10-66" strokeWidth="4" />
          <path d="M204 164c12-22 18-44 14-64" strokeWidth="4" />
          <path d="M162 120c-12-16-26-28-44-36" strokeWidth="3.5" />
          <path d="M166 116c14-16 30-26 50-32" strokeWidth="3.5" />
        </g>
        {leaves.map(([x, y, r, c], i) => (
          <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
            <path d="M0-15C9-10 11 4 0 15-11 4-9-10 0-15z" fill={c} opacity=".95" />
            <path d="M0-12V12" stroke="#fff" strokeOpacity=".35" strokeWidth="1" />
          </g>
        ))}
        {/* buah emas = keturunan */}
        {[[126, 116], [204, 112], [165, 88], [96, 176], [236, 172]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="5" fill="#d4a843" stroke="#fff3c4" strokeWidth="1.5" />
        ))}
      </g>
    </svg>
  );
}
