/**
 * Client-side password gate for the STATIC build.
 *
 * HONEST WARNING: this is obscurity, not security. The expected password is
 * baked into the JS bundle at build time, and GitHub Pages on the free plan
 * only serves PUBLIC repos — so anyone can open the site and read the bundle.
 * This gate only keeps casual visitors out. Real server-side auth arrives with
 * the future Vercel backend (docs/api-spec.md).
 */

const FLAG = "as_auth";

export function gateEnabled(): boolean {
  return !!process.env.NEXT_PUBLIC_ANIME_STUDIO_PASSWORD;
}

export function checkPassword(pw: string): boolean {
  const expected = process.env.NEXT_PUBLIC_ANIME_STUDIO_PASSWORD || "";
  if (!expected) return true; // no password configured → open studio
  return pw === expected;
}

export function isAuthed(): boolean {
  if (typeof window === "undefined") return false;
  if (!gateEnabled()) return true;
  return localStorage.getItem(FLAG) === "1";
}

export function setAuthed() {
  localStorage.setItem(FLAG, "1");
}

export function clearAuth() {
  localStorage.removeItem(FLAG);
}
