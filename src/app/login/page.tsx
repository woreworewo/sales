import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { isDemoMode } from "@/lib/config";
import { queryRecords } from "@/lib/database";
import { LoginForm } from "@/components/login-form";

export const runtime = "nodejs";
export default async function LoginPage() {
  if (await currentUser()) redirect("/");
  const demo = isDemoMode();
  const accounts = demo
    ? (await queryRecords("users"))
        .filter((u) => u.active)
        .map((u) => ({
          id: u.id,
          name:
            u.name + " · " + (u.admin ? "Group Admin" : Object.values(u.hotelAccess).join(" / ")),
        }))
    : [];
  return (
    <main className="login-card">
      <div className="brand">
        sales<small>HOTEL WORKSPACE</small>
      </div>
      <h1>Selamat datang.</h1>
      <p className="login-intro">
        Kelola hubungan klien dan peluang bisnis hotel dalam satu workspace.
      </p>
      <LoginForm demo={demo} accounts={accounts} />
    </main>
  );
}
