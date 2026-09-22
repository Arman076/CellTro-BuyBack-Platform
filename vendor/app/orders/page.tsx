import type { Metadata } from "next";

import OrdersClient from "@/components/orders/OrdersClient";

export const metadata: Metadata = {
  title: "Orders",
};

export default function OrdersPage() {
  return <OrdersClient orders={[]} />;
}