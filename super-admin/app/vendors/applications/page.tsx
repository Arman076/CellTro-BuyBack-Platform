import type { Metadata } from "next";

import SuperAdminShell from "@/components/layout/SuperAdminShell";
import VendorApplicationsClient from "@/components/vendor-applications/VendorApplicationsClient";

export const metadata: Metadata = {
  title: "Vendor Applications | Celltro Super Admin",
};

export default function VendorApplicationsPage() {
  return (
    <SuperAdminShell>
      <VendorApplicationsClient />
    </SuperAdminShell>
  );
}