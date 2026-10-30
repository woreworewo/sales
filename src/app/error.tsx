"use client";
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="login-card">
      <h1>Workspace belum dapat dimuat</h1>
      <p>Periksa koneksi dan konfigurasi Firebase, lalu coba lagi.</p>
      <button className="button primary" onClick={reset}>
        Coba lagi
      </button>
    </main>
  );
}
