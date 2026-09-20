"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  ArrowLeft,
  ChevronRight,
  CircleCheckBig,
  CircleX,
  Eye,
  Home,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  UserRound,
} from "lucide-react";

import styles from "./CustomerDetailClient.module.css";

type CustomerAddress = {
  id: number;
  fullName: string | null;
  house: string | null;
  street: string | null;
  locality: string | null;
  landmark: string | null;
  pincode: string | null;
  city: string | null;
  state: string | null;
  type: string | null;
  isActive: boolean;
};

type CustomerOrder = {
  id?: string;
  orderNumber: string;
  productName: string;
  variantLabel: string;
  finalPrice: number | null;
  status: string;
  createdAt: string;
};

type CustomerDetails = {
  id: number;
  name: string | null;
  phone: string;
  createdAt: string;
  updatedAt?: string;

  summary: {
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
  };

  addresses: CustomerAddress[];
  orders: CustomerOrder[];
};

type CustomerDetailsResponse =
  | CustomerDetails
  | {
      data?: CustomerDetails;
      message?: string;
    };

type CustomerDetailClientProps = {
  customerId: string;
};

function formatDate(
  value: string | null | undefined,
) {
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

function formatMoney(
  value: number | null | undefined,
) {
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

function formatStatus(value: string) {
  if (!value) {
    return "—";
  }

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

function statusClass(
  status: string,
) {
  if (status === "COMPLETED") {
    return styles.statusCompleted;
  }

  if (status === "CANCELLED") {
    return styles.statusCancelled;
  }

  if (
    status === "PAYMENT_COMPLETED"
  ) {
    return styles.statusPayment;
  }

  if (
    status ===
    "INSPECTION_COMPLETED"
  ) {
    return styles.statusInspection;
  }

  return styles.statusProgress;
}

function addressLine(
  address: CustomerAddress,
) {
  const parts = [
    address.house,
    address.street,
    address.locality,
    address.landmark,
    address.city,
    address.state,
    address.pincode,
  ]
    .map((value) => value?.trim())
    .filter(Boolean);

  return parts.length > 0
    ? parts.join(", ")
    : "Address unavailable";
}

function addressTypeLabel(
  value: string | null,
) {
  if (!value) {
    return "Saved Address";
  }

  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase(),
    );
}

function getInitial(
  name: string | null,
) {
  const value = name?.trim();

  if (!value) {
    return "C";
  }

  return value
    .charAt(0)
    .toUpperCase();
}

function isCustomerDetails(
  value: unknown,
): value is CustomerDetails {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const record =
    value as Record<string, unknown>;

  return (
    typeof record.id === "number" &&
    typeof record.phone === "string" &&
    typeof record.summary === "object" &&
    Array.isArray(record.addresses) &&
    Array.isArray(record.orders)
  );
}

export default function CustomerDetailClient({
  customerId,
}: CustomerDetailClientProps) {
  const router = useRouter();

  const [customer, setCustomer] =
    useState<CustomerDetails | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const loadCustomer =
    useCallback(
      async (
        signal?: AbortSignal,
      ) => {
        setLoading(true);
        setError(null);

        try {
          const response =
            await fetch(
              `/api/super-admin/customers/${encodeURIComponent(
                customerId,
              )}`,
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
              .includes(
                "application/json",
              )
          ) {
            throw new Error(
              `Customer API returned HTTP ${response.status} instead of JSON.`,
            );
          }

          const body =
            (await response.json()) as
              CustomerDetailsResponse;

          if (!response.ok) {
            const message =
              typeof body === "object" &&
              body !== null &&
              "message" in body &&
              typeof body.message ===
                "string"
                ? body.message
                : "Unable to load customer details.";

            throw new Error(message);
          }

          let details:
            | CustomerDetails
            | undefined;

          if (
            isCustomerDetails(body)
          ) {
            details = body;
          } else if (
            typeof body ===
              "object" &&
            body !== null &&
            "data" in body &&
            isCustomerDetails(
              body.data,
            )
          ) {
            details = body.data;
          }

          if (!details) {
            throw new Error(
              "Customer API returned an invalid response.",
            );
          }

          setCustomer(details);
        } catch (caught) {
          if (
            caught instanceof
              DOMException &&
            caught.name ===
              "AbortError"
          ) {
            return;
          }

          setCustomer(null);

          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load customer details.",
          );
        } finally {
          if (!signal?.aborted) {
            setLoading(false);
          }
        }
      },
      [customerId],
    );

  useEffect(() => {
    const controller =
      new AbortController();

    void loadCustomer(
      controller.signal,
    );

    return () => {
      controller.abort();
    };
  }, [loadCustomer]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div
          className={
            styles.loadingState
          }
        >
          <span
            className={styles.spinner}
          />

          <span>
            Loading customer details...
          </span>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className={styles.page}>
        <div
          className={styles.errorState}
        >
          <div
            className={
              styles.errorIcon
            }
          >
            <UserRound size={26} />
          </div>

          <h2>
            Could not load customer
          </h2>

          <p>
            {error ||
              "Customer details are unavailable."}
          </p>

          <div
            className={
              styles.errorActions
            }
          >
            <button
              type="button"
              className={
                styles.secondaryButton
              }
              onClick={() =>
                router.push(
                  "/customers",
                )
              }
            >
              <ArrowLeft size={17} />
              Customers
            </button>

            <button
              type="button"
              className={
                styles.primaryButton
              }
              onClick={() =>
                void loadCustomer()
              }
            >
              <RefreshCw size={17} />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageIntro}>
        <div
          className={styles.breadcrumb}
        >
          <button
            type="button"
            onClick={() =>
              router.push(
                "/dashboard",
              )
            }
          >
            Home
          </button>

          <ChevronRight size={14} />

          <button
            type="button"
            onClick={() =>
              router.push(
                "/customers",
              )
            }
          >
            Customer Management
          </button>

          <ChevronRight size={14} />

          <button
            type="button"
            onClick={() =>
              router.push(
                "/customers",
              )
            }
          >
            Customers
          </button>

          <ChevronRight size={14} />

          <strong>
            Customer Details
          </strong>
        </div>

        <div
          className={
            styles.headingRow
          }
        >
          <div>
            <p
              className={
                styles.eyebrow
              }
            >
              CUSTOMER MANAGEMENT
            </p>

            <h1>
              Customer Details
            </h1>

            <p
              className={
                styles.subtitle
              }
            >
              View customer profile,
              saved addresses and complete
              order history.
            </p>
          </div>

          <button
            type="button"
            className={
              styles.backButton
            }
            onClick={() =>
              router.push(
                "/customers",
              )
            }
          >
            <ArrowLeft size={17} />
            Back to Customers
          </button>
        </div>
      </div>

      <section
        className={
          styles.customerHero
        }
      >
        <div
          className={
            styles.customerHeroIdentity
          }
        >
          <div
            className={
              styles.customerAvatar
            }
          >
            {getInitial(
              customer.name,
            )}
          </div>

          <div>
            <div
              className={
                styles.customerNameRow
              }
            >
              <h2>
                {customer.name ||
                  "Name unavailable"}
              </h2>

              <span
                className={
                  styles.customerId
                }
              >
                Customer #
                {customer.id}
              </span>
            </div>

            <div
              className={
                styles.customerMeta
              }
            >
              <span>
                <Phone size={15} />

                {customer.phone ||
                  "—"}
              </span>

              <span>
                <UserRound
                  size={15}
                />

                Customer since{" "}
                {formatDate(
                  customer.createdAt,
                )}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section
        className={
          styles.summaryGrid
        }
      >
        <article
          className={`${styles.summaryCard} ${styles.totalCard}`}
        >
          <div
            className={
              styles.totalIcon
            }
          >
            <Package size={24} />
          </div>

          <div>
            <span>
              Total Orders
            </span>

            <strong>
              {
                customer.summary
                  .totalOrders
              }
            </strong>

            <small>
              Complete order history
            </small>
          </div>
        </article>

        <article
          className={`${styles.summaryCard} ${styles.completedCard}`}
        >
          <div
            className={
              styles.completedIcon
            }
          >
            <CircleCheckBig
              size={24}
            />
          </div>

          <div>
            <span>
              Completed
            </span>

            <strong>
              {
                customer.summary
                  .completedOrders
              }
            </strong>

            <small>
              Successfully completed
            </small>
          </div>
        </article>

        <article
          className={`${styles.summaryCard} ${styles.cancelledCard}`}
        >
          <div
            className={
              styles.cancelledIcon
            }
          >
            <CircleX size={24} />
          </div>

          <div>
            <span>
              Cancelled
            </span>

            <strong>
              {
                customer.summary
                  .cancelledOrders
              }
            </strong>

            <small>
              Cancelled orders
            </small>
          </div>
        </article>
      </section>

      <div
        className={
          styles.informationGrid
        }
      >
        <section
          className={
            styles.contentCard
          }
        >
          <div
            className={
              styles.sectionHeader
            }
          >
            <div
              className={
                styles.sectionIcon
              }
            >
              <UserRound
                size={19}
              />
            </div>

            <div>
              <h2>
                Customer Information
              </h2>

              <p>
                Customer profile
                information.
              </p>
            </div>
          </div>

          <div
            className={
              styles.profileDetails
            }
          >
            <div>
              <span>
                Customer Name
              </span>

              <strong>
                {customer.name ||
                  "—"}
              </strong>
            </div>

            <div>
              <span>
                Mobile Number
              </span>

              <strong>
                {customer.phone ||
                  "—"}
              </strong>
            </div>

            <div>
              <span>
                Customer ID
              </span>

              <strong>
                #{customer.id}
              </strong>
            </div>

            <div>
              <span>
                Customer Since
              </span>

              <strong>
                {formatDate(
                  customer.createdAt,
                )}
              </strong>
            </div>
          </div>
        </section>

        <section
          className={
            styles.contentCard
          }
        >
          <div
            className={
              styles.sectionHeader
            }
          >
            <div
              className={
                styles.sectionIcon
              }
            >
              <MapPin size={19} />
            </div>

            <div>
              <h2>
                Saved Addresses
              </h2>

              <p>
                Active customer pickup
                addresses.
              </p>
            </div>
          </div>

          {customer.addresses.length >
          0 ? (
            <div
              className={
                styles.addressList
              }
            >
              {customer.addresses.map(
                (address) => (
                  <article
                    key={address.id}
                    className={
                      styles.addressCard
                    }
                  >
                    <div
                      className={
                        styles.addressTop
                      }
                    >
                      <div
                        className={
                          styles.addressType
                        }
                      >
                        <Home
                          size={15}
                        />

                        {addressTypeLabel(
                          address.type,
                        )}
                      </div>

                      {address.isActive ? (
                        <span
                          className={
                            styles.activeBadge
                          }
                        >
                          Active
                        </span>
                      ) : null}
                    </div>

                    <strong>
                      {address.fullName ||
                        "—"}
                    </strong>

                    <p>
                      {addressLine(
                        address,
                      )}
                    </p>
                  </article>
                ),
              )}
            </div>
          ) : (
            <div
              className={
                styles.emptySection
              }
            >
              <MapPin size={23} />

              <span>
                No saved addresses
                available.
              </span>
            </div>
          )}
        </section>
      </div>

      <section
        className={
          styles.ordersSection
        }
      >
        <div
          className={
            styles.ordersHeader
          }
        >
          <div>
            <div
              className={
                styles.sectionIcon
              }
            >
              <Package size={19} />
            </div>

            <div>
              <h2>
                Order History
              </h2>

              <p>
                All orders linked to
                this customer.
              </p>
            </div>
          </div>

          <span
            className={
              styles.orderTotal
            }
          >
            {customer.orders.length}{" "}
            {customer.orders.length ===
            1
              ? "order"
              : "orders"}
          </span>
        </div>

        {customer.orders.length ===
        0 ? (
          <div
            className={
              styles.emptyOrders
            }
          >
            <Package size={28} />

            <strong>
              No orders available
            </strong>

            <span>
              This customer does not
              have any orders.
            </span>
          </div>
        ) : (
          <>
            <div
              className={
                styles.tableWrapper
              }
            >
              <table
                className={
                  styles.ordersTable
                }
              >
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Order ID</th>
                    <th>
                      Device / Model
                    </th>
                    <th>
                      Final Price
                    </th>
                    <th>Status</th>
                    <th>
                      Order Date
                    </th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {customer.orders.map(
                    (
                      order,
                      index,
                    ) => (
                      <tr
                        key={
                          order.orderNumber
                        }
                      >
                        <td
                          className={
                            styles.rowNumber
                          }
                        >
                          {index + 1}
                        </td>

                        <td>
                          <span
                            className={
                              styles.orderNumber
                            }
                          >
                            {
                              order.orderNumber
                            }
                          </span>
                        </td>

                        <td>
                          <div
                            className={
                              styles.device
                            }
                          >
                            <strong>
                              {
                                order.productName
                              }
                            </strong>

                            <span>
                              {order.variantLabel ||
                                "—"}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span
                            className={
                              styles.price
                            }
                          >
                            {formatMoney(
                              order.finalPrice,
                            )}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`${styles.statusBadge} ${statusClass(
                              order.status,
                            )}`}
                          >
                            {formatStatus(
                              order.status,
                            )}
                          </span>
                        </td>

                        <td>
                          <span
                            className={
                              styles.orderDate
                            }
                          >
                            {formatDate(
                              order.createdAt,
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
                                `/orders/${encodeURIComponent(
                                  order.orderNumber,
                                )}`,
                              )
                            }
                          >
                            <Eye
                              size={15}
                            />

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
                styles.mobileOrders
              }
            >
              {customer.orders.map(
                (order) => (
                  <article
                    key={
                      order.orderNumber
                    }
                    className={
                      styles.mobileOrderCard
                    }
                  >
                    <div
                      className={
                        styles.mobileOrderTop
                      }
                    >
                      <div>
                        <span>
                          Order ID
                        </span>

                        <strong>
                          {
                            order.orderNumber
                          }
                        </strong>
                      </div>

                      <span
                        className={`${styles.statusBadge} ${statusClass(
                          order.status,
                        )}`}
                      >
                        {formatStatus(
                          order.status,
                        )}
                      </span>
                    </div>

                    <div
                      className={
                        styles.mobileDevice
                      }
                    >
                      <span>
                        Device / Model
                      </span>

                      <strong>
                        {
                          order.productName
                        }
                      </strong>

                      <small>
                        {order.variantLabel ||
                          "—"}
                      </small>
                    </div>

                    <div
                      className={
                        styles.mobileOrderInfo
                      }
                    >
                      <div>
                        <span>
                          Final Price
                        </span>

                        <strong>
                          {formatMoney(
                            order.finalPrice,
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Order Date
                        </span>

                        <strong>
                          {formatDate(
                            order.createdAt,
                          )}
                        </strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={
                        styles.mobileViewButton
                      }
                      onClick={() =>
                        router.push(
                          `/orders/${encodeURIComponent(
                            order.orderNumber,
                          )}`,
                        )
                      }
                    >
                      <Eye size={16} />
                      View Order
                    </button>
                  </article>
                ),
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
