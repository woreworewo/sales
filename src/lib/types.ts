export const BUSINESS_TYPES = ["Corporate Room", "Meeting/Event", "Wedding"] as const;
export const STAGES = [
  "Inquiry",
  "Qualified",
  "Proposal",
  "Negotiation",
  "Tentative",
  "Won",
  "Lost",
] as const;
export const ACTIVITY_TYPES = [
  "Sales Call",
  "WhatsApp",
  "Email",
  "Sales Visit",
  "Site Inspection",
] as const;
export const SOURCES = [
  "Sales visit",
  "Website",
  "Instagram",
  "Referral",
  "Repeat business",
  "Wedding fair",
  "Lainnya",
] as const;
export type HotelRole = "manager" | "sales" | "viewer";
export interface BaseRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}
export interface User extends BaseRecord {
  name: string;
  email: string;
  admin: boolean;
  active: boolean;
  hotelAccess: Record<string, HotelRole>;
}
export interface Hotel extends BaseRecord {
  name: string;
  city: string;
  timezone: string;
  active: boolean;
}
export interface Client extends BaseRecord {
  name: string;
  segment: string;
  pic: string;
  email: string;
  phone: string;
  hotelIds: string[];
}
export interface Opportunity extends BaseRecord {
  title: string;
  hotelId: string;
  clientId: string;
  ownerId: string;
  businessType: (typeof BUSINESS_TYPES)[number];
  stage: (typeof STAGES)[number];
  value: number;
  businessDate: string;
  closeDate: string;
  source: string;
  notes: string;
  quantity: number;
  nights: number;
  corporateType: "Pemesanan" | "Kontrak rate";
  venue: string;
  lostReason: string;
  history: { at: string; actorId: string; from: string; to: string }[];
}
export interface Evidence {
  photoPath: string;
  mime: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
  recordedAt: string;
  simulated: boolean;
}
export interface Activity extends BaseRecord {
  hotelId: string;
  clientId: string;
  opportunityId: string;
  ownerId: string;
  type: (typeof ACTIVITY_TYPES)[number];
  occurredAt: string;
  result: string;
  notes: string;
  nextAction: string;
  nextDate: string;
  evidence: Evidence | null;
}
export interface Task extends BaseRecord {
  hotelId: string;
  clientId: string;
  opportunityId: string;
  ownerId: string;
  title: string;
  dueDate: string;
  completedAt: string;
}
export interface Submission extends BaseRecord {
  actorId: string;
  kind: string;
  recordId: string;
}
export interface Collections {
  users: User;
  hotels: Hotel;
  clients: Client;
  opportunities: Opportunity;
  activities: Activity;
  tasks: Task;
  submissions: Submission;
}
export type CollectionName = keyof Collections;
export interface Snapshot {
  actor: User;
  hotels: Hotel[];
  clients: Client[];
  opportunities: Opportunity[];
  activities: Activity[];
  tasks: Task[];
  users: User[];
  scope: string;
  truncated: boolean;
  demo: boolean;
}
export interface ActionResult {
  error?: string;
  redirectTo?: string;
}
