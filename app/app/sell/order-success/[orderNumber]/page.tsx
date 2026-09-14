import type { Metadata } from "next";
import OrderSuccess from "@/components/order/OrderSuccess";

export const metadata: Metadata = {
  title: "Pickup Confirmed | Celltro",
  robots: { index: false, follow: false },
};

export default async function OrderSuccessPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  return <OrderSuccess orderNumber={decodeURIComponent(orderNumber)} />;
}
