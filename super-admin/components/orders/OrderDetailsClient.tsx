"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  ArrowLeft,
  CalendarDays,
  CircleX,
  Clock3,
  CreditCard,
  FileText,
  History,
  MapPin,
  MessageSquareText,
  Package,
  RefreshCw,
  Smartphone,
  UserRound,
  WalletCards,
} from "lucide-react";

import styles from "./OrderDetailsClient.module.css";

type QuestionnaireOption = {
  id: number;
  label: string;
};

type QuestionnaireAnswer = {
  index: number;
  itemId: number | null;
  question: string;
  selectedOptions: QuestionnaireOption[];
  childOptions: QuestionnaireOption[];
};

type OrderDetails = {
  id: string;
  orderNumber: string;

  productId: number;
  variantId: number;

  productName: string;
  productImage: string | null;
  variantLabel: string;

  basePrice: number;
  totalDeduction: number;
  finalPrice: number;

  questionnaireSnapshot:
    | unknown[]
    | null;

  questionnaire?:
    QuestionnaireAnswer[];

  status: string;

  pickupDate: string;

  payoutMethod: string;

  payoutUpiMobile:
    | string
    | null;

  createdAt: string;
  updatedAt: string;

  customer: {
    id: number;
    phone: string;
    createdAt: string;
  } | null;

  pickupSlot: {
    code: string;
    label: string;
    startTime: string;
    endTime: string;
  } | null;

  addressSnapshot: {
    fullName: string;
    phone: string;
    house: string;
    street: string;
    locality: string;

    landmark:
      | string
      | null;

    pincode: string;
    city: string;
    state: string;
    type: string;
    createdAt: string;
  } | null;

  statusHistory?: Array<{
    id: number;
    status: string;

    note:
      | string
      | null;

    createdAt: string;
  }>;

  reschedules?: Array<{
    id: number;

    oldPickupDate: string;
    newPickupDate: string;

    oldSlotLabel: string;
    newSlotLabel: string;

    createdAt: string;
  }>;

  cancellation: {
    actor: string;

    reasonCode:
      | string
      | null;

    reasonText:
      | string
      | null;

    createdAt: string;
  } | null;

  feedback: {
    rating:
      | number
      | null;

    optionCode:
      | string
      | null;

    optionLabelSnapshot:
      | string
      | null;

    feedbackText:
      | string
      | null;

    createdAt: string;
  } | null;

  pdfAvailable: boolean;
};

type Props = {
  orderNumber: string;
};

type Tab =
  | "overview"
  | "questionnaire"
  | "timeline"
  | "feedback";

function money(
  value:
    | number
    | string
    | null
    | undefined,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  const amount =
    Number(value);

  if (
    !Number.isFinite(
      amount,
    )
  ) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    },
  ).format(amount);
}

function dateTime(
  value:
    | string
    | null
    | undefined,
) {
  if (!value) {
    return "—";
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(parsed);
}

function dateOnly(
  value:
    | string
    | null
    | undefined,
) {
  if (!value) {
    return "—";
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      dateStyle: "medium",
    },
  ).format(parsed);
}

function statusLabel(
  value:
    | string
    | null
    | undefined,
) {
  if (!value) {
    return "—";
  }

  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

function normalizeOptions(
  value: unknown,
): QuestionnaireOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (
        !item ||
        typeof item !==
          "object"
      ) {
        return null;
      }

      const raw =
        item as Record<
          string,
          unknown
        >;

      const id =
        Number(raw.id);

      const label =
        typeof raw.label ===
        "string"
          ? raw.label.trim()
          : "";

      if (
        !Number.isFinite(id) ||
        !label
      ) {
        return null;
      }

      return {
        id,
        label,
      };
    })
    .filter(
      (
        item,
      ): item is QuestionnaireOption =>
        item !== null,
    );
}

function normalizeQuestionnaire(
  value: unknown,
): QuestionnaireAnswer[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(
      (
        item,
        arrayIndex,
      ) => {
        if (
          !item ||
          typeof item !==
            "object"
        ) {
          return null;
        }

        const raw =
          item as Record<
            string,
            unknown
          >;

        const rawIndex =
          Number(raw.index);

        const rawItemId =
          Number(raw.itemId);

        return {
          index:
            Number.isFinite(
              rawIndex,
            ) &&
            rawIndex > 0
              ? rawIndex
              : arrayIndex +
                1,

          itemId:
            Number.isFinite(
              rawItemId,
            ) &&
            rawItemId > 0
              ? rawItemId
              : null,

          question:
            typeof raw.question ===
              "string" &&
            raw.question.trim()
              ? raw.question.trim()
              : "Question unavailable",

          selectedOptions:
            normalizeOptions(
              raw.selectedOptions,
            ),

          childOptions:
            normalizeOptions(
              raw.childOptions,
            ),
        } satisfies QuestionnaireAnswer;
      },
    )
    .filter(
      (
        item,
      ): item is QuestionnaireAnswer =>
        item !== null,
    );
}

export default function OrderDetailsClient({
  orderNumber,
}: Props) {
  const [
    data,
    setData,
  ] =
    useState<OrderDetails | null>(
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
    activeTab,
    setActiveTab,
  ] =
    useState<Tab>(
      "overview",
    );

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadOrder() {
      try {
        setLoading(true);
        setError("");

        const response =
          await fetch(
            `/api/super-admin/orders/${encodeURIComponent(
              orderNumber,
            )}`,
            {
              cache:
                "no-store",

              signal:
                controller.signal,

              headers: {
                Accept:
                  "application/json",
              },
            },
          );

        const body =
          await response
            .json()
            .catch(
              () => null,
            );

        if (!response.ok) {
          let message =
            `Order request failed. HTTP ${response.status}`;

          if (
            body &&
            typeof body ===
              "object" &&
            "message" in body &&
            typeof body.message ===
              "string"
          ) {
            message =
              body.message;
          }

          throw new Error(
            message,
          );
        }

        if (
          !body ||
          typeof body !==
            "object"
        ) {
          throw new Error(
            "Invalid order response.",
          );
        }

        if (
          controller.signal
            .aborted
        ) {
          return;
        }

        const raw =
          body as OrderDetails;

        setData({
          ...raw,

          questionnaire:
            normalizeQuestionnaire(
              raw.questionnaire,
            ),

          statusHistory:
            Array.isArray(
              raw.statusHistory,
            )
              ? raw.statusHistory
              : [],

          reschedules:
            Array.isArray(
              raw.reschedules,
            )
              ? raw.reschedules
              : [],
        });
      } catch (err) {
        if (
          controller.signal
            .aborted
        ) {
          return;
        }

        setData(null);

        setError(
          err instanceof Error
            ? err.message
            : "Order details could not be loaded.",
        );
      } finally {
        if (
          !controller.signal
            .aborted
        ) {
          setLoading(false);
        }
      }
    }

    void loadOrder();

    return () =>
      controller.abort();
  }, [orderNumber]);

  if (loading) {
    return (
      <div
        className={
          styles.state
        }
      >
        <RefreshCw
          size={24}
          className={
            styles.spinning
          }
        />

        <strong>
          Loading order details...
        </strong>
      </div>
    );
  }

  if (
    error ||
    !data
  ) {
    return (
      <div
        className={
          styles.state
        }
      >
        <CircleX
          size={28}
        />

        <strong>
          Order details unavailable
        </strong>

        <p>
          {error ||
            "Order not found."}
        </p>

        <Link
          href="/orders"
          className={
            styles.backButton
          }
        >
          <ArrowLeft
            size={17}
          />

          Back to Orders
        </Link>
      </div>
    );
  }

  const questionnaire =
    Array.isArray(
      data.questionnaire,
    )
      ? data.questionnaire
      : [];

  const statusHistory =
    Array.isArray(
      data.statusHistory,
    )
      ? data.statusHistory
      : [];

  return (
    <section
      className={
        styles.page
      }
    >
      <div
        className={
          styles.top
        }
      >
        <div>
          <Link
            href="/orders"
            className={
              styles.backLink
            }
          >
            <ArrowLeft
              size={17}
            />

            Orders
          </Link>

          <div
            className={
              styles.titleRow
            }
          >
            <div>
              <p
                className={
                  styles.eyebrow
                }
              >
                ORDER DETAILS
              </p>

              <h1>
                {data.productName}
              </h1>

              <p
                className={
                  styles.orderNumber
                }
              >
                {data.orderNumber}
              </p>
            </div>

            <span
              className={
                styles.status
              }
            >
              {statusLabel(
                data.status,
              )}
            </span>
          </div>
        </div>
      </div>

      <div
        className={
          styles.summary
        }
      >
        <Summary
          icon={UserRound}
          label="Customer"
          value={
            data
              .addressSnapshot
              ?.fullName ??
            "—"
          }
        />

        <Summary
          icon={WalletCards}
          label="Order Value"
          value={money(
            data.finalPrice,
          )}
        />

        <Summary
          icon={CalendarDays}
          label="Pickup Date"
          value={dateOnly(
            data.pickupDate,
          )}
        />

        <Summary
          icon={Clock3}
          label="Pickup Slot"
          value={
            data.pickupSlot
              ?.label ??
            "—"
          }
        />
      </div>

      <nav
        className={
          styles.tabs
        }
      >
        <TabButton
          active={
            activeTab ===
            "overview"
          }
          icon={Package}
          label="Overview"
          onClick={() =>
            setActiveTab(
              "overview",
            )
          }
        />

        <TabButton
          active={
            activeTab ===
            "questionnaire"
          }
          icon={
            MessageSquareText
          }
          label="Questionnaire"
          onClick={() =>
            setActiveTab(
              "questionnaire",
            )
          }
        />

        <TabButton
          active={
            activeTab ===
            "timeline"
          }
          icon={History}
          label="Order Timeline"
          onClick={() =>
            setActiveTab(
              "timeline",
            )
          }
        />

        <TabButton
          active={
            activeTab ===
            "feedback"
          }
          icon={FileText}
          label="Feedback"
          onClick={() =>
            setActiveTab(
              "feedback",
            )
          }
        />
      </nav>

      {activeTab ===
        "overview" && (
        <div
          className={
            styles.grid
          }
        >
          <div
            className={
              styles.mainColumn
            }
          >
            <Panel
              title="Device Information"
              icon={Smartphone}
            >
              <div
                className={
                  styles.device
                }
              >
                <div
                  className={
                    styles.deviceImage
                  }
                >
                  {data.productImage ? (
                    <img
                      src={
                        data.productImage
                      }
                      alt={
                        data.productName
                      }
                    />
                  ) : (
                    <Smartphone
                      size={32}
                    />
                  )}
                </div>

                <div>
                  <h3>
                    {data.productName}
                  </h3>

                  <p>
                    {data.variantLabel}
                  </p>

                  <small>
                    Product ID:{" "}
                    {data.productId}
                    {" • "}
                    Variant ID:{" "}
                    {data.variantId}
                  </small>
                </div>
              </div>
            </Panel>

            <Panel
              title="Customer Information"
              icon={UserRound}
            >
              <div
                className={
                  styles.infoGrid
                }
              >
                <Info
                  label="Customer Name"
                  value={
                    data
                      .addressSnapshot
                      ?.fullName ??
                    "—"
                  }
                />

                <Info
                  label="Customer Mobile"
                  value={
                    data.customer
                      ?.phone ??
                    "—"
                  }
                />

                <Info
                  label="Customer Since"
                  value={dateTime(
                    data.customer
                      ?.createdAt,
                  )}
                />

                <Info
                  label="Order Placed"
                  value={dateTime(
                    data.createdAt,
                  )}
                />

                <Info
                  label="Last Updated"
                  value={dateTime(
                    data.updatedAt,
                  )}
                />
              </div>
            </Panel>

            <Panel
              title="Pickup Address"
              icon={MapPin}
            >
              {data.addressSnapshot ? (
                <>
                  <strong
                    className={
                      styles.addressName
                    }
                  >
                    {
                      data
                        .addressSnapshot
                        .fullName
                    }
                  </strong>

                  <p
                    className={
                      styles.address
                    }
                  >
                    {[
                      data
                        .addressSnapshot
                        .house,

                      data
                        .addressSnapshot
                        .street,

                      data
                        .addressSnapshot
                        .locality,

                      data
                        .addressSnapshot
                        .landmark,

                      data
                        .addressSnapshot
                        .city,

                      data
                        .addressSnapshot
                        .state,

                      data
                        .addressSnapshot
                        .pincode,
                    ]
                      .filter(
                        Boolean,
                      )
                      .join(", ")}
                  </p>

                  <div
                    className={
                      styles.addressMeta
                    }
                  >
                    <span>
                      {
                        data
                          .addressSnapshot
                          .type
                      }
                    </span>

                    <span>
                      {
                        data
                          .addressSnapshot
                          .phone
                      }
                    </span>
                  </div>
                </>
              ) : (
                <EmptyText>
                  Address snapshot
                  unavailable.
                </EmptyText>
              )}
            </Panel>
          </div>

          <aside
            className={
              styles.sideColumn
            }
          >
            <Panel
              title="Price Breakdown"
              icon={CreditCard}
            >
              <div
                className={
                  styles.priceList
                }
              >
                <PriceRow
                  label="Base Price"
                  value={money(
                    data.basePrice,
                  )}
                />

                <PriceRow
                  label="Total Deduction"
                  value={`- ${money(
                    data.totalDeduction,
                  )}`}
                />

                <div
                  className={
                    styles.finalPrice
                  }
                >
                  <span>
                    Final Price
                  </span>

                  <strong>
                    {money(
                      data.finalPrice,
                    )}
                  </strong>
                </div>
              </div>
            </Panel>

            <Panel
              title="Pickup"
              icon={
                CalendarDays
              }
            >
              <div
                className={
                  styles.infoStack
                }
              >
                <Info
                  label="Date"
                  value={dateOnly(
                    data.pickupDate,
                  )}
                />

                <Info
                  label="Slot"
                  value={
                    data.pickupSlot
                      ?.label ??
                    "—"
                  }
                />
              </div>
            </Panel>

            <Panel
              title="Payout"
              icon={WalletCards}
            >
              <div
                className={
                  styles.infoStack
                }
              >
                <Info
                  label="Method"
                  value={
                    data.payoutMethod ??
                    "—"
                  }
                />

                <Info
                  label="UPI Mobile"
                  value={
                    data.payoutUpiMobile ??
                    "—"
                  }
                />
              </div>
            </Panel>

            <Panel
              title="Assignment"
              icon={UserRound}
            >
              <EmptyText>
                Vendor and Agent
                assignment will appear
                here after the real
                assignment workflow is
                connected.
              </EmptyText>
            </Panel>
          </aside>
        </div>
      )}

      {activeTab ===
        "questionnaire" && (
        <Panel
          title="Questionnaire"
          icon={
            MessageSquareText
          }
        >
          {questionnaire.length >
          0 ? (
            <>
              <div
                className={
                  styles.questionList
                }
              >
                {questionnaire.map(
                  (
                    answer,
                  ) => (
                    <div
                      key={`${answer.itemId ?? "unknown"}-${answer.index}`}
                      className={
                        styles.questionItem
                      }
                    >
                      <div
                        className={
                          styles.questionNumber
                        }
                      >
                        {
                          answer.index
                        }
                      </div>

                      <div
                        className={
                          styles.questionContent
                        }
                      >
                        <span
                          className={
                            styles.questionLabel
                          }
                        >
                          Question
                        </span>

                        <h3>
                          {
                            answer.question
                          }
                        </h3>

                        <div
                          className={
                            styles.responseBlock
                          }
                        >
                          <span>
                            Customer
                            Response
                          </span>

                          {answer
                            .selectedOptions
                            .length >
                          0 ? (
                            <div
                              className={
                                styles.answerList
                              }
                            >
                              {answer.selectedOptions.map(
                                (
                                  option,
                                ) => (
                                  <strong
                                    key={
                                      option.id
                                    }
                                  >
                                    {
                                      option.label
                                    }
                                  </strong>
                                ),
                              )}
                            </div>
                          ) : (
                            <strong>
                              Response
                              unavailable
                            </strong>
                          )}
                        </div>

                        {answer
                          .childOptions
                          .length >
                          0 && (
                          <div
                            className={
                              styles.childResponses
                            }
                          >
                            <span>
                              Additional
                              Details
                            </span>

                            <div
                              className={
                                styles.answerList
                              }
                            >
                              {answer.childOptions.map(
                                (
                                  option,
                                ) => (
                                  <strong
                                    key={
                                      option.id
                                    }
                                  >
                                    {
                                      option.label
                                    }
                                  </strong>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>

              <div
                className={
                  styles.questionnaireTotal
                }
              >
                <div>
                  <span>
                    Total Deduction
                  </span>

                  <small>
                    Total deduction
                    applied to this
                    order
                  </small>
                </div>

                <strong>
                  -{" "}
                  {money(
                    data.totalDeduction,
                  )}
                </strong>
              </div>
            </>
          ) : (
            <EmptyText>
              Questionnaire responses
              are currently unavailable
              for this order.
            </EmptyText>
          )}
        </Panel>
      )}

      {activeTab ===
        "timeline" && (
        <Panel
          title="Order Timeline"
          icon={History}
        >
          {statusHistory.length >
          0 ? (
            <div
              className={
                styles.timeline
              }
            >
              {statusHistory.map(
                (item) => (
                  <div
                    key={
                      item.id
                    }
                    className={
                      styles.timelineItem
                    }
                  >
                    <span
                      className={
                        styles.timelineDot
                      }
                    />

                    <div>
                      <strong>
                        {statusLabel(
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
                        {dateTime(
                          item.createdAt,
                        )}
                      </small>
                    </div>
                  </div>
                ),
              )}
            </div>
          ) : (
            <EmptyText>
              Status history
              unavailable.
            </EmptyText>
          )}
        </Panel>
      )}

      {activeTab ===
        "feedback" && (
        <Panel
          title="Customer Feedback"
          icon={FileText}
        >
          {data.feedback ? (
            <div
              className={
                styles.infoGrid
              }
            >
              <Info
                label="Rating"
                value={
                  data.feedback
                    .rating !==
                  null
                    ? `${data.feedback.rating} / 5`
                    : "—"
                }
              />

              <Info
                label="Feedback Option"
                value={
                  data.feedback
                    .optionLabelSnapshot ??
                  "—"
                }
              />

              <Info
                label="Comment"
                value={
                  data.feedback
                    .feedbackText ??
                  "—"
                }
              />

              <Info
                label="Submitted"
                value={dateTime(
                  data.feedback
                    .createdAt,
                )}
              />
            </div>
          ) : (
            <EmptyText>
              Customer has not
              submitted feedback for
              this order.
            </EmptyText>
          )}
        </Panel>
      )}
    </section>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Package;
  children: React.ReactNode;
}) {
  return (
    <section
      className={
        styles.panel
      }
    >
      <div
        className={
          styles.panelTitle
        }
      >
        <Icon size={18} />

        <h2>
          {title}
        </h2>
      </div>

      {children}
    </section>
  );
}

function Summary({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Package;
  label: string;
  value: string;
}) {
  return (
    <div
      className={
        styles.summaryItem
      }
    >
      <span
        className={
          styles.summaryIcon
        }
      >
        <Icon size={19} />
      </span>

      <div>
        <small>
          {label}
        </small>

        <strong>
          {value}
        </strong>
      </div>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className={
        styles.info
      }
    >
      <small>
        {label}
      </small>

      <strong>
        {value}
      </strong>
    </div>
  );
}

function PriceRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className={
        styles.priceRow
      }
    >
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

function TabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof Package;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={
        active
          ? styles.activeTab
          : styles.tab
      }
      onClick={onClick}
    >
      <Icon size={17} />

      {label}
    </button>
  );
}

function EmptyText({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <p
      className={
        styles.empty
      }
    >
      {children}
    </p>
  );
}