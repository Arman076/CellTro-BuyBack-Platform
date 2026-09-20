"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  CalendarDays,
  RefreshCw,
  RotateCcw,
  Search,
  Smartphone,
} from "lucide-react";

import styles from "./OrdersClient.module.css";

type Order = {
  id: string;
  orderNumber: string;

  productName: string;
  productImage: string | null;
  variantLabel: string;

  finalPrice: number | string;
  status: string;

  pickupDate: string;
  createdAt: string;

  customer: {
    id: number;
    phone: string;
  } | null;

  pickupSlot: {
    label: string;
  } | null;

  addressSnapshot: {
    fullName: string;
  } | null;
};

type OrdersResponse = {
  data?: Order[];
  orders?: Order[];

  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  total?: number;
  totalPages?: number;
  message?: string;
};

type DatePreset =
  | "ALL"
  | "TODAY"
  | "YESTERDAY"
  | "7D"
  | "30D"
  | "CUSTOM";

type StatusGroup =
  | ""
  | "PENDING"
  | "COMPLETED"
  | "CANCELLED";

const STATUS_TABS: Array<{
  value: StatusGroup;
  label: string;
}> = [
  {
    value: "",
    label: "All Orders",
  },
  {
    value: "PENDING",
    label: "Pending",
  },
  {
    value: "COMPLETED",
    label: "Completed",
  },
  {
    value: "CANCELLED",
    label: "Cancelled",
  },
];

function money(value: unknown) {
  if (
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
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

function date(value?: string) {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);

  if (
    Number.isNaN(parsed.getTime())
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(parsed);
}

function statusLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

function statusClass(value: string) {
  if (value === "COMPLETED") {
    return styles.completed;
  }

  if (value === "CANCELLED") {
    return styles.cancelled;
  }

  if (
    value === "PAYMENT_COMPLETED"
  ) {
    return styles.payment;
  }

  if (
    value ===
    "INSPECTION_COMPLETED"
  ) {
    return styles.inspection;
  }

  if (
    value ===
      "PICKUP_CONFIRMED" ||
    value === "PICKUP_STARTED"
  ) {
    return styles.progress;
  }

  return styles.requested;
}

function localDateValue(
  value: Date,
) {
  const year =
    value.getFullYear();

  const month = String(
    value.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    value.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getPresetRange(
  preset: DatePreset,
) {
  const today = new Date();

  if (preset === "TODAY") {
    const value =
      localDateValue(today);

    return {
      from: value,
      to: value,
    };
  }

  if (
    preset === "YESTERDAY"
  ) {
    const yesterday =
      new Date(today);

    yesterday.setDate(
      yesterday.getDate() - 1,
    );

    const value =
      localDateValue(yesterday);

    return {
      from: value,
      to: value,
    };
  }

  if (preset === "7D") {
    const from =
      new Date(today);

    from.setDate(
      from.getDate() - 6,
    );

    return {
      from: localDateValue(from),
      to: localDateValue(today),
    };
  }

  if (preset === "30D") {
    const from =
      new Date(today);

    from.setDate(
      from.getDate() - 29,
    );

    return {
      from: localDateValue(from),
      to: localDateValue(today),
    };
  }

  return {
    from: "",
    to: "",
  };
}

export default function OrdersClient() {
  const [orders, setOrders] =
    useState<Order[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    searchInput,
    setSearchInput,
  ] = useState("");

  const [search, setSearch] =
    useState("");

  const [
    datePreset,
    setDatePreset,
  ] =
    useState<DatePreset>("ALL");

  const [customFrom, setCustomFrom] =
    useState("");

  const [customTo, setCustomTo] =
    useState("");

  const [
    appliedFrom,
    setAppliedFrom,
  ] = useState("");

  const [
    appliedTo,
    setAppliedTo,
  ] = useState("");

  const [
    statusGroup,
    setStatusGroup,
  ] =
    useState<StatusGroup>("");

  const [page, setPage] =
    useState(1);

  const [
    totalPages,
    setTotalPages,
  ] = useState(1);

  const [total, setTotal] =
    useState(0);

  const [
    refreshVersion,
    setRefreshVersion,
  ] = useState(0);

  const loadOrders =
    useCallback(
      async (
        signal?: AbortSignal,
      ) => {
        try {
          setLoading(true);
          setError("");

          const params =
            new URLSearchParams({
              page: String(page),
              limit: "20",
            });

          if (search) {
            params.set(
              "search",
              search,
            );
          }

          /*
           * Completed/Cancelled can use
           * the existing exact status API.
           *
           * Pending requires backend
           * statusGroup support because it
           * represents multiple statuses.
           */
          if (
            statusGroup ===
            "COMPLETED"
          ) {
            params.set(
              "status",
              "COMPLETED",
            );
          } else if (
            statusGroup ===
            "CANCELLED"
          ) {
            params.set(
              "status",
              "CANCELLED",
            );
          } else if (
            statusGroup === "PENDING"
          ) {
            params.set(
              "statusGroup",
              "PENDING",
            );
          }

          if (appliedFrom) {
            params.set(
              "from",
              appliedFrom,
            );
          }

          if (appliedTo) {
            params.set(
              "to",
              appliedTo,
            );
          }

          const response =
            await fetch(
              `/api/super-admin/orders?${params.toString()}`,
              {
                cache: "no-store",
                signal,
              },
            );

          const body:
            | OrdersResponse
            | Order[]
            | null =
            await response
              .json()
              .catch(() => null);

          if (!response.ok) {
            let message =
              "Orders could not be loaded.";

            if (
              body &&
              !Array.isArray(body) &&
              typeof body.message ===
                "string"
            ) {
              message =
                body.message;
            }

            throw new Error(message);
          }

          if (Array.isArray(body)) {
            setOrders(body);
            setTotal(body.length);
            setTotalPages(1);
            return;
          }

          const rows =
            body?.data ??
            body?.orders ??
            [];

          const safeRows =
            Array.isArray(rows)
              ? rows
              : [];

          setOrders(safeRows);

          setTotal(
            body?.pagination?.total ??
              body?.total ??
              safeRows.length,
          );

          setTotalPages(
            Math.max(
              1,
              body?.pagination
                ?.totalPages ??
                body?.totalPages ??
                1,
            ),
          );
        } catch (err) {
          if (signal?.aborted) {
            return;
          }

          setOrders([]);
          setTotal(0);
          setTotalPages(1);

          setError(
            err instanceof Error
              ? err.message
              : "Orders could not be loaded.",
          );
        } finally {
          if (!signal?.aborted) {
            setLoading(false);
          }
        }
      },
      [
        page,
        search,
        statusGroup,
        appliedFrom,
        appliedTo,
        refreshVersion,
      ],
    );

  useEffect(() => {
    const controller =
      new AbortController();

    void loadOrders(
      controller.signal,
    );

    return () => {
      controller.abort();
    };
  }, [loadOrders]);

  function handleSearch(
    event: FormEvent,
  ) {
    event.preventDefault();

    setPage(1);

    setSearch(
      searchInput.trim(),
    );
  }

  function handleDatePreset(
    value: DatePreset,
  ) {
    setDatePreset(value);

    if (value !== "CUSTOM") {
      setCustomFrom("");
      setCustomTo("");
    }
  }

  function applyFilters() {
    if (
      datePreset === "CUSTOM"
    ) {
      if (
        customFrom &&
        customTo &&
        customFrom > customTo
      ) {
        setError(
          "From date cannot be after To date.",
        );

        return;
      }

      setAppliedFrom(
        customFrom,
      );

      setAppliedTo(
        customTo,
      );
    } else {
      const range =
        getPresetRange(
          datePreset,
        );

      setAppliedFrom(
        range.from,
      );

      setAppliedTo(
        range.to,
      );
    }

    setError("");
    setPage(1);
  }

  function resetFilters() {
    setSearchInput("");
    setSearch("");

    setDatePreset("ALL");

    setCustomFrom("");
    setCustomTo("");

    setAppliedFrom("");
    setAppliedTo("");

    setPage(1);
    setError("");
  }

  function changeStatus(
    value: StatusGroup,
  ) {
    setStatusGroup(value);
    setPage(1);
  }

  return (
    <section
      className={styles.page}
    >
      <header
        className={styles.header}
      >
        <div>
          <p
            className={
              styles.eyebrow
            }
          >
            OPERATIONS
          </p>

          <h1>Orders</h1>

          <p
            className={
              styles.subtitle
            }
          >
            Track customer orders,
            pickup progress and
            completed transactions.
          </p>
        </div>

        <button
          type="button"
          className={
            styles.refresh
          }
          disabled={loading}
          onClick={() =>
            setRefreshVersion(
              (current) =>
                current + 1,
            )
          }
        >
          <RefreshCw
            size={17}
            className={
              loading
                ? styles.spin
                : ""
            }
          />

          Refresh
        </button>
      </header>

      {/* SEARCH + DATE FILTER SECTION */}

      <section
        className={
          styles.filterSection
        }
      >
        <form
          className={
            styles.filterBar
          }
          onSubmit={
            handleSearch
          }
        >
          <div
            className={
              styles.searchGroup
            }
          >
            <label>
              Search orders
            </label>

            <div
              className={
                styles.searchBox
              }
            >
              <Search size={18} />

              <input
                type="search"
                value={
                  searchInput
                }
                onChange={(
                  event,
                ) =>
                  setSearchInput(
                    event.target
                      .value,
                  )
                }
                placeholder="Customer, mobile, order ID, device or model"
              />
            </div>
          </div>

          <div
            className={
              styles.dateGroup
            }
          >
            <label>
              Date range
            </label>

            <div
              className={
                styles.dateSelectWrap
              }
            >
              <CalendarDays
                size={16}
              />

              <select
                value={
                  datePreset
                }
                onChange={(
                  event,
                ) =>
                  handleDatePreset(
                    event.target
                      .value as DatePreset,
                  )
                }
              >
                <option value="ALL">
                  All time
                </option>

                <option value="TODAY">
                  Today
                </option>

                <option value="YESTERDAY">
                  Yesterday
                </option>

                <option value="7D">
                  Last 7 days
                </option>

                <option value="30D">
                  Last 30 days
                </option>

                <option value="CUSTOM">
                  Custom range
                </option>
              </select>
            </div>
          </div>

          <button
            type="button"
            className={
              styles.applyButton
            }
            onClick={
              applyFilters
            }
          >
            Apply
          </button>

          <button
            type="button"
            className={
              styles.resetButton
            }
            onClick={
              resetFilters
            }
          >
            <RotateCcw
              size={15}
            />

            Reset
          </button>
        </form>

        {datePreset ===
          "CUSTOM" && (
          <div
            className={
              styles.customRange
            }
          >
            <label>
              <span>From</span>

              <input
                type="date"
                value={
                  customFrom
                }
                onChange={(
                  event,
                ) =>
                  setCustomFrom(
                    event.target
                      .value,
                  )
                }
              />
            </label>

            <label>
              <span>To</span>

              <input
                type="date"
                value={
                  customTo
                }
                onChange={(
                  event,
                ) =>
                  setCustomTo(
                    event.target
                      .value,
                  )
                }
              />
            </label>
          </div>
        )}
      </section>

      {/* STATUS SECTION */}

      <section
        className={
          styles.statusSection
        }
      >
        <div
          className={
            styles.statusTabs
          }
        >
          {STATUS_TABS.map(
            (item) => (
              <button
                key={
                  item.value ||
                  "ALL"
                }
                type="button"
                className={
                  statusGroup ===
                  item.value
                    ? styles.activeTab
                    : ""
                }
                onClick={() =>
                  changeStatus(
                    item.value,
                  )
                }
              >
                {item.label}
              </button>
            ),
          )}
        </div>
      </section>

      {error && (
        <div
          className={
            styles.error
          }
        >
          {error}
        </div>
      )}

      <div
        className={
          styles.resultHeader
        }
      >
        <span>
          <strong>
            {total.toLocaleString(
              "en-IN",
            )}
          </strong>{" "}
          Orders
        </span>

        <span>
          Page {page} of{" "}
          {totalPages}
        </span>
      </div>

      {/* ORDERS */}

      <section
        className={
          styles.tableCard
        }
      >
        <div
          className={
            styles.tableScroller
          }
        >
          <div
            className={
              styles.tableHead
            }
          >
            <span>Order ID</span>
            <span>Customer</span>
            <span>Mobile</span>
            <span>
              Device / Model
            </span>
            <span>Price</span>
            <span>Pickup</span>
            <span>Status</span>
            <span>Action</span>
          </div>

          {loading ? (
            <div
              className={
                styles.empty
              }
            >
              <RefreshCw
                size={21}
                className={
                  styles.spin
                }
              />

              Loading orders...
            </div>
          ) : orders.length ===
            0 ? (
            <div
              className={
                styles.empty
              }
            >
              No orders found.
            </div>
          ) : (
            orders.map(
              (order) => (
                <div
                  key={order.id}
                  className={
                    styles.orderRow
                  }
                >
                  <div
                    className={
                      styles.orderId
                    }
                  >
                    <small>
                      Order ID
                    </small>

                    <strong>
                      {
                        order.orderNumber
                      }
                    </strong>
                  </div>

                  <div
                    className={
                      styles.customer
                    }
                  >
                    <small>
                      Customer
                    </small>

                    <strong>
                      {order
                        .addressSnapshot
                        ?.fullName ??
                        "—"}
                    </strong>
                  </div>

                  <div
                    className={
                      styles.mobile
                    }
                  >
                    <small>
                      Mobile
                    </small>

                    <strong>
                      {order.customer
                        ?.phone ??
                        "—"}
                    </strong>
                  </div>

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
                      {order.productImage ? (
                        <img
                          src={
                            order.productImage
                          }
                          alt={
                            order.productName
                          }
                        />
                      ) : (
                        <Smartphone
                          size={23}
                        />
                      )}
                    </div>

                    <div
                      className={
                        styles.deviceText
                      }
                    >
                      <small>
                        Device / Model
                      </small>

                      <strong>
                        {
                          order.productName
                        }
                      </strong>

                      <span>
                        {
                          order.variantLabel
                        }
                      </span>
                    </div>
                  </div>

                  <div
                    className={
                      styles.price
                    }
                  >
                    <small>
                      Price
                    </small>

                    <strong>
                      {money(
                        order.finalPrice,
                      )}
                    </strong>
                  </div>

                  <div
                    className={
                      styles.pickup
                    }
                  >
                    <small>
                      Pickup
                    </small>

                    <strong>
                      {date(
                        order.pickupDate,
                      )}
                    </strong>

                    <span>
                      {order
                        .pickupSlot
                        ?.label ??
                        "—"}
                    </span>
                  </div>

                  <div
                    className={
                      styles.statusCell
                    }
                  >
                    <small>
                      Status
                    </small>

                    <span
                      className={`${styles.statusBadge} ${statusClass(
                        order.status,
                      )}`}
                    >
                      {statusLabel(
                        order.status,
                      )}
                    </span>
                  </div>

                  <div
                    className={
                      styles.action
                    }
                  >
                    <small>
                      Action
                    </small>

                    <Link
                      href={`/orders/${encodeURIComponent(
                        order.orderNumber,
                      )}`}
                    >
                      View
                    </Link>
                  </div>
                </div>
              ),
            )
          )}
        </div>
      </section>

      <footer
        className={
          styles.pagination
        }
      >
        <button
          type="button"
          disabled={
            page <= 1 ||
            loading
          }
          onClick={() =>
            setPage(
              (current) =>
                Math.max(
                  1,
                  current - 1,
                ),
            )
          }
        >
          Previous
        </button>

        <span>
          Page{" "}
          <strong>{page}</strong>{" "}
          of{" "}
          <strong>
            {totalPages}
          </strong>
        </span>

        <button
          type="button"
          disabled={
            page >= totalPages ||
            loading
          }
          onClick={() =>
            setPage(
              (current) =>
                Math.min(
                  totalPages,
                  current + 1,
                ),
            )
          }
        >
          Next
        </button>
      </footer>
    </section>
  );
}