import type { Metadata } from "next";
import type { ReactNode } from "react";

import VendorShell from "@/components/layout/VendorShell";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Vendor Panel | Celltro",
    template: "%s | Celltro Vendor",
  },
  description: "Celltro vendor operations portal.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <VendorShell>{children}</VendorShell>
      </body>
    </html>
  );
}