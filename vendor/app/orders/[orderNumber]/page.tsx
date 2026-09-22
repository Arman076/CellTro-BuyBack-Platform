import type { Metadata } from "next";

import OrderDetailsClient from "@/components/orders/OrderDetailsClient";

interface OrderDetailsPageProps {
  params: Promise<{
    orderNumber: string;
  }>;
}

export const metadata: Metadata = {
  title: "Order Details",
};

export default async function OrderDetailsPage({
  params,
}: OrderDetailsPageProps) {
  const { orderNumber } = await params;

  return (
    <OrderDetailsClient
      orderNumber={decodeURIComponent(orderNumber)}
    />
  );
}