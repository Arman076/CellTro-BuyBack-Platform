"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AgentSidebar from "@/components/agent-sidebar";
import {
  ApiError,
  commitAgentQuoteDecision,
  getAgentInspection,
  getAgentOrder,
  sendOrderVerification,
  verifyOrderVerification,
  type AgentInspectionResponse,
  type AgentOrderDetailResponse,
  type AgentQuoteDecision,
  type OrderVerificationChannel,
} from "@/lib/agent-api";
import "./quote.css";

type PageProps = { params: Promise<{ orderNumber: string }> };

type DecisionStage = "IDLE" | "SEND" | "OTP" | "COMMITTING" | "DONE";

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
}

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const local =
    digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;

  if (local.length < 4) return "Mobile";

  return `${local.slice(0, 2)}******${local.slice(-2)}`;
}

function maskEmail(value: string) {
  const [local, domain] = value.split("@");

  if (!local || !domain) return "Email";

  return `${local.charAt(0)}${"*".repeat(Math.max(3, local.length - 1))}@${domain}`;
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

  const [decision, setDecision] = useState<AgentQuoteDecision | null>(null);
  const [decisionStage, setDecisionStage] =
    useState<DecisionStage>("IDLE");
  const [channel, setChannel] =
    useState<OrderVerificationChannel>("SMS");
  const [challengeId, setChallengeId] = useState("");
  const [destinationMasked, setDestinationMasked] = useState("");
  const [otp, setOtp] = useState("");
  const [decisionError, setDecisionError] = useState("");
  const [decisionMessage, setDecisionMessage] = useState("");
  const [busy, setBusy] = useState(false);

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
        if (!cancelled) {
          setError(errorMessage(err, "Unable to load final quote."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orderNumber, router]);

  const customerPhone = useMemo(() => {
    return (
      order?.address?.phone?.trim() ||
      order?.customer?.phone?.trim() ||
      ""
    );
  }, [order]);

  const customerEmail = useMemo(() => {
    return (
      order?.address?.email?.trim() ||
      order?.customer?.email?.trim() ||
      ""
    );
  }, [order]);

  const availableChannels = useMemo(() => {
    const result: OrderVerificationChannel[] = [];

    if (customerPhone) result.push("SMS");
    if (customerEmail) result.push("EMAIL");

    return result;
  }, [customerEmail, customerPhone]);

  function closeDecision() {
    if (busy) return;

    setDecision(null);
    setDecisionStage("IDLE");
    setChallengeId("");
    setDestinationMasked("");
    setOtp("");
    setDecisionError("");
    setDecisionMessage("");
  }

  function openDecision(nextDecision: AgentQuoteDecision) {
    const preferredChannel: OrderVerificationChannel = customerPhone
      ? "SMS"
      : "EMAIL";

    setDecision(nextDecision);
    setChannel(preferredChannel);
    setDecisionStage("SEND");
    setChallengeId("");
    setDestinationMasked("");
    setOtp("");
    setDecisionError("");
    setDecisionMessage("");
  }

  function destinationForChannel(nextChannel: OrderVerificationChannel) {
    return nextChannel === "SMS" ? customerPhone : customerEmail;
  }

  async function handleSendOtp() {
    if (!decision) return;

    const destination = destinationForChannel(channel);

    if (!destination) {
      setDecisionError(
        channel === "SMS"
          ? "Customer mobile number is not available for this order."
          : "Customer email is not available for this order.",
      );
      return;
    }

    setBusy(true);
    setDecisionError("");
    setDecisionMessage("");

    try {
      const response = await sendOrderVerification(orderNumber, {
        destination,
        purpose: decision === "ACCEPTED" ? "QUOTE_ACCEPT" : "QUOTE_REJECT",
      });

      setChallengeId(response.challengeId);
      setDestinationMasked(response.destinationMasked);
      setDecisionStage("OTP");
      setDecisionMessage(
        `OTP sent to ${response.destinationMasked}. Ask the customer for this OTP.`,
      );
    } catch (err: unknown) {
      setDecisionError(
        errorMessage(err, "Unable to send customer verification OTP."),
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyAndConfirm() {
    if (!decision || !challengeId) return;

    const normalizedOtp = otp.replace(/\D/g, "");

    if (!/^\d{4,9}$/.test(normalizedOtp)) {
      setDecisionError("Enter the OTP received by the customer.");
      return;
    }

    setBusy(true);
    setDecisionError("");
    setDecisionMessage("");

    try {
      const verification = await verifyOrderVerification(orderNumber, {
        challengeId,
        otp: normalizedOtp,
        destination: destinationForChannel(channel),
      });

      if (!verification.verified) {
        throw new Error("Customer OTP could not be verified.");
      }

      setDecisionStage("COMMITTING");

      const result = await commitAgentQuoteDecision(orderNumber, {
        challengeId: verification.challengeId,
        decision,
      });

      setDecisionStage("DONE");
      setDecisionMessage(
        result.decision === "ACCEPTED"
          ? "Customer accepted the final offer. Continue to payment."
          : "Customer rejected the final offer. The decision has been recorded.",
      );
    } catch (err: unknown) {
      setDecisionStage("OTP");
      setDecisionError(
        errorMessage(err, "Unable to confirm the customer decision."),
      );
    } finally {
      setBusy(false);
    }
  }

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
  const selectedDestination = destinationForChannel(channel);

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
              <h2>Does the customer accept this offer?</h2>
              <p>
                Select the customer&apos;s decision. Both acceptance and
                rejection require customer OTP verification.
              </p>
            </div>

            <div className="quote-decision-actions">
              <button
                type="button"
                className="quote-reject-button"
                onClick={() => openDecision("REJECTED")}
              >
                Reject Offer
              </button>

              <button
                type="button"
                className="quote-accept-button"
                onClick={() => openDecision("ACCEPTED")}
              >
                Accept Offer
              </button>
            </div>

            <small>
              The OTP is tied to this exact frozen quote and customer decision.
            </small>
          </section>
        </div>
      </main>

      {decision && (
        <div
          className="quote-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDecision();
          }}
        >
          <section
            className="quote-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quote-decision-title"
          >
            <button
              type="button"
              className="quote-modal-close"
              aria-label="Close customer verification"
              onClick={closeDecision}
              disabled={busy}
            >
              ×
            </button>

            <div
              className={`quote-decision-mark ${
                decision === "ACCEPTED"
                  ? "quote-decision-mark-accept"
                  : "quote-decision-mark-reject"
              }`}
            >
              {decision === "ACCEPTED" ? "✓" : "×"}
            </div>

            <span className="quote-modal-eyebrow">Customer verification</span>
            <h2 id="quote-decision-title">
              {decision === "ACCEPTED"
                ? "Accept final offer"
                : "Reject final offer"}
            </h2>

            <p className="quote-modal-copy">
              Customer is confirming{" "}
              <strong>{money(quote.finalPrice)}</strong>. Verification is
              required before this decision is recorded.
            </p>

            {decisionStage !== "DONE" && (
              <>
                <div className="quote-channel-group">
                  <span>Send OTP via</span>

                  <div className="quote-channel-options">
                    <button
                      type="button"
                      className={channel === "SMS" ? "active" : ""}
                      onClick={() => setChannel("SMS")}
                      disabled={!customerPhone || busy || decisionStage === "OTP"}
                    >
                      <b>Mobile</b>
                      <small>
                        {customerPhone ? maskPhone(customerPhone) : "Unavailable"}
                      </small>
                    </button>

                    <button
                      type="button"
                      className={channel === "EMAIL" ? "active" : ""}
                      onClick={() => setChannel("EMAIL")}
                      disabled={!customerEmail || busy || decisionStage === "OTP"}
                    >
                      <b>Email</b>
                      <small>
                        {customerEmail ? maskEmail(customerEmail) : "Unavailable"}
                      </small>
                    </button>
                  </div>
                </div>

                {decisionStage === "SEND" && (
                  <button
                    type="button"
                    className="quote-primary-action"
                    onClick={handleSendOtp}
                    disabled={busy || !selectedDestination}
                  >
                    {busy ? "Sending OTP..." : "Send Customer OTP"}
                  </button>
                )}

                {(decisionStage === "OTP" ||
                  decisionStage === "COMMITTING") && (
                  <>
                    <label className="quote-otp-field">
                      <span>Customer OTP</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={9}
                        value={otp}
                        onChange={(event) =>
                          setOtp(event.target.value.replace(/\D/g, ""))
                        }
                        placeholder="Enter OTP"
                        disabled={busy}
                      />
                      <small>
                        {destinationMasked
                          ? `Sent to ${destinationMasked}`
                          : "Enter the OTP received by the customer."}
                      </small>
                    </label>

                    <button
                      type="button"
                      className={
                        decision === "ACCEPTED"
                          ? "quote-primary-action"
                          : "quote-danger-action"
                      }
                      onClick={handleVerifyAndConfirm}
                      disabled={busy || !otp}
                    >
                      {busy || decisionStage === "COMMITTING"
                        ? "Confirming..."
                        : decision === "ACCEPTED"
                          ? "Verify OTP & Accept"
                          : "Verify OTP & Reject"}
                    </button>

                    <button
                      type="button"
                      className="quote-link-action"
                      onClick={() => {
                        setDecisionStage("SEND");
                        setChallengeId("");
                        setDestinationMasked("");
                        setOtp("");
                        setDecisionError("");
                        setDecisionMessage("");
                      }}
                      disabled={busy}
                    >
                      Change verification method
                    </button>
                  </>
                )}
              </>
            )}

            {decisionError && (
              <div className="quote-modal-alert quote-modal-alert-error">
                {decisionError}
              </div>
            )}

            {decisionMessage && (
              <div
                className={`quote-modal-alert ${
                  decisionStage === "DONE"
                    ? "quote-modal-alert-success"
                    : "quote-modal-alert-info"
                }`}
              >
                {decisionMessage}
              </div>
            )}

            {decisionStage === "DONE" && (
              <div className="quote-done-actions">
                {decision === "ACCEPTED" ? (
                  <button
                    type="button"
                    className="quote-primary-action"
                    onClick={() =>
                      router.push(
                        `/orders/${encodeURIComponent(orderNumber)}`,
                      )
                    }
                  >
                    Continue to Payment
                  </button>
                ) : (
                  <button
                    type="button"
                    className="quote-primary-action"
                    onClick={() =>
                      router.push(
                        `/orders/${encodeURIComponent(orderNumber)}`,
                      )
                    }
                  >
                    Back to Order
                  </button>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
