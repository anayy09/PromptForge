import { NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_COOKIE, accessPassword, accessToken, safeEqual } from "@/lib/auth";

export const runtime = "nodejs";

const LoginSchema = z.object({ password: z.string().min(1) });

// POST { password } -> set the httpOnly access cookie on success.
export async function POST(req: Request) {
  const configured = accessPassword();
  if (!configured) {
    // Gate disabled: nothing to log into.
    return NextResponse.json({ ok: true, gated: false });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }

  const submitted = await accessToken(parsed.data.password);
  const expected = await accessToken(configured);
  if (!safeEqual(submitted, expected)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, gated: true });
  res.cookies.set(AUTH_COOKIE, expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}

// DELETE -> sign out.
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
