"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  ClipboardList,
} from "lucide-react";

import styles from "./OrderDetailsClient.module.css";

interface OrderDetailsClientProps {
  orderNumber: string;
}

const futureSteps = [
  "Order Created",
  "Vendor Allocated",
  "Vendor Accepted",
  "Agent Assigned",
  "Inspection",
  "Payment",
  "Completed",
];

export default function OrderDetailsClient({
  orderNumber,
}: OrderDetailsClientProps) {
  return (
    <section className={styles.page}>
      <Link href="/orders" className={styles.back}>
        <ArrowLeft size={17} />
        Back to Orders
      </Link>

      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Order details</p>
          <h1>{orderNumber}</h1>
          <p>
            Full order information will be loaded from the
            Vendor Orders API.
          </p>
        </div>
      </div>

      <div className={styles.grid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <ClipboardList size={19} />
            <h2>Order Information</h2>
          </div>

          <div className={styles.empty}>
            <strong>Order data not connected yet</strong>

            <p>
              Customer, device, pickup address, quote and
              assignment information will be displayed here
              after vendor-scoped order APIs are implemented.
            </p>
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <CheckCircle2 size={19} />
            <h2>Order Timeline</h2>
          </div>

          <div className={styles.timeline}>
            {futureSteps.map((step, index) => (
              <div className={styles.timelineItem} key={step}>
                {index === 0 ? (
                  <CheckCircle2
                    className={styles.completeIcon}
                    size={18}
                  />
                ) : (
                  <Circle
                    className={styles.pendingIcon}
                    size={18}
                  />
                )}

                <div>
                  <strong>{step}</strong>
                  <span>
                    {index === 0
                      ? "Order workflow"
                      : "Awaiting backend status"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}