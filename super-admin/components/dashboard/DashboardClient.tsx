"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  BadgeIndianRupee,
  CheckCircle2,
  CircleX,
  ClipboardList,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  UserRoundSearch,
  UserX,
} from "lucide-react";

// import {
//   API_BASE_URL,
// } from "@/lib/api";

import type {
  DashboardResponse,
} from "@/lib/dashboard-types";

import StatCard from "./StatCard";
import EnquiryFunnel from "./EnquiryFunnel";
import EnquiryInsights from "./EnquiryInsights";
import OrderStatusChart from "./OrderStatusChart";
import RecentActivity from "./RecentActivity";

import styles from "./DashboardClient.module.css";

type Period =
  | "today"
  | "yesterday"
  | "7days"
  | "30days"
  | "month"
  | "custom";

function formatLocalDate(
  date: Date,
) {
  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getPresetRange(
  period: Exclude<
    Period,
    "custom"
  >,
) {
  const now = new Date();

  const from =
    new Date(now);

  const to =
    new Date(now);

  switch (period) {
    case "today":
      break;

    case "yesterday":
      from.setDate(
        from.getDate() - 1,
      );

      to.setDate(
        to.getDate() - 1,
      );

      break;

    case "7days":
      from.setDate(
        from.getDate() - 6,
      );

      break;

    case "30days":
      from.setDate(
        from.getDate() - 29,
      );

      break;

    case "month":
      from.setDate(1);

      break;
  }

  return {
    from:
      formatLocalDate(from),

    to:
      formatLocalDate(to),
  };
}

function formatNumber(
  value:
    | number
    | null
    | undefined,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return undefined;
  }

  return value.toLocaleString(
    "en-IN",
  );
}

function formatPercentage(
  value:
    | number
    | null
    | undefined,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return undefined;
  }

  return `${value.toFixed(1)}%`;
}

function formatCurrency(
  value:
    | number
    | null
    | undefined,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return undefined;
  }

  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",

      maximumFractionDigits: 0,
    },
  ).format(value);
}

export default function DashboardClient() {
  const [
    period,
    setPeriod,
  ] =
    useState<Period>(
      "today",
    );

  const today =
    useMemo(
      () =>
        formatLocalDate(
          new Date(),
        ),
      [],
    );

  const [
    customFrom,
    setCustomFrom,
  ] =
    useState(today);

  const [
    customTo,
    setCustomTo,
  ] =
    useState(today);

  const [
    appliedCustomRange,
    setAppliedCustomRange,
  ] =
    useState({
      from: today,
      to: today,
    });

  const [
    refreshVersion,
    setRefreshVersion,
  ] =
    useState(0);

  const [
    data,
    setData,
  ] =
    useState<
      DashboardResponse | null
    >(null);

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

  const dateRange =
    useMemo(() => {
      if (
        period ===
        "custom"
      ) {
        return appliedCustomRange;
      }

      return getPresetRange(
        period,
      );
    }, [
      period,
      appliedCustomRange,
    ]);

  useEffect(() => {
    const controller =
      new AbortController();

    async function fetchDashboard() {
      try {
        const params =
          new URLSearchParams(
            {
              from:
                dateRange.from,

              to:
                dateRange.to,
            },
          );

        const response =
          await fetch(
            // `${API_BASE_URL}/super-admin/dashboard?${params.toString()}`,
            `/api/super-admin/dashboard?${params.toString()}`,
            {
              method: "GET",

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

       if (!response.ok) {
  const errorBody =
    await response
      .json()
      .catch(() => null);

  const message =
    errorBody &&
    typeof errorBody ===
      "object" &&
    "message" in
      errorBody &&
    typeof errorBody.message ===
      "string"
      ? errorBody.message
      : `Dashboard request failed. HTTP ${response.status}`;

  throw new Error(
    message,
  );
}

        const result =
          (await response.json()) as DashboardResponse;

        if (
          controller.signal
            .aborted
        ) {
          return;
        }

        setData(result);
        setError("");
      } catch (err) {
        if (
          controller.signal
            .aborted
        ) {
          return;
        }

        console.error(
          "Dashboard load error:",
          err,
        );

        setData(null);

        setError(
          err instanceof Error
            ? err.message
            : "Dashboard data load nahi hua.",
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

    void fetchDashboard();

    return () => {
      controller.abort();
    };
  }, [
    dateRange.from,
    dateRange.to,
    refreshVersion,
  ]);

  function changePeriod(
    newPeriod: Period,
  ) {
    setLoading(true);
    setError("");

    setPeriod(
      newPeriod,
    );
  }

  function refreshDashboard() {
    setLoading(true);
    setError("");

    setRefreshVersion(
      (current) =>
        current + 1,
    );
  }

  function applyCustomRange() {
    if (
      !customFrom ||
      !customTo
    ) {
      return;
    }

    if (
      customFrom >
      customTo
    ) {
      setError(
        "From date To date se badi nahi ho sakti.",
      );

      return;
    }

    setLoading(true);
    setError("");

    setAppliedCustomRange({
      from:
        customFrom,

      to:
        customTo,
    });
  }

  const summary =
    data?.summary;

  return (
    <section
      className={
        styles.page
      }
    >
      <div
        className={
          styles.header
        }
      >
        <div>
          <p
            className={
              styles.eyebrow
            }
          >
            PLATFORM OVERVIEW
          </p>

          <h1>
            Super Admin
            Dashboard
          </h1>

          <p
            className={
              styles.description
            }
          >
            Real enquiries,
            orders and platform
            activity from the
            Celltro backend.
          </p>
        </div>

        <div
          className={
            styles.headerActions
          }
        >
          <select
            value={period}
            className={
              styles.periodSelect
            }
            onChange={(
              event,
            ) =>
              changePeriod(
                event.target
                  .value as Period,
              )
            }
          >
            <option
              value="today"
            >
              Today
            </option>

            <option
              value="yesterday"
            >
              Yesterday
            </option>

            <option
              value="7days"
            >
              Last 7 Days
            </option>

            <option
              value="30days"
            >
              Last 30 Days
            </option>

            <option
              value="month"
            >
              This Month
            </option>

            <option
              value="custom"
            >
              Custom Range
            </option>
          </select>

          <button
            type="button"
            className={
              styles.refreshButton
            }
            onClick={
              refreshDashboard
            }
            disabled={
              loading
            }
          >
            <RefreshCw
              size={17}
              className={
                loading
                  ? styles.spinning
                  : ""
              }
            />

            Refresh
          </button>
        </div>
      </div>

      {period ===
        "custom" && (
        <div
          className={
            styles.customRange
          }
        >
          <label>
            <span>
              From
            </span>

            <input
              type="date"
              value={
                customFrom
              }
              max={
                customTo ||
                undefined
              }
              onChange={(
                event,
              ) =>
                setCustomFrom(
                  event
                    .target
                    .value,
                )
              }
            />
          </label>

          <label>
            <span>
              To
            </span>

            <input
              type="date"
              value={
                customTo
              }
              min={
                customFrom ||
                undefined
              }
              onChange={(
                event,
              ) =>
                setCustomTo(
                  event
                    .target
                    .value,
                )
              }
            />
          </label>

          <button
            type="button"
            onClick={
              applyCustomRange
            }
          >
            Apply
          </button>
        </div>
      )}

      <div
        className={
          styles.rangeInfo
        }
      >
        <span>
          Showing:
        </span>

        <strong>
          {
            dateRange.from
          }
        </strong>

        <span>
          to
        </span>

        <strong>
          {dateRange.to}
        </strong>
      </div>

      {error && (
        <div
          className={
            styles.errorBanner
          }
        >
          <CircleX
            size={18}
          />

          <div>
            <strong>
              Real data not
              available
            </strong>

            <p>
              {error}
            </p>
          </div>
        </div>
      )}

      <div
        className={
          styles.cardsGrid
        }
      >
        <StatCard
          title="Inquiry Customers"
          value={
            loading
              ? undefined
              : formatNumber(
                  summary
                    ?.activeInquiryCustomers,
                )
          }
          icon={
            UserRoundSearch
          }
          tone="blue"
          subtitle={
            loading
              ? "Grouped by verified mobile"
              : `${formatNumber(
                  summary
                    ?.activeDeviceEnquiries,
                ) ?? "—"} active device enquiries`
          }
        />

        <StatCard
          title="Total Orders"
          value={
            loading
              ? undefined
              : formatNumber(
                  summary
                    ?.totalOrders,
                )
          }
          icon={
            ShoppingCart
          }
          tone="indigo"
          subtitle="Orders created in selected period"
        />

        <StatCard
          title="Completed Orders"
          value={
            loading
              ? undefined
              : formatNumber(
                  summary
                    ?.completedOrders,
                )
          }
          icon={
            CheckCircle2
          }
          tone="emerald"
          subtitle="Successfully completed"
        />

        <StatCard
          title="Pending Orders"
          value={
            loading
              ? undefined
              : formatNumber(
                  summary
                    ?.pendingOrders,
                )
          }
          icon={
            ClipboardList
          }
          tone="amber"
          subtitle="Currently active"
        />

        <StatCard
          title="Cancelled Orders"
          value={
            loading
              ? undefined
              : formatNumber(
                  summary
                    ?.cancelledOrders,
                )
          }
          icon={
            CircleX
          }
          tone="red"
          subtitle="Current cancelled status"
        />

        <StatCard
          title="Customer Cancel"
          value={
            loading
              ? undefined
              : formatNumber(
                  summary
                    ?.customerCancelledOrders,
                )
          }
          icon={
            CircleX
          }
          tone="rose"
          subtitle="Cancellation event by customer"
        />

        <StatCard
          title="Agent Cancel"
          value={
            loading
              ? undefined
              : formatNumber(
                  summary
                    ?.agentCancelledOrders,
                )
          }
          icon={
            UserX
          }
          tone="orange"
          subtitle="Cancellation event by agent"
        />

        <StatCard
          title="Quote → Order Conversion"
          value={
            loading
              ? undefined
              : formatPercentage(
                  summary
                    ?.enquiryConversionRate,
                )
          }
          icon={
            TrendingUp
          }
          tone="cyan"
          subtitle="Orders linked ÷ quotes viewed"
        />

        <StatCard
          title="Order Success"
          value={
            loading
              ? undefined
              : formatPercentage(
                  summary
                    ?.orderSuccessRate,
                )
          }
          icon={
            CheckCircle2
          }
          tone="green"
          subtitle="Completed ÷ orders"
        />

        <StatCard
          title="Customer Payout"
          value={
            loading
              ? undefined
              : formatCurrency(
                  summary
                    ?.totalPayout,
                )
          }
          icon={
            BadgeIndianRupee
          }
          tone="purple"
          subtitle="Available when payout data is connected"
        />
      </div>

      <div
        className={
          styles.twoColumnGrid
        }
      >
        <section
          className={
            styles.panel
          }
        >
          <PanelHeader
            title="Enquiry → Order Funnel"
            subtitle="Real customer journey"
          />

          <EnquiryFunnel
            data={
              data
                ?.funnel ??
              null
            }
          />
        </section>

        <section
          className={
            styles.panel
          }
        >
          <PanelHeader
            title="Order Status"
            subtitle="Current order distribution"
          />

          <OrderStatusChart
            data={
              data
                ?.orderStatuses ??
              []
            }
          />
        </section>
      </div>

      <section
        className={
          styles.panel
        }
      >
        <PanelHeader
          title="Active Inquiry Customers"
          subtitle="Grouped by mobile number • expand a customer to see each active device quote"
        />

        <EnquiryInsights
          customers={
            data
              ?.inquiryCustomers ??
            []
          }
        />
      </section>

      <section
        className={
          styles.panel
        }
      >
        <PanelHeader
          title="Recent Activity"
          subtitle="Latest platform activity"
        />

        <RecentActivity
          activities={
            data
              ?.recentActivity ??
            []
          }
        />
      </section>
    </section>
  );
}

function PanelHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div
      className={
        styles.panelHeader
      }
    >
      <div>
        <h2>
          {title}
        </h2>

        <p>
          {subtitle}
        </p>
      </div>
    </div>
  );
}