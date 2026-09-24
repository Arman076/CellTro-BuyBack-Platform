"use client";

import Link from "next/link";

import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Clock3,
  MapPin,
  PackageCheck,
  RefreshCw,
  Truck,
  UserPlus,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  dateFilterLabel,
  formatDate,
  formatMoney,
  formatStatus,
  getVendorDashboard,
  type DateFilter,
  type VendorDashboardResponse,
} from "../../lib/vendor-orders";

import styles from "./DashboardClient.module.css";

const DATE_FILTERS: Array<{
  value: DateFilter;
  label: string;
}> = [
  {
    value: "ALL",
    label: "All Time",
  },
  {
    value: "TODAY",
    label: "Today",
  },
  {
    value: "YESTERDAY",
    label: "Yesterday",
  },
  {
    value: "LAST_7_DAYS",
    label: "Last 7 Days",
  },
  {
    value: "LAST_30_DAYS",
    label: "Last 30 Days",
  },
];

export default function DashboardClient() {
  const [dateFilter, setDateFilter] =
    useState<DateFilter>("ALL");

  const [data, setData] =
    useState<VendorDashboardResponse | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadDashboard =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const response =
          await getVendorDashboard(
            dateFilter,
          );

        setData(response);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load dashboard.",
        );
      } finally {
        setLoading(false);
      }
    }, [dateFilter]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const counts =
    data?.statusCounts ?? {};

  const newOrders =
    Number(
      counts.PICKUP_REQUESTED ?? 0,
    );

  /*
   * We intentionally derive operational
   * groups from real backend statuses.
   *
   * Unknown future statuses remain visible
   * in totalAssigned instead of being lost.
   */
  const completed =
    useMemo(() => {
      return Object.entries(counts)
        .filter(([status]) => {
          const value =
            status.toUpperCase();

          return (
            value.includes(
              "COMPLETED",
            ) ||
            value.includes(
              "DELIVERED",
            ) ||
            value.includes(
              "SUCCESS",
            )
          );
        })
        .reduce(
          (sum, [, count]) =>
            sum + Number(count),
          0,
        );
    }, [counts]);

  const inProgress =
    useMemo(() => {
      return Object.entries(counts)
        .filter(([status]) => {
          const value =
            status.toUpperCase();

          return (
            value !==
              "PICKUP_REQUESTED" &&
            !value.includes(
              "COMPLETED",
            ) &&
            !value.includes(
              "DELIVERED",
            ) &&
            !value.includes(
              "SUCCESS",
            ) &&
            !value.includes(
              "CANCEL",
            ) &&
            !value.includes(
              "FAILED",
            ) &&
            !value.includes(
              "REJECT",
            )
          );
        })
        .reduce(
          (sum, [, count]) =>
            sum + Number(count),
          0,
        );
    }, [counts]);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>
            Vendor Workspace
          </p>

          <h1>Dashboard</h1>

          <p className={styles.subtitle}>
            Manage assigned orders,
            pickups and agents from one
            place.
          </p>
        </div>

        <div className={styles.heroActions}>
          <div
            className={
              styles.dashboardDateFilter
            }
          >
            <CalendarDays size={17} />

            <select
              value={dateFilter}
              onChange={(event) =>
                setDateFilter(
                  event.target
                    .value as DateFilter,
                )
              }
              aria-label="Dashboard date range"
            >
              {DATE_FILTERS.map(
                (filter) => (
                  <option
                    key={filter.value}
                    value={filter.value}
                  >
                    {filter.label}
                  </option>
                ),
              )}
            </select>
          </div>

          <button
            type="button"
            className={
              styles.refreshButton
            }
            onClick={() =>
              void loadDashboard()
            }
            disabled={loading}
          >
            <RefreshCw
              size={17}
              className={
                loading
                  ? styles.spinning
                  : ""
              }
            />
          </button>

          <Link
            href="/vendor/orders"
            className={
              styles.primaryButton
            }
          >
            View Orders
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      {error && (
        <div className={styles.errorBox}>
          <div>
            <strong>
              Dashboard could not be
              loaded
            </strong>

            <p>{error}</p>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadDashboard()
            }
          >
            Retry
          </button>
        </div>
      )}

      <section className={styles.stats}>
        <StatCard
          icon={
            <ClipboardList
              size={21}
            />
          }
          label="Assigned Orders"
          value={
            loading
              ? "—"
              : String(
                  data?.totalAssigned ??
                    0,
                )
          }
          hint={dateFilterLabel(
            dateFilter,
          )}
        />

        <StatCard
          icon={<Clock3 size={21} />}
          label="New Orders"
          value={
            loading
              ? "—"
              : String(newOrders)
          }
          hint="Waiting for pickup action"
        />

        <StatCard
          icon={<Truck size={21} />}
          label="In Progress"
          value={
            loading
              ? "—"
              : String(inProgress)
          }
          hint="Active pickup workflow"
        />

        <StatCard
          icon={
            <PackageCheck
              size={21}
            />
          }
          label="Completed"
          value={
            loading
              ? "—"
              : String(completed)
          }
          hint="Successfully completed"
        />
      </section>

      <div className={styles.contentGrid}>
        <section
          className={styles.panel}
        >
          <div
            className={
              styles.panelHeader
            }
          >
            <div>
              <h2>Recent Orders</h2>

              <p>
                Latest orders assigned
                during{" "}
                {dateFilterLabel(
                  dateFilter,
                ).toLowerCase()}.
              </p>
            </div>

            <Link
              href="/vendor/orders"
              className={
                styles.textLink
              }
            >
              View all
              <ArrowRight
                size={15}
              />
            </Link>
          </div>

          {loading && (
            <div
              className={
                styles.dashboardLoading
              }
            >
              <div />
              <div />
              <div />
            </div>
          )}

          {!loading &&
            !error &&
            (!data?.recentOrders ||
              data.recentOrders
                .length === 0) && (
              <div
                className={
                  styles.emptyOrders
                }
              >
                <div
                  className={
                    styles.emptyIcon
                  }
                >
                  <ClipboardList
                    size={25}
                  />
                </div>

                <h3>
                  No orders found
                </h3>

                <p>
                  No assigned orders
                  exist for the selected
                  date range.
                </p>

                <Link
                  href="/vendor/orders"
                  className={
                    styles.secondaryButton
                  }
                >
                  Open Orders
                </Link>
              </div>
            )}

          {!loading &&
            data?.recentOrders &&
            data.recentOrders.length >
              0 && (
              <div
                className={
                  styles.recentOrders
                }
              >
                {data.recentOrders.map(
                  (order) => (
                    <Link
                      key={order.id}
                      href="/vendor/orders"
                      className={
                        styles.recentOrder
                      }
                    >
                      <div
                        className={
                          styles.orderImage
                        }
                      >
                        {order.productImage ? (
                          <img
                            src={
                              order.productImage
                            }
                            alt=""
                          />
                        ) : (
                          <ClipboardList
                            size={21}
                          />
                        )}
                      </div>

                      <div
                        className={
                          styles.orderMain
                        }
                      >
                        <strong>
                          {
                            order.productName
                          }
                        </strong>

                        <span>
                          {
                            order.orderNumber
                          }
                        </span>

                        <small>
                          {
                            order.customerName
                          }
                        </small>
                      </div>

                      <div
                        className={
                          styles.orderPickup
                        }
                      >
                        <span>
                          <CalendarDays
                            size={13}
                          />
                          {formatDate(
                            order.pickupDate,
                          )}
                        </span>

                        {order.location && (
                          <small>
                            <MapPin
                              size={12}
                            />
                            {
                              order
                                .location
                                .pincode
                            }
                          </small>
                        )}
                      </div>

                      <div
                        className={
                          styles.orderPrice
                        }
                      >
                        <strong>
                          {formatMoney(
                            order.finalPrice,
                          )}
                        </strong>

                        <span>
                          {formatStatus(
                            order.status,
                          )}
                        </span>
                      </div>

                      <ArrowRight
                        size={17}
                      />
                    </Link>
                  ),
                )}
              </div>
            )}
        </section>

        <section
          className={styles.panel}
        >
          <div
            className={
              styles.panelHeader
            }
          >
            <div>
              <h2>Quick Actions</h2>
              <p>
                Common vendor
                operations.
              </p>
            </div>
          </div>

          <div
            className={styles.actions}
          >
            <Link
              href="/vendor/orders"
              className={
                styles.action
              }
            >
              <div
                className={
                  styles.actionIcon
                }
              >
                <ClipboardList
                  size={20}
                />
              </div>

              <div>
                <strong>
                  Manage Orders
                </strong>

                <span>
                  View routed orders
                </span>
              </div>

              <ArrowRight
                size={17}
              />
            </Link>

            <Link
              href="/vendor/agents"
              className={
                styles.action
              }
            >
              <div
                className={
                  styles.actionIcon
                }
              >
                <UserPlus
                  size={20}
                />
              </div>

              <div>
                <strong>
                  Manage Agents
                </strong>

                <span>
                  Create and manage
                  pickup agents
                </span>
              </div>

              <ArrowRight
                size={17}
              />
            </Link>

            <button
              type="button"
              className={
                styles.action
              }
              onClick={() =>
                void loadDashboard()
              }
              disabled={loading}
            >
              <div
                className={
                  styles.actionIcon
                }
              >
                <RefreshCw
                  size={20}
                />
              </div>

              <div>
                <strong>
                  Refresh Dashboard
                </strong>

                <span>
                  Refresh live vendor
                  information
                </span>
              </div>

              <RefreshCw
                size={17}
                className={
                  loading
                    ? styles.spinning
                    : ""
                }
              />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <article
      className={styles.statCard}
    >
      <div
        className={styles.statTop}
      >
        <div
          className={styles.statIcon}
        >
          {icon}
        </div>

        <span
          className={styles.live}
        >
          LIVE
        </span>
      </div>

      <strong
        className={styles.statValue}
      >
        {value}
      </strong>

      <span
        className={styles.statLabel}
      >
        {label}
      </span>

      <small>{hint}</small>
    </article>
  );
}