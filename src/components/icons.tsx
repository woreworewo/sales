import {
  House,
  BriefcaseBusiness,
  ListChecks,
  ContactRound,
  ChartNoAxesCombined,
  UsersRound,
  Settings2,
  UserRound,
  Menu,
} from "lucide-react";
export const NAV_ITEMS = [
  { id: "dashboard", label: "Beranda", icon: House },
  { id: "opportunities", label: "Peluang", icon: BriefcaseBusiness },
  { id: "activities", label: "Aktivitas", icon: ListChecks },
  { id: "clients", label: "Klien", icon: ContactRound },
  { id: "reports", label: "Laporan", icon: ChartNoAxesCombined },
  { id: "users", label: "Pengguna", icon: UsersRound },
  { id: "settings", label: "Pengaturan", icon: Settings2 },
  { id: "account", label: "Akun", icon: UserRound },
];
export const MORE_ITEM = { id: "more", label: "Lainnya", icon: Menu };
