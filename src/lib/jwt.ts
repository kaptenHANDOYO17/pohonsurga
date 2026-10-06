import { SignJWT, jwtVerify } from "jose";

/* Token sesi anggota (HS256). Modul ini aman dipakai di proxy maupun server. */
const ISSUER = "pohon-keluarga";
const AUDIENCE = "anggota";

function key(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET wajib diisi minimal 32 karakter acak");
  return new TextEncoder().encode(s);
}

export async function signMemberToken(memberId: string, maxAgeSec: number): Promise<string> {
  return new SignJWT({ typ: "member" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(memberId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + maxAgeSec)
    .sign(key());
}

export async function verifyMemberToken(token: string | undefined | null): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { issuer: ISSUER, audience: AUDIENCE, algorithms: ["HS256"] });
    return typeof payload.sub === "string" && payload.typ === "member" ? payload.sub : null;
  } catch {
    return null;
  }
}
