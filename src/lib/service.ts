import "server-only";
import { cookies } from "next/headers";
import { canAccessHotel, canReadRecord } from "./access";
import { isDemoMode } from "./config";
import { getRecord, queryRecords } from "./database";
import type { CollectionName, Collections, Snapshot, User } from "./types";

const PAGE_SIZE = 100;
export async function loadSnapshot(actor: User): Promise<Snapshot> {
  const hotelRows = actor.admin
    ? await queryRecords("hotels", undefined, 101)
    : (
        await Promise.all(
          Object.keys(actor.hotelAccess)
            .slice(0, 20)
            .map((id) => getRecord("hotels", id)),
        )
      ).filter((h) => h !== null);
  const hotels = hotelRows.filter((h) => canAccessHotel(actor, h.id));
  const requested = (await cookies()).get("sales-hotel")?.value || "all";
  const scope = hotels.some((h) => h.active && h.id === requested) ? requested : "all";
  const selected = hotels.filter((h) => h.active && (scope === "all" || h.id === scope));
  let truncated = hotelRows.length > PAGE_SIZE;
  async function perHotel<K extends CollectionName>(
    collection: K,
    field = "hotelId",
    array = false,
  ): Promise<Collections[K][]> {
    const pages = await Promise.all(
      selected.map((h) =>
        queryRecords(
          collection,
          {
            field,
            value: h.id,
            array,
            ...(!array && !actor.admin && actor.hotelAccess[h.id] === "sales"
              ? { ownerId: actor.id }
              : {}),
          },
          PAGE_SIZE + 1,
        ),
      ),
    );
    truncated ||= pages.some((p) => p.length > PAGE_SIZE);
    return [
      ...new Map(pages.flatMap((p) => p.slice(0, PAGE_SIZE)).map((r) => [r.id, r])).values(),
    ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  const [clientRows, opps, acts, tasks, userRows] = await Promise.all([
    perHotel("clients", "hotelIds", true),
    perHotel("opportunities"),
    perHotel("activities"),
    perHotel("tasks"),
    queryRecords("users", undefined, 101),
  ]);
  truncated ||= userRows.length > PAGE_SIZE;
  const visibleUsers = userRows
    .filter(
      (u) =>
        actor.admin ||
        u.id === actor.id ||
        Object.keys(u.hotelAccess).some((h) => hotels.some((a) => a.id === h)),
    )
    .slice(0, PAGE_SIZE)
    .map((u) =>
      actor.admin
        ? u
        : {
            ...u,
            email: u.id === actor.id ? u.email : "",
            hotelAccess: Object.fromEntries(
              Object.entries(u.hotelAccess).filter(([h]) => hotels.some((a) => a.id === h)),
            ),
          },
    );
  return {
    actor,
    hotels,
    scope,
    truncated,
    demo: isDemoMode(),
    users: visibleUsers,
    clients: clientRows.map((c) => ({
      ...c,
      hotelIds: c.hotelIds.filter((h) => hotels.some((a) => a.id === h)),
    })),
    opportunities: opps.filter((d) => canReadRecord(actor, d)),
    activities: acts.filter((d) => canReadRecord(actor, d)),
    tasks: tasks.filter((d) => canReadRecord(actor, d)),
  };
}
