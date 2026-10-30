import type { Opportunity } from "./types";

export const currency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
export const compactCurrency = (value: number) =>
  value >= 1_000_000
    ? `Rp${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value / 1_000_000)} jt`
    : currency(value);
export function formatDate(value: string, timezone = "Asia/Jakarta") {
  if (!value) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: timezone,
  }).format(new Date(value.length === 10 ? value + "T12:00:00Z" : value));
}
export function today(timezone = "Asia/Jakarta") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function businessValue(record: Opportunity) {
  return record.businessType === "Corporate Room" && record.corporateType === "Kontrak rate"
    ? 0
    : record.value;
}
export function metrics(records: Opportunity[], month: string) {
  const open = records.filter((r) => !["Won", "Lost"].includes(r.stage));
  const closed = records.filter(
    (r) => ["Won", "Lost"].includes(r.stage) && r.closeDate.startsWith(month),
  );
  const won = closed.filter((r) => r.stage === "Won");
  return {
    pipeline: open.reduce((n, r) => n + businessValue(r), 0),
    confirmed: won.reduce((n, r) => n + businessValue(r), 0),
    openCount: open.length,
    won: won.length,
    lost: closed.length - won.length,
    conversion: closed.length ? Math.round((won.length / closed.length) * 100) : null,
  };
}
