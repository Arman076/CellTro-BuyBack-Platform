"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./OrderPages.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const STATUS_FLOW = [
  "PICKUP_REQUESTED",
  "PICKUP_CONFIRMED",
  "PICKUP_STARTED",
  "INSPECTION_COMPLETED",
  "PAYMENT_COMPLETED",
  "COMPLETED",
];

const STATUS_LABELS: Record<string, string> = {
  PICKUP_REQUESTED: "Pickup Requested",
  PICKUP_CONFIRMED: "Pickup Confirmed",
  PICKUP_STARTED: "Pickup Started",
  INSPECTION_COMPLETED: "Inspection",
  PAYMENT_COMPLETED: "Payment",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

type PickupSlot = {
  code: string;
  label: string;
};

type OrderView = {
  orderNumber: string;
  status: string;
  productName: string;
  productImage?: string | null;
  variantLabel: string;
  basePrice: number;
  totalDeduction: number;
  finalPrice: number;
  pickupDate: string;
  pickupSlot: { code: string; label: string };
  payoutMethod: "CASH" | "UPI";
  payoutUpiMobile?: string | null;
  address: {
    fullName: string;
    phone: string;
    house: string;
    street: string;
    locality: string;
    landmark?: string | null;
    city: string;
    state: string;
    pincode: string;
    type: string;
  };
  statusHistory: Array<{
    id: number;
    status: string;
    note?: string | null;
    createdAt: string;
  }>;
  reschedules: Array<{
    id: number;
    oldPickupDate: string;
    newPickupDate: string;
    oldSlotLabel: string;
    newSlotLabel: string;
    createdAt: string;
  }>;
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

function nextDates(days = 7) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + index);
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  });
}

export default function OrderDetails({ orderNumber }: { orderNumber: string }) {
  const [order, setOrder] = useState<OrderView | null>(null);
  const [slots, setSlots] = useState<PickupSlot[]>([]);
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newSlotCode, setNewSlotCode] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const dates = useMemo(() => nextDates(), []);

  const loadOrder = useCallback(async () => {
    try {
      setError("");
      const response = await fetch(
        `${API}/orders/${encodeURIComponent(orderNumber)}`,
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || "Unable to load order.");
      setOrder(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load order.");
    }
  }, [orderNumber]);

  useEffect(() => {
    loadOrder();

    fetch(`${API}/orders/pickup-slots`)
      .then((response) => response.json())
      .then((data) => setSlots(Array.isArray(data) ? data : []))
      .catch(() => undefined);
  }, [loadOrder]);

  const activeIndex = order ? STATUS_FLOW.indexOf(order.status) : -1;

  async function reschedule() {
    if (!newDate || !newSlotCode) {
      setError("Select a new pickup date and time slot.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch(
        `${API}/orders/${encodeURIComponent(orderNumber)}/reschedule`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pickupDate: newDate,
            pickupSlotCode: newSlotCode,
          }),
        },
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || "Unable to reschedule.");

      setShowReschedule(false);
      setNewDate("");
      setNewSlotCode("");
      await loadOrder();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to reschedule.");
    } finally {
      setSaving(false);
    }
  }

  async function cancelOrder() {
    if (!window.confirm("Cancel this pickup request?")) return;

    try {
      setSaving(true);
      setError("");

      const response = await fetch(
        `${API}/orders/${encodeURIComponent(orderNumber)}/cancel`,
        {
          method: "PATCH",
        },
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || "Unable to cancel order.");
      await loadOrder();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to cancel order.");
    } finally {
      setSaving(false);
    }
  }

  if (!order && !error) {
    return <div className={styles.loading}>Loading order details...</div>;
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {error && <div className={styles.error}>{error}</div>}

        {order && (
          <>
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
                  <p>Status: {STATUS_LABELS[order.status] || order.status}</p>
                </div>
                <div className={styles.price}>{money(order.finalPrice)}</div>
              </div>

              <div className={styles.rows}>
                <div className={styles.row}>
                  <span>Base Value</span>
                  <strong>{money(order.basePrice)}</strong>
                </div>
                <div className={styles.row}>
                  <span>Condition Adjustment</span>
                  <strong>-{money(order.totalDeduction)}</strong>
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
            </section>

            <section className={styles.card}>
              <strong>Order Status</strong>

              <div className={styles.timeline}>
                {STATUS_FLOW.map((status, index) => {
                  const active =
                    order.status !== "CANCELLED" && index <= Math.max(activeIndex, 0);

                  return (
                    <div
                      key={status}
                      className={`${styles.timelineItem} ${
                        active ? styles.timelineItemActive : ""
                      }`}
                    >
                      <span className={styles.timelineDot}>{active ? "✓" : ""}</span>
                      <strong>{STATUS_LABELS[status]}</strong>
                    </div>
                  );
                })}
              </div>

              {order.status === "CANCELLED" && (
                <div className={styles.banner}>This pickup request was cancelled.</div>
              )}

              <div className={styles.historyList}>
                {order.statusHistory.map((item) => (
                  <div key={item.id} className={styles.historyItem}>
                    <span className={styles.historyDot} />
                    <div>
                      <strong>{STATUS_LABELS[item.status] || item.status}</strong>
                      <span>{item.note || "Order status updated."}</span>
                    </div>
                    <time>
                      {new Intl.DateTimeFormat("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(item.createdAt))}
                    </time>
                  </div>
                ))}
              </div>

              <div className={styles.twoCol}>
                <div className={styles.detailBox}>
                  <span>Pickup Address</span>
                  <strong>
                    {order.address.fullName}
                    <br />
                    {order.address.house}, {order.address.street},{" "}
                    {order.address.locality}
                    {order.address.landmark ? `, ${order.address.landmark}` : ""}
                    <br />
                    {order.address.city}, {order.address.state} -{" "}
                    {order.address.pincode}
                  </strong>
                </div>

                <div className={styles.detailBox}>
                  <span>Pickup Date & Time</span>
                  <strong>
                    {dateText(order.pickupDate)}
                    <br />
                    {order.pickupSlot.label}
                  </strong>
                </div>
              </div>

              {order.reschedules.length > 0 && (
                <div className={styles.detailBox} style={{ marginTop: 14 }}>
                  <span>Reschedule History</span>
                  {order.reschedules.map((item) => (
                    <strong key={item.id} style={{ marginTop: 8 }}>
                      {dateText(item.oldPickupDate)} · {item.oldSlotLabel}
                      {" → "}
                      {dateText(item.newPickupDate)} · {item.newSlotLabel}
                    </strong>
                  ))}
                </div>
              )}

              {order.status !== "CANCELLED" && order.status !== "COMPLETED" && (
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.dangerButton}
                    onClick={cancelOrder}
                    disabled={saving}
                  >
                    Cancel Order
                  </button>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => setShowReschedule(true)}
                  >
                    Reschedule
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {showReschedule && order && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <h3>Reschedule Pickup</h3>
            <p>
              Current: {dateText(order.pickupDate)} · {order.pickupSlot.label}
            </p>

            <div className={styles.field}>
              <label htmlFor="newDate">New pickup date</label>
              <select
                id="newDate"
                value={newDate}
                onChange={(event) => setNewDate(event.target.value)}
              >
                <option value="">Select date</option>
                {dates.map((value) => (
                  <option key={value} value={value}>
                    {dateText(`${value}T00:00:00.000Z`)}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="newSlot">New time slot</label>
              <select
                id="newSlot"
                value={newSlotCode}
                onChange={(event) => setNewSlotCode(event.target.value)}
              >
                <option value="">Select time slot</option>
                {slots.map((slot) => (
                  <option key={slot.code} value={slot.code}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setShowReschedule(false)}
              >
                Close
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={reschedule}
                disabled={saving}
              >
                {saving ? "Saving..." : "Confirm Reschedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
