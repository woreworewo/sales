import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sales · Hotel CRM",
  description: "Workspace sales dan marketing untuk grup hotel.",
  robots: { index: false, follow: false },
  icons: { icon: "/icon.svg" },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
