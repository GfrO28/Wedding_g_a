import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, expectedToken } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const valid = Boolean(token) && token === (await expectedToken());

  if (!valid) {
    const loginUrl = new URL("/admin", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/dashboard/:path*"],
};
