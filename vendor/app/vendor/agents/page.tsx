import type { Metadata } from "next";

import VendorAgents from "@/components/agents/VendorAgents";

export const metadata: Metadata = {
  title: "Agents",
};

export default function VendorAgentsPage() {
  return <VendorAgents />;
}