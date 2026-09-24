"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  IndianRupee,
  MapPin,
  PackageSearch,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Smartphone,
  UserRound,
  X,
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
  formatDateTime,
  formatMoney,
  formatStatus,
  getVendorOrder,
  getVendorOrders,
  type DateFilter,
  type VendorOrder,
  type VendorOrderDetails,
} from "../../lib/vendor-orders";

import styles from "./VendorOrders.module.css";

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

function statusClass(
  status: string,
) {
  const value =
    status.toUpperCase();

  if (
    value.includes("COMPLETED") ||
    value.includes("DELIVERED") ||
    value.includes("SUCCESS")
  ) {
    return styles.statusSuccess;
  }

  if (
    value.includes("CANCEL") ||
    value.includes("REJECT") ||
    value.includes("FAILED")
  ) {
    return styles.statusDanger;
  }

  if (
    value.includes("PICKUP") ||
    value.includes("ASSIGNED")
  ) {
    return styles.statusInfo;
  }

  if (
    value.includes("PROCESS") ||
    value.includes("PENDING")
  ) {
    return styles.statusWarning;
  }

  return styles.statusNeutral;
}

function OrderImage({
  order,
}: {
  order: VendorOrder;
}) {
  if (!order.productImage) {
    return (
      <div
        className={
          styles.imageFallback
        }
      >
        <Smartphone size={22} />
      </div>
    );
  }

  return (
    <img
      className={
        styles.productImage
      }
      src={order.productImage}
      alt=""
      loading="lazy"
    />
  );
}

export default function VendorOrders() {
  const [orders, setOrders] =
    useState<VendorOrder[]>([]);

  const [page, setPage] =
    useState(1);

  const [limit] =
    useState(20);

  const [total, setTotal] =
    useState(0);

  const [
    totalPages,
    setTotalPages,
  ] = useState(1);

  const [
    searchInput,
    setSearchInput,
  ] = useState("");

  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState("");

  const [
    dateFilter,
    setDateFilter,
  ] =
    useState<DateFilter>("ALL");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    selectedOrder,
    setSelectedOrder,
  ] =
    useState<VendorOrderDetails | null>(
      null,
    );

  const [
    detailsOrderNumber,
    setDetailsOrderNumber,
  ] =
    useState<string | null>(null);

  const [
    detailsLoading,
    setDetailsLoading,
  ] = useState(false);

  const [
    detailsError,
    setDetailsError,
  ] = useState("");

  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        setPage(1);

        setSearch(
          searchInput.trim(),
        );
      }, 400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchInput]);

  const loadOrders =
    useCallback(
      async () => {
        setLoading(true);
        setError("");

        try {
          const result =
            await getVendorOrders({
              page,
              limit,
              search,
              status,
              dateFilter,
            });

          setOrders(
            Array.isArray(
              result.data,
            )
              ? result.data
              : [],
          );

          setTotal(
            Number(
              result.pagination
                ?.total ?? 0,
            ),
          );

          setTotalPages(
            Math.max(
              1,
              Number(
                result.pagination
                  ?.totalPages ?? 1,
              ),
            ),
          );
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load orders.",
          );

          setOrders([]);
          setTotal(0);
          setTotalPages(1);
        } finally {
          setLoading(false);
        }
      },
      [
        page,
        limit,
        search,
        status,
        dateFilter,
      ],
    );

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const availableStatuses =
    useMemo(() => {
      return Array.from(
        new Set(
          orders
            .map(
              (order) =>
                order.status,
            )
            .filter(Boolean),
        ),
      ).sort();
    }, [orders]);

  async function openDetails(
    orderNumber: string,
  ) {
    setDetailsOrderNumber(
      orderNumber,
    );

    setSelectedOrder(null);
    setDetailsError("");
    setDetailsLoading(true);

    try {
      const result =
        await getVendorOrder(
          orderNumber,
        );

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
  }

  useEffect(() => {
    if (!detailsOrderNumber) {
      return;
    }

    function onKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        closeDetails();
      }
    }

    document.addEventListener(
      "keydown",
      onKeyDown,
    );

    return () =>
      document.removeEventListener(
        "keydown",
        onKeyDown,
      );
  }, [detailsOrderNumber]);

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setStatus("");
    setDateFilter("ALL");
    setPage(1);
  }

  return (
    <div className={styles.page}>
      <section
        className={styles.header}
      >
        <div>
          <div
            className={styles.eyebrow}
          >
            ORDER MANAGEMENT
          </div>

          <h1>
            Assigned Orders
          </h1>

          <p>
            Manage orders currently
            routed to your vendor
            account.
          </p>
        </div>

        <button
          className={
            styles.refreshButton
          }
          type="button"
          onClick={() =>
            void loadOrders()
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

          Refresh
        </button>
      </section>

      <section
        className={
          styles.summaryStrip
        }
      >
        <div>
          <span>
            Assigned orders
          </span>

          <strong>
            {loading ? "—" : total}
          </strong>
        </div>

        <div>
          <span>
            Date range
          </span>

          <strong>
            {dateFilterLabel(
              dateFilter,
            )}
          </strong>
        </div>

        <div>
          <span>Showing</span>

          <strong>
            {loading
              ? "—"
              : orders.length}
          </strong>
        </div>
      </section>

      <section
        className={styles.toolbar}
      >
        <div
          className={
            styles.searchBox
          }
        >
          <Search size={18} />

          <input
            value={searchInput}
            onChange={(event) =>
              setSearchInput(
                event.target.value,
              )
            }
            placeholder="Search order, customer, device, pincode..."
            aria-label="Search orders"
          />

          {searchInput && (
            <button
              type="button"
              onClick={() =>
                setSearchInput("")
              }
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div
          className={
            styles.filterBox
          }
        >
          <CalendarDays
            size={17}
          />

          <select
            value={dateFilter}
            onChange={(event) => {
              setDateFilter(
                event.target
                  .value as DateFilter,
              );

              setPage(1);
            }}
            aria-label="Filter by assignment date"
          >
            {DATE_FILTERS.map(
              (filter) => (
                <option
                  key={
                    filter.value
                  }
                  value={
                    filter.value
                  }
                >
                  {filter.label}
                </option>
              ),
            )}
          </select>
        </div>

        <div
          className={
            styles.filterBox
          }
        >
          <SlidersHorizontal
            size={17}
          />

          <select
            value={status}
            onChange={(event) => {
              setStatus(
                event.target.value,
              );

              setPage(1);
            }}
            aria-label="Filter by status"
          >
            <option value="">
              All statuses
            </option>

            {availableStatuses.map(
              (item) => (
                <option
                  value={item}
                  key={item}
                >
                  {formatStatus(
                    item,
                  )}
                </option>
              ),
            )}
          </select>
        </div>
      </section>

      {error && (
        <section
          className={
            styles.errorState
          }
        >
          <div>
            <strong>
              Couldn&apos;t load
              orders
            </strong>

            <p>{error}</p>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadOrders()
            }
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </section>
      )}

      {!error && loading && (
        <section
          className={
            styles.loadingList
          }
        >
          {Array.from({
            length: 5,
          }).map((_, index) => (
            <div
              className={
                styles.skeleton
              }
              key={index}
            />
          ))}
        </section>
      )}

      {!error &&
        !loading &&
        orders.length === 0 && (
          <section
            className={
              styles.emptyState
            }
          >
            <div
              className={
                styles.emptyIcon
              }
            >
              <PackageSearch
                size={28}
              />
            </div>

            <h2>
              No orders found
            </h2>

            <p>
              No assigned orders
              match the current
              search, date and
              status filters.
            </p>

            {(search ||
              status ||
              dateFilter !==
                "ALL") && (
              <button
                type="button"
                onClick={
                  clearFilters
                }
              >
                Clear filters
              </button>
            )}
          </section>
        )}

      {!error &&
        !loading &&
        orders.length > 0 && (
          <>
            <section
              className={
                styles.desktopTable
              }
            >
              <div
                className={
                  styles.tableHeader
                }
              >
                <span>
                  Order / Device
                </span>

                <span>
                  Customer
                </span>

                <span>
                  Pickup
                </span>

                <span>
                  Amount
                </span>

                <span>
                  Status
                </span>

                <span />
              </div>

              {orders.map(
                (order) => (
                  <article
                    className={
                      styles.tableRow
                    }
                    key={order.id}
                  >
                    <div
                      className={
                        styles.deviceCell
                      }
                    >
                      <OrderImage
                        order={order}
                      />

                      <div>
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

                        <small>
                          {
                            order.orderNumber
                          }
                        </small>
                      </div>
                    </div>

                    <div
                      className={
                        styles.customerCell
                      }
                    >
                      <strong>
                        {order
                          .customer
                          ?.name ??
                          "—"}
                      </strong>

                      <span>
                        {order
                          .customer
                          ?.phone ??
                          "—"}
                      </span>

                      <small>
                        <MapPin
                          size={13}
                        />

                        {order
                          .location
                          ?.locality
                          ? `${order.location.locality}, `
                          : ""}

                        {order
                          .location
                          ?.city ??
                          "—"}{" "}

                        {order
                          .location
                          ?.pincode ??
                          ""}
                      </small>
                    </div>

                    <div
                      className={
                        styles.pickupCell
                      }
                    >
                      <span>
                        <CalendarDays
                          size={15}
                        />

                        {formatDate(
                          order.pickupDate,
                        )}
                      </span>

                      <small>
                        <Clock3
                          size={14}
                        />

                        {order
                          .pickupSlot
                          ?.label ??
                          "—"}
                      </small>
                    </div>

                    <div
                      className={
                        styles.amountCell
                      }
                    >
                      <strong>
                        {formatMoney(
                          order.finalPrice,
                        )}
                      </strong>

                      <small>
                        Customer final
                        quote
                      </small>
                    </div>

                    <div>
                      <span
                        className={`${styles.statusBadge} ${statusClass(
                          order.status,
                        )}`}
                      >
                        {formatStatus(
                          order.status,
                        )}
                      </span>

                      <small
                        className={
                          styles.assignedTime
                        }
                      >
                        Assigned{" "}
                        {formatDateTime(
                          order
                            .assignment
                            ?.assignedAt,
                        )}
                      </small>
                    </div>

                    <button
                      className={
                        styles.viewButton
                      }
                      type="button"
                      onClick={() =>
                        void openDetails(
                          order.orderNumber,
                        )
                      }
                    >
                      <Eye
                        size={17}
                      />
                      View
                    </button>
                  </article>
                ),
              )}
            </section>

            <section
              className={
                styles.mobileCards
              }
            >
              {orders.map(
                (order) => (
                  <article
                    className={
                      styles.orderCard
                    }
                    key={order.id}
                  >
                    <div
                      className={
                        styles.cardTop
                      }
                    >
                      <div
                        className={
                          styles.cardDevice
                        }
                      >
                        <OrderImage
                          order={order}
                        />

                        <div>
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
                        styles.orderNumber
                      }
                    >
                      {
                        order.orderNumber
                      }
                    </div>

                    <div
                      className={
                        styles.cardGrid
                      }
                    >
                      <div>
                        <UserRound
                          size={16}
                        />

                        <span>
                          <small>
                            Customer
                          </small>

                          <strong>
                            {order
                              .customer
                              ?.name ??
                              "—"}
                          </strong>
                        </span>
                      </div>

                      <div>
                        <IndianRupee
                          size={16}
                        />

                        <span>
                          <small>
                            Final quote
                          </small>

                          <strong>
                            {formatMoney(
                              order.finalPrice,
                            )}
                          </strong>
                        </span>
                      </div>

                      <div>
                        <CalendarDays
                          size={16}
                        />

                        <span>
                          <small>
                            Pickup
                          </small>

                          <strong>
                            {formatDate(
                              order.pickupDate,
                            )}
                          </strong>
                        </span>
                      </div>

                      <div>
                        <MapPin
                          size={16}
                        />

                        <span>
                          <small>
                            Location
                          </small>

                          <strong>
                            {order
                              .location
                              ?.city ??
                              "—"}
                            ,{" "}
                            {order
                              .location
                              ?.pincode ??
                              "—"}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div
                      className={
                        styles.mobileSlot
                      }
                    >
                      <Clock3
                        size={15}
                      />

                      {order
                        .pickupSlot
                        ?.label ??
                        "Pickup slot unavailable"}
                    </div>

                    <button
                      className={
                        styles.mobileViewButton
                      }
                      type="button"
                      onClick={() =>
                        void openDetails(
                          order.orderNumber,
                        )
                      }
                    >
                      View order
                      <Eye
                        size={17}
                      />
                    </button>
                  </article>
                ),
              )}
            </section>

            <section
              className={
                styles.pagination
              }
            >
              <span>
                {total} assigned{" "}
                {total === 1
                  ? "order"
                  : "orders"}
              </span>

              <div>
                <button
                  type="button"
                  disabled={
                    page <= 1
                  }
                  onClick={() =>
                    setPage(
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

                <span>
                  Page {page} of{" "}
                  {totalPages}
                </span>

                <button
                  type="button"
                  disabled={
                    page >=
                    totalPages
                  }
                  onClick={() =>
                    setPage(
                      (current) =>
                        Math.min(
                          totalPages,
                          current +
                            1,
                        ),
                    )
                  }
                >
                  Next

                  <ChevronRight
                    size={17}
                  />
                </button>
              </div>
            </section>
          </>
        )}

      {detailsOrderNumber && (
        <div
          className={
            styles.modalOverlay
          }
          role="presentation"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeDetails();
            }
          }}
        >
          <section
            className={
              styles.modal
            }
            role="dialog"
            aria-modal="true"
            aria-label="Order details"
          >
            <header
              className={
                styles.modalHeader
              }
            >
              <div>
                <span>
                  ORDER DETAILS
                </span>

                <h2>
                  {
                    detailsOrderNumber
                  }
                </h2>
              </div>

              <button
                type="button"
                onClick={
                  closeDetails
                }
                aria-label="Close order details"
              >
                <X size={20} />
              </button>
            </header>

            <div
              className={
                styles.modalBody
              }
            >
              {detailsLoading && (
                <>
                  <div
                    className={
                      styles.detailSkeleton
                    }
                  />

                  <div
                    className={
                      styles.detailSkeleton
                    }
                  />

                  <div
                    className={
                      styles.detailSkeleton
                    }
                  />
                </>
              )}

              {detailsError && (
                <div
                  className={
                    styles.modalError
                  }
                >
                  <strong>
                    Unable to load
                    details
                  </strong>

                  <p>
                    {detailsError}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      void openDetails(
                        detailsOrderNumber,
                      )
                    }
                  >
                    Retry
                  </button>
                </div>
              )}

              {!detailsLoading &&
                !detailsError &&
                selectedOrder && (
                  <OrderDetailsView
                    data={
                      selectedOrder
                    }
                  />
                )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function OrderDetailsView({
  data,
}: {
  data: VendorOrderDetails;
}) {
  return (
    <div
      className={styles.details}
    >
      <section
        className={
          styles.detailHero
        }
      >
        <div
          className={
            styles.detailIcon
          }
        >
          <Smartphone
            size={24}
          />
        </div>

        <div>
          <span>DEVICE</span>

          <h3>
            {data.product.name}
          </h3>

          <p>
            {data.product.variant}
          </p>
        </div>

        <strong>
          {formatMoney(
            data.pricing.finalPrice,
          )}
        </strong>
      </section>

      <section
        className={
          styles.quoteSection
        }
      >
        <div
          className={
            styles.sectionHeading
          }
        >
          <div>
            <span>
              CUSTOMER QUOTE
            </span>

            <h3>
              Original system quote
            </h3>
          </div>
        </div>

        <div
          className={
            styles.quoteRows
          }
        >
          <div>
            <span>
              Base Price
            </span>

            <strong>
              {formatMoney(
                data.pricing
                  .basePrice,
              )}
            </strong>
          </div>

          <div>
            <span>
              Total Deduction
            </span>

            <strong
              className={
                styles.deductionValue
              }
            >
              -
              {formatMoney(
                data.pricing
                  .totalDeduction,
              )}
            </strong>
          </div>

          <div
            className={
              styles.finalQuoteRow
            }
          >
            <span>
              Customer Final Quote
            </span>

            <strong>
              {formatMoney(
                data.pricing
                  .finalPrice,
              )}
            </strong>
          </div>
        </div>
      </section>

      <div
        className={
          styles.detailSections
        }
      >
        <section>
          <h4>Customer</h4>

          <dl>
            <DetailRow
              label="Name"
              value={
                data.customer
                  ?.name
              }
            />

            <DetailRow
              label="Phone"
              value={
                data.customer
                  ?.phone
              }
            />
          </dl>
        </section>

        <section>
          <h4>Pickup</h4>

          <dl>
            <DetailRow
              label="Date"
              value={formatDate(
                data.pickup.date,
              )}
            />

            <DetailRow
              label="Slot"
              value={
                data.pickup.slot
                  ?.label
              }
            />

            <DetailRow
              label="Time"
              value={
                data.pickup.slot
                  ? `${data.pickup.slot.startTime} - ${data.pickup.slot.endTime}`
                  : "—"
              }
            />
          </dl>
        </section>

        <section>
          <h4>
            Pickup Address
          </h4>

          <dl>
            <DetailRow
              label="House"
              value={
                data.address
                  ?.house
              }
            />

            <DetailRow
              label="Street"
              value={
                data.address
                  ?.street
              }
            />

            <DetailRow
              label="Locality"
              value={
                data.address
                  ?.locality
              }
            />

            <DetailRow
              label="Landmark"
              value={
                data.address
                  ?.landmark
              }
            />

            <DetailRow
              label="City"
              value={
                data.address
                  ?.city
              }
            />

            <DetailRow
              label="State"
              value={
                data.address
                  ?.state
              }
            />

            <DetailRow
              label="Pincode"
              value={
                data.address
                  ?.pincode
              }
            />
          </dl>
        </section>

        <section>
          <h4>Order</h4>

          <dl>
            <DetailRow
              label="Status"
              value={formatStatus(
                data.status,
              )}
            />

            <DetailRow
              label="Created"
              value={formatDateTime(
                data.createdAt,
              )}
            />

            <DetailRow
              label="Updated"
              value={formatDateTime(
                data.updatedAt,
              )}
            />
          </dl>
        </section>
      </div>

      <QuestionnaireSection
        questionnaire={
          data.questionnaire
        }
      />

      <section
        className={
          styles.historySection
        }
      >
        <div
          className={
            styles.sectionHeading
          }
        >
          <div>
            <span>
              VENDOR ROUTING
            </span>

            <h3>
              Assignment History
            </h3>
          </div>
        </div>

        {data.assignmentHistory
          .length === 0 ? (
          <EmptyHistory text="No assignment history available." />
        ) : (
          <div
            className={
              styles.timeline
            }
          >
            {data.assignmentHistory.map(
              (item) => (
                <div
                  key={item.id}
                  className={
                    styles.timelineItem
                  }
                >
                  <div
                    className={
                      styles.timelineDot
                    }
                  />

                  <div>
                    <strong>
                      {formatStatus(
                        item.source,
                      )}
                    </strong>

                    <span>
                      {formatStatus(
                        item.reason,
                      )}
                    </span>

                    <small>
                      Assigned{" "}
                      {formatDateTime(
                        item.assignedAt,
                      )}
                    </small>

                    {item.unassignedAt && (
                      <small>
                        Unassigned{" "}
                        {formatDateTime(
                          item.unassignedAt,
                        )}
                      </small>
                    )}
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </section>

      <section
        className={
          styles.historySection
        }
      >
        <div
          className={
            styles.sectionHeading
          }
        >
          <div>
            <span>
              ORDER HISTORY
            </span>

            <h3>
              Status Timeline
            </h3>
          </div>
        </div>

        {data.statusHistory
          .length === 0 ? (
          <EmptyHistory text="No status history available." />
        ) : (
          <div
            className={
              styles.timeline
            }
          >
            {data.statusHistory.map(
              (item) => (
                <div
                  key={item.id}
                  className={
                    styles.timelineItem
                  }
                >
                  <div
                    className={
                      styles.timelineDot
                    }
                  />

                  <div>
                    <strong>
                      {formatStatus(
                        item.status,
                      )}
                    </strong>

                    {item.note && (
                      <span>
                        {item.note}
                      </span>
                    )}

                    <small>
                      {formatDateTime(
                        item.createdAt,
                      )}
                    </small>
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </section>

      {data.reschedules.length >
        0 && (
        <section
          className={
            styles.historySection
          }
        >
          <div
            className={
              styles.sectionHeading
            }
          >
            <div>
              <span>
                PICKUP HISTORY
              </span>

              <h3>
                Reschedules
              </h3>
            </div>
          </div>

          <div
            className={
              styles.timeline
            }
          >
            {data.reschedules.map(
              (item) => (
                <div
                  key={item.id}
                  className={
                    styles.timelineItem
                  }
                >
                  <div
                    className={
                      styles.timelineDot
                    }
                  />

                  <div>
                    <strong>
                      Pickup
                      rescheduled
                    </strong>

                    <span>
                      {formatDate(
                        item.oldPickupDate,
                      )}{" "}
                      →{" "}
                      {formatDate(
                        item.newPickupDate,
                      )}
                    </span>

                    <small>
                      {
                        item.oldSlotLabel
                      }{" "}
                      →{" "}
                      {
                        item.newSlotLabel
                      }
                    </small>

                    <small>
                      {formatDateTime(
                        item.createdAt,
                      )}
                    </small>
                  </div>
                </div>
              ),
            )}
          </div>
        </section>
      )}

      <section
        className={
          styles.agentPlaceholder
        }
      >
        <div>
          <span>AGENT</span>

          <h3>
            Pickup Agent
          </h3>

          <p>
            No agent has been
            assigned yet. Agent
            assignment, inspection,
            re-quote and pickup
            history will appear here
            after the Agent module is
            connected.
          </p>
        </div>
      </section>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value:
    | string
    | number
    | null
    | undefined;
}) {
  return (
    <div>
      <dt>{label}</dt>

      <dd>
        {value === null ||
        value === undefined ||
        value === ""
          ? "—"
          : String(value)}
      </dd>
    </div>
  );
}

function EmptyHistory({
  text,
}: {
  text: string;
}) {
  return (
    <div
      className={
        styles.historyEmpty
      }
    >
      {text}
    </div>
  );
}

/*
 * QuestionnaireSnapshot is JSON.
 *
 * We do NOT recalculate deductions here.
 * We only render the frozen values stored
 * when the customer placed the order.
 *
 * This renderer supports nested sections,
 * questions and answer objects without
 * changing financial values.
 */
function QuestionnaireSection({
  questionnaire,
}: {
  questionnaire: unknown;
}) {
  if (
    questionnaire === null ||
    questionnaire === undefined
  ) {
    return (
      <section
        className={
          styles.questionnaireSection
        }
      >
        <div
          className={
            styles.sectionHeading
          }
        >
          <div>
            <span>
              DEVICE CONDITION
            </span>

            <h3>
              Customer Answers
            </h3>
          </div>
        </div>

        <EmptyHistory text="No questionnaire snapshot available." />
      </section>
    );
  }

  const entries =
    extractQuestionnaireEntries(
      questionnaire,
    );

  return (
    <section
      className={
        styles.questionnaireSection
      }
    >
      <div
        className={
          styles.sectionHeading
        }
      >
        <div>
          <span>
            DEVICE CONDITION
          </span>

          <h3>
            Customer Answers &
            Deductions
          </h3>
        </div>
      </div>

      {entries.length === 0 ? (
        <div
          className={
            styles.rawSnapshot
          }
        >
          <pre>
            {JSON.stringify(
              questionnaire,
              null,
              2,
            )}
          </pre>
        </div>
      ) : (
        <div
          className={
            styles.questionList
          }
        >
          {entries.map(
            (entry, index) => (
              <article
                key={`${entry.question}-${index}`}
                className={
                  styles.questionRow
                }
              >
                <div>
                  {entry.section && (
                    <small>
                      {entry.section}
                    </small>
                  )}

                  <strong>
                    {
                      entry.question
                    }
                  </strong>

                  <span>
                    Answer:{" "}
                    <b>
                      {entry.answer}
                    </b>
                  </span>
                </div>

                <div
                  className={
                    entry.deduction >
                    0
                      ? styles.questionDeduction
                      : styles.noDeduction
                  }
                >
                  {entry.deduction >
                  0
                    ? `-${formatMoney(
                        entry.deduction,
                      )}`
                    : "No deduction"}
                </div>
              </article>
            ),
          )}
        </div>
      )}
    </section>
  );
}

type QuestionnaireEntry = {
  section: string;
  question: string;
  answer: string;
  deduction: number;
};

function extractQuestionnaireEntries(
  value: unknown,
): QuestionnaireEntry[] {
  const result:
    QuestionnaireEntry[] = [];

  const visited =
    new WeakSet<object>();

  function walk(
    node: unknown,
    inheritedSection = "",
  ) {
    if (
      node === null ||
      node === undefined
    ) {
      return;
    }

    if (Array.isArray(node)) {
      for (const item of node) {
        walk(
          item,
          inheritedSection,
        );
      }

      return;
    }

    if (
      typeof node !== "object"
    ) {
      return;
    }

    if (
      visited.has(
        node as object,
      )
    ) {
      return;
    }

    visited.add(
      node as object,
    );

    const object =
      node as Record<
        string,
        unknown
      >;

    const section =
      firstText(object, [
        "section",
        "sectionName",
        "category",
        "categoryName",
        "group",
        "groupName",
      ]) || inheritedSection;

    const question =
      firstText(object, [
        "question",
        "questionText",
        "label",
        "title",
        "name",
      ]);

    const answerValue =
      firstValue(object, [
        "answer",
        "answerText",
        "selectedAnswer",
        "selectedOption",
        "value",
        "response",
      ]);

    const deduction =
      firstNumber(object, [
        "deduction",
        "deductionAmount",
        "amount",
        "priceDeduction",
        "deductedAmount",
      ]);

    if (
      question &&
      answerValue !== undefined
    ) {
      result.push({
        section,

        question,

        answer:
          stringifyAnswer(
            answerValue,
          ),

        deduction:
          Math.max(
            0,
            deduction ?? 0,
          ),
      });
    }

    for (
      const [
        key,
        child,
      ] of Object.entries(
        object,
      )
    ) {
      if (
        [
          "answer",
          "answerText",
          "selectedAnswer",
          "selectedOption",
          "value",
          "response",
        ].includes(key)
      ) {
        continue;
      }

      if (
        child &&
        typeof child ===
          "object"
      ) {
        walk(
          child,
          section,
        );
      }
    }
  }

  walk(value);

  return result;
}

function firstText(
  object: Record<
    string,
    unknown
  >,
  keys: string[],
) {
  for (const key of keys) {
    const value =
      object[key];

    if (
      typeof value ===
        "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return "";
}

function firstValue(
  object: Record<
    string,
    unknown
  >,
  keys: string[],
) {
  for (const key of keys) {
    if (
      Object.prototype.hasOwnProperty.call(
        object,
        key,
      )
    ) {
      return object[key];
    }
  }

  return undefined;
}

function firstNumber(
  object: Record<
    string,
    unknown
  >,
  keys: string[],
) {
  for (const key of keys) {
    const raw =
      object[key];

    const value =
      Number(raw);

    if (
      raw !== null &&
      raw !== "" &&
      Number.isFinite(value)
    ) {
      return value;
    }
  }

  return undefined;
}

function stringifyAnswer(
  value: unknown,
): string {
  if (
    typeof value === "string"
  ) {
    return value;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value
      .map(stringifyAnswer)
      .join(", ");
  }

  if (
    value &&
    typeof value === "object"
  ) {
    const object =
      value as Record<
        string,
        unknown
      >;

    return (
      firstText(object, [
        "label",
        "text",
        "name",
        "value",
      ]) ||
      JSON.stringify(value)
    );
  }

  return "—";
}