import { z } from "zod";
import { ACTIVITY_TYPES, BUSINESS_TYPES, SOURCES, STAGES } from "./types";

export const idSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/, "ID tidak valid.");
const text = (max = 200) => z.string().trim().max(max);
const required = (max = 200) => text(max).min(1, "Kolom wajib belum diisi.");
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid.")
  .refine((v) => {
    const d = new Date(v + "T12:00:00Z");
    return (
      !Number.isNaN(d.valueOf()) &&
      d.toISOString().slice(0, 10) === v &&
      v >= "2000-01-01" &&
      v <= "2100-12-31"
    );
  }, "Tanggal tidak valid.");
const integer = z.coerce.number().int().nonnegative().max(1_000_000_000_000);
export const clientSchema = z.object({
  name: required(),
  segment: z.enum(["Corporate", "Government", "Travel Agent", "Wedding Organizer", "Individu"]),
  pic: required(),
  email: z.union([z.email(), z.literal("")]),
  phone: text(40),
  hotelIds: z.array(idSchema).min(1, "Pilih minimal satu hotel.").max(20),
});
export const opportunitySchema = z
  .object({
    title: required(),
    hotelId: idSchema,
    clientId: idSchema,
    ownerId: idSchema,
    businessType: z.enum(BUSINESS_TYPES),
    stage: z.enum(STAGES),
    value: integer,
    businessDate: dateSchema,
    closeDate: dateSchema,
    source: z.enum(SOURCES),
    notes: text(2000),
    quantity: integer.max(100000),
    nights: integer.min(1).max(3650),
    corporateType: z.enum(["Pemesanan", "Kontrak rate"]),
    venue: text(),
    lostReason: text(1000),
  })
  .superRefine((v, ctx) => {
    if (v.stage === "Lost" && !v.lostReason)
      ctx.addIssue({ code: "custom", message: "Isi alasan lost.", path: ["lostReason"] });
    if (
      v.stage === "Won" &&
      !(v.businessType === "Corporate Room" && v.corporateType === "Kontrak rate") &&
      !v.value
    )
      ctx.addIssue({
        code: "custom",
        message: "Nilai confirmed wajib diisi untuk Won.",
        path: ["value"],
      });
  });
export const activitySchema = z
  .object({
    hotelId: idSchema,
    clientId: idSchema,
    opportunityId: z.union([idSchema, z.literal("")]),
    type: z.enum(ACTIVITY_TYPES),
    occurredAt: z.iso.datetime(),
    result: z.enum([
      "Ada kebutuhan",
      "Hubungi kembali",
      "Belum ada kebutuhan",
      "Tidak terhubung / PIC tidak ditemui",
    ]),
    notes: required(2000),
    nextAction: text(),
    nextDate: z.union([dateSchema, z.literal("")]),
    taskId: z.union([idSchema, z.literal("")]),
  })
  .refine((v) => !v.nextAction || Boolean(v.nextDate), {
    message: "Pilih tanggal follow-up.",
    path: ["nextDate"],
  });
export const locationSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  accuracy: z.coerce.number().nonnegative().max(100000),
  capturedAt: z.iso.datetime(),
});
export const userSchema = z.object({
  name: required(100),
  email: z.email(),
  active: z.boolean(),
  hotelAccess: z
    .record(idSchema, z.enum(["manager", "sales", "viewer"]))
    .refine(
      (v) => Object.keys(v).length > 0 && Object.keys(v).length <= 20,
      "Pilih satu sampai 20 hotel.",
    ),
});
export const hotelSchema = z.object({
  name: required(),
  city: required(),
  timezone: z.enum(["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"]),
  active: z.boolean(),
});
export function parsePhoto(bytes: Uint8Array) {
  if (bytes.length > 5 * 1024 * 1024 || bytes.length < 12)
    throw new Error("Foto wajib JPG, PNG, atau WebP maksimal 5 MB.");
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)) return "image/png";
  const decoder = new TextDecoder();
  if (decoder.decode(bytes.slice(0, 4)) === "RIFF" && decoder.decode(bytes.slice(8, 12)) === "WEBP")
    return "image/webp";
  throw new Error("Format foto tidak didukung. Gunakan JPG, PNG, atau WebP.");
}
