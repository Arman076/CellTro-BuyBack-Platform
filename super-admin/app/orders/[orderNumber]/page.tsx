import type { Metadata } from "next";

import SuperAdminShell from "@/components/layout/SuperAdminShell";
import OrderDetailsClient from "@/components/orders/OrderDetailsClient";

export const metadata: Metadata = {
  title: "Order Details | Celltro",
};

type OrderDetailsPageProps = {
  params: Promise<{
    orderNumber: string;
  }>;
};

export default async function OrderDetailsPage({
  params,
}: OrderDetailsPageProps) {
  const { orderNumber } = await params;

  return (
    <SuperAdminShell>
      <OrderDetailsClient
        orderNumber={orderNumber}
      />
    </SuperAdminShell>
  );
}