import { headers } from "next/headers";

// Personal sign-in links: an admin creates one per member; opening it stores
// the secret in an HttpOnly cookie. Only the SHA-256 hash is kept in D1.
export const ACCESS_COOKIE = "bridge_access";
const KEY_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const ONE_YEAR = 60 * 60 * 24 * 365;

export function newAccessKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function isAccessKey(value: string): boolean {
  return KEY_PATTERN.test(value);
}

export async function hashAccessKey(key: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function getAccessKey(): Promise<string | null> {
  const raw = (await headers()).get("cookie") || "";
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i < 0 || part.slice(0, i).trim() !== ACCESS_COOKIE) continue;
    const value = part.slice(i + 1).trim();
    return isAccessKey(value) ? value : null;
  }
  return null;
}

export function accessCookie(key: string | null): string {
  const base = `${ACCESS_COOKIE}=${key ?? ""}; Path=/; HttpOnly; Secure; SameSite=Lax`;
  return key ? `${base}; Max-Age=${ONE_YEAR}` : `${base}; Max-Age=0`;
}
