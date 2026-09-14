import type { Metadata } from "next";
import PickupSlotClient from "./PickupSlotClient";

export const metadata: Metadata = {
  title: "Choose Pickup Slot | Celltro",
  description: "Choose a convenient date and time for your device pickup.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PickupSlotPage() {
  return <PickupSlotClient />;
}
