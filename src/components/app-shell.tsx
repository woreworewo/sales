import Link from "next/link";
import { NAV_ITEMS, MORE_ITEM } from "./icons";
import type { Snapshot } from "@/lib/types";
import { roleLabel } from "@/lib/access";

export function AppShell({
  data,
  view,
  notice,
  children,
}: {
  data: Snapshot;
  view: string;
  notice?: string;
  children: React.ReactNode;
}) {
  const menu = NAV_ITEMS.filter((n) => n.id !== "users" || data.actor.admin),
    mobile = [...menu.slice(0, 4), MORE_ITEM];
  const role = data.actor.admin
    ? "Group Admin"
    : [...new Set(Object.values(data.actor.hotelAccess).map(roleLabel))].join(" / ");
  const notices: Record<string, string> = {
    "client-saved": "Klien berhasil disimpan.",
    "opportunity-saved": "Peluang berhasil disimpan.",
    "activity-saved": "Aktivitas tersimpan dan follow-up diperbarui.",
    "hotel-saved": "Hotel berhasil disimpan.",
    "user-saved": "Profil dan akses user berhasil disimpan.",
    "scope-saved": "Tampilan data diperbarui.",
  };
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Lewati ke konten
      </a>
      <aside className="sidebar">
        <Link href="/" className="brand">
          sales<small>HOTEL WORKSPACE</small>
        </Link>
        <nav aria-label="Navigasi utama">
          {menu.map(({ id, label, icon: Icon }) => (
            <Link
              className="nav-item"
              href={`/?view=${id}`}
              aria-current={view === id ? "page" : undefined}
              key={id}
            >
              <Icon size={18} aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
        <Link className="profile sidebar-profile" href="/?view=account">
          <span className="avatar">{data.actor.name[0]}</span>
          <span>
            {data.actor.name}
            <small>{role}</small>
          </span>
        </Link>
      </aside>
      <div className="app-body">
        <header className="header">
          <Link className="brand mobile-brand" href="/">
            sales<small>HOTEL WORKSPACE</small>
          </Link>
          <span className="breadcrumb">
            Workspace / {menu.find((n) => n.id === view)?.label || "Lainnya"}
          </span>
          {data.demo && <span className="demo-label">DEMO LOKAL</span>}
          <Link href="/?view=account" className="avatar" aria-label="Buka akun">
            {data.actor.name[0]}
          </Link>
        </header>
        <main id="main">
          {notice && notices[notice] && (
            <div className="feedback" role="status">
              {notices[notice]}
              <Link href={`/?view=${view}`} aria-label="Tutup notifikasi">
                ×
              </Link>
            </div>
          )}
          {data.truncated && (
            <div className="warning" role="status">
              Menampilkan maksimal 100 data terbaru per hotel. Ringkasan dan laporan hanya mencakup
              data yang dimuat.
            </div>
          )}
          {children}
        </main>
        <nav className="mobile-nav" aria-label="Navigasi mobile">
          {mobile.map(({ id, label, icon: Icon }) => (
            <Link
              key={id}
              href={`/?view=${id}`}
              className="nav-item"
              aria-current={
                view === id || (id === "more" && !mobile.slice(0, 4).some((n) => n.id === view))
                  ? "page"
                  : undefined
              }
            >
              <Icon size={19} aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
