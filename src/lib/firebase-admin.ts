import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

export function adminApp() {
  return (
    getApps()[0] ||
    initializeApp({
      credential: applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID || undefined,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || undefined,
    })
  );
}
export const adminAuth = () => getAuth(adminApp());
export const firestore = () => getFirestore(adminApp());
export const storage = () => getStorage(adminApp()).bucket();
