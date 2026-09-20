import type { Metadata } from "next";

import SuperAdminShell from "@/components/layout/SuperAdminShell";
import EnquiriesClient from "@/components/enquiries/EnquiriesClient";

export const metadata: Metadata = {
  title: "Enquiries",
};

export default function EnquiriesPage() {
  return (
    <SuperAdminShell>
      <EnquiriesClient />
    </SuperAdminShell>
  );
}