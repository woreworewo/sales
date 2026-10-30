import type { Activity, HotelRole, Opportunity, Task, User } from "./types";

export function canAccessHotel(user: User, hotelId: string): boolean {
  return user.active && (user.admin || Boolean(user.hotelAccess[hotelId]));
}
export function canWriteHotel(user: User, hotelId: string): boolean {
  return canAccessHotel(user, hotelId) && (user.admin || user.hotelAccess[hotelId] !== "viewer");
}
export function canReadRecord(
  user: User,
  record: Pick<Opportunity | Activity | Task, "hotelId" | "ownerId">,
): boolean {
  return (
    canAccessHotel(user, record.hotelId) &&
    (user.admin || user.hotelAccess[record.hotelId] !== "sales" || record.ownerId === user.id)
  );
}
export function canWriteRecord(
  user: User,
  record: Pick<Opportunity | Activity | Task, "hotelId" | "ownerId">,
): boolean {
  return canWriteHotel(user, record.hotelId) && canReadRecord(user, record);
}
export function assertAllowed(
  condition: unknown,
  message = "Anda tidak memiliki akses untuk tindakan ini.",
): asserts condition {
  if (!condition) throw new Error(message);
}
export function roleLabel(role: HotelRole | undefined) {
  return role === "manager" ? "Sales Manager" : role === "sales" ? "Sales Executive" : "Viewer";
}
