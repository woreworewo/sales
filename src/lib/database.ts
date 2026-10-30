import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { CollectionName, Collections } from "./types";
import { GROUP_ID, isDemoMode } from "./config";
import { demoSeed } from "./demo-seed";
import { firestore, storage } from "./firebase-admin";

export interface Transaction {
  get<K extends CollectionName>(collection: K, id: string): Promise<Collections[K] | null>;
  set<K extends CollectionName>(collection: K, record: Collections[K]): void;
}
export interface Filter {
  field: string;
  value: string;
  array?: boolean;
  ownerId?: string;
}
const collectionPath = (collection: CollectionName) => `groups/${GROUP_ID}/${collection}`;
async function sqlite() {
  const { DatabaseSync } = await import("node:sqlite");
  const dir = join(process.cwd(), ".data");
  mkdirSync(dir, { recursive: true });
  const db = new DatabaseSync(join(dir, "demo.sqlite"));
  db.exec(
    "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS records (collection TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(collection,id)); CREATE TABLE IF NOT EXISTS photos (id TEXT PRIMARY KEY, mime TEXT NOT NULL, bytes BLOB NOT NULL);",
  );
  if (!db.prepare("SELECT id FROM records WHERE collection='users' LIMIT 1").get()) {
    db.exec("BEGIN IMMEDIATE");
    try {
      const stmt = db.prepare("INSERT OR IGNORE INTO records VALUES (?,?,?)");
      const seed = demoSeed();
      for (const collection of Object.keys(seed) as CollectionName[])
        for (const record of seed[collection])
          stmt.run(collection, record.id, JSON.stringify(record));
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
  return db;
}
export async function getRecord<K extends CollectionName>(
  collection: K,
  id: string,
): Promise<Collections[K] | null> {
  if (!isDemoMode()) {
    const snap = await firestore().collection(collectionPath(collection)).doc(id).get();
    return snap.exists ? (snap.data() as Collections[K]) : null;
  }
  const db = await sqlite();
  try {
    const row = db
      .prepare("SELECT data FROM records WHERE collection=? AND id=?")
      .get(collection, id);
    return row ? JSON.parse(String(row.data)) : null;
  } finally {
    db.close();
  }
}
export async function queryRecords<K extends CollectionName>(
  collection: K,
  filter?: Filter,
  limit = 101,
): Promise<Collections[K][]> {
  if (!isDemoMode()) {
    let query: FirebaseFirestore.Query = firestore().collection(collectionPath(collection));
    if (filter)
      query = query.where(filter.field, filter.array ? "array-contains" : "==", filter.value);
    if (filter?.ownerId) query = query.where("ownerId", "==", filter.ownerId);
    const snap = await query.orderBy("updatedAt", "desc").limit(limit).get();
    return snap.docs.map((d) => d.data() as Collections[K]);
  }
  const db = await sqlite();
  try {
    const path = filter ? `$.${filter.field}` : "";
    if (filter && !/^[a-zA-Z]+$/.test(filter.field)) throw new Error("Filter tidak valid.");
    const sql =
      "SELECT data FROM records WHERE collection=?" +
      (filter
        ? filter.array
          ? " AND EXISTS(SELECT 1 FROM json_each(json_extract(records.data,?)) WHERE value=?)"
          : " AND json_extract(data,?)=?"
        : "") +
      (filter?.ownerId ? " AND json_extract(data,'$.ownerId')=?" : "") +
      " ORDER BY json_extract(data,'$.updatedAt') DESC, id LIMIT ?";
    const args = filter
      ? [collection, path, filter.value, ...(filter.ownerId ? [filter.ownerId] : []), limit]
      : [collection, limit];
    return db
      .prepare(sql)
      .all(...args)
      .map((row) => JSON.parse(String(row.data)));
  } finally {
    db.close();
  }
}
export async function transact<T>(callback: (tx: Transaction) => Promise<T>): Promise<T> {
  if (!isDemoMode())
    return firestore().runTransaction(async (tx) => {
      const writes: { collection: CollectionName; record: Collections[CollectionName] }[] = [];
      const result = await callback({
        get: async (collection, id) => {
          const doc = await tx.get(firestore().collection(collectionPath(collection)).doc(id));
          return doc.exists ? (doc.data() as never) : null;
        },
        set: (collection, record) => {
          writes.push({ collection, record });
        },
      });
      for (const w of writes)
        tx.set(firestore().collection(collectionPath(w.collection)).doc(w.record.id), w.record);
      return result;
    });
  const db = await sqlite();
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = await callback({
      get: async (collection, id) => {
        const row = db
          .prepare("SELECT data FROM records WHERE collection=? AND id=?")
          .get(collection, id);
        return row ? JSON.parse(String(row.data)) : null;
      },
      set: (collection, record) => {
        db.prepare(
          "INSERT INTO records VALUES(?,?,?) ON CONFLICT(collection,id) DO UPDATE SET data=excluded.data",
        ).run(collection, record.id, JSON.stringify(record));
      },
    });
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    db.close();
  }
}
export async function transactOnce(
  key: string,
  actorId: string,
  kind: string,
  recordId: string,
  callback: (tx: Transaction) => Promise<void>,
) {
  return transact(async (tx) => {
    const actor = await tx.get("users", actorId);
    if (!actor?.active) throw new Error("Akun tidak aktif.");
    const previous = await tx.get("submissions", key);
    if (previous) return { id: previous.recordId, replayed: true };
    await callback(tx);
    const now = new Date().toISOString();
    tx.set("submissions", {
      id: key,
      actorId,
      kind,
      recordId,
      createdAt: now,
      updatedAt: now,
      version: 1,
    });
    return { id: recordId, replayed: false };
  });
}
export async function storePhoto(id: string, mime: string, bytes: Uint8Array) {
  if (!isDemoMode()) {
    await storage()
      .file(`groups/${GROUP_ID}/evidence/${id}`)
      .save(Buffer.from(bytes), {
        resumable: false,
        metadata: { contentType: mime, cacheControl: "private, no-store" },
      });
    return;
  }
  const db = await sqlite();
  try {
    db.prepare("INSERT INTO photos VALUES(?,?,?)").run(id, mime, bytes);
  } finally {
    db.close();
  }
}
export async function readPhoto(id: string): Promise<{ mime: string; bytes: Uint8Array } | null> {
  if (!isDemoMode()) {
    const file = storage().file(`groups/${GROUP_ID}/evidence/${id}`);
    const [[bytes], [metadata]] = await Promise.all([file.download(), file.getMetadata()]);
    return { bytes, mime: metadata.contentType || "image/jpeg" };
  }
  const db = await sqlite();
  try {
    const row = db.prepare("SELECT mime,bytes FROM photos WHERE id=?").get(id);
    return row ? { mime: String(row.mime), bytes: row.bytes as Uint8Array } : null;
  } finally {
    db.close();
  }
}
export async function removePhoto(id: string) {
  if (!isDemoMode()) {
    await storage().file(`groups/${GROUP_ID}/evidence/${id}`).delete({ ignoreNotFound: true });
    return;
  }
  const db = await sqlite();
  try {
    db.prepare("DELETE FROM photos WHERE id=?").run(id);
  } finally {
    db.close();
  }
}
