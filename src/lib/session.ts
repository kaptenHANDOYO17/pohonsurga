import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./env";
import { signMemberToken, verifyMemberToken } from "./jwt";

const MAX_AGE = 60 * 60 * 24 * 30; // 30 hari

export async function createMemberSession(memberId: string) {
  const token = await signMemberToken(memberId, MAX_AGE);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function readMemberSession(): Promise<string | null> {
  return verifyMemberToken((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function clearMemberSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
