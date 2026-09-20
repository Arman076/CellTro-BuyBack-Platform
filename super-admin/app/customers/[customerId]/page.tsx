import type { Metadata } from "next";

import SuperAdminShell from "@/components/layout/SuperAdminShell";
import CustomerDetailClient from "@/components/customers/CustomerDetailClient";

export const metadata: Metadata = {
  title: "Customer Details | Celltro Super Admin",
};

type CustomerDetailsPageProps = {
  params: Promise<{
    customerId: string;
  }>;
};

export default async function CustomerDetailsPage({
  params,
}: CustomerDetailsPageProps) {
  const { customerId } = await params;

  return (
    <SuperAdminShell>
      <CustomerDetailClient
        customerId={customerId}
      />
    </SuperAdminShell>
  );
}