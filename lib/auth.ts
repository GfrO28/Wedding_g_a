import { cookies } from "next/headers";

export const COOKIE_NAME = "admin_session";

// Web Crypto (no node:crypto) para que también funcione en el runtime Edge del middleware
export async function expectedToken() {
  const data = new TextEncoder().encode(process.env.ADMIN_PASSWORD ?? "");
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createAdminSession() {
  const store = await cookies();
  store.set(COOKIE_NAME, await expectedToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function isAdminAuthed() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  return Boolean(token) && token === (await expectedToken());
}

export function checkPassword(password: string) {
  return password === process.env.ADMIN_PASSWORD;
}

export async function destroyAdminSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
