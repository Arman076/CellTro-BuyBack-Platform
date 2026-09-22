"use client";

import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useMemo, useState } from "react";

import DateRangeFilter from "@/components/filters/DateRangeFilter";
import {
  getDateRangeForPreset,
  type DateRangeValue,
} from "@/lib/date-range";
import type {
  VendorDashboardOrder,
  VendorOrderStatus,
} from "@/lib/vendor-types";

import styles from "./OrdersClient.module.css";

interface OrdersClientProps {
  orders: VendorDashboardOrder[];
}

type OrderFilter = "ALL" | VendorOrderStatus;

const filters: Array<{
  label: string;
  value: OrderFilter;
}> = [
  { label: "All", value: "ALL" },
  { label: "Allocated", value: "ALLOCATED" },
  { label: "Picked", value: "PICKED" },
  { label: "Pending", value: "PENDING" },
  { label: "Inspection", value: "INSPECTION" },
  { label: "Completed", value: "COMPLETED" },
];

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function getStatusClass(
  status: VendorOrderStatus,
): string {
  switch (status) {
    case "ALLOCATED":
      return styles.allocated;
    case "PICKED":
      return styles.picked;
    case "PENDING":
      return styles.pending;
    case "INSPECTION":
      return styles.inspection;
    case "COMPLETED":
      return styles.completed;
    case "CANCELLED":
      return styles.cancelled;
    default:
      return "";
  }
}

export default function OrdersClient({
  orders,
}: OrdersClientProps) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] =
    useState<OrderFilter>("ALL");

  const [dateRange, setDateRange] =
    useState<DateRangeValue>(() =>
      getDateRangeForPreset("TODAY"),
    );

  const summary = useMemo(() => {
    return orders.reduce(
      (result, order) => {
        result.total += 1;

        if (
          order.status === "PENDING" ||
          order.status === "ALLOCATED"
        ) {
          result.pending += 1;
        }

        if (order.status === "COMPLETED") {
          result.completed += 1;
        }

        return result;
      },
      {
        total: 0,
        pending: 0,
        completed: 0,
      },
    );
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const query = normalize(search);

    return orders.filter((order) => {
      const matchesStatus =
        activeFilter === "ALL" ||
        order.status === activeFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        order.orderNumber,
        order.customerName,
        order.deviceName,
      ].some((value) =>
        normalize(value).includes(query),
      );
    });
  }, [activeFilter, orders, search]);

  function handleDateRangeChange(
    nextRange: DateRangeValue,
  ) {
    setDateRange(nextRange);

    /*
     * The real Vendor Orders API will receive:
     *
     * from = nextRange.from
     * to   = nextRange.to
     *
     * Date filtering is intentionally NOT performed
     * against the current placeholder order model.
     * The existing VendorDashboardOrder does not contain
     * a reliable pickupDate field yet.
     *
     * Filtering will be performed server-side once the
     * vendor-scoped Orders API is connected.
     */
  }

  return (
    <section className={styles.page}>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>
          Order management
        </p>

        <h1>Orders</h1>

        <p className={styles.subtitle}>
          View allocated orders and manage pickup
          operations.
        </p>
      </header>

      <div className={styles.summaryGrid}>
        <article className={styles.summaryCard}>
          <div
            className={`${styles.summaryIcon} ${styles.totalIcon}`}
          >
            <ClipboardList size={19} />
          </div>

          <div>
            <span>Total Orders</span>
            <strong>
              {orders.length > 0 ? summary.total : "—"}
            </strong>
          </div>
        </article>

        <article className={styles.summaryCard}>
          <div
            className={`${styles.summaryIcon} ${styles.pendingIcon}`}
          >
            <Clock3 size={19} />
          </div>

          <div>
            <span>Pending Actions</span>
            <strong>
              {orders.length > 0
                ? summary.pending
                : "—"}
            </strong>
          </div>
        </article>

        <article className={styles.summaryCard}>
          <div
            className={`${styles.summaryIcon} ${styles.completedIcon}`}
          >
            <CheckCircle2 size={19} />
          </div>

          <div>
            <span>Completed</span>
            <strong>
              {orders.length > 0
                ? summary.completed
                : "—"}
            </strong>
          </div>
        </article>
      </div>

      <div className={styles.toolbar}>
        <label className={styles.searchBox}>
          <Search size={18} />

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search order, customer or device"
            aria-label="Search orders"
          />
        </label>

        <div className={styles.toolbarActions}>
          <DateRangeFilter
            value={dateRange}
            onChange={handleDateRangeChange}
          />

          <button
            type="button"
            className={styles.filterButton}
            disabled
            title="Advanced filters will be enabled with the Vendor Orders API"
          >
            <SlidersHorizontal size={17} />
            <span>Filters</span>
          </button>
        </div>
      </div>

      <div className={styles.tabs}>
        {filters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={
              activeFilter === filter.value
                ? styles.activeTab
                : ""
            }
            onClick={() =>
              setActiveFilter(filter.value)
            }
          >
            {filter.label}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <ClipboardList size={29} />
          </div>

          <h2>No orders found</h2>

          <p>
            {orders.length === 0
              ? "Orders allocated to this vendor will appear here after the Vendor Orders API is connected."
              : "No orders match the selected search or status filter."}
          </p>
        </div>
      ) : (
        <>
          <div className={styles.desktopTable}>
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Device</th>
                  <th>Pickup Slot</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>

              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.orderNumber}>
                    <td>
                      <Link
                        href={`/orders/${encodeURIComponent(
                          order.orderNumber,
                        )}`}
                        className={styles.orderNumber}
                      >
                        {order.orderNumber}
                      </Link>
                    </td>

                    <td>{order.customerName}</td>
                    <td>{order.deviceName}</td>
                    <td>{order.pickupSlot}</td>

                    <td>
                      <span
                        className={`${styles.status} ${getStatusClass(
                          order.status,
                        )}`}
                      >
                        {order.status}
                      </span>
                    </td>

                    <td>
                      <Link
                        href={`/orders/${encodeURIComponent(
                          order.orderNumber,
                        )}`}
                        className={styles.viewButton}
                      >
                        View
                        <ChevronRight size={15} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.mobileList}>
            {filteredOrders.map((order) => (
              <article
                key={order.orderNumber}
                className={styles.orderCard}
              >
                <div className={styles.cardHeader}>
                  <strong>{order.orderNumber}</strong>

                  <span
                    className={`${styles.status} ${getStatusClass(
                      order.status,
                    )}`}
                  >
                    {order.status}
                  </span>
                </div>

                <h2>{order.deviceName}</h2>
                <p>{order.customerName}</p>

                <div className={styles.cardMeta}>
                  <span>Pickup</span>
                  <strong>{order.pickupSlot}</strong>
                </div>

                <Link
                  href={`/orders/${encodeURIComponent(
                    order.orderNumber,
                  )}`}
                  className={styles.mobileView}
                >
                  View Details
                  <ChevronRight size={16} />
                </Link>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}