"use client";

import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  Eye,
  History,
  IndianRupee,
  MapPin,
  PackageSearch,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
  XCircle,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  dateFilterLabel,
  formatDate,
  formatDateTime,
  formatMoney,
  formatStatus,
  getVendorOrder,
  getVendorOrders,
  type DateFilter,
  type StatusGroup,
  type VendorOrder,
  type VendorOrderDetails,
} from "../../lib/vendor-orders";

import styles from "./VendorOrders.module.css";

type DetailTab =
  | "OVERVIEW"
  | "DEVICE_REPORT"
  | "AGENT_INSPECTION"
  | "HISTORY";

const DATE_FILTERS: Array<{
  value: DateFilter;
  label: string;
}> = [
  { value: "ALL", label: "All Time" },
  { value: "TODAY", label: "Today" },
  { value: "YESTERDAY", label: "Yesterday" },
  { value: "LAST_7_DAYS", label: "Last 7 Days" },
  { value: "LAST_30_DAYS", label: "Last 30 Days" },
];

const STATUS_TABS: Array<{
  value: StatusGroup;
  label: string;
}> = [
  { value: "ALL", label: "All Orders" },
  { value: "PENDING", label: "Pending" },
  { value: "IN_PROCESS", label: "In Process" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

function statusClass(status: string) {
  const value = String(status ?? "").toUpperCase();

  if (value === "COMPLETED") {
    return styles.statusSuccess;
  }

  if (value === "CANCELLED") {
    return styles.statusDanger;
  }

  if (
    value === "INSPECTION_COMPLETED" ||
    value === "PAYMENT_COMPLETED"
  ) {
    return styles.statusSuccess;
  }

  if (
    value === "PICKUP_STARTED" ||
    value.includes("AGENT") ||
    value.includes("INSPECTION")
  ) {
    return styles.statusWarning;
  }

  if (
    value === "PICKUP_REQUESTED" ||
    value === "PICKUP_CONFIRMED"
  ) {
    return styles.statusInfo;
  }

  return styles.statusNeutral;
}

function combineAddress(
  address:
    | VendorOrder["address"]
    | VendorOrderDetails["address"]
    | null
    | undefined,
) {
  if (!address) {
    return "Address not available";
  }

  const values = [
    address.house,
    address.street,
    address.locality,
    address.landmark,
    address.city,
    address.state,
    address.pincode,
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  return values.length
    ? values.join(", ")
    : "Address not available";
}

function DetailCard({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.detailCard}>
      <div className={styles.detailCardIcon}>{icon}</div>

      <div className={styles.detailCardContent}>
        <span className={styles.detailLabel}>{label}</span>
        <div className={styles.detailValue}>{children}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`${styles.statusBadge} ${statusClass(status)}`}
    >
      {formatStatus(status)}
    </span>
  );
}

function DeviceAnswerState({
  severity,
}: {
  severity?: string | null;
}) {
  const value = String(severity ?? "").toUpperCase();

  const unhealthy =
    value.includes("SEVERE") ||
    value.includes("CRITICAL") ||
    value.includes("MAJOR") ||
    value.includes("HIGH") ||
    value.includes("FAULT");

  if (unhealthy) {
    return (
      <span
        className={`${styles.reportStateIcon} ${styles.reportStateBad}`}
        aria-label="Issue reported"
      >
        <XCircle size={20} />
      </span>
    );
  }

  return (
    <span
      className={`${styles.reportStateIcon} ${styles.reportStateGood}`}
      aria-label="Reported condition"
    >
      <CheckCircle2 size={20} />
    </span>
  );
}

export default function VendorOrders() {
  const [orders, setOrders] = useState<VendorOrder[]>([]);

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [statusGroup, setStatusGroup] =
    useState<StatusGroup>("ALL");

  const [dateFilter, setDateFilter] =
    useState<DateFilter>("ALL");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [detailsOrderNumber, setDetailsOrderNumber] =
    useState<string | null>(null);

  const [selectedOrder, setSelectedOrder] =
    useState<VendorOrderDetails | null>(null);

  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  const [activeTab, setActiveTab] =
    useState<DetailTab>("OVERVIEW");

  /*
   * Search is intentionally debounced.
   * Avoids API/DB request on every keystroke.
   */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadOrders = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      if (!silent) {
        setError("");
      }

      try {
        const result = await getVendorOrders({
          page,
          limit,
          search,
          statusGroup,
          dateFilter,
        });

        setOrders(
          Array.isArray(result.data) ? result.data : [],
        );

        setTotal(
          Number(result.pagination?.total ?? 0),
        );

        setTotalPages(
          Math.max(
            1,
            Number(result.pagination?.totalPages ?? 1),
          ),
        );
      } catch (err) {
        if (!silent) {
          setOrders([]);
          setTotal(0);
          setTotalPages(1);

          setError(
            err instanceof Error
              ? err.message
              : "Unable to load orders.",
          );
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }

        setRefreshing(false);
      }
    },
    [
      page,
      limit,
      search,
      statusGroup,
      dateFilter,
    ],
  );

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  /*
   * Lightweight refresh only.
   *
   * - GET request only
   * - only when page is visible
   * - paused while order details are open
   *
   * Later this can be replaced by SSE/WebSocket
   * without changing the order UI structure.
   */
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (
        document.visibilityState === "visible" &&
        !detailsOrderNumber
      ) {
        void loadOrders(true);
      }
    }, 30000);

    return () => window.clearInterval(interval);
  }, [loadOrders, detailsOrderNumber]);

  async function openDetails(orderNumber: string) {
    setDetailsOrderNumber(orderNumber);
    setSelectedOrder(null);
    setDetailsError("");
    setDetailsLoading(true);
    setActiveTab("OVERVIEW");

    try {
      const result = await getVendorOrder(orderNumber);
      setSelectedOrder(result);
    } catch (err) {
      setDetailsError(
        err instanceof Error
          ? err.message
          : "Unable to load order details.",
      );
    } finally {
      setDetailsLoading(false);
    }
  }

  function closeDetails() {
    setDetailsOrderNumber(null);
    setSelectedOrder(null);
    setDetailsError("");
    setActiveTab("OVERVIEW");
  }

  useEffect(() => {
    if (!detailsOrderNumber) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeDetails();
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [detailsOrderNumber]);

  useEffect(() => {
    if (!detailsOrderNumber) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [detailsOrderNumber]);

  const resultText = useMemo(() => {
    if (total === 0) {
      return "No orders";
    }

    const first = (page - 1) * limit + 1;
    const last = Math.min(page * limit, total);

    return `${first}-${last} of ${total} orders`;
  }, [page, limit, total]);

  function changeStatusGroup(value: StatusGroup) {
    setStatusGroup(value);
    setPage(1);
  }

  function changeDateFilter(value: DateFilter) {
    setDateFilter(value);
    setPage(1);
  }

  return (
    <section className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Vendor Workspace</p>

          <h1 className={styles.title}>Orders</h1>

          <p className={styles.subtitle}>
            Manage assigned pickup orders, customer device
            reports and agent workflow from one place.
          </p>
        </div>

        <button
          type="button"
          className={styles.refreshButton}
          onClick={() => void loadOrders(true)}
          disabled={refreshing}
        >
          <RefreshCw
            size={18}
            className={refreshing ? styles.spin : undefined}
          />
          Refresh
        </button>
      </header>

      {/* MAIN STATUS TABS */}

      <div
        className={styles.statusTabs}
        role="tablist"
        aria-label="Order status"
      >
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={statusGroup === tab.value}
            className={`${styles.statusTab} ${
              statusGroup === tab.value
                ? styles.statusTabActive
                : ""
            }`}
            onClick={() => changeStatusGroup(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* FILTER BAR */}

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={20} />

          <input
            type="search"
            value={searchInput}
            placeholder="Search order, device, customer, mobile, city or pincode"
            onChange={(event) =>
              setSearchInput(event.target.value)
            }
            aria-label="Search orders"
          />

          {searchInput ? (
            <button
              type="button"
              className={styles.clearSearch}
              aria-label="Clear search"
              onClick={() => setSearchInput("")}
            >
              <X size={17} />
            </button>
          ) : null}
        </div>

        <div className={styles.filterBox}>
          <CalendarDays size={18} />

          <select
            value={dateFilter}
            onChange={(event) =>
              changeDateFilter(
                event.target.value as DateFilter,
              )
            }
            aria-label="Filter by assignment date"
          >
            {DATE_FILTERS.map((filter) => (
              <option
                key={filter.value}
                value={filter.value}
              >
                {filter.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.resultBar}>
        <span>{resultText}</span>

        <span>
          {dateFilterLabel(dateFilter)}
          {statusGroup !== "ALL"
            ? ` • ${
                STATUS_TABS.find(
                  (tab) => tab.value === statusGroup,
                )?.label ?? ""
              }`
            : ""}
        </span>
      </div>

      {/* ERROR */}

      {error ? (
        <div className={styles.errorState}>
          <CircleAlert size={28} />

          <div>
            <strong>Orders could not be loaded</strong>
            <p>{error}</p>
          </div>

          <button
            type="button"
            onClick={() => void loadOrders()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {/* LOADING */}

      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner} />
          <strong>Loading assigned orders...</strong>
        </div>
      ) : null}

      {/* EMPTY */}

      {!loading && !error && orders.length === 0 ? (
        <div className={styles.emptyState}>
          <PackageSearch size={44} />

          <h2>No orders found</h2>

          <p>
            There are no orders matching the selected
            filters.
          </p>
        </div>
      ) : null}

      {/* DESKTOP TABLE */}

      {!loading && !error && orders.length > 0 ? (
        <>
          <div className={styles.tableCard}>
            <div className={styles.tableHeader}>
              <span>Order / Device</span>
              <span>Customer & Address</span>
              <span>Pickup</span>
              <span>Final Quote</span>
              <span>Agent</span>
              <span>Status</span>
              <span>Action</span>
            </div>

            <div className={styles.tableBody}>
              {orders.map((order) => (
                <div
                  key={order.id}
                  className={styles.tableRow}
                >
                  <div className={styles.deviceCell}>
                    <strong className={styles.deviceName}>
                      {order.productName}
                    </strong>

                    <span className={styles.variantText}>
                      {order.variantLabel || "Variant —"}
                    </span>

                    <span className={styles.orderNumber}>
                      {order.orderNumber}
                    </span>
                  </div>

                  <div className={styles.customerCell}>
                    <div className={styles.customerName}>
                      <UserRound size={17} />

                      <strong>
                        {order.customer?.name ??
                          "Customer"}
                      </strong>
                    </div>

                    {order.customer?.phone ? (
                      <span className={styles.phoneText}>
                        {order.customer.phone}
                      </span>
                    ) : null}

                    <div className={styles.fullAddress}>
                      <MapPin size={16} />
                      <span>
                        {combineAddress(order.address)}
                      </span>
                    </div>
                  </div>

                  <div className={styles.pickupCell}>
                    <div className={styles.pickupPrimary}>
                      <CalendarDays size={17} />
                      <strong>
                        {formatDate(order.pickupDate)}
                      </strong>
                    </div>

                    <div className={styles.pickupSecondary}>
                      <Clock3 size={16} />
                      <span>
                        {order.pickupSlot?.label ??
                          "Slot not available"}
                      </span>
                    </div>
                  </div>

                  <div className={styles.quoteCell}>
                    <span className={styles.quoteLabel}>
                      Customer Quote
                    </span>

                    <strong className={styles.quoteValue}>
                      {formatMoney(order.finalPrice)}
                    </strong>
                  </div>

                  <div className={styles.agentCell}>
                    {order.agent ? (
                      <>
                        <strong>{order.agent.name}</strong>

                        {order.agent.mobile ? (
                          <span>{order.agent.mobile}</span>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <span className={styles.unassignedAgent}>
                          <UsersRound size={17} />
                          Not assigned
                        </span>

                        <small>
                          Agent module will manage assignment
                        </small>
                      </>
                    )}
                  </div>

                  <div className={styles.statusCell}>
                    <StatusBadge status={order.status} />
                  </div>

                  <div className={styles.actionCell}>
                    <button
                      type="button"
                      className={styles.viewButton}
                      onClick={() =>
                        void openDetails(order.orderNumber)
                      }
                    >
                      <Eye size={17} />
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* MOBILE CARDS */}

          <div className={styles.mobileList}>
            {orders.map((order) => (
              <article
                key={order.id}
                className={styles.mobileCard}
              >
                <div className={styles.mobileCardTop}>
                  <div>
                    <strong className={styles.mobileDeviceName}>
                      {order.productName}
                    </strong>

                    <span className={styles.mobileVariant}>
                      {order.variantLabel}
                    </span>
                  </div>

                  <StatusBadge status={order.status} />
                </div>

                <span className={styles.mobileOrderNumber}>
                  {order.orderNumber}
                </span>

                <div className={styles.mobileSection}>
                  <span className={styles.mobileLabel}>
                    Customer
                  </span>

                  <strong>
                    {order.customer?.name ?? "Customer"}
                  </strong>

                  {order.customer?.phone ? (
                    <span>{order.customer.phone}</span>
                  ) : null}
                </div>

                <div className={styles.mobileAddress}>
                  <MapPin size={18} />

                  <span>{combineAddress(order.address)}</span>
                </div>

                <div className={styles.mobileGrid}>
                  <div>
                    <span className={styles.mobileLabel}>
                      Pickup
                    </span>

                    <strong>
                      {formatDate(order.pickupDate)}
                    </strong>

                    <span>
                      {order.pickupSlot?.label ??
                        "Slot not available"}
                    </span>
                  </div>

                  <div>
                    <span className={styles.mobileLabel}>
                      Final Quote
                    </span>

                    <strong className={styles.mobileQuote}>
                      {formatMoney(order.finalPrice)}
                    </strong>
                  </div>
                </div>

                <div className={styles.mobileAgent}>
                  <UsersRound size={18} />

                  <div>
                    <span className={styles.mobileLabel}>
                      Agent
                    </span>

                    <strong>
                      {order.agent?.name ?? "Not assigned"}
                    </strong>
                  </div>
                </div>

                <button
                  type="button"
                  className={styles.mobileViewButton}
                  onClick={() =>
                    void openDetails(order.orderNumber)
                  }
                >
                  <Eye size={18} />
                  View Details
                </button>
              </article>
            ))}
          </div>

          {/* PAGINATION */}

          <div className={styles.pagination}>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() =>
                setPage((current) =>
                  Math.max(1, current - 1),
                )
              }
            >
              <ChevronLeft size={18} />
              Previous
            </button>

            <span>
              Page <strong>{page}</strong> of{" "}
              <strong>{totalPages}</strong>
            </span>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() =>
                setPage((current) =>
                  Math.min(totalPages, current + 1),
                )
              }
            >
              Next
              <ChevronRight size={18} />
            </button>
          </div>
        </>
      ) : null}

      {/* ORDER DETAILS WORKSPACE */}

      {detailsOrderNumber ? (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              closeDetails();
            }
          }}
        >
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-label="Order details"
          >
            <header className={styles.modalHeader}>
              <div>
                <span className={styles.modalEyebrow}>
                  Order Workspace
                </span>

                <h2>
                  {selectedOrder?.product.name ??
                    "Order Details"}
                </h2>

                <p>
                  {selectedOrder?.orderNumber ??
                    detailsOrderNumber}
                </p>
              </div>

              <div className={styles.modalHeaderRight}>
                {selectedOrder ? (
                  <StatusBadge
                    status={selectedOrder.status}
                  />
                ) : null}

                <button
                  type="button"
                  className={styles.closeButton}
                  onClick={closeDetails}
                  aria-label="Close order details"
                >
                  <X size={22} />
                </button>
              </div>
            </header>

            <div className={styles.detailTabs}>
              <button
                type="button"
                className={
                  activeTab === "OVERVIEW"
                    ? styles.detailTabActive
                    : ""
                }
                onClick={() => setActiveTab("OVERVIEW")}
              >
                Overview
              </button>

              <button
                type="button"
                className={
                  activeTab === "DEVICE_REPORT"
                    ? styles.detailTabActive
                    : ""
                }
                onClick={() =>
                  setActiveTab("DEVICE_REPORT")
                }
              >
                Device Report
              </button>

              <button
                type="button"
                className={
                  activeTab === "AGENT_INSPECTION"
                    ? styles.detailTabActive
                    : ""
                }
                onClick={() =>
                  setActiveTab("AGENT_INSPECTION")
                }
              >
                Agent Inspection
              </button>

              <button
                type="button"
                className={
                  activeTab === "HISTORY"
                    ? styles.detailTabActive
                    : ""
                }
                onClick={() => setActiveTab("HISTORY")}
              >
                History
              </button>
            </div>

            <div className={styles.modalBody}>
              {detailsLoading ? (
                <div className={styles.detailsLoading}>
                  <div className={styles.loadingSpinner} />
                  <strong>Loading order details...</strong>
                </div>
              ) : null}

              {detailsError ? (
                <div className={styles.detailsError}>
                  <CircleAlert size={28} />

                  <div>
                    <strong>
                      Unable to load order details
                    </strong>
                    <p>{detailsError}</p>
                  </div>
                </div>
              ) : null}

              {!detailsLoading &&
              !detailsError &&
              selectedOrder ? (
                <>
                  {activeTab === "OVERVIEW" ? (
                    <OverviewTab order={selectedOrder} />
                  ) : null}

                  {activeTab === "DEVICE_REPORT" ? (
                    <DeviceReportTab
                      order={selectedOrder}
                    />
                  ) : null}

                  {activeTab === "AGENT_INSPECTION" ? (
                    <AgentInspectionTab
                      order={selectedOrder}
                    />
                  ) : null}

                  {activeTab === "HISTORY" ? (
                    <HistoryTab order={selectedOrder} />
                  ) : null}
                </>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function OverviewTab({
  order,
}: {
  order: VendorOrderDetails;
}) {
  return (
    <div className={styles.tabContent}>
      <section className={styles.quoteSummary}>
        <div>
          <span>Base Price</span>
          <strong>
            {formatMoney(order.pricing.basePrice)}
          </strong>
        </div>

        <div>
          <span>Total Deduction</span>
          <strong className={styles.deductionValue}>
            -{formatMoney(order.pricing.totalDeduction)}
          </strong>
        </div>

        <div className={styles.finalQuoteBox}>
          <span>Customer Final Quote</span>
          <strong>
            {formatMoney(order.pricing.finalPrice)}
          </strong>
        </div>
      </section>

      <div className={styles.overviewGrid}>
        <DetailCard
          icon={<UserRound size={21} />}
          label="Customer"
        >
          <strong>
            {order.customer?.name ?? "—"}
          </strong>

          <span>
            {order.customer?.phone ?? "—"}
          </span>
        </DetailCard>

        <DetailCard
          icon={<CalendarDays size={21} />}
          label="Pickup"
        >
          <strong>{formatDate(order.pickup.date)}</strong>

          <span>
            {order.pickup.slot?.label ??
              "Slot not available"}
          </span>
        </DetailCard>

        <DetailCard
          icon={<IndianRupee size={21} />}
          label="Payout"
        >
          <strong>
            {formatStatus(order.payout.method)}
          </strong>

          {order.payout.upiMobile ? (
            <span>{order.payout.upiMobile}</span>
          ) : null}
        </DetailCard>

        <DetailCard
          icon={<UsersRound size={21} />}
          label="Assigned Agent"
        >
          {order.agent ? (
            <>
              <strong>{order.agent.name}</strong>
              <span>{order.agent.mobile ?? ""}</span>
            </>
          ) : (
            <>
              <strong>Not assigned</strong>
              <span>
                Agent assignment will be enabled in the
                Agent module.
              </span>
            </>
          )}
        </DetailCard>
      </div>

      <section className={styles.infoPanel}>
        <div className={styles.sectionHeading}>
          <MapPin size={21} />

          <div>
            <h3>Pickup Address</h3>
            <p>Customer provided pickup location</p>
          </div>
        </div>

        <div className={styles.addressBlock}>
          <strong>
            {order.address?.fullName ??
              order.customer?.name ??
              "Customer"}
          </strong>

          <span>{combineAddress(order.address)}</span>

          {order.address?.phone ? (
            <span>{order.address.phone}</span>
          ) : null}
        </div>
      </section>

      <section className={styles.infoPanel}>
        <div className={styles.sectionHeading}>
          <ClipboardCheck size={21} />

          <div>
            <h3>Device</h3>
            <p>Customer selected device configuration</p>
          </div>
        </div>

        <div className={styles.deviceOverview}>
          <div>
            <span>Device</span>
            <strong>{order.product.name}</strong>
          </div>

          <div>
            <span>Variant</span>
            <strong>{order.product.variant}</strong>
          </div>

          <div>
            <span>Current Status</span>
            <StatusBadge status={order.status} />
          </div>
        </div>
      </section>
    </div>
  );
}

function DeviceReportTab({
  order,
}: {
  order: VendorOrderDetails;
}) {
  const report = order.deviceReport;

  return (
    <div className={styles.tabContent}>
      <section className={styles.reportHero}>
        <div>
          <span className={styles.reportHeroLabel}>
            Customer Device Report
          </span>

          <h3>{order.product.name}</h3>

          <p>
            {order.product.variant}
          </p>
        </div>

        <div className={styles.reportQuote}>
          <span>Original Final Quote</span>

          <strong>
            {formatMoney(order.pricing.finalPrice)}
          </strong>
        </div>
      </section>

      <div className={styles.reportNotice}>
        <ShieldCheck size={20} />

        <p>
          This report shows the customer&apos;s original
          questionnaire selections. Historical per-answer
          deduction is not shown unless it was frozen at the
          time of quote. Current deduction rules are never
          used to rewrite an old order.
        </p>
      </div>

      {!report?.available ||
      !report.sections?.length ? (
        <div className={styles.reportEmpty}>
          <ClipboardCheck size={40} />

          <h3>Device report unavailable</h3>

          <p>
            This order does not contain questionnaire data
            that can be resolved into a report.
          </p>
        </div>
      ) : (
        <div className={styles.reportSections}>
          {report.sections.map((section) => (
            <section
              key={section.id}
              className={styles.reportSection}
            >
              <header className={styles.reportSectionHeader}>
                <div>
                  <h3>{section.name}</h3>

                  <span>
                    {section.checks.length}{" "}
                    {section.checks.length === 1
                      ? "check"
                      : "checks"}
                  </span>
                </div>
              </header>

              <div className={styles.reportChecks}>
                {section.checks.map((check) => (
                  <div
                    key={check.itemId}
                    className={styles.reportCheck}
                  >
                    <div className={styles.reportQuestion}>
                      <span className={styles.reportItemName}>
                        {check.name}
                      </span>

                      <strong>{check.question}</strong>
                    </div>

                    <div className={styles.reportAnswers}>
                      {check.selectedAnswers.length ? (
                        check.selectedAnswers.map(
                          (answer) => (
                            <div
                              key={`${check.itemId}-${answer.id}-${answer.selectionType}`}
                              className={styles.reportAnswer}
                            >
                              <DeviceAnswerState
                                severity={answer.severity}
                              />

                              <div>
                                <strong>
                                  {answer.label}
                                </strong>

                                {answer.issueGroup?.name ? (
                                  <span>
                                    {
                                      answer.issueGroup
                                        .name
                                    }
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          ),
                        )
                      ) : (
                        <div
                          className={
                            styles.reportAnswerUnavailable
                          }
                        >
                          <CircleAlert size={18} />
                          Selected answer label unavailable
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <section className={styles.reportTotals}>
        <div>
          <span>Base Price</span>

          <strong>
            {formatMoney(order.pricing.basePrice)}
          </strong>
        </div>

        <div>
          <span>Total Deduction</span>

          <strong>
            {formatMoney(order.pricing.totalDeduction)}
          </strong>
        </div>

        <div>
          <span>Final Quote</span>

          <strong>
            {formatMoney(order.pricing.finalPrice)}
          </strong>
        </div>
      </section>
    </div>
  );
}

function AgentInspectionTab({
  order,
}: {
  order: VendorOrderDetails;
}) {
  return (
    <div className={styles.tabContent}>
      <section className={styles.agentInspectionHero}>
        <div className={styles.agentInspectionIcon}>
          <UsersRound size={30} />
        </div>

        <div>
          <h3>Agent Inspection</h3>

          <p>
            Agent inspection and re-quote will remain
            separate from the customer&apos;s original
            questionnaire and quote.
          </p>
        </div>
      </section>

      <div className={styles.agentQuoteComparison}>
        <div>
          <span>Original Customer Quote</span>

          <strong>
            {formatMoney(order.pricing.finalPrice)}
          </strong>
        </div>

        <div>
          <span>Agent Final Quote</span>

          <strong>Not available</strong>
        </div>
      </div>

      <div className={styles.agentEmptyState}>
        <ClipboardCheck size={42} />

        <h3>No agent inspection yet</h3>

        <p>
          Once an agent is assigned and the customer OTP is
          verified, the agent inspection will appear here.
          The customer&apos;s original Device Report will
          remain unchanged.
        </p>
      </div>
    </div>
  );
}

function HistoryTab({
  order,
}: {
  order: VendorOrderDetails;
}) {
  const events = [
    ...order.statusHistory.map((entry) => ({
      key: `status-${entry.id}`,
      type: "STATUS",
      title: formatStatus(entry.status),
      description:
        entry.note || "Order status updated.",
      date: entry.createdAt,
    })),

    ...order.assignmentHistory.map((entry) => ({
      key: `assignment-${entry.id}`,
      type: "ASSIGNMENT",
      title: "Vendor Assigned",
      description: `${formatStatus(
        entry.source,
      )} • ${formatStatus(entry.reason)}`,
      date: entry.assignedAt,
    })),

    ...order.reschedules.map((entry) => ({
      key: `reschedule-${entry.id}`,
      type: "RESCHEDULE",
      title: "Pickup Rescheduled",
      description: `${formatDate(
        entry.oldPickupDate,
      )} → ${formatDate(entry.newPickupDate)}${
        entry.newSlotLabel
          ? ` • ${entry.newSlotLabel}`
          : ""
      }`,
      date: entry.createdAt,
    })),
  ].sort(
    (a, b) =>
      new Date(b.date).getTime() -
      new Date(a.date).getTime(),
  );

  return (
    <div className={styles.tabContent}>
      <section className={styles.historyHeader}>
        <History size={23} />

        <div>
          <h3>Order History</h3>

          <p>
            Status, routing and pickup events for this
            order.
          </p>
        </div>
      </section>

      {events.length === 0 ? (
        <div className={styles.historyEmpty}>
          No history is available for this order.
        </div>
      ) : (
        <div className={styles.timeline}>
          {events.map((event) => (
            <div
              key={event.key}
              className={styles.timelineItem}
            >
              <div className={styles.timelineMarker}>
                {event.type === "STATUS" ? (
                  <ClipboardCheck size={17} />
                ) : event.type === "ASSIGNMENT" ? (
                  <UsersRound size={17} />
                ) : (
                  <CalendarDays size={17} />
                )}
              </div>

              <div className={styles.timelineContent}>
                <div className={styles.timelineTop}>
                  <strong>{event.title}</strong>

                  <time>
                    {formatDateTime(event.date)}
                  </time>
                </div>

                <p>{event.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}