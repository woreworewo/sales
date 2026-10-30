import { adminAuth, firestore } from "../src/lib/firebase-admin";
import { GROUP_ID } from "../src/lib/config";
import { userSchema } from "../src/lib/validation";

async function main() {
  if (process.env.CRM_DEMO_MODE === "true")
    throw new Error("Nonaktifkan CRM_DEMO_MODE sebelum bootstrap Firebase.");
  if (!process.env.FIREBASE_PROJECT_ID) throw new Error("Isi FIREBASE_PROJECT_ID terlebih dahulu.");
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL || "";
  userSchema.shape.email.parse(email);
  let account;
  try {
    account = await adminAuth().getUserByEmail(email);
  } catch (error) {
    if ((error as { code?: string }).code !== "auth/user-not-found") throw error;
    account = await adminAuth().createUser({ email, displayName: "Group Admin" });
  }
  const ref = firestore().doc(`groups/${GROUP_ID}/users/${account.uid}`);
  await firestore().runTransaction(async (tx) => {
    const old = await tx.get(ref);
    const now = new Date().toISOString();
    tx.set(ref, {
      id: account.uid,
      name: old.data()?.name || "Group Admin",
      email,
      admin: true,
      active: true,
      hotelAccess: old.data()?.hotelAccess || {},
      createdAt: old.data()?.createdAt || now,
      updatedAt: now,
      version: (old.data()?.version || 0) + 1,
    });
  });
  console.log(
    "Admin berhasil disiapkan. Aktifkan Google sign-in, lalu login dan tambahkan hotel melalui Pengaturan.",
  );
}
void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Bootstrap gagal.");
  process.exitCode = 1;
});
