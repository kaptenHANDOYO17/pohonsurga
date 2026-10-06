/**
 * Normalisasi nama untuk login yang ramah semua umur:
 * - gelar (H., Hj., Drs., S.E., dll) diabaikan
 * - variasi ejaan umum disamakan (kh/ch → h, oe → u, huruf ganda, dsb)
 * - "Muhammad/Moh./Muh./M." diabaikan karena penulisannya sangat beragam
 */
const TITLES = new Set(
  [
    "h", "hj", "haji", "hajjah", "drs", "dra", "dr", "ir", "prof", "kh", "ust", "ustadz",
    "s", "se", "sh", "st", "sag", "spd", "ssi", "si", "msi", "ssos", "spsi", "spt", "sp", "sakt",
    "skom", "skm", "ss", "shi", "sf", "apt", "mba", "mm", "ma", "mh", "mkn", "mars", "lc",
    "mthi", "mth", "bsc", "be", "ba", "cn", "bk", "teks", "bkteks", "spn", "ak", "amd",
    "amdkeb", "amdkep", "amdpel", "amdbns", "keb", "kep", "pel", "bns", "pd", "psi", "pt",
    "sos", "kom", "akt", "ag", "s1", "alm", "almh", "almarhum", "almarhumah", "za",
  ].map((t) => t),
);
const MUHAMMAD = new Set([
  "m", "mh", "moh", "muh", "mohd", "muhammad", "mohammad", "mohamad", "muhamad", "mochammad",
  "mohamed", "mukhammad", "moch", "mochamad", "much",
]);

function phonetic(token: string): string {
  return token
    .replace(/kh/g, "h")
    .replace(/ch/g, "h")
    .replace(/dh/g, "d")
    .replace(/dz/g, "z")
    .replace(/th/g, "t")
    .replace(/sy/g, "s")
    .replace(/oe/g, "u")
    .replace(/ie/g, "i")
    .replace(/y/g, "i")
    .replace(/(.)\1+/g, "$1")
    .replace(/h$/, "");
}

export function nameTokens(raw: string): string[] {
  const cleaned = raw
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ") // buang isi kurung "(Slamet)"
    .replace(/[’'`]/g, "")
    .replace(/[.,]/g, " ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/-/g, " ");
  return cleaned
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => !TITLES.has(t) && !MUHAMMAD.has(t))
    .map(phonetic)
    .filter((t) => t.length > 0);
}

/** True bila semua kata yang diketik ada di nama lengkap / panggilan anggota. */
export function nameMatches(input: string, fullName: string, nickname: string | null): boolean {
  const inTokens = nameTokens(input);
  if (inTokens.length === 0) return false;
  const pool = new Set([...nameTokens(fullName), ...(nickname ? nameTokens(nickname) : [])]);
  return inTokens.every((t) => pool.has(t));
}

/** Nama tanpa gelar depan & gelar belakang, mis. "H. Drs. Slamet Saiful Muslimin" → "Slamet Saiful Muslimin" */
export function plainName(fullName: string): string {
  return fullName
    .replace(/^((H|Hj|Drs|Dra|Dr|Ir|Prof|KH)\.?\s+)+/i, "")
    .split(",")[0]
    .trim();
}

/** Nama pendek untuk ditampilkan dalam kalimat/relasi. */
export function shortName(m: { full_name: string; nickname: string | null }): string {
  const plain = plainName(m.full_name);
  if (plain.length <= 22) return plain;
  if (m.nickname && m.nickname.length <= 18) return m.nickname;
  return plain.split(/\s+/).slice(0, 2).join(" ");
}

/** Nama sapaan (panggilan). */
export function callName(m: { full_name: string; nickname: string | null }): string {
  return m.nickname && m.nickname.length <= 18 ? m.nickname : shortName(m);
}

export function initials(name: string): string {
  const parts = name
    .replace(/^((H|Hj|Drs|Dra|Dr|Ir|Prof)\.?\s+)+/i, "")
    .split(",")[0]
    .split(/\s+/)
    .filter((p) => /^[A-Za-z]/.test(p));
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}
