import type { Metadata } from "next";
import OrderDetails from "@/components/order/OrderDetails";

export const metadata: Metadata = {
  title: "Order Details | Celltro",
  robots: { index: false, follow: false },
};

export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  return <OrderDetails orderNumber={decodeURIComponent(orderNumber)} />;
}
