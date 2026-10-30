import { test } from "node:test";
import assert from "node:assert/strict";
import { canAccessHotel, canReadRecord, canWriteHotel, canWriteRecord } from "./access";
import { demoSeed } from "./demo-seed";

const users = demoSeed().users,
  manager = users.find((u) => u.id === "dina")!,
  sales = users.find((u) => u.id === "rafi")!,
  viewer = users.find((u) => u.id === "viewer")!,
  admin = users.find((u) => u.admin)!;
test("one user has different permissions per hotel", () => {
  assert.equal(canWriteRecord(manager, { hotelId: "jakarta", ownerId: "someone-else" }), true);
  assert.equal(canWriteRecord(manager, { hotelId: "bandung", ownerId: "someone-else" }), false);
  assert.equal(canWriteRecord(manager, { hotelId: "bandung", ownerId: "dina" }), true);
  assert.equal(canAccessHotel(manager, "bali"), false);
});
test("sales cannot read or modify another sales record even within same hotel", () => {
  assert.equal(canReadRecord(sales, { hotelId: "bandung", ownerId: "dina" }), false);
  assert.equal(canWriteRecord(sales, { hotelId: "bandung", ownerId: "dina" }), false);
  assert.equal(canWriteRecord(sales, { hotelId: "bandung", ownerId: "rafi" }), true);
  assert.equal(canWriteRecord(sales, { hotelId: "jakarta", ownerId: "rafi" }), false);
});
test("viewer can read hotel records but cannot mutate", () => {
  assert.equal(canReadRecord(viewer, { hotelId: "jakarta", ownerId: "dina" }), true);
  assert.equal(canWriteHotel(viewer, "jakarta"), false);
  assert.equal(canReadRecord(viewer, { hotelId: "bali", ownerId: "maya" }), false);
});
test("inactive admin cannot access records", () => {
  assert.equal(canWriteHotel(admin, "new-hotel"), true);
  assert.equal(canAccessHotel({ ...admin, active: false }, "jakarta"), false);
  assert.equal(
    canReadRecord({ ...admin, active: false }, { hotelId: "jakarta", ownerId: "dina" }),
    false,
  );
});
