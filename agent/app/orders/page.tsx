'use client';

import {
  Suspense,
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  useRouter,
  useSearchParams,
} from 'next/navigation';

import AgentSidebar from '@/components/agent-sidebar';

import {
  ApiError,
  getAgentOrders,
  type AgentOrderDateFilter,
  type AgentOrderListItem,
  type AgentOrderStatusGroup,
  type AgentOrdersResponse,
} from '@/lib/agent-api';

import './orders.css';

const STATUS_TABS: {
  label: string;
  value: AgentOrderStatusGroup;
}[] = [
  {
    label: 'All Orders',
    value: 'ALL',
  },
  {
    label: 'Pending',
    value: 'PENDING',
  },
  {
    label: 'In Process',
    value: 'IN_PROCESS',
  },
  {
    label: 'Completed',
    value: 'COMPLETED',
  },
];

type DeviceVariant = {
  ramRom: string;
  details: string;
};

function formatMoney(
  value: number,
) {
  return new Intl.NumberFormat(
    'en-IN',
    {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    },
  ).format(value);
}

function formatDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    },
  ).format(new Date(value));
}

function formatStatus(
  value: string,
) {
  return value
    .toLowerCase()
    .split('_')
    .map(
      (part) =>
        part
          .charAt(0)
          .toUpperCase() +
        part.slice(1),
    )
    .join(' ');
}

function getStatusClass(
  value: string,
) {
  if (
    value === 'COMPLETED'
  ) {
    return 'order-status completed';
  }

  if (
    value ===
      'PICKUP_STARTED' ||
    value ===
      'INSPECTION_COMPLETED' ||
    value ===
      'PAYMENT_COMPLETED'
  ) {
    return 'order-status process';
  }

  if (
    value ===
    'PICKUP_CONFIRMED'
  ) {
    return 'order-status confirmed';
  }

  if (
    value === 'CANCELLED'
  ) {
    return 'order-status cancelled';
  }

  return 'order-status pending';
}

function getLocation(
  order: AgentOrderListItem,
) {
  if (!order.address) {
    return 'Address unavailable';
  }

  return [
    order.address.house,
    order.address.street,
    order.address.locality,
    order.address.landmark,
    order.address.city,
    order.address.state,
    order.address.pincode,
  ]
    .map(
      (part) =>
        part?.trim(),
    )
    .filter(Boolean)
    .join(', ');
}

function normalizeMemory(
  value: string,
) {
  const clean =
    value.trim();

  if (!clean) {
    return '';
  }

  if (
    /(?:GB|TB)$/i.test(
      clean,
    )
  ) {
    return clean;
  }

  return `${clean} GB`;
}

function formatDeviceVariant(
  value: string,
): DeviceVariant {
  const parts =
    value
      .split('/')
      .map(
        (part) =>
          part.trim(),
      )
      .filter(Boolean);

  if (
    parts.length >= 4
  ) {
    const [
      battery,
      color,
      ram,
      storage,
      ...extra
    ] = parts;

    return {
      ramRom:
        `${normalizeMemory(
          ram,
        )} / ${normalizeMemory(
          storage,
        )}`,
      details: [
        battery,
        color,
        ...extra,
      ]
        .filter(Boolean)
        .join(' • '),
    };
  }

  if (
    parts.length >= 2
  ) {
    return {
      ramRom:
        parts.join(' / '),
      details: '',
    };
  }

  return {
    ramRom:
      value.trim() ||
      'Variant unavailable',
    details: '',
  };
}

function getPrimaryAction(
  status: string,
) {
  switch (status) {
    case 'PICKUP_REQUESTED':
    case 'PICKUP_CONFIRMED':
      return {
        label: 'Start Quote',
        mode: 'quote',
        disabled: false,
      };

    case 'PICKUP_STARTED':
      return {
        label:
          'Continue Inspection',
        mode: 'inspection',
        disabled: false,
      };

    case 'INSPECTION_COMPLETED':
      return {
        label: 'Review Quote',
        mode: 'review',
        disabled: false,
      };

    case 'PAYMENT_COMPLETED':
      return {
        label: 'Complete Order',
        mode: 'complete',
        disabled: false,
      };

    case 'COMPLETED':
      return {
        label: 'View Deal',
        mode: 'view',
        disabled: false,
      };

    case 'CANCELLED':
      return {
        label: 'Cancelled',
        mode: 'view',
        disabled: true,
      };

    default:
      return {
        label: 'View Order',
        mode: 'view',
        disabled: false,
      };
  }
}

function getInitialStatus(
  value: string | null,
): AgentOrderStatusGroup {
  const normalized =
    (
      value ?? 'ALL'
    ).toUpperCase();

  if (
    normalized ===
      'PENDING' ||
    normalized ===
      'IN_PROCESS' ||
    normalized ===
      'COMPLETED'
  ) {
    return normalized;
  }

  return 'ALL';
}

function OrdersPageContent() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const [
    statusGroup,
    setStatusGroup,
  ] =
    useState<AgentOrderStatusGroup>(
      () =>
        getInitialStatus(
          searchParams.get(
            'statusGroup',
          ),
        ),
    );

  const [
    dateFilter,
    setDateFilter,
  ] =
    useState<AgentOrderDateFilter>(
      'ALL',
    );

  const [
    searchInput,
    setSearchInput,
  ] =
    useState('');

  const [
    search,
    setSearch,
  ] =
    useState('');

  const [
    page,
    setPage,
  ] =
    useState(1);

  const [
    orders,
    setOrders,
  ] =
    useState<AgentOrdersResponse | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState('');

  const [
    sidebarOpen,
    setSidebarOpen,
  ] =
    useState(false);

  /*
   * Important:
   * This function ONLY performs the API request.
   * It does not synchronously call setState.
   *
   * This keeps the React effect clean and fixes:
   * react-hooks/set-state-in-effect
   */
  const requestOrders =
    useCallback(
      () =>
        getAgentOrders({
          search,
          statusGroup,
          dateFilter,
          page,
          limit: 20,
        }),
      [
        search,
        statusGroup,
        dateFilter,
        page,
      ],
    );

  useEffect(() => {
    let cancelled =
      false;

    const fetchOrders =
      async () => {
        try {
          const response =
            await requestOrders();

          if (cancelled) {
            return;
          }

          setOrders(
            response,
          );

          setError('');
        } catch (err) {
          if (cancelled) {
            return;
          }

          if (
            err instanceof
              ApiError &&
            err.status === 401
          ) {
            router.replace(
              '/login',
            );

            return;
          }

          setError(
            err instanceof
              Error
              ? err.message
              : 'Unable to load orders.',
          );
        } finally {
          if (!cancelled) {
            setLoading(
              false,
            );
          }
        }
      };

    void fetchOrders();

    return () => {
      cancelled = true;
    };
  }, [
    requestOrders,
    router,
  ]);

  async function retryOrders() {
    try {
      setLoading(true);
      setError('');

      const response =
        await requestOrders();

      setOrders(response);
    } catch (err) {
      if (
        err instanceof
          ApiError &&
        err.status === 401
      ) {
        router.replace(
          '/login',
        );

        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load orders.',
      );
    } finally {
      setLoading(false);
    }
  }

  function changeStatus(
    value:
      AgentOrderStatusGroup,
  ) {
    if (
      value ===
      statusGroup
    ) {
      return;
    }

    setLoading(true);
    setStatusGroup(value);
    setPage(1);
  }

  function changeDate(
    value:
      AgentOrderDateFilter,
  ) {
    if (
      value ===
      dateFilter
    ) {
      return;
    }

    setLoading(true);
    setDateFilter(value);
    setPage(1);
  }

  function submitSearch(
    event:
      React.FormEvent,
  ) {
    event.preventDefault();

    const normalized =
      searchInput.trim();

    if (
      normalized === search &&
      page === 1
    ) {
      return;
    }

    setLoading(true);
    setPage(1);
    setSearch(normalized);
  }

  function clearSearch() {
    if (
      !searchInput &&
      !search
    ) {
      return;
    }

    setLoading(true);
    setSearchInput('');
    setSearch('');
    setPage(1);
  }

  function goToPage(
    nextPage: number,
  ) {
    if (
      nextPage === page ||
      nextPage < 1
    ) {
      return;
    }

    setLoading(true);
    setPage(nextPage);
  }

  function openOrder(
    orderNumber: string,
  ) {
    router.push(
      `/orders/${encodeURIComponent(
        orderNumber,
      )}`,
    );
  }

  function proceedOrder(
    order:
      AgentOrderListItem,
  ) {
    const action =
      getPrimaryAction(
        order.status,
      );

    if (action.disabled) {
      return;
    }

    const orderUrl =
      `/orders/${encodeURIComponent(
        order.orderNumber,
      )}`;

    if (
      action.mode ===
      'view'
    ) {
      router.push(
        orderUrl,
      );

      return;
    }

    router.push(
      `${orderUrl}?mode=${encodeURIComponent(
        action.mode,
      )}`,
    );
  }

  return (
    <div className="orders-shell">
      <AgentSidebar
        open={sidebarOpen}
        onClose={() =>
          setSidebarOpen(
            false,
          )
        }
      />

      <main className="orders-main">
        <header className="orders-topbar">
          <div className="orders-title-wrap">
            <button
              type="button"
              className="orders-menu"
              aria-label="Open menu"
              onClick={() =>
                setSidebarOpen(
                  true,
                )
              }
            >
              ☰
            </button>

            <div>
              <h1>
                My Orders
              </h1>

              <p>
                Manage your assigned
                customer pickups
              </p>
            </div>
          </div>

          <div className="orders-top-filter">
            <span>
              VIEW
            </span>

            <select
              value={
                dateFilter
              }
              aria-label="Order date filter"
              onChange={(
                event,
              ) =>
                changeDate(
                  event.target
                    .value as AgentOrderDateFilter,
                )
              }
            >
              <option value="ALL">
                All Days
              </option>

              <option value="TODAY">
                Today
              </option>

              <option value="TOMORROW">
                Tomorrow
              </option>

              <option value="YESTERDAY">
                Yesterday
              </option>

              <option value="LAST_7_DAYS">
                Last 7 Days
              </option>

              <option value="LAST_30_DAYS">
                Last 30 Days
              </option>
            </select>
          </div>
        </header>

        <div className="orders-content">
          <section className="orders-intro">
            <div>
              <span className="orders-eyebrow">
                FIELD OPERATIONS
              </span>

              <h2>
                Assigned Orders
              </h2>

              <p>
                Only orders currently
                assigned to your
                account are shown
                here.
              </p>
            </div>

            <div className="orders-count">
              <strong>
                {orders
                  ?.pagination
                  .total ?? 0}
              </strong>

              <span>
                Total Orders
              </span>
            </div>
          </section>

          <section className="orders-toolbar">
            <div className="order-tabs">
              {STATUS_TABS.map(
                (tab) => (
                  <button
                    key={
                      tab.value
                    }
                    type="button"
                    className={
                      statusGroup ===
                      tab.value
                        ? 'order-tab active'
                        : 'order-tab'
                    }
                    onClick={() =>
                      changeStatus(
                        tab.value,
                      )
                    }
                  >
                    {tab.label}
                  </button>
                ),
              )}
            </div>

            <form
              className="orders-search"
              onSubmit={
                submitSearch
              }
            >
              <span className="search-icon">
                ⌕
              </span>

              <input
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
                placeholder="Search order, device, customer..."
                maxLength={100}
              />

              {searchInput && (
                <button
                  type="button"
                  className="search-clear"
                  aria-label="Clear search"
                  onClick={
                    clearSearch
                  }
                >
                  ×
                </button>
              )}

              <button
                type="submit"
                className="search-submit"
              >
                Search
              </button>
            </form>
          </section>

          {error && (
            <div className="orders-error">
              <span>
                !
              </span>

              <div>
                <strong>
                  Unable to load
                  orders
                </strong>

                <p>
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  void retryOrders();
                }}
              >
                Retry
              </button>
            </div>
          )}

          <section className="orders-panel">
            <div className="orders-panel-heading">
              <div>
                <strong>
                  {STATUS_TABS.find(
                    (tab) =>
                      tab.value ===
                      statusGroup,
                  )?.label ??
                    'Orders'}
                </strong>

                <span>
                  {orders
                    ?.pagination
                    .total ??
                    0}{' '}
                  result
                  {(orders
                    ?.pagination
                    .total ??
                    0) === 1
                    ? ''
                    : 's'}
                </span>
              </div>

              {loading && (
                <span className="orders-loading">
                  Refreshing...
                </span>
              )}
            </div>

            {!loading &&
            orders?.data
              .length === 0 ? (
              <div className="orders-empty">
                <div className="orders-empty-icon">
                  ✓
                </div>

                <h3>
                  No orders found
                </h3>

                <p>
                  Try changing the
                  status, date or
                  search filter.
                </p>
              </div>
            ) : (
              <div className="orders-list">
                {orders?.data.map(
                  (order) => {
                    const variant =
                      formatDeviceVariant(
                        order.product
                          .variant,
                      );

                    const action =
                      getPrimaryAction(
                        order.status,
                      );

                    return (
                      <article
                        className="order-card"
                        key={
                          order.id
                        }
                      >
                        <div className="order-card-top">
                          <span className="order-number">
                            {
                              order.orderNumber
                            }
                          </span>

                          <small
                            className={getStatusClass(
                              order.status,
                            )}
                          >
                            {formatStatus(
                              order.status,
                            )}
                          </small>
                        </div>

                        <div className="order-device-box">
                          <span className="order-section-label">
                            DEVICE
                          </span>

                          <div className="device-row">
                            <span>
                              Device Name
                            </span>

                            <strong>
                              {
                                order
                                  .product
                                  .name
                              }
                            </strong>
                          </div>

                          <div className="device-row">
                            <span>
                              RAM / ROM
                            </span>

                            <strong className="device-memory">
                              {
                                variant.ramRom
                              }
                            </strong>
                          </div>

                          {variant.details && (
                            <div className="device-row">
                              <span>
                                Details
                              </span>

                              <strong className="device-details">
                                {
                                  variant.details
                                }
                              </strong>
                            </div>
                          )}
                        </div>

                        <div className="order-customer-box">
                          <span className="order-section-label">
                            CUSTOMER
                          </span>

                          <div className="customer-line">
                            <strong>
                              {order.customer
                                ?.name ??
                                'Customer'}
                            </strong>

                            <a
                              href={
                                order.customer
                                  ?.phone
                                  ? `tel:${order.customer.phone}`
                                  : undefined
                              }
                              className={
                                order.customer
                                  ?.phone
                                  ? 'customer-phone'
                                  : 'customer-phone unavailable'
                              }
                              onClick={(
                                event,
                              ) => {
                                if (
                                  !order
                                    .customer
                                    ?.phone
                                ) {
                                  event.preventDefault();
                                }
                              }}
                            >
                              {order.customer
                                ?.phone ??
                                '—'}
                            </a>
                          </div>
                        </div>

                        <div className="order-meta-grid">
                          <div className="order-meta">
                            <span>
                              Pickup
                            </span>

                            <strong>
                              {formatDate(
                                order
                                  .pickup
                                  .date,
                              )}
                            </strong>

                            <small>
                              {
                                order
                                  .pickup
                                  .slot
                                  .label
                              }
                            </small>
                          </div>

                          <div className="order-meta order-location">
                            <span>
                                Location
                            </span>

                            {/* <strong>
                              {order.address
                                ?.locality ??
                                '—'}
                            </strong> */}

                            <strong>
                            {getLocation(
                                order,
                                )}
                        </strong>
                          </div>

                          <div className="order-meta order-price">
                            <span>
                              Deal Value
                            </span>

                            <strong>
                              {formatMoney(
                                order.dealValue,
                              )}
                            </strong>
                          </div>
                        </div>

                        <div className="order-actions">
                          <button
                            type="button"
                            className="order-secondary-action"
                            onClick={() =>
                              openOrder(
                                order.orderNumber,
                              )
                            }
                          >
                            View Details
                          </button>

                          <button
                            type="button"
                            className="order-primary-action"
                            disabled={
                              action.disabled
                            }
                            onClick={() =>
                              proceedOrder(
                                order,
                              )
                            }
                          >
                            {
                              action.label
                            }

                            {!action.disabled && (
                              <span>
                                →
                              </span>
                            )}
                          </button>
                        </div>
                      </article>
                    );
                  },
                )}
              </div>
            )}

            {orders &&
              orders.pagination
                .totalPages >
                1 && (
                <div className="orders-pagination">
                  <span>
                    Page{' '}
                    {
                      orders
                        .pagination
                        .page
                    }{' '}
                    of{' '}
                    {
                      orders
                        .pagination
                        .totalPages
                    }
                  </span>

                  <div>
                    <button
                      type="button"
                      disabled={
                        page <= 1 ||
                        loading
                      }
                      onClick={() =>
                        goToPage(
                          Math.max(
                            1,
                            page - 1,
                          ),
                        )
                      }
                    >
                      ← Previous
                    </button>

                    <button
                      type="button"
                      disabled={
                        page >=
                          orders
                            .pagination
                            .totalPages ||
                        loading
                      }
                      onClick={() =>
                        goToPage(
                          page + 1,
                        )
                      }
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
          </section>
        </div>
      </main>

      <nav className="orders-mobile-nav">
        <button
          type="button"
          onClick={() =>
            router.push(
              '/dashboard',
            )
          }
        >
          <span>
            ⌂
          </span>
          Home
        </button>

        <button
          type="button"
          className="active"
          onClick={() =>
            router.push(
              '/orders',
            )
          }
        >
          <span>
            ▤
          </span>
          Orders
        </button>

        <button
          type="button"
          onClick={() =>
            router.push(
              '/profile',
            )
          }
        >
          <span>
            ○
          </span>
          Profile
        </button>
      </nav>
    </div>
  );
}

function OrdersPageFallback() {
  return (
    <main className="orders-page-fallback">
      <div className="orders-fallback-card">
        <div className="orders-fallback-logo">
          C
        </div>

        <strong>
          Loading orders
        </strong>

        <span>
          Preparing your assigned
          pickups...
        </span>
      </div>
    </main>
  );
}

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <OrdersPageFallback />
      }
    >
      <OrdersPageContent />
    </Suspense>
  );
}