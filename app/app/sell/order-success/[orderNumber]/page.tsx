"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import styles from "./OrderSuccess.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type StatusHistory = {
  id: number;
  status: string;
  note?: string | null;
  createdAt: string;
};

type Order = {
  orderNumber: string;
  status: string;

  productName: string;
  productImage?: string | null;
  variantLabel?: string | null;

  finalPrice: number;

  pickupDate: string;
  pickupSlot?: {
    code?: string;
    label?: string;
    startTime?: string;
    endTime?: string;
  } | null;

  statusHistory?: StatusHistory[];
};

function statusLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export default function OrderSuccessPage() {
  const params = useParams<{ orderNumber: string }>();
  const router = useRouter();

  const orderNumber = decodeURIComponent(
    String(params?.orderNumber || ""),
  );

  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderNumber) return;

    let cancelled = false;

    async function loadOrder() {
      try {
        setError("");

        const response = await fetch(
          `${API}/orders/${encodeURIComponent(orderNumber)}`,
          {
            credentials: "include",
            cache: "no-store",
          },
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          const message = Array.isArray(data?.message)
            ? data.message.join(", ")
            : data?.message || "Unable to load order.";

          throw new Error(message);
        }

        if (!cancelled) {
          setOrder(data);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : "Unable to load order.",
          );
        }
      }
    }

    void loadOrder();

    return () => {
      cancelled = true;
    };
  }, [orderNumber]);

  if (error) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.messageCard}>
            <div className={styles.messageIcon}>!</div>

            <h1>Unable to load order</h1>
            <p>{error}</p>

            <Link href="/my-orders" className={styles.messageButton}>
              View My Orders
            </Link>
          </section>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.messageCard}>
            Loading your order...
          </section>
        </div>
      </main>
    );
  }

  const canModifyOrder = ![
    "COMPLETED",
    "CANCELLED",
    "PAYMENT_COMPLETED",
  ].includes(order.status);

  const timeline = order.statusHistory || [];

  return (
    <main className={styles.page}>
      <div className={styles.shell}>

        {/* SUCCESS MESSAGE */}
        <section className={styles.successBanner}>
          <div className={styles.successTick}>✓</div>

          <div>
            <span>ORDER CONFIRMED</span>

            <h1>Your pickup request is confirmed</h1>

            <p>
              Your device pickup has been successfully scheduled.
              You can track all updates from My Orders.
            </p>
          </div>
        </section>

        {/* PRODUCT + ORDER */}
        <section className={styles.productCard}>
          <div className={styles.productImageBox}>
            {order.productImage ? (
              <img
                src={order.productImage}
                alt={order.productName}
                className={styles.productImage}
              />
            ) : (
              <div className={styles.devicePlaceholder}>
                <span>DEVICE</span>
              </div>
            )}
          </div>

          <div className={styles.productInformation}>
            <div className={styles.productTop}>
              <span className={styles.productEyebrow}>
                YOUR DEVICE
              </span>

              <span className={styles.statusBadge}>
                {statusLabel(order.status)}
              </span>
            </div>

            <h2>{order.productName}</h2>

            {order.variantLabel && (
              <p className={styles.variant}>
                {order.variantLabel}
              </p>
            )}

            <div className={styles.orderNumber}>
              <span>Order ID</span>
              <strong>{order.orderNumber}</strong>
            </div>
          </div>
        </section>

        {/* QUICK SUMMARY */}
        <section className={styles.summaryCard}>
          <div className={styles.summaryItem}>
            <span>Expected Value</span>
            <strong>{formatMoney(order.finalPrice)}</strong>
            <small>Based on submitted condition</small>
          </div>

          <div className={styles.summaryItem}>
            <span>Pickup Date</span>
            <strong>{formatDate(order.pickupDate)}</strong>
            <small>Your selected pickup date</small>
          </div>

          <div className={styles.summaryItem}>
            <span>Pickup Time</span>
            <strong>
              {order.pickupSlot?.label || "Not available"}
            </strong>
            <small>Pickup slot</small>
          </div>
        </section>

        {/* WHAT HAPPENS NEXT */}
        <section className={styles.nextCard}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.sectionKicker}>
                NEXT STEPS
              </span>

              <h2>What happens next?</h2>

              <p>
                Here&apos;s how your device pickup will proceed.
              </p>
            </div>
          </div>

          <div className={styles.process}>
            <div className={styles.processItem}>
              <div className={styles.processIcon}>1</div>

              <div>
                <strong>Pickup Request</strong>
                <span>Pickup has been scheduled</span>
              </div>
            </div>

            <div className={styles.processArrow}>→</div>

            <div className={styles.processItem}>
              <div className={styles.processIcon}>2</div>

              <div>
                <strong>Device Pickup</strong>
                <span>Pickup team visits your address</span>
              </div>
            </div>

            <div className={styles.processArrow}>→</div>

            <div className={styles.processItem}>
              <div className={styles.processIcon}>3</div>

              <div>
                <strong>Inspection</strong>
                <span>Physical condition is verified</span>
              </div>
            </div>

            <div className={styles.processArrow}>→</div>

            <div className={styles.processItem}>
              <div className={styles.processIcon}>4</div>

              <div>
                <strong>Payment</strong>
                <span>Payout after successful deal</span>
              </div>
            </div>
          </div>

          <div className={styles.infoNote}>
            These are process steps only. Your actual order status is
            shown in the timeline below.
          </div>
        </section>

        {/* ACTUAL TIMELINE */}
        <section className={styles.timelineCard}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.sectionKicker}>
                LIVE STATUS
              </span>

              <h2>Order Timeline</h2>

              <p>
                Only actual updates recorded for this order are
                displayed here.
              </p>
            </div>
          </div>

          <div className={styles.timeline}>
            {timeline.map((item, index) => (
              <div
                className={styles.timelineItem}
                key={item.id}
              >
                <div className={styles.timelineRail}>
                  <span className={styles.timelineDot} />

                  {index < timeline.length - 1 && (
                    <span className={styles.timelineLine} />
                  )}
                </div>

                <div className={styles.timelineContent}>
                  <div className={styles.timelineTitle}>
                    <strong>
                      {statusLabel(item.status)}
                    </strong>

                    <small>
                      {formatDateTime(item.createdAt)}
                    </small>
                  </div>

                  {item.note && (
                    <p>{item.note}</p>
                  )}
                </div>
              </div>
            ))}

            {!timeline.length && (
              <p className={styles.emptyTimeline}>
                No order timeline events are available yet.
              </p>
            )}
          </div>
        </section>

        {/* ACTIONS */}
        <section className={styles.actionsCard}>
          <div className={styles.actionsText}>
            <strong>Manage your pickup</strong>

            <span>
              Need to change the pickup date or view your
              complete order?
            </span>
          </div>

          <div className={styles.actions}>
            {canModifyOrder && (
              <>
                <button
                  type="button"
                  className={styles.rescheduleButton}
                  onClick={() =>
                    router.push(
                      `/my-orders/${encodeURIComponent(
                        order.orderNumber,
                      )}?reschedule=1`,
                    )
                  }
                >
                  Reschedule Pickup
                </button>

                <Link
                  className={styles.cancelButton}
                  href={`/my-orders/${encodeURIComponent(
                    order.orderNumber,
                  )}?cancel=1`}
                >
                  Cancel Order
                </Link>
              </>
            )}

            <Link
              className={styles.ordersButton}
              href="/my-orders"
            >
              View Orders
            </Link>
          </div>
        </section>

        <div className={styles.securityNote}>
          <span>✓</span>

          <p>
            Your order details are linked to your verified
            customer session.
          </p>
        </div>
      </div>
    </main>
  );
}