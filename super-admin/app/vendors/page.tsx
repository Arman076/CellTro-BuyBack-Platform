import type { Metadata } from "next";

import SuperAdminShell from "@/components/layout/SuperAdminShell";
import VendorsClient from "@/components/vendors/VendorsClient";

export const metadata: Metadata = {
  title: "Vendors | Celltro Super Admin",
};

export default function VendorsPage() {
  return (
    <SuperAdminShell>
      <VendorsClient />
    </SuperAdminShell>
  );
}