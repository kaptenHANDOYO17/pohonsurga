import { NextResponse, type NextRequest } from "next/server";
import { refreshSupabaseSession } from "@/lib/supabase/proxy";
import { verifyMemberToken } from "@/lib/jwt";
import { SESSION_COOKIE } from "@/lib/env";

/**
 * Penjaga rute:
 *  /pohon  → wajib login anggota (atau admin)
 *  /admin  → wajib login admin (pemeriksaan hak admin penuh dilakukan lagi di server)
 */
export async function proxy(request: NextRequest) {
  const { response, userId } = await refreshSupabaseSession(request);
  const path = request.nextUrl.pathname;

  const redirectTo = (to: string) => {
    const res = NextResponse.redirect(new URL(to, request.url));
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  if (path.startsWith("/admin") && path !== "/admin/login" && !userId) return redirectTo("/admin/login");
  if (path.startsWith("/pohon") && !userId) {
    const memberId = await verifyMemberToken(request.cookies.get(SESSION_COOKIE)?.value);
    if (!memberId) return redirectTo("/");
  }
  return response;
}

export const config = {
  matcher: ["/pohon/:path*", "/admin/:path*"],
};
