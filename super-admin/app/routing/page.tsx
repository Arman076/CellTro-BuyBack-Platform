import type { Metadata } from "next";

import SuperAdminShell from "@/components/layout/SuperAdminShell";
import RoutingClient from "@/components/routing/RoutingClient";

export const metadata: Metadata = {
  title: "Service Areas & Routing",
};

export default function RoutingPage() {
  return (
    <SuperAdminShell>
      <RoutingClient />
    </SuperAdminShell>
  );
}