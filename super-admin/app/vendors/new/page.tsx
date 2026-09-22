import type { Metadata } from "next";

import SuperAdminShell from "@/components/layout/SuperAdminShell";
import VendorForm from "@/components/vendors/VendorForm";

export const metadata: Metadata = {
  title: "Add Vendor | Celltro Super Admin",
};

export default function NewVendorPage() {
  return (
    <SuperAdminShell>
      <VendorForm />
    </SuperAdminShell>
  );
}