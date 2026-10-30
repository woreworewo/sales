import { requireUser } from "@/lib/session";
import { loadSnapshot } from "@/lib/service";
import { AppShell } from "@/components/app-shell";
import { Workspace, type Params } from "@/components/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireUser(),
    data = await loadSnapshot(actor),
    raw = await searchParams;
  const params: Params = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  return (
    <AppShell data={data} view={params.view || "dashboard"} notice={params.notice}>
      <Workspace data={data} params={params} />
    </AppShell>
  );
}
