"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  inMemoryPersistence,
  setPersistence,
  signOut,
} from "firebase/auth";

export function LoginForm({
  demo,
  accounts,
}: {
  demo: boolean;
  accounts: { id: string; name: string }[];
}) {
  const [error, setError] = useState(""),
    [pending, setPending] = useState(false),
    [uid, setUid] = useState(accounts[0]?.id || "");
  const router = useRouter();
  async function login() {
    setError("");
    setPending(true);
    try {
      let body: Record<string, string> = { uid };
      if (!demo) {
        const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
        if (!apiKey) throw new Error("Konfigurasi Firebase belum tersedia. Hubungi admin.");
        const app =
          getApps()[0] ||
          initializeApp({
            apiKey,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
          });
        const auth = getAuth(app);
        await setPersistence(auth, inMemoryPersistence);
        const result = await signInWithPopup(auth, new GoogleAuthProvider());
        body = { idToken: await result.user.getIdToken() };
        await signOut(auth);
      }
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Login gagal.");
      router.replace("/");
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error && !/auth\//.test(e.message)
          ? e.message
          : "Login belum berhasil. Periksa popup dan akun Google Anda.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void login();
      }}
    >
      {demo && (
        <label className="field">
          Akun demo
          <select value={uid} onChange={(e) => setUid(e.target.value)}>
            {accounts.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button primary full-width" disabled={pending} type="submit">
        {pending ? "Menghubungkan…" : demo ? "Masuk demo" : "Masuk dengan Google"}
      </button>
      <p className="muted login-note">
        {demo
          ? "Data demo tersimpan di komputer ini. Pilih akun untuk mencoba hak akses berbeda."
          : "Gunakan email yang telah didaftarkan admin hotel. Tidak ada pendaftaran publik."}
      </p>
    </form>
  );
}
