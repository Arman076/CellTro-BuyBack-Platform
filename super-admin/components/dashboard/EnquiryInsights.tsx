"use client";

import {
  ChevronDown,
  ChevronUp,
  Smartphone,
  UserRound,
} from "lucide-react";

import {
  useState,
} from "react";

import type {
  InquiryCustomerGroup,
} from "@/lib/dashboard-types";

import styles from "./EnquiryInsights.module.css";

type Props = {
  customers:
    InquiryCustomerGroup[];
};

function formatCurrency(
  value:
    | number
    | null,
) {
  if (
    value ===
    null
  ) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-IN",
    {
      style:
        "currency",

      currency:
        "INR",

      maximumFractionDigits:
        0,
    },
  ).format(
    value,
  );
}

function formatDateTime(
  value:
    | string
    | null,
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      dateStyle:
        "medium",

      timeStyle:
        "short",
    },
  ).format(
    date,
  );
}

export default function EnquiryInsights({
  customers,
}: Props) {
  const [
    expandedMobile,
    setExpandedMobile,
  ] =
    useState<
      string | null
    >(null);

  if (
    customers.length ===
    0
  ) {
    return (
      <div
        className={
          styles.empty
        }
      >
        No active inquiry
        customers in the
        selected period.
      </div>
    );
  }

  return (
    <div
      className={
        styles.list
      }
    >
      {customers.map(
        (
          customer,
        ) => {
          const expanded =
            expandedMobile ===
            customer.mobile;

          return (
            <article
              key={
                customer.mobile
              }
              className={
                styles.customer
              }
            >
              <button
                type="button"
                className={
                  styles.customerHeader
                }
                onClick={() =>
                  setExpandedMobile(
                    expanded
                      ? null
                      : customer.mobile,
                  )
                }
                aria-expanded={
                  expanded
                }
              >
                <span
                  className={
                    styles.customerIcon
                  }
                >
                  <UserRound
                    size={
                      18
                    }
                  />
                </span>

                <span
                  className={
                    styles.customerMain
                  }
                >
                  <strong>
                    {
                      customer.mobile
                    }
                  </strong>

                  <small>
                    {
                      customer.deviceCount
                    }{" "}
                    active{" "}
                    {customer.deviceCount ===
                    1
                      ? "device enquiry"
                      : "device enquiries"}
                  </small>
                </span>

                <span
                  className={
                    styles.latest
                  }
                >
                  <small>
                    Latest quote
                  </small>

                  <strong>
                    {formatDateTime(
                      customer.latestQuoteViewedAt,
                    )}
                  </strong>
                </span>

                <span
                  className={
                    styles.chevron
                  }
                >
                  {expanded ? (
                    <ChevronUp
                      size={
                        18
                      }
                    />
                  ) : (
                    <ChevronDown
                      size={
                        18
                      }
                    />
                  )}
                </span>
              </button>

              {expanded && (
                <div
                  className={
                    styles.devices
                  }
                >
                  {customer.devices.map(
                    (
                      device,
                    ) => (
                      <div
                        key={
                          device.id
                        }
                        className={
                          styles.deviceRow
                        }
                      >
                        <span
                          className={
                            styles.deviceIcon
                          }
                        >
                          <Smartphone
                            size={
                              17
                            }
                          />
                        </span>

                        <div
                          className={
                            styles.deviceMain
                          }
                        >
                          <strong>
                            {device.deviceName ??
                              "—"}
                          </strong>

                          <small>
                            Quote viewed{" "}
                            {formatDateTime(
                              device.quoteViewedAt,
                            )}
                          </small>
                        </div>

                        <div
                          className={
                            styles.amount
                          }
                        >
                          {formatCurrency(
                            device.quoteAmount,
                          )}
                        </div>

                        <span
                          className={
                            styles.status
                          }
                        >
                          Active inquiry
                        </span>
                      </div>
                    ),
                  )}
                </div>
              )}
            </article>
          );
        },
      )}
    </div>
  );
}
