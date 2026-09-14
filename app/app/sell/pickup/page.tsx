import type { Metadata } from "next";
import PickupPageClient from "./PickupPageClient";

export const metadata: Metadata = {
  title: "Schedule Device Pickup | Celltro",
  description: "Choose your address, pickup slot and payout preference.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PickupPage() {
  return <PickupPageClient />;
}
