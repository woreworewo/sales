import { test } from "node:test";
import assert from "node:assert/strict";
import { demoSeed } from "./demo-seed";
import {
  dateSchema,
  idSchema,
  locationSchema,
  opportunitySchema,
  parsePhoto,
  activitySchema,
  userSchema,
} from "./validation";

const opportunity = demoSeed().opportunities[0];
test("Won requires confirmed value; Lost requires reason", () => {
  assert.equal(
    opportunitySchema.safeParse({ ...opportunity, stage: "Won", value: 0 }).success,
    false,
  );
  assert.equal(
    opportunitySchema.safeParse({ ...opportunity, stage: "Lost", lostReason: "" }).success,
    false,
  );
  assert.equal(
    opportunitySchema.safeParse({
      ...opportunity,
      stage: "Lost",
      lostReason: "Tanggal tidak tersedia",
    }).success,
    true,
  );
  assert.equal(
    opportunitySchema.safeParse({ ...opportunity, stage: "Won", value: 50000 }).success,
    true,
  );
});
test("calendar dates, path IDs and money are validated", () => {
  assert.equal(dateSchema.safeParse("2026-02-30").success, false);
  assert.equal(dateSchema.safeParse("2028-02-29").success, true);
  assert.equal(idSchema.safeParse("../../users/admin").success, false);
  assert.equal(opportunitySchema.safeParse({ ...opportunity, value: 12.34 }).success, false);
  assert.equal(opportunitySchema.safeParse({ ...opportunity, value: -1 }).success, false);
});
test("photo content must match a supported signature and size", () => {
  assert.throws(() => parsePhoto(new TextEncoder().encode('<svg onload="alert(1)"/>')));
  const bytes = new Uint8Array(12);
  bytes.set([255, 216, 255]);
  assert.equal(parsePhoto(bytes), "image/jpeg");
  assert.throws(() => parsePhoto(new Uint8Array(5 * 1024 * 1024 + 1)));
});
test("location requires finite in-range coordinates", () => {
  const location = {
    latitude: -6.2,
    longitude: 106.8,
    accuracy: 18,
    capturedAt: new Date().toISOString(),
  };
  assert.equal(locationSchema.safeParse(location).success, true);
  assert.equal(locationSchema.safeParse({ ...location, latitude: 100 }).success, false);
  assert.equal(locationSchema.safeParse({ ...location, accuracy: -1 }).success, false);
});
test("follow-up needs a date and membership cannot grant arbitrary roles", () => {
  const activity = {
    ...demoSeed().activities[0],
    taskId: "",
    nextAction: "Kirim proposal",
    nextDate: "",
  };
  assert.equal(activitySchema.safeParse(activity).success, false);
  assert.equal(
    userSchema.safeParse({
      name: "User",
      email: "user@example.com",
      active: true,
      hotelAccess: { jakarta: "admin" },
    }).success,
    false,
  );
  assert.equal(
    userSchema.safeParse({ name: "User", email: "user@example.com", active: true, hotelAccess: {} })
      .success,
    false,
  );
});
