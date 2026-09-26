"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AgentSidebar from "@/components/agent-sidebar";
import {
  ApiError,
  getAgentInspection,
  getAgentOrder,
  type AgentInspectionResponse,
  type AgentOrderDetailResponse,
} from "@/lib/agent-api";
import "./quote.css";

type PageProps = { params: Promise<{ orderNumber: string }> };

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError || error instanceof Error)
    return error.message || fallback;
  return fallback;
}

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function AgentFinalQuotePage({ params }: PageProps) {
  const { orderNumber } = use(params);
  const router = useRouter();
  const [inspection, setInspection] = useState<AgentInspectionResponse | null>(
    null,
  );
  const [order, setOrder] = useState<AgentOrderDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getAgentInspection(orderNumber), getAgentOrder(orderNumber)])
      .then(([inspectionResponse, orderResponse]) => {
        if (cancelled) return;

        if (
          inspectionResponse.inspection.status !== "COMPLETED" ||
          !inspectionResponse.inspection.quote
        ) {
          router.replace(
            `/orders/${encodeURIComponent(orderNumber)}/inspection`,
          );
          return;
        }

        setInspection(inspectionResponse);
        setOrder(orderResponse);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(errorMessage(err, "Unable to load final quote."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orderNumber, router]);

  if (loading) {
    return (
      <div className="quote-state-page">
        <div className="quote-state-card">
          <div className="quote-loader" />
          <strong>Loading final quote</strong>
          <span>Reading the secured inspection result...</span>
        </div>
      </div>
    );
  }

  if (error || !inspection || !order || !inspection.inspection.quote) {
    return (
      <div className="quote-state-page">
        <div className="quote-state-card">
          <div className="quote-state-icon">!</div>
          <strong>Unable to open final quote</strong>
          <span>{error || "Final quote is not available."}</span>
          <button
            type="button"
            onClick={() =>
              router.replace(`/orders/${encodeURIComponent(orderNumber)}`)
            }
          >
            Back to Order
          </button>
        </div>
      </div>
    );
  }

  const quote = inspection.inspection.quote;

  return (
    <div className="quote-shell">
      <AgentSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="quote-main">
        <header className="quote-mobile-topbar">
          <button
            type="button"
            className="quote-menu"
            aria-label="Open menu"
            onClick={() => setSidebarOpen(true)}
          >
            ☰
          </button>
          <div>
            <strong>Final Quote</strong>
            <span>{inspection.orderNumber}</span>
          </div>
        </header>

        <div className="quote-container">
          <header className="quote-header">
            <button
              type="button"
              className="quote-back"
              onClick={() =>
                router.push(`/orders/${encodeURIComponent(orderNumber)}`)
              }
              aria-label="Back to order"
            >
              ←
            </button>
            <div>
              <span className="quote-eyebrow">Inspection completed</span>
              <h1>Final device offer</h1>
              <p>
                The amount below is calculated from the completed inspection.
              </p>
            </div>
            <div className="quote-order-number">{inspection.orderNumber}</div>
          </header>

          <section className="quote-product-card">
            <div className="quote-product-image">
              {inspection.product.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={inspection.product.image} alt="" />
              ) : (
                <span>Device</span>
              )}
            </div>
            <div className="quote-product-copy">
              <span>Inspected device</span>
              <h2>{inspection.product.name}</h2>
              <p>{inspection.product.variant}</p>
            </div>
            <div className="quote-complete-badge">Inspection complete</div>
          </section>

          <div className="quote-grid">
            <section className="quote-offer-card">
              <span className="quote-offer-label">Final offer</span>
              <strong>{money(quote.finalPrice)}</strong>
              <p>
                Final amount after the field inspection and configured condition
                deductions.
              </p>

              <div className="quote-breakdown">
                <div>
                  <span>Inspection base price</span>
                  <b>{money(quote.basePrice)}</b>
                </div>
                <div>
                  <span>Inspection deduction</span>
                  <b>- {money(quote.totalDeduction)}</b>
                </div>
                <div className="quote-breakdown-final">
                  <span>Final payable offer</span>
                  <b>{money(quote.finalPrice)}</b>
                </div>
              </div>

              <div className="quote-secure-note">
                <span>✓</span>
                <div>
                  <strong>Quote secured</strong>
                  <p>
                    This quote is frozen after inspection and will not be
                    recalculated on page refresh.
                  </p>
                </div>
              </div>
            </section>

            <aside className="quote-summary-card">
              <h3>Order summary</h3>
              <div className="quote-summary-row">
                <span>Customer</span>
                <b>
                  {order.customer?.name ||
                    order.address?.fullName ||
                    "Customer"}
                </b>
              </div>
              <div className="quote-summary-row">
                <span>Original online estimate</span>
                <b>{money(order.pricing.finalPrice)}</b>
              </div>
              <div className="quote-summary-row">
                <span>Inspection status</span>
                <b>Completed</b>
              </div>
              <div className="quote-summary-row">
                <span>Generated</span>
                <b>
                  {new Date(quote.quoteGeneratedAt).toLocaleString("en-IN")}
                </b>
              </div>
            </aside>
          </div>

          <section className="quote-next-card">
            <div>
              <span>Customer decision</span>
              <h2>Confirm this offer with the customer</h2>
              <p>
                Acceptance or rejection will require customer verification in
                the next step.
              </p>
            </div>
            <div className="quote-decision-actions">
              <button type="button" className="quote-reject-button" disabled>
                Reject Offer
              </button>
              <button type="button" className="quote-accept-button" disabled>
                Accept Offer
              </button>
            </div>
            <small>
              Decision buttons will be enabled after quote-bound OTP
              verification is connected.
            </small>
          </section>
        </div>
      </main>
    </div>
  );
}
