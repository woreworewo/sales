import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { tmpdir } from "node:os";
import {
  getRecord,
  queryRecords,
  readPhoto,
  removePhoto,
  storePhoto,
  transact,
  transactOnce,
} from "./database";

test("local adapter persists records, rolls back failed mutations and isolates owner queries", async () => {
  const original = process.cwd(),
    directory = mkdtempSync(join(tmpdir(), "aruna-crm-test-"));
  process.env.CRM_DEMO_MODE = "true";
  process.env.APP_ORIGIN = "http://localhost:3000";
  process.chdir(directory);
  try {
    const actor = await getRecord("users", "andi");
    assert.ok(actor);
    const hotel = await getRecord("hotels", "jakarta");
    assert.ok(hotel);
    await assert.rejects(
      transact(async (tx) => {
        tx.set("hotels", { ...hotel, name: "Uncommitted" });
        throw new Error("Rollback");
      }),
    );
    assert.equal((await getRecord("hotels", "jakarta"))?.name, "Aruna Jakarta");
    await transact(async (tx) => {
      const current = await tx.get("hotels", "jakarta");
      assert.ok(current);
      tx.set("hotels", { ...current, name: "Persisted Hotel", version: current.version + 1 });
    });
    assert.equal((await getRecord("hotels", "jakarta"))?.name, "Persisted Hotel");
    const own = await queryRecords("opportunities", {
      field: "hotelId",
      value: "bandung",
      ownerId: "rafi",
    });
    assert.ok(own.length > 0);
    assert.ok(own.every((r) => r.hotelId === "bandung" && r.ownerId === "rafi"));
    assert.equal(
      (await queryRecords("opportunities", { field: "hotelId", value: "bandung", ownerId: "dina" }))
        .length,
      0,
    );
    const clients = await queryRecords("clients", {
      field: "hotelIds",
      value: "jakarta",
      array: true,
    });
    assert.ok(clients.every((c) => c.hotelIds.includes("jakarta")));
    const bytes = new Uint8Array([1, 2, 3, 4]);
    await storePhoto("test-photo", "image/jpeg", bytes);
    assert.deepEqual((await readPhoto("test-photo"))?.bytes, bytes);
    await removePhoto("test-photo");
    assert.equal(await readPhoto("test-photo"), null);
    let mutations = 0;
    const save = async () =>
      transactOnce("unique-request", "andi", "hotel", "jakarta", async (tx) => {
        mutations++;
        const h = await tx.get("hotels", "jakarta");
        assert.ok(h);
        tx.set("hotels", { ...h, version: h.version + 1 });
      });
    const first = await save(),
      retry = await save();
    assert.equal(first.replayed, false);
    assert.equal(retry.replayed, true);
    assert.equal(mutations, 1);
    assert.equal(first.id, retry.id);
  } finally {
    process.chdir(original);
    const target = resolve(directory),
      base = resolve(tmpdir());
    assert.ok(target.startsWith(base + "\\") || target.startsWith(base + "/"));
    assert.ok(basename(target).startsWith("aruna-crm-test-"));
    rmSync(target, { recursive: true, force: true });
  }
});
