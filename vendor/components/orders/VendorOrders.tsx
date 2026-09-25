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
  Mail,
  MapPin,
  PackageSearch,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
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
  assignVendorOrderAgent,
  dateFilterLabel,
  formatDate,
  formatDateTime,
  formatMoney,
  formatStatus,
  getActiveVendorAgents,
  getVendorOrder,
  getVendorOrders,
  type ActiveVendorAgent,
  type DateFilter,
  type OrderAgent,
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

type AssignmentTarget = {
  orderNumber: string;
  productName: string;
  currentAgent: OrderAgent | null;
};

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

  if (
    value === "COMPLETED" ||
    value === "INSPECTION_COMPLETED" ||
    value === "PAYMENT_COMPLETED"
  ) {
    return styles.statusSuccess;
  }

  if (value === "CANCELLED") {
    return styles.statusDanger;
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

function CustomerAddressCard({
  order,
}: {
  order: VendorOrder;
}) {
  return (
    <div className={styles.customerAddressCard}>
      <div className={styles.customerIdentity}>
        <div className={styles.customerAvatar}>
          <UserRound size={17} />
        </div>

        <div className={styles.customerIdentityText}>
          <strong>
            {order.customer?.name ?? "Customer"}
          </strong>

          {order.customer?.phone ? (
            <span>
              <Phone size={12} />
              {order.customer.phone}
            </span>
          ) : null}
        </div>
      </div>

      <div className={styles.customerAddressDivider} />

      <div className={styles.customerAddressLine}>
        <MapPin size={15} />

        <span>{combineAddress(order.address)}</span>
      </div>
    </div>
  );
}

function AgentSummary({
  agent,
  onManage,
}: {
  agent: OrderAgent | null;
  onManage: () => void;
}) {
  return (
    <div className={styles.agentSummary}>
      {agent ? (
        <div className={styles.assignedAgentInfo}>
          <div className={styles.agentAvatar}>
            <UserCheck size={17} />
          </div>

          <div>
            <strong>{agent.name}</strong>

            {agent.mobile ? (
              <span>{agent.mobile}</span>
            ) : null}
          </div>
        </div>
      ) : (
        <div className={styles.agentNotAssigned}>
          <div className={styles.agentAvatarMuted}>
            <UsersRound size={17} />
          </div>

          <div>
            <strong>Not assigned</strong>
            <span>Choose pickup agent</span>
          </div>
        </div>
      )}

      <button
        type="button"
        className={
          agent
            ? styles.reassignButton
            : styles.assignButton
        }
        onClick={onManage}
      >
        {agent ? "Reassign" : "Assign Agent"}
      </button>
    </div>
  );
}

export default function VendorOrders() {
  const [orders, setOrders] = useState<VendorOrder[]>([]);

  const [page, setPage] = useState(1);
  const limit = 20;
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

  const [detailsLoading, setDetailsLoading] =
    useState(false);

  const [detailsError, setDetailsError] = useState("");

  const [activeTab, setActiveTab] =
    useState<DetailTab>("OVERVIEW");

  const [assignmentTarget, setAssignmentTarget] =
    useState<AssignmentTarget | null>(null);

  const [agents, setAgents] =
    useState<ActiveVendorAgent[]>([]);

  const [agentsLoading, setAgentsLoading] =
    useState(false);

  const [agentsError, setAgentsError] = useState("");

  const [agentSearch, setAgentSearch] = useState("");

  const [selectedAgentId, setSelectedAgentId] =
    useState<number | null>(null);

  const [assignmentSubmitting, setAssignmentSubmitting] =
    useState(false);

  const [assignmentError, setAssignmentError] =
    useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadOrders = useCallback(
    async (silent = false) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
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

        setTotal(Number(result.pagination?.total ?? 0));

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
    [page, search, statusGroup, dateFilter],
  );

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (
        document.visibilityState === "visible" &&
        !detailsOrderNumber &&
        !assignmentTarget
      ) {
        void loadOrders(true);
      }
    }, 30000);

    return () => window.clearInterval(interval);
  }, [loadOrders, detailsOrderNumber, assignmentTarget]);

  const refreshSelectedOrder = useCallback(
    async (orderNumber: string) => {
      const result = await getVendorOrder(orderNumber);
      setSelectedOrder(result);
    },
    [],
  );

  async function openDetails(orderNumber: string) {
    setDetailsOrderNumber(orderNumber);
    setSelectedOrder(null);
    setDetailsError("");
    setDetailsLoading(true);
    setActiveTab("OVERVIEW");

    try {
      await refreshSelectedOrder(orderNumber);
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

  const openAgentAssignment = useCallback(
    async (target: AssignmentTarget) => {
      setAssignmentTarget(target);
      setSelectedAgentId(target.currentAgent?.id ?? null);
      setAgentSearch("");
      setAgents([]);
      setAgentsError("");
      setAssignmentError("");
      setAgentsLoading(true);

      try {
        const result = await getActiveVendorAgents();
        setAgents(result);
      } catch (err) {
        setAgentsError(
          err instanceof Error
            ? err.message
            : "Unable to load active agents.",
        );
      } finally {
        setAgentsLoading(false);
      }
    },
    [],
  );

  function closeAgentAssignment() {
    if (assignmentSubmitting) {
      return;
    }

    setAssignmentTarget(null);
    setSelectedAgentId(null);
    setAgents([]);
    setAgentSearch("");
    setAgentsError("");
    setAssignmentError("");
  }

  async function submitAgentAssignment() {
    if (
      !assignmentTarget ||
      !selectedAgentId ||
      assignmentSubmitting
    ) {
      return;
    }

    if (
      assignmentTarget.currentAgent?.id === selectedAgentId
    ) {
      closeAgentAssignment();
      return;
    }

    setAssignmentSubmitting(true);
    setAssignmentError("");

    try {
      await assignVendorOrderAgent(
        assignmentTarget.orderNumber,
        selectedAgentId,
      );

      const orderNumber = assignmentTarget.orderNumber;

      setAssignmentTarget(null);
      setSelectedAgentId(null);
      setAgents([]);
      setAgentSearch("");

      await loadOrders(true);

      if (detailsOrderNumber === orderNumber) {
        try {
          await refreshSelectedOrder(orderNumber);
        } catch {
          // List assignment succeeded.
          // Existing detail data remains visible if detail refresh fails.
        }
      }
    } catch (err) {
      setAssignmentError(
        err instanceof Error
          ? err.message
          : "Unable to assign agent.",
      );
    } finally {
      setAssignmentSubmitting(false);
    }
  }

  useEffect(() => {
    if (!detailsOrderNumber && !assignmentTarget) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      if (assignmentTarget) {
        closeAgentAssignment();
        return;
      }

      closeDetails();
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [
    detailsOrderNumber,
    assignmentTarget,
    assignmentSubmitting,
  ]);

  useEffect(() => {
    if (!detailsOrderNumber && !assignmentTarget) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [detailsOrderNumber, assignmentTarget]);

  const resultText = useMemo(() => {
    if (total === 0) {
      return "No orders";
    }

    const first = (page - 1) * limit + 1;
    const last = Math.min(page * limit, total);

    return `${first}-${last} of ${total} orders`;
  }, [page, total]);

  const filteredAgents = useMemo(() => {
    const query = agentSearch.trim().toLowerCase();

    if (!query) {
      return agents;
    }

    return agents.filter((agent) => {
      return [
        agent.fullName,
        agent.mobile,
        agent.email,
        agent.agentCode,
      ].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query),
      );
    });
  }, [agents, agentSearch]);

  const selectedAgent = useMemo(
    () =>
      agents.find(
        (agent) => agent.id === selectedAgentId,
      ) ?? null,
    [agents, selectedAgentId],
  );

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
            Manage assigned pickups, customer device reports,
            quotes and field agents from one workspace.
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
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </header>

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

      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner} />
          <strong>Loading assigned orders...</strong>
        </div>
      ) : null}

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

      {!loading && !error && orders.length > 0 ? (
        <>
          <div className={styles.tableCard}>
            <div className={styles.tableHeader}>
              <span>Order / Device</span>
              <span>Customer & Pickup Address</span>
              <span>Pickup</span>
              <span>Quote</span>
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

                  <CustomerAddressCard order={order} />

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

                    <span className={styles.quoteHint}>
                      Original quote
                    </span>
                  </div>

                  <AgentSummary
                    agent={order.agent}
                    onManage={() =>
                      void openAgentAssignment({
                        orderNumber: order.orderNumber,
                        productName: order.productName,
                        currentAgent: order.agent,
                      })
                    }
                  />

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
                      {order.variantLabel || "Variant —"}
                    </span>
                  </div>

                  <StatusBadge status={order.status} />
                </div>

                <span className={styles.mobileOrderNumber}>
                  {order.orderNumber}
                </span>

                <div className={styles.mobileCustomerCard}>
                  <div className={styles.mobileCustomerTop}>
                    <div className={styles.customerAvatar}>
                      <UserRound size={17} />
                    </div>

                    <div>
                      <span className={styles.mobileLabel}>
                        Customer
                      </span>

                      <strong>
                        {order.customer?.name ?? "Customer"}
                      </strong>

                      {order.customer?.phone ? (
                        <span className={styles.mobilePhone}>
                          {order.customer.phone}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className={styles.mobileAddress}>
                    <MapPin size={17} />
                    <span>
                      {combineAddress(order.address)}
                    </span>
                  </div>
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
                      Customer Quote
                    </span>

                    <strong className={styles.mobileQuote}>
                      {formatMoney(order.finalPrice)}
                    </strong>
                  </div>
                </div>

                <div className={styles.mobileAgentCard}>
                  <div className={styles.mobileAgentIdentity}>
                    <div
                      className={
                        order.agent
                          ? styles.agentAvatar
                          : styles.agentAvatarMuted
                      }
                    >
                      {order.agent ? (
                        <UserCheck size={17} />
                      ) : (
                        <UsersRound size={17} />
                      )}
                    </div>

                    <div>
                      <span className={styles.mobileLabel}>
                        Pickup Agent
                      </span>

                      <strong>
                        {order.agent?.name ??
                          "Not assigned"}
                      </strong>

                      {order.agent?.mobile ? (
                        <span>
                          {order.agent.mobile}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <button
                    type="button"
                    className={
                      order.agent
                        ? styles.mobileReassignButton
                        : styles.mobileAssignButton
                    }
                    onClick={() =>
                      void openAgentAssignment({
                        orderNumber: order.orderNumber,
                        productName: order.productName,
                        currentAgent: order.agent,
                      })
                    }
                  >
                    {order.agent ? "Reassign" : "Assign"}
                  </button>
                </div>

                <button
                  type="button"
                  className={styles.mobileViewButton}
                  onClick={() =>
                    void openDetails(order.orderNumber)
                  }
                >
                  <Eye size={18} />
                  View Order Details
                </button>
              </article>
            ))}
          </div>

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
              {[
                ["OVERVIEW", "Overview"],
                ["DEVICE_REPORT", "Device Report"],
                ["AGENT_INSPECTION", "Agent Inspection"],
                ["HISTORY", "History"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={
                    activeTab === value
                      ? styles.detailTabActive
                      : ""
                  }
                  onClick={() =>
                    setActiveTab(value as DetailTab)
                  }
                >
                  {label}
                </button>
              ))}
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
                    <OverviewTab
                      order={selectedOrder}
                      onManageAgent={() =>
                        void openAgentAssignment({
                          orderNumber:
                            selectedOrder.orderNumber,
                          productName:
                            selectedOrder.product.name,
                          currentAgent:
                            selectedOrder.agent,
                        })
                      }
                    />
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

      {assignmentTarget ? (
        <div
          className={styles.assignmentBackdrop}
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.currentTarget === event.target &&
              !assignmentSubmitting
            ) {
              closeAgentAssignment();
            }
          }}
        >
          <section
            className={styles.assignmentModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="agent-assignment-title"
          >
            <header className={styles.assignmentHeader}>
              <div>
                <span className={styles.modalEyebrow}>
                  Field Operations
                </span>

                <h2 id="agent-assignment-title">
                  {assignmentTarget.currentAgent
                    ? "Reassign Pickup Agent"
                    : "Assign Pickup Agent"}
                </h2>

                <p>
                  {assignmentTarget.productName} •{" "}
                  {assignmentTarget.orderNumber}
                </p>
              </div>

              <button
                type="button"
                className={styles.closeButton}
                onClick={closeAgentAssignment}
                disabled={assignmentSubmitting}
                aria-label="Close agent assignment"
              >
                <X size={21} />
              </button>
            </header>

            {assignmentTarget.currentAgent ? (
              <div className={styles.currentAgentBanner}>
                <div className={styles.currentAgentIcon}>
                  <UserCheck size={20} />
                </div>

                <div>
                  <span>Currently assigned</span>
                  <strong>
                    {assignmentTarget.currentAgent.name}
                  </strong>

                  {assignmentTarget.currentAgent.mobile ? (
                    <small>
                      {
                        assignmentTarget.currentAgent
                          .mobile
                      }
                    </small>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className={styles.assignmentNotice}>
                <UsersRound size={20} />

                <div>
                  <strong>No agent assigned yet</strong>
                  <span>
                    Select an active agent for this pickup.
                  </span>
                </div>
              </div>
            )}

            <div className={styles.assignmentSearch}>
              <Search size={18} />

              <input
                type="search"
                value={agentSearch}
                onChange={(event) =>
                  setAgentSearch(event.target.value)
                }
                placeholder="Search agent by name, mobile, email or ID"
                aria-label="Search active agents"
              />

              {agentSearch ? (
                <button
                  type="button"
                  onClick={() => setAgentSearch("")}
                  aria-label="Clear agent search"
                >
                  <X size={16} />
                </button>
              ) : null}
            </div>

            <div className={styles.assignmentBody}>
              {agentsLoading ? (
                <div className={styles.agentListState}>
                  <div className={styles.loadingSpinner} />
                  <strong>Loading active agents...</strong>
                </div>
              ) : null}

              {!agentsLoading && agentsError ? (
                <div className={styles.agentListError}>
                  <CircleAlert size={22} />

                  <div>
                    <strong>
                      Active agents could not be loaded
                    </strong>
                    <span>{agentsError}</span>
                  </div>
                </div>
              ) : null}

              {!agentsLoading &&
              !agentsError &&
              filteredAgents.length === 0 ? (
                <div className={styles.agentListEmpty}>
                  <UsersRound size={34} />

                  <strong>
                    {agents.length === 0
                      ? "No active agents available"
                      : "No matching agents"}
                  </strong>

                  <span>
                    {agents.length === 0
                      ? "Approve or activate an agent before assigning this order."
                      : "Try another name, mobile number or agent ID."}
                  </span>
                </div>
              ) : null}

              {!agentsLoading &&
              !agentsError &&
              filteredAgents.length > 0 ? (
                <div className={styles.agentList}>
                  {filteredAgents.map((agent) => {
                    const selected =
                      selectedAgentId === agent.id;

                    const current =
                      assignmentTarget.currentAgent?.id ===
                      agent.id;

                    return (
                      <button
                        key={agent.id}
                        type="button"
                        className={`${styles.agentOption} ${
                          selected
                            ? styles.agentOptionSelected
                            : ""
                        }`}
                        onClick={() =>
                          setSelectedAgentId(agent.id)
                        }
                      >
                        <div className={styles.agentOptionAvatar}>
                          {agent.fullName
                            .trim()
                            .slice(0, 1)
                            .toUpperCase() || "A"}
                        </div>

                        <div
                          className={
                            styles.agentOptionContent
                          }
                        >
                          <div
                            className={
                              styles.agentOptionTop
                            }
                          >
                            <strong>
                              {agent.fullName}
                            </strong>

                            {current ? (
                              <span
                                className={
                                  styles.currentBadge
                                }
                              >
                                Current
                              </span>
                            ) : null}
                          </div>

                          <span
                            className={
                              styles.agentCodeText
                            }
                          >
                            {agent.agentCode}
                          </span>

                          <div
                            className={
                              styles.agentMeta
                            }
                          >
                            <span>
                              <Phone size={13} />
                              {agent.mobile}
                            </span>

                            {agent.email ? (
                              <span>
                                <Mail size={13} />
                                {agent.email}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <span
                          className={`${styles.selectionCircle} ${
                            selected
                              ? styles.selectionCircleActive
                              : ""
                          }`}
                          aria-hidden="true"
                        >
                          {selected ? (
                            <CheckCircle2 size={21} />
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {assignmentError ? (
              <div className={styles.assignmentError}>
                <CircleAlert size={18} />
                <span>{assignmentError}</span>
              </div>
            ) : null}

            <footer className={styles.assignmentFooter}>
              <div className={styles.assignmentSelection}>
                {selectedAgent ? (
                  <>
                    <span>Selected agent</span>
                    <strong>
                      {selectedAgent.fullName}
                    </strong>
                  </>
                ) : (
                  <span>Select an agent to continue</span>
                )}
              </div>

              <div className={styles.assignmentActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={closeAgentAssignment}
                  disabled={assignmentSubmitting}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className={styles.confirmAssignButton}
                  disabled={
                    !selectedAgentId ||
                    assignmentSubmitting ||
                    selectedAgentId ===
                      assignmentTarget.currentAgent?.id
                  }
                  onClick={() =>
                    void submitAgentAssignment()
                  }
                >
                  {assignmentSubmitting ? (
                    <>
                      <RefreshCw
                        size={17}
                        className={styles.spin}
                      />
                      Saving...
                    </>
                  ) : assignmentTarget.currentAgent ? (
                    <>
                      <UserCheck size={17} />
                      Confirm Reassignment
                    </>
                  ) : (
                    <>
                      <UserCheck size={17} />
                      Assign Agent
                    </>
                  )}
                </button>
              </div>
            </footer>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function OverviewTab({
  order,
  onManageAgent,
}: {
  order: VendorOrderDetails;
  onManageAgent: () => void;
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

        <div className={styles.detailCard}>
          <div className={styles.detailCardIcon}>
            <UsersRound size={21} />
          </div>

          <div className={styles.detailCardContent}>
            <span className={styles.detailLabel}>
              Assigned Agent
            </span>

            <div className={styles.detailValue}>
              <strong>
                {order.agent?.name ?? "Not assigned"}
              </strong>

              {order.agent?.mobile ? (
                <span>{order.agent.mobile}</span>
              ) : (
                <span>
                  Select an active field agent for pickup.
                </span>
              )}
            </div>

            <button
              type="button"
              className={styles.overviewAgentButton}
              onClick={onManageAgent}
            >
              {order.agent
                ? "Reassign Agent"
                : "Assign Agent"}
            </button>
          </div>
        </div>
      </div>

      <section className={styles.infoPanel}>
        <div className={styles.sectionHeading}>
          <MapPin size={21} />

          <div>
            <h3>Pickup Address</h3>
            <p>
              Verified location provided for customer pickup
            </p>
          </div>
        </div>

        <div className={styles.addressBlock}>
          <div className={styles.addressPerson}>
            <div className={styles.customerAvatar}>
              <UserRound size={17} />
            </div>

            <div>
              <strong>
                {order.address?.fullName ??
                  order.customer?.name ??
                  "Customer"}
              </strong>

              <span>
                {order.address?.phone ??
                  order.customer?.phone ??
                  "Phone not available"}
              </span>
            </div>
          </div>

          <div className={styles.addressLocation}>
            <MapPin size={17} />
            <span>{combineAddress(order.address)}</span>
          </div>
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
          <p>{order.product.variant}</p>
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
          This report preserves the customer&apos;s original
          questionnaire selections. Current deduction rules
          are never used to rewrite the historical customer
          quote.
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
              <header
                className={styles.reportSectionHeader}
              >
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
                      <span
                        className={styles.reportItemName}
                      >
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
            Agent inspection and re-quote remain separate
            from the customer&apos;s original questionnaire
            and quote.
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
          Once the assigned agent reaches the customer and
          completes OTP-authorized inspection, the inspection
          result can appear here. The original customer
          Device Report remains unchanged.
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
      key: `vendor-assignment-${entry.id}`,
      type: "ASSIGNMENT",
      title: "Vendor Assigned",
      description: `${formatStatus(
        entry.source,
      )} • ${formatStatus(entry.reason)}`,
      date: entry.assignedAt,
    })),

    ...(order.agentAssignmentHistory ?? []).map(
      (entry) => ({
        key: `agent-assignment-${entry.id}`,
        type: "AGENT",
        title:
          entry.source === "REASSIGN"
            ? "Agent Reassigned"
            : "Agent Assigned",
        description: `${entry.agent.name}${
          entry.agent.mobile
            ? ` • ${entry.agent.mobile}`
            : ""
        }`,
        date: entry.assignedAt,
      }),
    ),

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
            Status, vendor routing, agent assignment and
            pickup events.
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
                ) : event.type === "RESCHEDULE" ? (
                  <CalendarDays size={17} />
                ) : (
                  <UsersRound size={17} />
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