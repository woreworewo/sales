import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";
import { createDemoSession, SESSION_COOKIE, SESSION_SECONDS, sessionOptions } from "@/lib/session";
import { getRecord } from "@/lib/database";
import { isDemoMode } from "@/lib/config";
import { idSchema } from "@/lib/validation";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const expected = new URL(process.env.APP_ORIGIN || "http://localhost:3000").origin;
  if (request.headers.get("origin") !== expected)
    return NextResponse.json({ error: "Origin tidak diizinkan." }, { status: 403 });
  try {
    const body = await request.json();
    let token: string;
    if (isDemoMode()) {
      const uid = idSchema.parse(body.uid),
        user = await getRecord("users", uid);
      if (!user?.active) return NextResponse.json({ error: "Akun tidak aktif." }, { status: 403 });
      token = createDemoSession(uid);
    } else {
      if (typeof body.idToken !== "string" || body.idToken.length > 10000)
        throw new Error("Token tidak valid.");
      const decoded = await adminAuth().verifyIdToken(body.idToken, true);
      if (!decoded.email_verified || Date.now() / 1000 - decoded.auth_time > 300)
        return NextResponse.json(
          { error: "Silakan login ulang dengan email yang terverifikasi." },
          { status: 401 },
        );
      const user = await getRecord("users", decoded.uid);
      if (!user?.active)
        return NextResponse.json(
          { error: "Akun belum diberi akses. Hubungi admin hotel." },
          { status: 403 },
        );
      token = await adminAuth().createSessionCookie(body.idToken, {
        expiresIn: SESSION_SECONDS * 1000,
      });
    }
    (await cookies()).set(SESSION_COOKIE, token, sessionOptions());
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Login gagal. Periksa akun dan konfigurasi Firebase." },
      { status: 401 },
    );
  }
}
