import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { redirect } from "next/navigation";
import { adminAuth } from "./firebase-admin";
import { getRecord } from "./database";
import { isDemoMode } from "./config";

export const SESSION_COOKIE = "sales-session";
export const SESSION_SECONDS = 60 * 60 * 24 * 5;
function demoSecret() {
  const dir = join(process.cwd(), ".data");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "session-secret");
  try {
    return readFileSync(path, "utf8");
  } catch {
    const secret = randomBytes(32).toString("hex");
    try {
      writeFileSync(path, secret, { flag: "wx", mode: 0o600 });
    } catch {
      return readFileSync(path, "utf8");
    }
    return secret;
  }
}
export function createDemoSession(uid: string) {
  if (!isDemoMode()) throw new Error("Demo tidak aktif.");
  const payload = Buffer.from(
    JSON.stringify({ uid, expires: Date.now() + SESSION_SECONDS * 1000 }),
  ).toString("base64url");
  return payload + "." + createHmac("sha256", demoSecret()).update(payload).digest("base64url");
}
function verifyDemoSession(token: string): string | null {
  try {
    const [payload, signature] = token.split(".");
    const expected = createHmac("sha256", demoSecret()).update(payload).digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(expected, actual)) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof data.uid === "string" && data.expires > Date.now() ? data.uid : null;
  } catch {
    return null;
  }
}
export const currentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  let uid: string | null = null;
  try {
    uid = isDemoMode()
      ? verifyDemoSession(token)
      : (await adminAuth().verifySessionCookie(token, true)).uid;
  } catch {
    return null;
  }
  if (!uid) return null;
  const user = await getRecord("users", uid);
  return user?.active ? user : null;
});
export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}
export function sessionOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && !isDemoMode(),
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_SECONDS,
  };
}
