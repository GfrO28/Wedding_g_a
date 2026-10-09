import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, looksLikeSession } from "@/lib/authCookie";

// Control rápido (sin base de datos): sin una cookie de sesión con la forma
// correcta, al login. La verificación de verdad la hacen el layout del panel
// y cada acción (lib/auth.ts → verifySession).
export async function proxy(request: NextRequest) {
  if (!looksLikeSession(request.cookies.get(COOKIE_NAME)?.value)) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/dashboard/:path*"],
};
