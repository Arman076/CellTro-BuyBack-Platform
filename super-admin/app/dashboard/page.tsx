import type { Metadata } from "next";

import SuperAdminShell from "@/components/layout/SuperAdminShell";
import DashboardClient from "@/components/dashboard/DashboardClient";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <SuperAdminShell>
      <DashboardClient />
    </SuperAdminShell>
  );
}