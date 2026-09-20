import type {
  Metadata,
} from "next";

import SuperAdminShell from "@/components/layout/SuperAdminShell";
import CustomersClient from "@/components/customers/CustomersClient";

export const metadata: Metadata = {
  title:
    "Customers | Celltro Super Admin",
};

export default function CustomersPage() {
  return (
    <SuperAdminShell>
      <CustomersClient />
    </SuperAdminShell>
  );
}