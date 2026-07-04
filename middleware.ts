import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, accessPassword, accessToken, safeEqual } from "@/lib/auth";

/**
 * Access gate. Active only when APP_ACCESS_PASSWORD is set (production). API
 * routes get a 401 JSON; page requests redirect to /login. The login page and
 * the auth endpoint are excluded so an unauthenticated visitor can sign in.
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login|api/auth).*)"],
};

export async function middleware(req: NextRequest) {
  const password = accessPassword();
  if (!password) return NextResponse.next(); // gate disabled

  const cookie = req.cookies.get(AUTH_COOKIE)?.value ?? "";
  const expected = await accessToken(password);
  if (cookie && safeEqual(cookie, expected)) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("from", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}
