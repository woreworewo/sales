"use server";

import { cookies } from "next/headers";
import { randomUUID, createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requireUser, SESSION_COOKIE } from "@/lib/session";
import { adminAuth } from "@/lib/firebase-admin";
import { isDemoMode } from "@/lib/config";
import { transactOnce, storePhoto, removePhoto, type Transaction } from "@/lib/database";
import { assertAllowed, canAccessHotel, canWriteHotel, canWriteRecord } from "@/lib/access";
import {
  activitySchema,
  clientSchema,
  hotelSchema,
  idSchema,
  locationSchema,
  opportunitySchema,
  parsePhoto,
  userSchema,
} from "@/lib/validation";
import type { ActionResult, BaseRecord, Evidence, User } from "@/lib/types";

const value = (f: FormData, key: string) => String(f.get(key) || "");
const meta = (id: string): BaseRecord => ({
  id,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  version: 1,
});
function updated<T extends BaseRecord>(old: T, data: Partial<T>, form: FormData): T {
  assertAllowed(
    old.version === Number(value(form, "version")),
    "Data telah berubah. Muat ulang sebelum menyimpan.",
  );
  return { ...old, ...data, updatedAt: new Date().toISOString(), version: old.version + 1 };
}
async function freshActor(tx: Transaction, id: string) {
  const user = await tx.get("users", id);
  assertAllowed(user?.active);
  return user;
}
async function writableHotel(tx: Transaction, actor: User, id: string) {
  const hotel = await tx.get("hotels", id);
  assertAllowed(hotel?.active && canWriteHotel(actor, id));
  return hotel;
}
export async function saveRecord(_previous: ActionResult, form: FormData): Promise<ActionResult> {
  const session = await requireUser();
  let uploaded: string | undefined;
  let committed = false;
  try {
    const kind = value(form, "kind"),
      id = value(form, "id");
    if (id) idSchema.parse(id);
    const recordId = id || randomUUID();
    const nonce = value(form, "submissionId");
    assertAllowed(/^[a-f0-9-]{36}$/.test(nonce), "Formulir tidak valid. Muat ulang halaman.");
    const requestKey = createHash("sha256")
      .update(session.id + ":" + kind + ":" + nonce)
      .digest("hex");
    let replayed = false,
      actualRecordId = recordId;
    async function writeOnce(callback: (tx: Transaction) => Promise<void>) {
      const receipt = await transactOnce(requestKey, session.id, kind, recordId, callback);
      replayed = receipt.replayed;
      actualRecordId = receipt.id;
    }
    let destination = "/";
    if (kind === "client") {
      const parsed = clientSchema.parse({
        ...Object.fromEntries(form),
        hotelIds: form.getAll("hotelIds").map(String),
      });
      await writeOnce(async (tx) => {
        const actor = await freshActor(tx, session.id),
          old = id ? await tx.get("clients", id) : null;
        if (id) assertAllowed(old, "Klien tidak ditemukan.");
        if (old) assertAllowed(old.hotelIds.some((h) => canWriteHotel(actor, h)));
        for (const h of parsed.hotelIds) await writableHotel(tx, actor, h);
        const payload = {
          ...parsed,
          hotelIds: [...new Set([...(old?.hotelIds || []), ...parsed.hotelIds])],
        };
        assertAllowed(payload.hotelIds.length <= 20, "Maksimal 20 hotel per klien.");
        tx.set("clients", old ? updated(old, payload, form) : { ...meta(recordId), ...payload });
      });
      destination = "/?view=clients&notice=client-saved";
    } else if (kind === "opportunity") {
      const parsed = opportunitySchema.parse(Object.fromEntries(form));
      await writeOnce(async (tx) => {
        const actor = await freshActor(tx, session.id),
          old = id ? await tx.get("opportunities", id) : null;
        if (id) assertAllowed(old, "Peluang tidak ditemukan.");
        if (old)
          assertAllowed(
            canWriteRecord(actor, old) && old.hotelId === parsed.hotelId,
            "Hotel peluang tidak dapat dipindahkan.",
          );
        await writableHotel(tx, actor, parsed.hotelId);
        const client = await tx.get("clients", parsed.clientId),
          owner = await tx.get("users", parsed.ownerId);
        assertAllowed(
          client?.hotelIds.includes(parsed.hotelId),
          "Klien tidak tersedia untuk hotel ini.",
        );
        assertAllowed(
          owner?.active && canWriteHotel(owner, parsed.hotelId),
          "Sales tidak memiliki akses ke hotel ini.",
        );
        assertAllowed(
          actor.admin ||
            actor.hotelAccess[parsed.hotelId] !== "sales" ||
            parsed.ownerId === actor.id,
          "Sales hanya dapat mengelola peluang miliknya.",
        );
        const history = [...(old?.history || [])];
        if (!old || old.stage !== parsed.stage)
          history.unshift({
            at: new Date().toISOString(),
            actorId: actor.id,
            from: old?.stage || "",
            to: parsed.stage,
          });
        const payload = { ...parsed, history: history.slice(0, 100) };
        tx.set(
          "opportunities",
          old ? updated(old, payload, form) : { ...meta(recordId), ...payload },
        );
      });
      destination = "/?view=opportunities&notice=opportunity-saved";
    } else if (kind === "activity") {
      const parsed = activitySchema.parse(Object.fromEntries(form));
      const visit = ["Sales Visit", "Site Inspection"].includes(parsed.type);
      let evidence: Evidence | null = null;
      if (visit) {
        const location = locationSchema.parse(Object.fromEntries(form));
        assertAllowed(
          Date.parse(location.capturedAt) > Date.now() - 30 * 60 * 1000 &&
            Date.parse(location.capturedAt) < Date.now() + 60000,
          "Lokasi kedaluwarsa. Ambil lokasi lagi.",
        );
        const file = form.get("photo");
        const simulated = isDemoMode() && value(form, "simulated") === "true";
        let bytes: Uint8Array;
        if (simulated && !(file instanceof File && file.size))
          bytes = new Uint8Array(
            Buffer.from(
              "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF1cAAAAASUVORK5CYII=",
              "base64",
            ),
          );
        else {
          assertAllowed(
            file instanceof File && file.size > 0 && file.size <= 5 * 1024 * 1024,
            "Tambahkan foto bukti maksimal 5 MB.",
          );
          bytes = new Uint8Array(await file.arrayBuffer());
        }
        const mime = parsePhoto(bytes);
        uploaded = randomUUID();
        await storePhoto(uploaded, mime, bytes);
        evidence = {
          ...location,
          mime,
          photoPath: uploaded,
          recordedAt: new Date().toISOString(),
          simulated,
        };
      }
      await writeOnce(async (tx) => {
        const actor = await freshActor(tx, session.id);
        await writableHotel(tx, actor, parsed.hotelId);
        const client = await tx.get("clients", parsed.clientId);
        assertAllowed(
          client?.hotelIds.includes(parsed.hotelId),
          "Klien tidak tersedia untuk hotel ini.",
        );
        if (parsed.opportunityId) {
          const opp = await tx.get("opportunities", parsed.opportunityId);
          assertAllowed(
            opp &&
              canWriteRecord(actor, opp) &&
              opp.hotelId === parsed.hotelId &&
              opp.clientId === parsed.clientId,
            "Peluang tidak sesuai dengan klien atau hotel.",
          );
        }
        const task = parsed.taskId ? await tx.get("tasks", parsed.taskId) : null;
        if (parsed.taskId)
          assertAllowed(
            task &&
              canWriteRecord(actor, task) &&
              task.clientId === parsed.clientId &&
              task.hotelId === parsed.hotelId &&
              task.opportunityId === parsed.opportunityId &&
              !task.completedAt,
            "Follow-up sudah berubah atau tidak sesuai.",
          );
        const { taskId: _taskId, ...payload } = parsed;
        tx.set("activities", { ...meta(recordId), ...payload, ownerId: actor.id, evidence });
        if (task)
          tx.set("tasks", {
            ...task,
            completedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: task.version + 1,
          });
        if (parsed.nextAction)
          tx.set("tasks", {
            ...meta(randomUUID()),
            hotelId: parsed.hotelId,
            clientId: parsed.clientId,
            opportunityId: parsed.opportunityId,
            ownerId: task?.ownerId || actor.id,
            title: parsed.nextAction,
            dueDate: parsed.nextDate,
            completedAt: "",
          });
      });
      destination = `/?view=activities&id=${actualRecordId}&notice=activity-saved`;
    } else if (kind === "hotel") {
      const parsed = hotelSchema.parse({
        ...Object.fromEntries(form),
        active: form.get("active") === "on",
      });
      await writeOnce(async (tx) => {
        const actor = await freshActor(tx, session.id);
        assertAllowed(actor.admin);
        const old = id ? await tx.get("hotels", id) : null;
        if (id) assertAllowed(old);
        tx.set("hotels", old ? updated(old, parsed, form) : { ...meta(recordId), ...parsed });
      });
      destination = "/?view=settings&notice=hotel-saved";
    } else if (kind === "user") {
      const roles = Object.fromEntries(
        form
          .getAll("hotelIds")
          .map(String)
          .map((h) => [h, value(form, "role-" + h)]),
      );
      const parsed = userSchema.parse({
        ...Object.fromEntries(form),
        active: form.get("active") === "on",
        hotelAccess: roles,
      });
      assertAllowed(session.admin);
      let targetId = id;
      if (!targetId) {
        if (isDemoMode()) targetId = recordId;
        else {
          try {
            targetId = (await adminAuth().getUserByEmail(parsed.email)).uid;
          } catch (error) {
            if ((error as { code?: string }).code !== "auth/user-not-found") throw error;
            targetId = (
              await adminAuth().createUser({ email: parsed.email, displayName: parsed.name })
            ).uid;
          }
        }
      }
      await writeOnce(async (tx) => {
        const actor = await freshActor(tx, session.id);
        assertAllowed(actor.admin);
        const old = await tx.get("users", targetId);
        assertAllowed(!old?.admin, "Profil Group Admin diatur melalui bootstrap.");
        for (const h of Object.keys(parsed.hotelAccess)) {
          const hotel = await tx.get("hotels", h);
          assertAllowed(hotel?.active, "Hotel tidak aktif.");
        }
        if (old)
          assertAllowed(
            old.email === parsed.email,
            "Email akun tidak dapat diubah dari formulir ini.",
          );
        const payload = { ...parsed, admin: false };
        tx.set("users", old ? updated(old, payload, form) : { ...meta(targetId), ...payload });
      });
      destination = "/?view=users&notice=user-saved";
    } else throw new Error("Tindakan tidak dikenal.");
    if (uploaded && replayed) await removePhoto(uploaded).catch(() => undefined);
    committed = true;
    revalidatePath("/");
    return { redirectTo: destination };
  } catch (error) {
    if (uploaded && !committed) await removePhoto(uploaded).catch(() => undefined);
    return {
      error:
        error instanceof ZodError
          ? error.issues[0]?.message || "Periksa isian formulir."
          : error instanceof Error &&
              !/credential|PERMISSION_DENIED|UNAVAILABLE|ECONN|bucket|firestore|firebase/i.test(
                error.message,
              )
            ? error.message
            : "Penyimpanan gagal. Periksa koneksi dan konfigurasi server.",
    };
  }
}
export async function setHotelScope(form: FormData) {
  const user = await requireUser(),
    scope = value(form, "scope");
  assertAllowed(scope === "all" || canAccessHotel(user, idSchema.parse(scope)));
  (await cookies()).set("sales-hotel", scope, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && !isDemoMode(),
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/");
  redirect("/?view=account&notice=scope-saved");
}
export async function logout() {
  const cookie = await cookies();
  cookie.delete(SESSION_COOKIE);
  cookie.delete("sales-hotel");
  redirect("/login");
}
