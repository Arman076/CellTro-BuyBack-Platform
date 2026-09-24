"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Activity,
  ArrowLeft,
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleX,
  Clock3,
  Eye,
  IndianRupee,
  Mail,
  MapPin,
  PackageCheck,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  TrendingUp,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";

import styles from "./VendorDetailClient.module.css";

type VendorStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED";

type OrderStatus =
  | "PICKUP_REQUESTED"
  | "PICKUP_CONFIRMED"
  | "PICKUP_STARTED"
  | "INSPECTION_COMPLETED"
  | "PAYMENT_COMPLETED"
  | "COMPLETED"
  | "CANCELLED";

type ServiceArea = {
  id: number;
  priority: number;
  isActive: boolean;

  serviceablePincode: {
    id: number;
    pincode: string;
    district: string | null;
    state: string | null;
    isActive: boolean;
  };
};

type VendorDetails = {
  id: number;
  vendorCode: string;
  businessName: string;
  contactName: string;
  phone: string;
  email: string | null;
  status: VendorStatus;
  createdAt: string;
  updatedAt: string;

  serviceAreas: ServiceArea[];

  summary: {
    serviceAreas: number;
  };
};

type VendorKpis = {
  vendorId: number;

  orders: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  };

  completionRate: number | null;

  financials: {
    totalPurchaseValue: number;
    averageOrderValue: number | null;
  };
};

type VendorOrder = {
  id: string;
  orderNumber: string;
  productName: string;
  productImage: string | null;
  variantLabel: string;
  finalPrice: number;
  status: OrderStatus;
  pickupDate: string;
  createdAt: string;
  updatedAt: string;

  addressSnapshot: {
    fullName: string;
    phone: string;
    pincode: string;
    city: string;
    state: string;
  } | null;
};

type OrdersResponse = {
  data: VendorOrder[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type Tab =
  | "overview"
  | "orders"
  | "performance"
  | "agents"
  | "serviceAreas"
  | "financials"
  | "activity";

type Props = {
  vendorId: string;
};

const ORDER_PAGE_SIZE = 20;

const ORDER_STATUSES: Array<{
  value: "" | OrderStatus;
  label: string;
}> = [
  {
    value: "",
    label: "All Statuses",
  },
  {
    value: "PICKUP_REQUESTED",
    label: "Pickup Requested",
  },
  {
    value: "PICKUP_CONFIRMED",
    label: "Pickup Confirmed",
  },
  {
    value: "PICKUP_STARTED",
    label: "Pickup Started",
  },
  {
    value: "INSPECTION_COMPLETED",
    label: "Inspection Completed",
  },
  {
    value: "PAYMENT_COMPLETED",
    label: "Payment Completed",
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

function displayValue(
  value:
    | string
    | number
    | null
    | undefined,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  return String(value);
}

function dateTime(
  value: string | null | undefined,
) {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);

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
  value: string | null | undefined,
) {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);

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
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    },
  ).format(parsed);
}

function money(
  value: number | null | undefined,
) {
  if (
    value === null ||
    value === undefined
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

function percentage(
  value: number | null | undefined,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  return `${value}%`;
}

function statusLabel(
  status: VendorStatus,
) {
  if (status === "ACTIVE") {
    return "Active";
  }

  if (status === "SUSPENDED") {
    return "Suspended";
  }

  return "Inactive";
}

function orderStatusLabel(
  status: OrderStatus,
) {
  return ORDER_STATUSES.find(
    (item) =>
      item.value === status,
  )?.label ??
    status.replaceAll("_", " ");
}

async function readApiError(
  response: Response,
  fallback: string,
) {
  const body: unknown =
    await response
      .json()
      .catch(() => null);

  if (
    body &&
    typeof body === "object" &&
    "message" in body
  ) {
    const message =
      (
        body as {
          message?: unknown;
        }
      ).message;

    if (
      typeof message === "string"
    ) {
      return message;
    }

    if (
      Array.isArray(message)
    ) {
      return message.join(", ");
    }
  }

  return fallback;
}

export default function VendorDetailClient({
  vendorId,
}: Props) {
  const [vendor, setVendor] =
    useState<VendorDetails | null>(
      null,
    );

  const [kpis, setKpis] =
    useState<VendorKpis | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<Tab>("overview");

  const [
    orders,
    setOrders,
  ] =
    useState<VendorOrder[]>([]);

  const [
    ordersLoading,
    setOrdersLoading,
  ] = useState(false);

  const [
    ordersError,
    setOrdersError,
  ] = useState("");

  const [
    orderPage,
    setOrderPage,
  ] = useState(1);

  const [
    orderTotal,
    setOrderTotal,
  ] = useState(0);

  const [
    orderTotalPages,
    setOrderTotalPages,
  ] = useState(0);

  const [
    orderSearchInput,
    setOrderSearchInput,
  ] = useState("");

  const [
    orderSearch,
    setOrderSearch,
  ] = useState("");

  const [
    orderStatus,
    setOrderStatus,
  ] =
    useState<"" | OrderStatus>(
      "",
    );

  const loadVendor =
    useCallback(
      async (
        signal?: AbortSignal,
      ) => {
        try {
          setLoading(true);
          setError("");

          const [
            vendorResponse,
            kpiResponse,
          ] =
            await Promise.all([
              fetch(
                `/api/super-admin/vendors/${encodeURIComponent(
                  vendorId,
                )}`,
                {
                  method: "GET",
                  cache: "no-store",
                  signal,

                  headers: {
                    Accept:
                      "application/json",
                  },
                },
              ),

              fetch(
                `/api/super-admin/vendors/${encodeURIComponent(
                  vendorId,
                )}/kpis`,
                {
                  method: "GET",
                  cache: "no-store",
                  signal,

                  headers: {
                    Accept:
                      "application/json",
                  },
                },
              ),
            ]);

          if (
            !vendorResponse.ok
          ) {
            throw new Error(
              await readApiError(
                vendorResponse,
                `Vendor request failed. HTTP ${vendorResponse.status}`,
              ),
            );
          }

          if (
            !kpiResponse.ok
          ) {
            throw new Error(
              await readApiError(
                kpiResponse,
                `Vendor KPI request failed. HTTP ${kpiResponse.status}`,
              ),
            );
          }

          const vendorBody =
            (await vendorResponse.json()) as VendorDetails;

          const kpiBody =
            (await kpiResponse.json()) as VendorKpis;

          if (!signal?.aborted) {
            setVendor(
              vendorBody,
            );

            setKpis(
              kpiBody,
            );
          }
        } catch (err) {
          if (
            err instanceof
              DOMException &&
            err.name ===
              "AbortError"
          ) {
            return;
          }

          if (
            !signal?.aborted
          ) {
            setVendor(null);
            setKpis(null);

            setError(
              err instanceof Error
                ? err.message
                : "Vendor details could not be loaded.",
            );
          }
        } finally {
          if (
            !signal?.aborted
          ) {
            setLoading(false);
          }
        }
      },
      [vendorId],
    );

  const loadOrders =
    useCallback(
      async (
        signal?: AbortSignal,
      ) => {
        try {
          setOrdersLoading(
            true,
          );

          setOrdersError("");

          const params =
            new URLSearchParams({
              page:
                String(
                  orderPage,
                ),

              limit:
                String(
                  ORDER_PAGE_SIZE,
                ),
            });

          if (orderSearch) {
            params.set(
              "search",
              orderSearch,
            );
          }

          if (orderStatus) {
            params.set(
              "status",
              orderStatus,
            );
          }

          const response =
            await fetch(
              `/api/super-admin/vendors/${encodeURIComponent(
                vendorId,
              )}/orders?${params.toString()}`,
              {
                method: "GET",
                cache:
                  "no-store",
                signal,

                headers: {
                  Accept:
                    "application/json",
                },
              },
            );

          if (!response.ok) {
            throw new Error(
              await readApiError(
                response,
                `Orders request failed. HTTP ${response.status}`,
              ),
            );
          }

          const body =
            (await response.json()) as OrdersResponse;

          if (
            !signal?.aborted
          ) {
            setOrders(
              Array.isArray(
                body.data,
              )
                ? body.data
                : [],
            );

            setOrderTotal(
              body.pagination
                ?.total ?? 0,
            );

            setOrderTotalPages(
              body.pagination
                ?.totalPages ?? 0,
            );
          }
        } catch (err) {
          if (
            err instanceof
              DOMException &&
            err.name ===
              "AbortError"
          ) {
            return;
          }

          if (
            !signal?.aborted
          ) {
            setOrders([]);
            setOrderTotal(0);
            setOrderTotalPages(
              0,
            );

            setOrdersError(
              err instanceof Error
                ? err.message
                : "Vendor orders could not be loaded.",
            );
          }
        } finally {
          if (
            !signal?.aborted
          ) {
            setOrdersLoading(
              false,
            );
          }
        }
      },
      [
        vendorId,
        orderPage,
        orderSearch,
        orderStatus,
      ],
    );

  useEffect(() => {
    const controller =
      new AbortController();

    void loadVendor(
      controller.signal,
    );

    return () =>
      controller.abort();
  }, [loadVendor]);

  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          const normalized =
            orderSearchInput
              .trim()
              .slice(
                0,
                100,
              );

          setOrderPage(1);

          setOrderSearch(
            normalized,
          );
        },
        350,
      );

    return () =>
      window.clearTimeout(
        timer,
      );
  }, [orderSearchInput]);

  useEffect(() => {
    if (
      activeTab !== "orders"
    ) {
      return;
    }

    const controller =
      new AbortController();

    void loadOrders(
      controller.signal,
    );

    return () =>
      controller.abort();
  }, [
    activeTab,
    loadOrders,
  ]);

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
          Loading vendor
          details...
        </strong>
      </div>
    );
  }

  if (
    error ||
    !vendor ||
    !kpis
  ) {
    return (
      <div
        className={
          styles.state
        }
      >
        <CircleX
          size={30}
        />

        <strong>
          Vendor details
          unavailable
        </strong>

        <p>
          {error ||
            "Vendor not found."}
        </p>

        <Link
          href="/vendors"
          className={
            styles.backButton
          }
        >
          <ArrowLeft
            size={17}
          />
          Back to Vendors
        </Link>
      </div>
    );
  }

  return (
    <main
      className={styles.page}
    >
      <header
        className={
          styles.header
        }
      >
        <div>
          <Link
            href="/vendors"
            className={
              styles.backLink
            }
          >
            <ArrowLeft
              size={17}
            />
            Vendors
          </Link>

          <p
            className={
              styles.eyebrow
            }
          >
            VENDOR 360
          </p>

          <div
            className={
              styles.titleRow
            }
          >
            <div>
              <h1>
                {
                  vendor.businessName
                }
              </h1>

              <p>
                {
                  vendor.vendorCode
                }
              </p>
            </div>

            <span
              className={`${styles.status} ${
                vendor.status ===
                "ACTIVE"
                  ? styles.statusActive
                  : vendor.status ===
                      "SUSPENDED"
                    ? styles.statusSuspended
                    : styles.statusInactive
              }`}
            >
              {statusLabel(
                vendor.status,
              )}
            </span>
          </div>
        </div>
      </header>

      <section
        className={
          styles.kpiGrid
        }
        aria-label="Vendor KPIs"
      >
        <Kpi
          icon={ShoppingBag}
          label="Total Orders"
          value={String(
            kpis.orders.total,
          )}
          description="Currently routed orders"
        />

        <Kpi
          icon={Clock3}
          label="Pending"
          value={String(
            kpis.orders.pending,
          )}
          description="Pickup requested"
        />

        <Kpi
          icon={RefreshCw}
          label="In Progress"
          value={String(
            kpis.orders
              .inProgress,
          )}
          description="Active processing"
        />

        <Kpi
          icon={PackageCheck}
          label="Completed"
          value={String(
            kpis.orders.completed,
          )}
          description="Completed orders"
        />

        <Kpi
          icon={CircleX}
          label="Cancelled"
          value={String(
            kpis.orders.cancelled,
          )}
          description="Cancelled orders"
        />

        <Kpi
          icon={TrendingUp}
          label="Completion Rate"
          value={percentage(
            kpis.completionRate,
          )}
          description="Completed / total"
        />

        <Kpi
          icon={IndianRupee}
          label="Purchase Value"
          value={money(
            kpis.financials
              .totalPurchaseValue,
          )}
          description="Completed purchases"
        />

        <Kpi
          icon={WalletCards}
          label="Average Order"
          value={money(
            kpis.financials
              .averageOrderValue,
          )}
          description="Completed order average"
        />
      </section>

      <nav
        className={styles.tabs}
        aria-label="Vendor details"
      >
        <TabButton
          active={
            activeTab ===
            "overview"
          }
          label="Overview"
          icon={Building2}
          onClick={() =>
            setActiveTab(
              "overview",
            )
          }
        />

        <TabButton
          active={
            activeTab ===
            "orders"
          }
          label={`Orders (${kpis.orders.total})`}
          icon={ShoppingBag}
          onClick={() =>
            setActiveTab(
              "orders",
            )
          }
        />

        <TabButton
          active={
            activeTab ===
            "performance"
          }
          label="Performance"
          icon={TrendingUp}
          onClick={() =>
            setActiveTab(
              "performance",
            )
          }
        />

        <TabButton
          active={
            activeTab ===
            "agents"
          }
          label="Agents"
          icon={UsersRound}
          onClick={() =>
            setActiveTab(
              "agents",
            )
          }
        />

        <TabButton
          active={
            activeTab ===
            "serviceAreas"
          }
          label="Service Areas"
          icon={MapPin}
          onClick={() =>
            setActiveTab(
              "serviceAreas",
            )
          }
        />

        <TabButton
          active={
            activeTab ===
            "financials"
          }
          label="Financials"
          icon={WalletCards}
          onClick={() =>
            setActiveTab(
              "financials",
            )
          }
        />

        <TabButton
          active={
            activeTab ===
            "activity"
          }
          label="Activity"
          icon={Activity}
          onClick={() =>
            setActiveTab(
              "activity",
            )
          }
        />
      </nav>

      {activeTab ===
        "overview" && (
        <div
          className={
            styles.contentGrid
          }
        >
          <div
            className={
              styles.mainColumn
            }
          >
            <Panel
              title="Business Information"
              icon={Building2}
            >
              <div
                className={
                  styles.infoGrid
                }
              >
                <Info
                  label="Business Name"
                  value={
                    vendor.businessName
                  }
                />

                <Info
                  label="Vendor Code"
                  value={
                    vendor.vendorCode
                  }
                />

                <Info
                  label="Account Status"
                  value={statusLabel(
                    vendor.status,
                  )}
                />

                <Info
                  label="Vendor Since"
                  value={dateTime(
                    vendor.createdAt,
                  )}
                />

                <Info
                  label="Last Updated"
                  value={dateTime(
                    vendor.updatedAt,
                  )}
                />
              </div>
            </Panel>

            <Panel
              title="Contact Information"
              icon={UserRound}
            >
              <div
                className={
                  styles.contactGrid
                }
              >
                <Contact
                  icon={UserRound}
                  label="Primary Contact"
                  value={
                    vendor.contactName
                  }
                />

                <Contact
                  icon={Phone}
                  label="Mobile"
                  value={
                    vendor.phone
                  }
                />

                <Contact
                  icon={Mail}
                  label="Email"
                  value={displayValue(
                    vendor.email,
                  )}
                />
              </div>
            </Panel>

            <ServiceAreaContent
              serviceAreas={
                vendor.serviceAreas
              }
            />
          </div>

          <aside
            className={
              styles.sideColumn
            }
          >
            <Panel
              title="Account"
              icon={ShieldCheck}
            >
              <div
                className={
                  styles.infoStack
                }
              >
                <Info
                  label="Current Status"
                  value={statusLabel(
                    vendor.status,
                  )}
                />

                <Info
                  label="Vendor Code"
                  value={
                    vendor.vendorCode
                  }
                />

                <Info
                  label="Active Areas"
                  value={String(
                    vendor.summary
                      .serviceAreas,
                  )}
                />
              </div>
            </Panel>

            <Panel
              title="Order Snapshot"
              icon={ShoppingBag}
            >
              <div
                className={
                  styles.infoStack
                }
              >
                <Info
                  label="Pending"
                  value={String(
                    kpis.orders
                      .pending,
                  )}
                />

                <Info
                  label="In Progress"
                  value={String(
                    kpis.orders
                      .inProgress,
                  )}
                />

                <Info
                  label="Completed"
                  value={String(
                    kpis.orders
                      .completed,
                  )}
                />

                <Info
                  label="Cancelled"
                  value={String(
                    kpis.orders
                      .cancelled,
                  )}
                />
              </div>
            </Panel>
          </aside>
        </div>
      )}

      {activeTab ===
        "orders" && (
        <section
          className={
            styles.ordersPanel
          }
        >
          <div
            className={
              styles.ordersHeader
            }
          >
            <div>
              <h2>
                Vendor Orders
              </h2>

              <p>
                {orderTotal} current
                order
                {orderTotal === 1
                  ? ""
                  : "s"}{" "}
                routed to this
                vendor.
              </p>
            </div>

            <div
              className={
                styles.orderFilters
              }
            >
              <label
                className={
                  styles.searchBox
                }
              >
                <Search
                  size={17}
                />

                <input
                  type="search"
                  value={
                    orderSearchInput
                  }
                  placeholder="Search order, product or variant"
                  maxLength={100}
                  onChange={(
                    event,
                  ) =>
                    setOrderSearchInput(
                      event.target
                        .value,
                    )
                  }
                />
              </label>

              <select
                className={
                  styles.statusSelect
                }
                value={
                  orderStatus
                }
                onChange={(
                  event,
                ) => {
                  setOrderPage(
                    1,
                  );

                  setOrderStatus(
                    event.target
                      .value as
                      | ""
                      | OrderStatus,
                  );
                }}
              >
                {ORDER_STATUSES.map(
                  (status) => (
                    <option
                      key={
                        status.value ||
                        "ALL"
                      }
                      value={
                        status.value
                      }
                    >
                      {
                        status.label
                      }
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>

          {ordersLoading ? (
            <div
              className={
                styles.ordersState
              }
            >
              <RefreshCw
                size={22}
                className={
                  styles.spinning
                }
              />

              Loading orders...
            </div>
          ) : ordersError ? (
            <div
              className={
                styles.ordersState
              }
            >
              <CircleX
                size={24}
              />

              <strong>
                Unable to load
                orders
              </strong>

              <p>
                {ordersError}
              </p>

              <button
                type="button"
                className={
                  styles.retryButton
                }
                onClick={() =>
                  void loadOrders()
                }
              >
                Retry
              </button>
            </div>
          ) : orders.length ===
            0 ? (
            <div
              className={
                styles.ordersState
              }
            >
              <ShoppingBag
                size={28}
              />

              <strong>
                No orders found
              </strong>

              <p>
                No current vendor
                orders match the
                selected filters.
              </p>
            </div>
          ) : (
            <>
              <div
                className={
                  styles.tableWrap
                }
              >
                <table
                  className={
                    styles.ordersTable
                  }
                >
                  <thead>
                    <tr>
                      <th>
                        Order
                      </th>
                      <th>
                        Product
                      </th>
                      <th>
                        Customer
                      </th>
                      <th>
                        Location
                      </th>
                      <th>
                        Pickup
                      </th>
                      <th>
                        Value
                      </th>
                      <th>
                        Status
                      </th>
                      <th
                        aria-label="Actions"
                      />
                    </tr>
                  </thead>

                  <tbody>
                    {orders.map(
                      (order) => (
                        <tr
                          key={
                            order.id
                          }
                        >
                          <td>
                            <div
                              className={
                                styles.orderIdentity
                              }
                            >
                              <Link
                                href={`/orders/${encodeURIComponent(
                                  order.orderNumber,
                                )}`}
                              >
                                {
                                  order.orderNumber
                                }
                              </Link>

                              <small>
                                Created{" "}
                                {dateOnly(
                                  order.createdAt,
                                )}
                              </small>
                            </div>
                          </td>

                          <td>
                            <div
                              className={
                                styles.productCell
                              }
                            >
                              {order.productImage ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={
                                    order.productImage
                                  }
                                  alt=""
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div
                                  className={
                                    styles.productFallback
                                  }
                                >
                                  <ShoppingBag
                                    size={17}
                                  />
                                </div>
                              )}

                              <div>
                                <strong>
                                  {
                                    order.productName
                                  }
                                </strong>

                                <small>
                                  {
                                    order.variantLabel
                                  }
                                </small>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div
                              className={
                                styles.customerCell
                              }
                            >
                              <strong>
                                {order
                                  .addressSnapshot
                                  ?.fullName ??
                                  "—"}
                              </strong>

                              <small>
                                {order
                                  .addressSnapshot
                                  ?.phone ??
                                  "—"}
                              </small>
                            </div>
                          </td>

                          <td>
                            <div
                              className={
                                styles.customerCell
                              }
                            >
                              <strong>
                                {order
                                  .addressSnapshot
                                  ?.city ??
                                  "—"}
                              </strong>

                              <small>
                                {order
                                  .addressSnapshot
                                  ? `${order.addressSnapshot.pincode}, ${order.addressSnapshot.state}`
                                  : "—"}
                              </small>
                            </div>
                          </td>

                          <td>
                            {dateOnly(
                              order.pickupDate,
                            )}
                          </td>

                          <td
                            className={
                              styles.moneyCell
                            }
                          >
                            {money(
                              order.finalPrice,
                            )}
                          </td>

                          <td>
                            <OrderStatusBadge
                              status={
                                order.status
                              }
                            />
                          </td>

                          <td>
                            <Link
                              href={`/orders/${encodeURIComponent(
                                order.orderNumber,
                              )}`}
                              className={
                                styles.viewOrder
                              }
                              aria-label={`View ${order.orderNumber}`}
                            >
                              <Eye
                                size={17}
                              />
                              View
                            </Link>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>

              <div
                className={
                  styles.pagination
                }
              >
                <p>
                  Page {orderPage} of{" "}
                  {Math.max(
                    1,
                    orderTotalPages,
                  )}
                  {" · "}
                  {orderTotal} orders
                </p>

                <div>
                  <button
                    type="button"
                    disabled={
                      orderPage <=
                        1 ||
                      ordersLoading
                    }
                    onClick={() =>
                      setOrderPage(
                        (current) =>
                          Math.max(
                            1,
                            current -
                              1,
                          ),
                      )
                    }
                  >
                    <ChevronLeft
                      size={17}
                    />
                    Previous
                  </button>

                  <button
                    type="button"
                    disabled={
                      orderPage >=
                        orderTotalPages ||
                      ordersLoading
                    }
                    onClick={() =>
                      setOrderPage(
                        (current) =>
                          current +
                          1,
                      )
                    }
                  >
                    Next
                    <ChevronRight
                      size={17}
                    />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {activeTab ===
        "performance" && (
        <ComingSoon
          title="Performance"
          description="Detailed turnaround time, cancellation trend and operational performance will be connected through a dedicated aggregate endpoint."
        />
      )}

      {activeTab ===
        "agents" && (
        <ComingSoon
          title="Agents"
          description="This will connect to the vendor-agent registration and approval workflow instead of showing placeholder agent data."
        />
      )}

      {activeTab ===
        "serviceAreas" && (
        <ServiceAreaContent
          serviceAreas={
            vendor.serviceAreas
          }
        />
      )}

      {activeTab ===
        "financials" && (
        <Panel
          title="Financial Summary"
          icon={WalletCards}
        >
          <div
            className={
              styles.infoGrid
            }
          >
            <Info
              label="Completed Purchase Value"
              value={money(
                kpis.financials
                  .totalPurchaseValue,
              )}
            />

            <Info
              label="Average Completed Order"
              value={money(
                kpis.financials
                  .averageOrderValue,
              )}
            />

            <Info
              label="Completed Orders"
              value={String(
                kpis.orders
                  .completed,
              )}
            />
          </div>
        </Panel>
      )}

      {activeTab ===
        "activity" && (
        <ComingSoon
          title="Activity & Audit"
          description="Vendor administrative and operational events will appear here after the audit event source is connected."
        />
      )}
    </main>
  );
}

function ServiceAreaContent({
  serviceAreas,
}: {
  serviceAreas: ServiceArea[];
}) {
  return (
    <Panel
      title="Service Coverage"
      icon={MapPin}
    >
      {serviceAreas.length >
      0 ? (
        <div
          className={
            styles.serviceAreaGrid
          }
        >
          {serviceAreas.map(
            (area) => (
              <div
                key={area.id}
                className={
                  styles.serviceArea
                }
              >
                <div>
                  <strong>
                    {
                      area
                        .serviceablePincode
                        .pincode
                    }
                  </strong>

                  <span>
                    {[
                      area
                        .serviceablePincode
                        .district,
                      area
                        .serviceablePincode
                        .state,
                    ]
                      .filter(Boolean)
                      .join(", ") ||
                      "Location unavailable"}
                  </span>
                </div>

                <small>
                  Priority{" "}
                  {area.priority}
                </small>
              </div>
            ),
          )}
        </div>
      ) : (
        <EmptyText>
          No active service
          areas are currently
          mapped to this vendor.
        </EmptyText>
      )}
    </Panel>
  );
}

function OrderStatusBadge({
  status,
}: {
  status: OrderStatus;
}) {
  let className =
    styles.orderStatus;

  if (
    status === "COMPLETED"
  ) {
    className +=
      ` ${styles.orderStatusCompleted}`;
  } else if (
    status === "CANCELLED"
  ) {
    className +=
      ` ${styles.orderStatusCancelled}`;
  } else if (
    status ===
    "PICKUP_REQUESTED"
  ) {
    className +=
      ` ${styles.orderStatusPending}`;
  } else {
    className +=
      ` ${styles.orderStatusProgress}`;
  }

  return (
    <span
      className={className}
    >
      {orderStatusLabel(
        status,
      )}
    </span>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: typeof ShoppingBag;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <article
      className={
        styles.kpiCard
      }
    >
      <span
        className={
          styles.kpiIcon
        }
      >
        <Icon size={20} />
      </span>

      <div>
        <span>{label}</span>

        <strong>
          {value}
        </strong>

        <small>
          {description}
        </small>
      </div>
    </article>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof ShoppingBag;
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
        <h2>{title}</h2>
      </div>

      {children}
    </section>
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
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function Contact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div
      className={
        styles.contact
      }
    >
      <span
        className={
          styles.contactIcon
        }
      >
        <Icon size={18} />
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

function TabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof ShoppingBag;
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
      aria-selected={active}
      role="tab"
      onClick={onClick}
    >
      <Icon size={17} />
      {label}
    </button>
  );
}

function ComingSoon({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section
      className={
        styles.placeholder
      }
    >
      <RefreshCw
        size={24}
      />

      <h2>{title}</h2>

      <p>
        {description}
      </p>
    </section>
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