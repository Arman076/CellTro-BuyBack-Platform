"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  RefreshCw,
  Repeat2,
  Search,
  UserPlus,
  UsersRound,
} from "lucide-react";

import styles from "./CustomersClient.module.css";

type LatestOrder = {
  orderNumber: string;
  productName: string;
  variantLabel: string;
  finalPrice: number | null;
  status: string;
  createdAt: string;
};

type Customer = {
  id: number;
  name: string | null;
  phone: string;

  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;

  latestOrder: LatestOrder | null;

  createdAt: string;
  updatedAt: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number | null;
  totalPages: number;
};

type CustomersResponse = {
  data?: Customer[];

  pagination?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };

  summary?: {
    totalCustomers?: number;
    newCustomers?: number;
    repeatCustomers?: number;
  };

  message?: string;
};

type DatePreset =
  | "ALL_TIME"
  | "TODAY"
  | "YESTERDAY"
  | "LAST_7_DAYS"
  | "LAST_30_DAYS"
  | "CUSTOM";

type CustomerTab =
  | "ALL"
  | "NEW"
  | "REPEAT";

const PAGE_SIZE = 50;

const DEFAULT_PAGINATION: Pagination = {
  page: 1,
  limit: PAGE_SIZE,
  total: null,
  totalPages: 1,
};

function toDateInputValue(date: Date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getPresetRange(
  preset: DatePreset,
) {
  if (
    preset === "ALL_TIME" ||
    preset === "CUSTOM"
  ) {
    return {
      from: "",
      to: "",
    };
  }

  const today = new Date();

  const end = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const start = new Date(end);

  if (preset === "YESTERDAY") {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
  }

  if (preset === "LAST_7_DAYS") {
    start.setDate(start.getDate() - 6);
  }

  if (preset === "LAST_30_DAYS") {
    start.setDate(start.getDate() - 29);
  }

  return {
    from: toDateInputValue(start),
    to: toDateInputValue(end),
  };
}

function formatDate(value: string | null) {
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

function formatMoney(value: number | null) {
  if (
    value === null ||
    !Number.isFinite(value)
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
  ).format(value);
}

function formatStatus(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1),
    )
    .join(" ");
}

function getInitial(name: string | null) {
  const trimmed = name?.trim();

  if (!trimmed) {
    return "C";
  }

  return trimmed.charAt(0).toUpperCase();
}

export default function CustomersClient() {
  const router = useRouter();

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [pagination, setPagination] =
    useState<Pagination>(
      DEFAULT_PAGINATION,
    );

  const [summary, setSummary] = useState<{
    totalCustomers: number | null;
    newCustomers: number | null;
    repeatCustomers: number | null;
  }>({
    totalCustomers: null,
    newCustomers: null,
    repeatCustomers: null,
  });

  const [activeTab, setActiveTab] =
    useState<CustomerTab>("ALL");

  const [search, setSearch] = useState("");

  const [datePreset, setDatePreset] =
    useState<DatePreset>("ALL_TIME");

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [
    appliedSearch,
    setAppliedSearch,
  ] = useState("");

  const [
    appliedFrom,
    setAppliedFrom,
  ] = useState("");

  const [
    appliedTo,
    setAppliedTo,
  ] = useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const loadCustomers = useCallback(
    async (
      requestedPage: number,
      signal?: AbortSignal,
    ) => {
      setLoading(true);
      setError(null);

      try {
        const params =
          new URLSearchParams();

        params.set(
          "page",
          String(requestedPage),
        );

        params.set(
          "limit",
          String(PAGE_SIZE),
        );

        params.set(
          "group",
          activeTab,
        );

        if (appliedSearch) {
          params.set(
            "search",
            appliedSearch,
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

        const response = await fetch(
          `/api/super-admin/customers?${params.toString()}`,
          {
            method: "GET",
            cache: "no-store",
            signal,
          },
        );

        const contentType =
          response.headers.get(
            "content-type",
          ) ?? "";

        if (
          !contentType
            .toLowerCase()
            .includes("application/json")
        ) {
          throw new Error(
            `Customer API returned HTTP ${response.status} instead of JSON.`,
          );
        }

        const body =
          (await response.json()) as
            CustomersResponse;

        if (!response.ok) {
          throw new Error(
            body.message ||
              "Unable to load customers.",
          );
        }

        setCustomers(
          Array.isArray(body.data)
            ? body.data
            : [],
        );

        const backendPagination =
          body.pagination ?? {};

        setPagination({
          page:
            typeof backendPagination.page ===
            "number"
              ? backendPagination.page
              : requestedPage,

          limit:
            typeof backendPagination.limit ===
            "number"
              ? backendPagination.limit
              : PAGE_SIZE,

          total:
            typeof backendPagination.total ===
            "number"
              ? backendPagination.total
              : null,

          totalPages:
            typeof backendPagination.totalPages ===
            "number"
              ? Math.max(
                  1,
                  backendPagination.totalPages,
                )
              : 1,
        });

        setSummary({
          totalCustomers:
            typeof body.summary
              ?.totalCustomers === "number"
              ? body.summary.totalCustomers
              : activeTab === "ALL" &&
                  typeof backendPagination.total ===
                    "number"
                ? backendPagination.total
                : null,

          newCustomers:
            typeof body.summary
              ?.newCustomers === "number"
              ? body.summary.newCustomers
              : null,

          repeatCustomers:
            typeof body.summary
              ?.repeatCustomers === "number"
              ? body.summary.repeatCustomers
              : null,
        });
      } catch (caught) {
        if (
          caught instanceof DOMException &&
          caught.name === "AbortError"
        ) {
          return;
        }

        setCustomers([]);

        setPagination(
          DEFAULT_PAGINATION,
        );

        setSummary({
          totalCustomers: null,
          newCustomers: null,
          repeatCustomers: null,
        });

        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to load customers.",
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [
      activeTab,
      appliedSearch,
      appliedFrom,
      appliedTo,
    ],
  );

  useEffect(() => {
    const controller =
      new AbortController();

    void loadCustomers(
      1,
      controller.signal,
    );

    return () => {
      controller.abort();
    };
  }, [loadCustomers]);

  function handlePresetChange(
    value: DatePreset,
  ) {
    setDatePreset(value);

    if (value === "CUSTOM") {
      return;
    }

    const range =
      getPresetRange(value);

    setFrom(range.from);
    setTo(range.to);
  }

  function applyFilters(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (
      datePreset === "CUSTOM" &&
      from &&
      to &&
      from > to
    ) {
      setError(
        "From date cannot be after To date.",
      );

      return;
    }

    const range =
      datePreset === "CUSTOM"
        ? {
            from,
            to,
          }
        : getPresetRange(datePreset);

    setAppliedSearch(search.trim());
    setAppliedFrom(range.from);
    setAppliedTo(range.to);

    setError(null);
  }

  function resetFilters() {
    setSearch("");
    setDatePreset("ALL_TIME");
    setFrom("");
    setTo("");

    setAppliedSearch("");
    setAppliedFrom("");
    setAppliedTo("");

    setError(null);
  }

  function changeTab(tab: CustomerTab) {
    if (loading || tab === activeTab) {
      return;
    }

    setActiveTab(tab);
  }

  function changePage(nextPage: number) {
    if (
      loading ||
      nextPage < 1 ||
      nextPage >
        pagination.totalPages ||
      nextPage === pagination.page
    ) {
      return;
    }

    void loadCustomers(nextPage);
  }

  const firstRecord =
    pagination.total !== null &&
    pagination.total > 0
      ? (pagination.page - 1) *
          pagination.limit +
        1
      : null;

  const lastRecord =
    firstRecord !== null &&
    pagination.total !== null
      ? Math.min(
          pagination.page *
            pagination.limit,
          pagination.total,
        )
      : null;

  return (
    <div className={styles.page}>
      <div className={styles.pageIntro}>
  <div className={styles.breadcrumb}>
    <span>Home</span>

    <ChevronRight
      size={13}
      strokeWidth={1.8}
    />

    <span>Customer Management</span>

    <ChevronRight
      size={13}
      strokeWidth={1.8}
    />

    <strong>Customers</strong>
  </div>

  <div className={styles.headingBlock}>
    <p className={styles.eyebrow}>
      CUSTOMER MANAGEMENT
    </p>

    <h1>Customers</h1>

    <p className={styles.subtitle}>
      View unique customers, their order activity
      and latest order information. Each customer
      appears only once even when they have placed
      multiple orders.
    </p>
  </div>
</div>

      <section
        className={styles.summaryGrid}
      >
        <article
          className={`${styles.summaryCard} ${styles.totalCard}`}
        >
          <div className={styles.totalIcon}>
            <UsersRound size={27} />
          </div>

          <div>
            <span>Total Customers</span>

            <strong>
              {loading
                ? "—"
                : summary.totalCustomers ??
                  "—"}
            </strong>

            <small>
              Unique customer records
            </small>
          </div>
        </article>

        <article
          className={`${styles.summaryCard} ${styles.newCard}`}
        >
          <div className={styles.newIcon}>
            <UserPlus size={27} />
          </div>

          <div>
            <span>New Customers</span>

            <strong>
              {loading
                ? "—"
                : summary.newCustomers ??
                  "—"}
            </strong>

            <small>
              Registered in last 30 days
            </small>
          </div>
        </article>

        <article
          className={`${styles.summaryCard} ${styles.repeatCard}`}
        >
          <div
            className={styles.repeatIcon}
          >
            <Repeat2 size={27} />
          </div>

          <div>
            <span>Repeat Customers</span>

            <strong>
              {loading
                ? "—"
                : summary.repeatCustomers ??
                  "—"}
            </strong>

            <small>
              Customers with multiple
              orders
            </small>
          </div>
        </article>
      </section>

      <form
        className={styles.filterCard}
        onSubmit={applyFilters}
      >
        <div className={styles.searchGroup}>
          <label
            htmlFor="customer-search"
          >
            Search customers
          </label>

          <div
            className={styles.searchInput}
          >
            <Search size={18} />

            <input
              id="customer-search"
              type="search"
              value={search}
              maxLength={100}
              placeholder="Name, mobile, order ID or device"
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
            />
          </div>
        </div>

        <div className={styles.dateGroup}>
          <label
            htmlFor="customer-date-range"
          >
            Date range
          </label>

          <div
            className={styles.dateSelect}
          >
            <CalendarDays size={17} />

            <select
              id="customer-date-range"
              value={datePreset}
              onChange={(event) =>
                handlePresetChange(
                  event.target
                    .value as DatePreset,
                )
              }
            >
              <option value="ALL_TIME">
                All time
              </option>

              <option value="TODAY">
                Today
              </option>

              <option value="YESTERDAY">
                Yesterday
              </option>

              <option value="LAST_7_DAYS">
                Last 7 days
              </option>

              <option value="LAST_30_DAYS">
                Last 30 days
              </option>

              <option value="CUSTOM">
                Custom range
              </option>
            </select>
          </div>
        </div>

        {datePreset === "CUSTOM" ? (
          <div
            className={
              styles.customDates
            }
          >
            <input
              type="date"
              value={from}
              aria-label="From date"
              onChange={(event) =>
                setFrom(
                  event.target.value,
                )
              }
            />

            <input
              type="date"
              value={to}
              aria-label="To date"
              onChange={(event) =>
                setTo(
                  event.target.value,
                )
              }
            />
          </div>
        ) : null}

        <div
          className={styles.filterActions}
        >
          <button
            type="submit"
            className={styles.applyButton}
            disabled={loading}
          >
            <Filter size={17} />
            Apply
          </button>

          <button
            type="button"
            className={styles.resetButton}
            disabled={loading}
            onClick={resetFilters}
          >
            <RefreshCw size={16} />
            Reset
          </button>
        </div>
      </form>

     <div
  className={styles.customerTabsWrapper}
  role="tablist"
  aria-label="Customer filters"
>
  <button
    type="button"
    role="tab"
    aria-selected={activeTab === "ALL"}
    className={`${styles.customerTab} ${
      activeTab === "ALL"
        ? styles.customerTabActive
        : ""
    }`}
    onClick={() => changeTab("ALL")}
  >
    All Customers

    {summary.totalCustomers !== null ? (
      <span className={styles.tabCount}>
        {summary.totalCustomers}
      </span>
    ) : null}
  </button>

  <button
    type="button"
    role="tab"
    aria-selected={activeTab === "NEW"}
    className={`${styles.customerTab} ${
      activeTab === "NEW"
        ? styles.customerTabActive
        : ""
    }`}
    onClick={() => changeTab("NEW")}
  >
    New Customers

    {summary.newCustomers !== null ? (
      <span className={styles.tabCount}>
        {summary.newCustomers}
      </span>
    ) : null}
  </button>

  <button
    type="button"
    role="tab"
    aria-selected={activeTab === "REPEAT"}
    className={`${styles.customerTab} ${
      activeTab === "REPEAT"
        ? styles.customerTabActive
        : ""
    }`}
    onClick={() => changeTab("REPEAT")}
  >
    Repeat Customers

    {summary.repeatCustomers !== null ? (
      <span className={styles.tabCount}>
        {summary.repeatCustomers}
      </span>
    ) : null}
  </button>
</div>

      {error ? (
        <div
          className={styles.errorBox}
          role="alert"
        >
          <div>
            <strong>
              Could not load customers
            </strong>

            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadCustomers(
                pagination.page,
              )
            }
          >
            Retry
          </button>
        </div>
      ) : null}

      <section
        className={styles.directory}
        aria-busy={loading}
      >
        <div
          className={
            styles.directoryHeader
          }
        >
          <div>
            <div
              className={
                styles.directoryIcon
              }
            >
              <UsersRound size={20} />
            </div>

            <div>
              <h2>
                Customer Directory
              </h2>

              <p>
                Unique customers with
                their complete order
                counts.
              </p>
            </div>
          </div>

          {!loading &&
          !error &&
          firstRecord !== null &&
          lastRecord !== null &&
          pagination.total !== null ? (
            <span
              className={
                styles.showingBadge
              }
            >
              Showing {firstRecord}–
              {lastRecord} of{" "}
              {pagination.total} customers
            </span>
          ) : null}
        </div>

        {loading ? (
          <div
            className={styles.loadingState}
          >
            <span
              className={styles.spinner}
            />

            Loading customers...
          </div>
        ) : !error &&
          customers.length === 0 ? (
          <div
            className={styles.emptyState}
          >
            <UsersRound size={30} />

            <strong>
              No customers found
            </strong>

            <span>
              No customer records match
              the selected filters.
            </span>
          </div>
        ) : !error ? (
          <>
            <div
              className={
                styles.tableWrapper
              }
            >
              <table
                className={styles.table}
              >
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Customer</th>
                    <th>
                      Mobile Number
                    </th>
                    <th>
                      Total Orders
                    </th>
                    <th>Completed</th>
                    <th>Cancelled</th>
                    <th>
                      Latest Order
                    </th>
                    <th>
                      Customer Since
                    </th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {customers.map(
                    (
                      customer,
                      index,
                    ) => (
                      <tr
                        key={customer.id}
                      >
                        <td
                          className={
                            styles.rowNumber
                          }
                        >
                          {(pagination.page -
                            1) *
                            pagination.limit +
                            index +
                            1}
                        </td>

                        <td>
                          <div
                            className={
                              styles.customerIdentity
                            }
                          >
                            <div
                              className={
                                styles.avatar
                              }
                            >
                              {getInitial(
                                customer.name,
                              )}
                            </div>

                            <div>
                              <strong>
                                {customer.name ||
                                  "—"}
                              </strong>

                              <span>
                                Customer #
                                {customer.id}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span
                            className={
                              styles.phone
                            }
                          >
                            {customer.phone ||
                              "—"}
                          </span>
                        </td>

                        <td>
                          <span
                            className={
                              styles.orderCount
                            }
                          >
                            {
                              customer.totalOrders
                            }
                          </span>
                        </td>

                        <td>
                          <span
                            className={
                              styles.completedCount
                            }
                          >
                            {
                              customer.completedOrders
                            }
                          </span>
                        </td>

                        <td>
                          <span
                            className={
                              styles.cancelledCount
                            }
                          >
                            {
                              customer.cancelledOrders
                            }
                          </span>
                        </td>

                        <td>
                          {customer.latestOrder ? (
                            <div
                              className={
                                styles.latestOrder
                              }
                            >
                              <div>
                                <strong>
                                  {
                                    customer
                                      .latestOrder
                                      .orderNumber
                                  }
                                </strong>

                                <span
                                  className={
                                    styles.statusBadge
                                  }
                                >
                                  {formatStatus(
                                    customer
                                      .latestOrder
                                      .status,
                                  )}
                                </span>
                              </div>

                              <p>
                                {
                                  customer
                                    .latestOrder
                                    .productName
                                }

                                {customer
                                  .latestOrder
                                  .variantLabel
                                  ? ` · ${customer.latestOrder.variantLabel}`
                                  : ""}
                              </p>

                              <small>
                                {formatMoney(
                                  customer
                                    .latestOrder
                                    .finalPrice,
                                )}

                                {" · "}

                                {formatDate(
                                  customer
                                    .latestOrder
                                    .createdAt,
                                )}
                              </small>
                            </div>
                          ) : (
                            <span
                              className={
                                styles.muted
                              }
                            >
                              No orders
                            </span>
                          )}
                        </td>

                        <td>
                          <span
                            className={
                              styles.date
                            }
                          >
                            {formatDate(
                              customer.createdAt,
                            )}
                          </span>
                        </td>

                        <td>
                          <button
                            type="button"
                            className={
                              styles.viewButton
                            }
                            onClick={() =>
                              router.push(
                                `/customers/${customer.id}`,
                              )
                            }
                          >
                            <Eye size={16} />
                            View
                          </button>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>

            <div
              className={
                styles.mobileCustomers
              }
            >
              {customers.map(
                (customer) => (
                  <article
                    key={customer.id}
                    className={
                      styles.customerCard
                    }
                  >
                    <div
                      className={
                        styles.customerCardHeader
                      }
                    >
                      <div
                        className={
                          styles.customerIdentity
                        }
                      >
                        <div
                          className={
                            styles.avatar
                          }
                        >
                          {getInitial(
                            customer.name,
                          )}
                        </div>

                        <div>
                          <strong>
                            {customer.name ||
                              "—"}
                          </strong>

                          <span>
                            Customer #
                            {customer.id}
                          </span>
                        </div>
                      </div>

                      <span
                        className={
                          styles.cardPhone
                        }
                      >
                        {customer.phone ||
                          "—"}
                      </span>
                    </div>

                    <div
                      className={
                        styles.cardStats
                      }
                    >
                      <div>
                        <span>Orders</span>
                        <strong>
                          {
                            customer.totalOrders
                          }
                        </strong>
                      </div>

                      <div>
                        <span>
                          Completed
                        </span>
                        <strong>
                          {
                            customer.completedOrders
                          }
                        </strong>
                      </div>

                      <div>
                        <span>
                          Cancelled
                        </span>
                        <strong>
                          {
                            customer.cancelledOrders
                          }
                        </strong>
                      </div>
                    </div>

                    {customer.latestOrder ? (
                      <div
                        className={
                          styles.cardOrder
                        }
                      >
                        <div>
                          <strong>
                            {
                              customer
                                .latestOrder
                                .orderNumber
                            }
                          </strong>

                          <span
                            className={
                              styles.statusBadge
                            }
                          >
                            {formatStatus(
                              customer
                                .latestOrder
                                .status,
                            )}
                          </span>
                        </div>

                        <p>
                          {
                            customer
                              .latestOrder
                              .productName
                          }

                          {customer
                            .latestOrder
                            .variantLabel
                            ? ` · ${customer.latestOrder.variantLabel}`
                            : ""}
                        </p>

                        <small>
                          {formatMoney(
                            customer
                              .latestOrder
                              .finalPrice,
                          )}

                          {" · "}

                          {formatDate(
                            customer
                              .latestOrder
                              .createdAt,
                          )}
                        </small>
                      </div>
                    ) : null}

                    <div
                      className={
                        styles.cardFooter
                      }
                    >
                      <span>
                        Customer since{" "}
                        <strong>
                          {formatDate(
                            customer.createdAt,
                          )}
                        </strong>
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/customers/${customer.id}`,
                          )
                        }
                      >
                        <Eye size={16} />
                        View Details
                      </button>
                    </div>
                  </article>
                ),
              )}
            </div>

            <footer
              className={
                styles.pagination
              }
            >
              <div>
                Rows per page
                <strong>50</strong>
              </div>

              <div
                className={
                  styles.pageControls
                }
              >
                <button
                  type="button"
                  disabled={
                    loading ||
                    pagination.page <= 1
                  }
                  onClick={() =>
                    changePage(
                      pagination.page - 1,
                    )
                  }
                >
                  <ChevronLeft
                    size={16}
                  />
                  Previous
                </button>

                <span>
                  {pagination.page}
                </span>

                <button
                  type="button"
                  disabled={
                    loading ||
                    pagination.page >=
                      pagination.totalPages
                  }
                  onClick={() =>
                    changePage(
                      pagination.page + 1,
                    )
                  }
                >
                  Next
                  <ChevronRight
                    size={16}
                  />
                </button>
              </div>
            </footer>
          </>
        ) : null}
      </section>
    </div>
  );
}