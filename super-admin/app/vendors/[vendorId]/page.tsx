import type { Metadata } from "next";

import SuperAdminShell from "@/components/layout/SuperAdminShell";
import VendorDetailClient from "@/components/vendors/VendorDetailClient";

export const metadata: Metadata = {
  title: "Vendor Details | Celltro Super Admin",
};

type VendorDetailsPageProps = {
  params: Promise<{
    vendorId: string;
  }>;
};

export default async function VendorDetailsPage({
  params,
}: VendorDetailsPageProps) {
  const { vendorId } = await params;

  return (
    <SuperAdminShell>
      <VendorDetailClient vendorId={vendorId} />
    </SuperAdminShell>
  );
}