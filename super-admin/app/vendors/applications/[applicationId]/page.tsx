import type { Metadata } from "next";

import SuperAdminShell from "@/components/layout/SuperAdminShell";
import VendorApplicationDetailClient from "@/components/vendor-applications/VendorApplicationDetailClient";

export const metadata: Metadata = {
  title: "Vendor Application | Celltro Super Admin",
};

type PageProps = {
  params: Promise<{
    applicationId: string;
  }>;
};

export default async function VendorApplicationDetailPage({
  params,
}: PageProps) {
  const { applicationId } = await params;

  return (
    <SuperAdminShell>
      <VendorApplicationDetailClient
        applicationId={applicationId}
      />
    </SuperAdminShell>
  );
}