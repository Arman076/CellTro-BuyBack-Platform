"use client";

import {
  CheckCircle2,
  CircleX,
  Download,
  MapPin,
  MessageSquareText,
  PackageCheck,
  Star,
} from "lucide-react";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useParams,
  useSearchParams,
} from "next/navigation";

import styles from "./OrderSuccess.module.css";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000";

type StatusHistoryItem = {
  id: number;
  status: string;
  note?: string | null;
  createdAt: string;
};

type OrderFeedback = {
  rating?: number | null;
  optionCode?: string | null;
  optionLabel?: string | null;
  feedbackText?: string | null;
  createdAt?: string | null;
};

type PickupSlot = {
  id: number;
  code: string;
  label: string;
  startTime: string;
  endTime: string;
};

type OrderView = {
  orderNumber: string;
  status: string;
  productName: string;
  productImage?: string | null;
  variantLabel: string;
  finalPrice: number;
  pickupDate: string;

  pickupSlot?: {
    code?: string;
    label?: string;
  } | null;

  payoutMethod: string;

  address?: {
    fullName?: string;
    phone?: string;
    house?: string;
    street?: string;
    locality?: string;
    landmark?: string | null;
    pincode?: string;
    city?: string;
    state?: string;
    type?: string;
  } | null;

  statusHistory?: StatusHistoryItem[];

  feedback?: OrderFeedback | null;
};

type ConfigOption = {
  code: string;
  label: string;
  requiresFreeText: boolean;
};

async function apiJson(
  url: string,
  init?: RequestInit,
) {
  const response = await fetch(url, {
    ...init,

    credentials: "include",

    cache: "no-store",

    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const data = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      Array.isArray(data?.message)
        ? data.message.join(", ")
        : data?.message ||
            `Request failed (${response.status})`,
    );
  }

  return data;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    },
  ).format(Number(value || 0));
}

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(date);
}

function formatDateTime(
  value?: string | null,
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

function humanStatus(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (char) => char.toUpperCase(),
    );
}

function todayLocalDate() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(
      now.getMonth() + 1,
    ).padStart(2, "0"),
    String(
      now.getDate(),
    ).padStart(2, "0"),
  ].join("-");
}

export default function OrderSuccessPage() {
  const params =
    useParams<{
      orderNumber: string;
    }>();

  const searchParams =
    useSearchParams();

  const orderNumber =
    decodeURIComponent(
      String(
        params?.orderNumber ||
          "",
      ),
    );

  const [
    order,
    setOrder,
  ] =
    useState<OrderView | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState("");

  const [
    downloadingPdf,
    setDownloadingPdf,
  ] =
    useState(false);

  /* CANCELLATION */

  const [
    cancellationReasons,
    setCancellationReasons,
  ] =
    useState<ConfigOption[]>([]);

  const [
    cancelOpen,
    setCancelOpen,
  ] =
    useState(false);

  const [
    cancelReasonCode,
    setCancelReasonCode,
  ] =
    useState("");

  const [
    cancelText,
    setCancelText,
  ] =
    useState("");

  const [
    cancelling,
    setCancelling,
  ] =
    useState(false);

  /* RESCHEDULE */

  const [
    rescheduleOpen,
    setRescheduleOpen,
  ] =
    useState(false);

  const [
    pickupSlots,
    setPickupSlots,
  ] =
    useState<PickupSlot[]>([]);

  const [
    loadingSlots,
    setLoadingSlots,
  ] =
    useState(false);

  const [
    rescheduleDate,
    setRescheduleDate,
  ] =
    useState("");

  const [
    rescheduleSlotCode,
    setRescheduleSlotCode,
  ] =
    useState("");

  const [
    rescheduling,
    setRescheduling,
  ] =
    useState(false);

  /* FEEDBACK */

  const [
    feedbackOptions,
    setFeedbackOptions,
  ] =
    useState<ConfigOption[]>([]);

  const [
    feedbackRating,
    setFeedbackRating,
  ] =
    useState<number | null>(
      null,
    );

  const [
    feedbackOptionCode,
    setFeedbackOptionCode,
  ] =
    useState("");

  const [
    feedbackText,
    setFeedbackText,
  ] =
    useState("");

  const [
    feedbackSubmitting,
    setFeedbackSubmitting,
  ] =
    useState(false);

  const selectedCancellationReason =
    useMemo(
      () =>
        cancellationReasons.find(
          (item) =>
            item.code ===
            cancelReasonCode,
        ) ?? null,
      [
        cancellationReasons,
        cancelReasonCode,
      ],
    );

  const selectedFeedbackOption =
    useMemo(
      () =>
        feedbackOptions.find(
          (item) =>
            item.code ===
            feedbackOptionCode,
        ) ?? null,
      [
        feedbackOptions,
        feedbackOptionCode,
      ],
    );

  const canCancel =
    Boolean(
      order &&
        ![
          "COMPLETED",
          "CANCELLED",
          "PAYMENT_COMPLETED",
        ].includes(order.status),
    );

  const canReschedule =
    Boolean(
      order &&
        ![
          "COMPLETED",
          "CANCELLED",
          "PAYMENT_COMPLETED",
        ].includes(order.status),
    );

  const canFeedback =
    Boolean(
      order?.status ===
        "COMPLETED" &&
        !order?.feedback,
    );

  async function loadOrder() {
    if (!orderNumber) {
      setError(
        "Order number is missing.",
      );

      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      /*
       * Order itself is essential.
       * Cancellation / feedback configuration is optional.
       * A config endpoint failure must not stop the order page.
       */
      const orderData =
        await apiJson(
          `${API}/orders/${encodeURIComponent(
            orderNumber,
          )}`,
        );

      setOrder(orderData);

      const [
        cancellationResult,
        feedbackResult,
      ] =
        await Promise.allSettled([
          apiJson(
            `${API}/orders/cancellation-reasons`,
          ),

          apiJson(
            `${API}/orders/feedback-options`,
          ),
        ]);

      if (
        cancellationResult.status ===
        "fulfilled"
      ) {
        setCancellationReasons(
          Array.isArray(
            cancellationResult.value,
          )
            ? cancellationResult.value
            : [],
        );
      } else {
        setCancellationReasons([]);
      }

      if (
        feedbackResult.status ===
        "fulfilled"
      ) {
        setFeedbackOptions(
          Array.isArray(
            feedbackResult.value,
          )
            ? feedbackResult.value
            : [],
        );
      } else {
        setFeedbackOptions([]);
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to load order.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(
    () => {
      void loadOrder();
    },
    [orderNumber],
  );

  /*
   * Supports links from order-success:
   * ?cancel=1
   * ?reschedule=1
   */
  useEffect(
    () => {
      if (!order) {
        return;
      }

      if (
        searchParams.get(
          "cancel",
        ) === "1" &&
        canCancel
      ) {
        setCancelOpen(true);
      }

      if (
        searchParams.get(
          "reschedule",
        ) === "1" &&
        canReschedule
      ) {
        setRescheduleOpen(true);
      }
    },
    [
      order,
      searchParams,
      canCancel,
      canReschedule,
    ],
  );

  useEffect(
    () => {
      if (!rescheduleOpen) {
        return;
      }

      let cancelled = false;

      async function loadPickupSlots() {
        try {
          setLoadingSlots(true);
          setError("");

          const data =
            await apiJson(
              `${API}/orders/pickup-slots`,
            );

          if (cancelled) {
            return;
          }

          setPickupSlots(
            Array.isArray(data)
              ? data
              : [],
          );
        } catch (e) {
          if (cancelled) {
            return;
          }

          setPickupSlots([]);

          setError(
            e instanceof Error
              ? e.message
              : "Unable to load pickup slots.",
          );
        } finally {
          if (!cancelled) {
            setLoadingSlots(false);
          }
        }
      }

      void loadPickupSlots();

      return () => {
        cancelled = true;
      };
    },
    [rescheduleOpen],
  );

  async function downloadPdf() {
    if (
      !order ||
      order.status !==
        "COMPLETED"
    ) {
      return;
    }

    try {
      setDownloadingPdf(true);
      setError("");

      const response =
        await fetch(
          `${API}/orders/${encodeURIComponent(
            order.orderNumber,
          )}/pdf`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          },
        );

      if (!response.ok) {
        const data =
          await response
            .json()
            .catch(
              () => ({}),
            );

        throw new Error(
          data?.message ||
            `Unable to download PDF (${response.status}).`,
        );
      }

      const blob =
        await response.blob();

      const url =
        URL.createObjectURL(
          blob,
        );

      const link =
        document.createElement(
          "a",
        );

      link.href = url;

      link.download =
        `celltro-order-${order.orderNumber}.pdf`;

      document.body.appendChild(
        link,
      );

      link.click();
      link.remove();

      URL.revokeObjectURL(
        url,
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to download order PDF.",
      );
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function rescheduleOrder() {
    if (
      !order ||
      !canReschedule
    ) {
      return;
    }

    if (
      !rescheduleDate ||
      !rescheduleSlotCode
    ) {
      setError(
        "Please select a new pickup date and time slot.",
      );

      return;
    }

    try {
      setRescheduling(true);
      setError("");
      setSuccessMessage("");

      await apiJson(
        `${API}/orders/${encodeURIComponent(
          order.orderNumber,
        )}/reschedule`,
        {
          method: "PATCH",

          body:
            JSON.stringify({
              pickupDate:
                rescheduleDate,

              pickupSlotCode:
                rescheduleSlotCode,
            }),
        },
      );

      setRescheduleOpen(false);

      setRescheduleDate("");

      setRescheduleSlotCode("");

      setSuccessMessage(
        "Pickup has been rescheduled successfully.",
      );

      await loadOrder();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to reschedule pickup.",
      );
    } finally {
      setRescheduling(false);
    }
  }

  async function cancelOrder() {
    if (
      !order ||
      !canCancel
    ) {
      return;
    }

    if (
      selectedCancellationReason
        ?.requiresFreeText &&
      !cancelText.trim()
    ) {
      setError(
        "Please write the reason details for the selected option.",
      );

      return;
    }

    try {
      setCancelling(true);
      setError("");
      setSuccessMessage("");

      await apiJson(
        `${API}/orders/${encodeURIComponent(
          order.orderNumber,
        )}/cancel`,
        {
          method: "PATCH",

          body:
            JSON.stringify({
              reasonCode:
                cancelReasonCode ||
                undefined,

              reasonText:
                cancelText.trim() ||
                undefined,
            }),
        },
      );

      setCancelOpen(false);

      setCancelReasonCode("");

      setCancelText("");

      setSuccessMessage(
        "Your order has been cancelled.",
      );

      await loadOrder();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to cancel order.",
      );
    } finally {
      setCancelling(false);
    }
  }

  async function submitFeedback() {
    if (
      !order ||
      !canFeedback
    ) {
      return;
    }

    if (
      selectedFeedbackOption
        ?.requiresFreeText &&
      !feedbackText.trim()
    ) {
      setError(
        "Please write feedback details for the selected option.",
      );

      return;
    }

    if (
      feedbackRating === null &&
      !feedbackOptionCode &&
      !feedbackText.trim()
    ) {
      setError(
        "Add a rating, select a response, or write feedback.",
      );

      return;
    }

    try {
      setFeedbackSubmitting(true);
      setError("");
      setSuccessMessage("");

      await apiJson(
        `${API}/orders/${encodeURIComponent(
          order.orderNumber,
        )}/feedback`,
        {
          method: "POST",

          body:
            JSON.stringify({
              rating:
                feedbackRating ??
                undefined,

              optionCode:
                feedbackOptionCode ||
                undefined,

              feedbackText:
                feedbackText.trim() ||
                undefined,
            }),
        },
      );

      setSuccessMessage(
        "Thank you. Your feedback has been submitted.",
      );

      await loadOrder();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to submit feedback.",
      );
    } finally {
      setFeedbackSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.loadingCard}>
            Loading order...
          </div>
        </div>
      </main>
    );
  }

  if (
    error &&
    !order
  ) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.errorCard}>
            <h1>
              Unable to load order
            </h1>

            <p>{error}</p>

            <Link
              href="/my-orders"
              className={
                styles.homeButton
              }
            >
              View My Orders
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!order) {
    return null;
  }

  const history =
    order.statusHistory || [];

  const latestHistory =
    history.length > 0
      ? history[
          history.length - 1
        ]
      : null;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>

        {/* ORDER HEADER */}

        <section
          className={
            styles.orderHeader
          }
        >
          <div
            className={
              styles.successIcon
            }
          >
            {order.status ===
            "CANCELLED" ? (
              <CircleX size={30} />
            ) : order.status ===
              "COMPLETED" ? (
              <PackageCheck
                size={30}
              />
            ) : (
              <CheckCircle2
                size={30}
              />
            )}
          </div>

          <div
            className={
              styles.orderIdentity
            }
          >
            <span
              className={
                styles.eyebrow
              }
            >
              {order.status ===
              "CANCELLED"
                ? "ORDER CANCELLED"
                : order.status ===
                    "COMPLETED"
                  ? "ORDER COMPLETED"
                  : "ORDER PLACED"}
            </span>

            <h1>
              {order.orderNumber}
            </h1>

            <p
              className={
                styles.deviceName
              }
            >
              {order.productName}

              {order.variantLabel
                ? ` · ${order.variantLabel}`
                : ""}
            </p>
          </div>

          <span
            className={`${styles.status} ${
              order.status ===
              "CANCELLED"
                ? styles.statusDanger
                : order.status ===
                    "COMPLETED"
                  ? styles.statusSuccess
                  : styles.statusActive
            }`}
          >
            {humanStatus(
              order.status,
            )}
          </span>
        </section>

        {/* SUMMARY */}

        <section
          className={
            styles.quickSummary
          }
        >
          <div>
            <span>
              Expected value
            </span>

            <strong>
              {formatMoney(
                order.finalPrice,
              )}
            </strong>
          </div>

          <div>
            <span>
              Pickup date
            </span>

            <strong>
              {formatDate(
                order.pickupDate,
              )}
            </strong>
          </div>

          <div>
            <span>
              Time slot
            </span>

            <strong>
              {order.pickupSlot
                ?.label ||
                "—"}
            </strong>
          </div>
        </section>

        {error && (
          <div
            className={
              styles.errorBanner
            }
          >
            {error}
          </div>
        )}

        {successMessage && (
          <div
            className={
              styles.successBanner
            }
          >
            {successMessage}
          </div>
        )}

        {/* ACTIONS */}

        <section
          className={
            styles.actions
          }
        >
          {canReschedule && (
            <button
              type="button"
              className={
                styles.rescheduleButton
              }
              onClick={() => {
                setError("");

                setSuccessMessage(
                  "",
                );

                setRescheduleOpen(
                  true,
                );
              }}
            >
              Reschedule Pickup
            </button>
          )}

          {canCancel && (
            <button
              type="button"
              className={
                styles.cancelButton
              }
              onClick={() => {
                setError("");

                setSuccessMessage(
                  "",
                );

                setCancelOpen(
                  true,
                );
              }}
            >
              Cancel Order
            </button>
          )}

          {order.status ===
            "COMPLETED" && (
            <button
              type="button"
              className={
                styles.downloadButton
              }
              disabled={
                downloadingPdf
              }
              onClick={
                downloadPdf
              }
            >
              <Download
                size={17}
              />

              {downloadingPdf
                ? "Preparing..."
                : "Download PDF"}
            </button>
          )}
        </section>

        <div
          className={
            styles.expanded
          }
        >

          {/* ORDER DETAILS */}

          <section
            className={
              styles.card
            }
          >
            <div
              className={
                styles.sectionHeading
              }
            >
              <div>
                <span>01</span>

                <div>
                  <h2>
                    Order Details
                  </h2>

                  <p>
                    Device, pickup,
                    payout and address
                    information.
                  </p>
                </div>
              </div>
            </div>

            <div
              className={
                styles.detailGrid
              }
            >
              <div>
                <span>
                  Device
                </span>

                <strong>
                  {order.productName}
                </strong>

                <small>
                  {order.variantLabel}
                </small>
              </div>

              <div>
                <span>
                  Expected Value
                </span>

                <strong>
                  {formatMoney(
                    order.finalPrice,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Pickup Date
                </span>

                <strong>
                  {formatDate(
                    order.pickupDate,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Pickup Slot
                </span>

                <strong>
                  {order.pickupSlot
                    ?.label ||
                    "—"}
                </strong>
              </div>

              <div>
                <span>
                  Payout
                </span>

                <strong>
                  {
                    order.payoutMethod
                  }
                </strong>
              </div>

              <div>
                <span>
                  Order Status
                </span>

                <strong>
                  {humanStatus(
                    order.status,
                  )}
                </strong>
              </div>
            </div>

            {order.address && (
              <div
                className={
                  styles.addressBox
                }
              >
                <div
                  className={
                    styles.addressTitle
                  }
                >
                  <MapPin
                    size={18}
                  />

                  <strong>
                    Pickup Address
                  </strong>
                </div>

                <p>
                  {
                    order.address
                      .fullName
                  }
                  <br />

                  {
                    order.address
                      .house
                  }

                  {order.address
                    .street
                    ? `, ${order.address.street}`
                    : ""}

                  <br />

                  {
                    order.address
                      .locality
                  }

                  {order.address
                    .landmark
                    ? `, ${order.address.landmark}`
                    : ""}

                  <br />

                  {order.address
                    .city
                    ? `${order.address.city}, `
                    : ""}

                  {
                    order.address
                      .state
                  }{" "}

                  {
                    order.address
                      .pincode
                  }
                </p>
              </div>
            )}
          </section>

          {/* REAL TIMELINE */}

          <section
            className={
              styles.card
            }
          >
            <div
              className={
                styles.sectionHeading
              }
            >
              <div>
                <span>02</span>

                <div>
                  <h2>
                    Order Timeline
                  </h2>

                  <p>
                    Only real status
                    updates recorded by
                    the backend are shown.
                  </p>
                </div>
              </div>
            </div>

            <div
              className={
                styles.timeline
              }
            >
              {history.length ===
              0 ? (
                <p
                  className={
                    styles.emptyText
                  }
                >
                  No status history
                  available.
                </p>
              ) : (
                history.map(
                  (
                    item,
                    index,
                  ) => (
                    <div
                      key={item.id}
                      className={
                        styles.timelineItem
                      }
                    >
                      <div
                        className={
                          styles.timelineRail
                        }
                      >
                        <span
                          className={
                            styles.timelineDot
                          }
                        />

                        {index <
                          history.length -
                            1 && (
                          <span
                            className={
                              styles.timelineLine
                            }
                          />
                        )}
                      </div>

                      <div
                        className={
                          styles.timelineBody
                        }
                      >
                        <strong>
                          {humanStatus(
                            item.status,
                          )}
                        </strong>

                        {item.note && (
                          <p>
                            {
                              item.note
                            }
                          </p>
                        )}

                        <small>
                          {formatDateTime(
                            item.createdAt,
                          )}
                        </small>
                      </div>
                    </div>
                  ),
                )
              )}
            </div>

            {/* LIVE CURRENT STATUS BELOW TIMELINE */}

            <div
              className={
                styles.liveStatus
              }
            >
              <div
                className={
                  styles.liveDot
                }
              />

              <div>
                <span>
                  LIVE ORDER STATUS
                </span>

                <strong>
                  {humanStatus(
                    order.status,
                  )}
                </strong>

                <p>
                  {latestHistory
                    ? `Latest recorded update: ${humanStatus(
                        latestHistory.status,
                      )}.`
                    : "Waiting for the first recorded order update."}{" "}
                  New stages will appear
                  only after they are
                  actually recorded for
                  this order.
                </p>
              </div>
            </div>
          </section>

          {/* FEEDBACK */}

          {canFeedback && (
            <section
              className={`${styles.card} ${styles.feedbackCard}`}
            >
              <div
                className={
                  styles.sectionHeading
                }
              >
                <div>
                  <span>03</span>

                  <div>
                    <h2>
                      Your Feedback
                    </h2>

                    <p>
                      Available after
                      order completion.
                    </p>
                  </div>
                </div>
              </div>

              <div
                className={
                  styles.rating
                }
              >
                {[1, 2, 3, 4, 5].map(
                  (value) => (
                    <button
                      key={value}
                      type="button"
                      aria-label={`${value} star`}
                      className={`${styles.star} ${
                        feedbackRating !==
                          null &&
                        value <=
                          feedbackRating
                          ? styles.starActive
                          : ""
                      }`}
                      onClick={() =>
                        setFeedbackRating(
                          value,
                        )
                      }
                    >
                      <Star
                        size={26}
                        fill={
                          feedbackRating !==
                            null &&
                          value <=
                            feedbackRating
                            ? "currentColor"
                            : "none"
                        }
                      />
                    </button>
                  ),
                )}
              </div>

              {feedbackOptions.length >
                0 && (
                <div
                  className={
                    styles.chips
                  }
                >
                  {feedbackOptions.map(
                    (item) => (
                      <button
                        key={
                          item.code
                        }
                        type="button"
                        className={`${styles.chip} ${
                          feedbackOptionCode ===
                          item.code
                            ? styles.chipActive
                            : ""
                        }`}
                        onClick={() =>
                          setFeedbackOptionCode(
                            feedbackOptionCode ===
                              item.code
                              ? ""
                              : item.code,
                          )
                        }
                      >
                        {
                          item.label
                        }
                      </button>
                    ),
                  )}
                </div>
              )}

              <textarea
                value={
                  feedbackText
                }
                onChange={(
                  event,
                ) =>
                  setFeedbackText(
                    event.target.value.slice(
                      0,
                      1000,
                    ),
                  )
                }
                rows={4}
                className={
                  styles.textarea
                }
                placeholder={
                  selectedFeedbackOption
                    ?.requiresFreeText
                    ? "Please share the details..."
                    : "Additional feedback (optional)"
                }
              />

              <button
                type="button"
                className={
                  styles.submitButton
                }
                disabled={
                  feedbackSubmitting
                }
                onClick={
                  submitFeedback
                }
              >
                {feedbackSubmitting
                  ? "Submitting..."
                  : "Submit Feedback"}
              </button>
            </section>
          )}

          {order.feedback && (
            <section
              className={`${styles.card} ${styles.feedbackSaved}`}
            >
              <div
                className={
                  styles.savedTitle
                }
              >
                <MessageSquareText
                  size={19}
                />

                <strong>
                  Feedback Submitted
                </strong>
              </div>

              {order.feedback
                .rating && (
                <p>
                  Rating:{" "}
                  <strong>
                    {
                      order.feedback
                        .rating
                    }
                    /5
                  </strong>
                </p>
              )}

              {order.feedback
                .optionLabel && (
                <p>
                  {
                    order.feedback
                      .optionLabel
                  }
                </p>
              )}

              {order.feedback
                .feedbackText && (
                <p>
                  {
                    order.feedback
                      .feedbackText
                  }
                </p>
              )}
            </section>
          )}
        </div>

        <Link
          href="/my-orders"
          className={
            styles.backHome
          }
        >
          Back to My Orders
        </Link>
      </div>

      {/* RESCHEDULE MODAL */}

      {rescheduleOpen &&
        canReschedule && (
        <div
          className={
            styles.modalBackdrop
          }
          role="dialog"
          aria-modal="true"
          aria-label="Reschedule pickup"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setRescheduleOpen(
                false,
              );
            }
          }}
        >
          <section
            className={
              styles.modal
            }
          >
            <div
              className={`${styles.modalHeader} ${styles.rescheduleModalHeader}`}
            >
              <div>
                <span>
                  PICKUP RESCHEDULE
                </span>

                <h2>
                  Choose a new pickup
                  slot
                </h2>

                <p>
                  Select a new date and
                  one of the currently
                  available pickup slots.
                </p>
              </div>

              <button
                type="button"
                className={
                  styles.closeModal
                }
                aria-label="Close reschedule"
                onClick={() =>
                  setRescheduleOpen(
                    false,
                  )
                }
              >
                <CircleX
                  size={20}
                />
              </button>
            </div>

            <div
              className={
                styles.currentPickup
              }
            >
              <span>
                Current pickup
              </span>

              <strong>
                {formatDate(
                  order.pickupDate,
                )}
                {" · "}
                {order.pickupSlot
                  ?.label ||
                  "—"}
              </strong>
            </div>

            <div
              className={
                styles.rescheduleFields
              }
            >
              <label
                className={
                  styles.rescheduleField
                }
              >
                <span>
                  New pickup date
                </span>

                <input
                  type="date"
                  min={
                    todayLocalDate()
                  }
                  value={
                    rescheduleDate
                  }
                  onChange={(
                    event,
                  ) => {
                    setRescheduleDate(
                      event.target.value,
                    );
                  }}
                />
              </label>

              <div
                className={
                  styles.rescheduleField
                }
              >
                <span>
                  Available time
                </span>

                {loadingSlots ? (
                  <p
                    className={
                      styles.emptyText
                    }
                  >
                    Loading available
                    slots...
                  </p>
                ) : pickupSlots.length >
                  0 ? (
                  <div
                    className={
                      styles.rescheduleSlots
                    }
                  >
                    {pickupSlots.map(
                      (slot) => (
                        <button
                          key={
                            slot.code
                          }
                          type="button"
                          className={`${styles.rescheduleSlot} ${
                            rescheduleSlotCode ===
                            slot.code
                              ? styles.rescheduleSlotActive
                              : ""
                          }`}
                          onClick={() =>
                            setRescheduleSlotCode(
                              slot.code,
                            )
                          }
                        >
                          {
                            slot.label
                          }
                        </button>
                      ),
                    )}
                  </div>
                ) : (
                  <p
                    className={
                      styles.emptyText
                    }
                  >
                    No pickup slots are
                    currently available.
                  </p>
                )}
              </div>
            </div>

            <div
              className={
                styles.modalActions
              }
            >
              <button
                type="button"
                className={
                  styles.keepButton
                }
                disabled={
                  rescheduling
                }
                onClick={() =>
                  setRescheduleOpen(
                    false,
                  )
                }
              >
                Keep Current Slot
              </button>

              <button
                type="button"
                className={
                  styles.confirmReschedule
                }
                disabled={
                  rescheduling ||
                  loadingSlots ||
                  !rescheduleDate ||
                  !rescheduleSlotCode
                }
                onClick={
                  rescheduleOrder
                }
              >
                {rescheduling
                  ? "Rescheduling..."
                  : "Confirm Reschedule"}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* CANCEL MODAL */}

      {cancelOpen &&
        canCancel && (
        <div
          className={
            styles.modalBackdrop
          }
          role="dialog"
          aria-modal="true"
          aria-label="Cancel order"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setCancelOpen(
                false,
              );
            }
          }}
        >
          <section
            className={
              styles.modal
            }
          >
            <div
              className={
                styles.modalHeader
              }
            >
              <div>
                <span>
                  ORDER CANCELLATION
                </span>

                <h2>
                  Why are you
                  cancelling?
                </h2>

                <p>
                  Selecting a reason is
                  optional.
                </p>
              </div>

              <button
                type="button"
                className={
                  styles.closeModal
                }
                aria-label="Close cancellation"
                onClick={() =>
                  setCancelOpen(
                    false,
                  )
                }
              >
                <CircleX
                  size={20}
                />
              </button>
            </div>

            {cancellationReasons.length >
            0 ? (
              <div
                className={
                  styles.chips
                }
              >
                {cancellationReasons.map(
                  (item) => (
                    <button
                      key={
                        item.code
                      }
                      type="button"
                      className={`${styles.chip} ${
                        cancelReasonCode ===
                        item.code
                          ? styles.chipActive
                          : ""
                      }`}
                      onClick={() =>
                        setCancelReasonCode(
                          cancelReasonCode ===
                            item.code
                            ? ""
                            : item.code,
                        )
                      }
                    >
                      {
                        item.label
                      }
                    </button>
                  ),
                )}
              </div>
            ) : (
              <p
                className={
                  styles.emptyText
                }
              >
                You may cancel without
                selecting a reason.
              </p>
            )}

            <textarea
              value={
                cancelText
              }
              onChange={(
                event,
              ) =>
                setCancelText(
                  event.target.value.slice(
                    0,
                    500,
                  ),
                )
              }
              rows={4}
              className={
                styles.textarea
              }
              placeholder={
                selectedCancellationReason
                  ?.requiresFreeText
                  ? "Please enter the reason details..."
                  : "Additional feedback (optional)"
              }
            />

            <div
              className={
                styles.modalActions
              }
            >
              <button
                type="button"
                className={
                  styles.keepButton
                }
                onClick={() =>
                  setCancelOpen(
                    false,
                  )
                }
                disabled={
                  cancelling
                }
              >
                Keep Order
              </button>

              <button
                type="button"
                className={
                  styles.confirmCancel
                }
                onClick={
                  cancelOrder
                }
                disabled={
                  cancelling
                }
              >
                {cancelling
                  ? "Cancelling..."
                  : "Cancel Order"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}