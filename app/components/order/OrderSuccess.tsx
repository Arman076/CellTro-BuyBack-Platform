"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./OrderPages.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type OrderView = {
  orderNumber: string;
  status: string;
  productName: string;
  productImage?: string | null;
  variantLabel: string;
  finalPrice: number;
  pickupDate: string;
  pickupSlot: { label: string };
  payoutMethod: "CASH" | "UPI";
  payoutUpiMobile?: string | null;
  address: {
    fullName: string;
    house: string;
    street: string;
    locality: string;
    landmark?: string | null;
    city: string;
    state: string;
    pincode: string;
  };
  createdAt: string;
};

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function dateText(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function OrderSuccess({ orderNumber }: { orderNumber: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<OrderView | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API}/orders/${encodeURIComponent(orderNumber)}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.message || "Unable to load order.");
        return data;
      })
      .then(setOrder)
      .catch((e) => setError(e instanceof Error ? e.message : "Unable to load order."));
  }, [orderNumber]);

  if (!order && !error) {
    return <div className={styles.loading}>Loading order confirmation...</div>;
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {error && <div className={styles.error}>{error}</div>}

        {order && (
          <>
            <header className={styles.centerHeader}>
              <div className={styles.successIcon}>✓</div>
              <h1>Thank You!</h1>
              <p>Your pickup request has been confirmed.</p>
            </header>

            <div className={styles.banner}>
              Final value will be confirmed after physical inspection if the actual
              device condition differs from the questionnaire answers.
            </div>

            <section className={styles.card}>
              <div className={styles.orderHero}>
                <div className={styles.deviceImage}>
                  {order.productImage ? (
                    <img src={order.productImage} alt={order.productName} />
                  ) : (
                    <span>DEVICE</span>
                  )}
                </div>
                <div>
                  <h2>{order.productName}</h2>
                  <p>{order.variantLabel}</p>
                  <p>Order ID: {order.orderNumber}</p>
                </div>
                <div className={styles.price}>{money(order.finalPrice)}</div>
              </div>
            </section>

            <section className={styles.card}>
              <strong>Order Details</strong>
              <div className={styles.rows}>
                <div className={styles.row}>
                  <span>Order Date</span>
                  <strong>{dateText(order.createdAt)}</strong>
                </div>
                <div className={styles.row}>
                  <span>Pickup Address</span>
                  <strong>
                    {order.address.house}, {order.address.street},{" "}
                    {order.address.locality}
                    {order.address.landmark ? `, ${order.address.landmark}` : ""},{" "}
                    {order.address.city}, {order.address.state} -{" "}
                    {order.address.pincode}
                  </strong>
                </div>
                <div className={styles.row}>
                  <span>Pickup Date & Time</span>
                  <strong>
                    {dateText(order.pickupDate)} · {order.pickupSlot.label}
                  </strong>
                </div>
                <div className={styles.row}>
                  <span>Payment Preference</span>
                  <strong>
                    {order.payoutMethod === "CASH"
                      ? "Cash"
                      : `UPI · ******${order.payoutUpiMobile?.slice(-4) || ""}`}
                  </strong>
                </div>
              </div>

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() =>
                    router.push(`/orders/${encodeURIComponent(order.orderNumber)}`)
                  }
                >
                  View Order Details
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
