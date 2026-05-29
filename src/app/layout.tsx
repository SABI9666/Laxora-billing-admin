import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Laxora Admin",
  description: "Platform administration for Laxora Billing",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
