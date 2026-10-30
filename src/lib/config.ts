export function isDemoMode() {
  if (process.env.CRM_DEMO_MODE !== "true") return false;
  const origin = process.env.APP_ORIGIN || "http://localhost:3000";
  const host = new URL(origin).hostname;
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(host) ||
    process.env.K_SERVICE ||
    process.env.FIREBASE_CONFIG
  ) {
    throw new Error("Mode demo hanya diperbolehkan di localhost.");
  }
  return true;
}
export const GROUP_ID = process.env.CRM_GROUP_ID || "main";
if (!/^[a-zA-Z0-9_-]{1,64}$/.test(GROUP_ID)) throw new Error("CRM_GROUP_ID tidak valid.");
