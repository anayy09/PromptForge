/**
 * Access-gate primitives. The public deploy is backed by an effectively
 * unmetered model endpoint, so an ungated /api/enhance is an open door: anyone
 * who finds the URL can burn the quota or use it as a free LLM proxy. When
 * APP_ACCESS_PASSWORD is set, middleware.ts requires a matching cookie on every
 * route. When it is unset (local dev) the gate is disabled.
 *
 * The plaintext password never reaches the browser. The cookie holds only a
 * SHA-256 token derived from it, set httpOnly so page scripts cannot read it.
 * These helpers use Web Crypto (globalThis.crypto.subtle) so the same code runs
 * in the edge middleware and in Node route handlers.
 */

export const AUTH_COOKIE = "pf_auth";

/** Deterministic, non-reversible token for a password. Compared, never shown. */
export async function accessToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`promptforge:v1:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Length-safe constant-time-ish comparison to avoid trivial timing leaks. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** The configured password, or null when the gate is disabled (local dev). */
export function accessPassword(): string | null {
  const p = process.env.APP_ACCESS_PASSWORD ?? process.env.APP_SHARED_SECRET ?? "";
  return p.trim() ? p : null;
}
