import type { Metadata } from "next";
import "./globals.css";
import { Manrope } from "next/font/google";


import CustomerHeader from "@/components/customer/CustomerHeader";
import CustomerFooter from "@/components/customer/CustomerFooter";

export const metadata: Metadata = {
  title: {
    default: "CELLTRO",
    template: "%s | CELLTRO",
  },
  description:
    "Sell your used mobile phones and electronic devices online with CELLTRO.",
};

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={manrope.className}>
        <CustomerHeader />

        {children}

        <CustomerFooter />
      </body>
    </html>
  );
}