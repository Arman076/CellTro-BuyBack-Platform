'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useRouter,
} from 'next/navigation';

import AgentSidebar from '@/components/agent-sidebar';

import {
  ApiError,
  DashboardRange,
  getAgentDashboard,
  type AgentDashboardResponse,
  type DashboardPickup,
} from '@/lib/agent-api';

import './dashboard.css';

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
  ).format(
    new Date(value),
  );
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

function statusClass(
  value: string,
) {
  switch (value) {
    case 'COMPLETED':
      return 'status-completed';

    case 'PICKUP_STARTED':
    case 'INSPECTION_COMPLETED':
    case 'PAYMENT_COMPLETED':
      return 'status-process';

    case 'PICKUP_CONFIRMED':
      return 'status-confirmed';

    default:
      return 'status-pending';
  }
}

function locationText(
  pickup: DashboardPickup,
) {
  if (!pickup.address) {
    return 'Address unavailable';
  }

  return [
    pickup.address.locality,
    pickup.address.city,
    pickup.address.pincode,
  ]
    .filter(Boolean)
    .join(', ');
}

type DeviceVariantDisplay = {
  memory: string;
  details: string;
};

function formatDeviceVariant(
  variant: string,
): DeviceVariantDisplay {
  const cleanVariant =
    variant.trim();

  if (!cleanVariant) {
    return {
      memory: 'Variant unavailable',
      details: '',
    };
  }

  const parts =
    cleanVariant
      .split('/')
      .map(
        (part) =>
          part.trim(),
      )
      .filter(Boolean);

  /*
   * Current catalogue variant example:
   *
   * 4000mAh / BLACK / 16 / 256
   *
   * Display:
   *
   * 16 GB / 256 GB
   * 4000mAh • BLACK
   *
   * This is presentation-only formatting.
   * No pricing/business calculation happens here.
   */
  if (parts.length >= 4) {
    const battery =
      parts[0];

    const color =
      parts[1];

    const ram =
      parts[2];

    const storage =
      parts[3];

    const ramText =
      /\b(gb|tb)\b/i.test(
        ram,
      )
        ? ram
        : `${ram} GB`;

    const storageText =
      /\b(gb|tb)\b/i.test(
        storage,
      )
        ? storage
        : `${storage} GB`;

    const remainingDetails =
      [
        battery,
        color,
        ...parts.slice(4),
      ]
        .filter(Boolean)
        .join(' • ');

    return {
      memory:
        `${ramText} / ${storageText}`,
      details:
        remainingDetails,
    };
  }

  /*
   * Safe fallback:
   * If catalogue variant format changes,
   * don't guess RAM/storage.
   * Show original value instead.
   */
  return {
    memory:
      cleanVariant,
    details: '',
  };
}

export default function DashboardPage() {
  const router =
    useRouter();

  const [
    dashboard,
    setDashboard,
  ] =
    useState<AgentDashboardResponse | null>(
      null,
    );

  const [
    range,
    setRange,
  ] =
    useState<DashboardRange>(
      'TODAY',
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

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

  const loadDashboard =
    useCallback(
      async (
        background = false,
      ) => {
        try {
          if (background) {
            setRefreshing(
              true,
            );
          } else {
            setLoading(
              true,
            );
          }

          setError('');

          const data =
            await getAgentDashboard(
              range,
            );

          setDashboard(
            data,
          );
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
              : 'Unable to load dashboard.',
          );
        } finally {
          setLoading(
            false,
          );

          setRefreshing(
            false,
          );
        }
      },
      [
        range,
        router,
      ],
    );

  useEffect(() => {
    let cancelled = false;

    const fetchDashboard =
      async () => {
        try {
          const data =
            await getAgentDashboard(
              range,
            );

          if (cancelled) {
            return;
          }

          setDashboard(
            data,
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
            err instanceof Error
              ? err.message
              : 'Unable to load dashboard.',
          );
        } finally {
          if (!cancelled) {
            setLoading(
              false,
            );
          }
        }
      };

    void fetchDashboard();

    return () => {
      cancelled = true;
    };
  }, [
    range,
    router,
  ]);

  const cards =
    useMemo(() => {
      if (!dashboard) {
        return [];
      }

      return [
        {
          key: 'assigned',
          title:
            'Active Assigned',

          value:
            dashboard.summary
              .assigned,

          caption:
            'Open assignments',

          symbol: 'A',

          className:
            'kpi-blue',
        },

        {
          key: 'pickups',
          title: 'Pickups',

          value:
            dashboard.summary
              .pickups,

          caption:
            dashboard.filter
              .label,

          symbol: 'P',

          className:
            'kpi-violet',
        },

        {
          key: 'pending',
          title: 'Pending',

          value:
            dashboard.summary
              .pending,

          caption:
            'Needs action',

          symbol: '!',

          className:
            'kpi-orange',
        },

        {
          key: 'completed',
          title:
            'Completed',

          value:
            dashboard.summary
              .completed,

          caption:
            'Deals completed',

          symbol: '✓',

          className:
            'kpi-green',
        },

        {
          key: 'value',
          title:
            'Deal Value',

          value:
            formatMoney(
              dashboard.summary
                .dealValue,
            ),

          caption:
            'Completed order value',

          symbol: '₹',

          className:
            'kpi-cyan',
        },
      ];
    }, [
      dashboard,
    ]);

  if (
    loading &&
    !dashboard
  ) {
    return (
      <main className="dashboard-state-page">
        <div className="dashboard-loading-card">
          <div className="state-logo">
            C
          </div>

          <strong>
            Loading dashboard
          </strong>

          <span>
            Fetching your
            assignments...
          </span>
        </div>
      </main>
    );
  }

  if (!dashboard) {
    return (
      <main className="dashboard-state-page">
        <div className="dashboard-error-card">
          <div className="error-icon">
            !
          </div>

          <h1>
            Unable to load dashboard
          </h1>

          <p>
            {error}
          </p>

          <button
            type="button"
            className="primary-action"
            onClick={() =>
              void loadDashboard()
            }
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="agent-dashboard-shell">
      <AgentSidebar
        agentName={
          dashboard.agent
            .fullName
        }
        agentCode={
          dashboard.agent
            .agentCode
        }
        open={
          sidebarOpen
        }
        onClose={() =>
          setSidebarOpen(
            false,
          )
        }
      />

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="dashboard-heading">
            <button
              type="button"
              className="mobile-menu-button"
              aria-label="Open navigation"
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
                Dashboard
              </h1>

              <p>
                Your field operations
                at a glance
              </p>
            </div>
          </div>

          <div className="dashboard-top-actions">
            <div className="top-filter">
              <span className="top-filter-label">
                View
              </span>

              <select
                aria-label="Dashboard date filter"
                value={
                  range
                }
                onChange={(
                  event,
                ) =>
                  setRange(
                    event
                      .target
                      .value as DashboardRange,
                  )
                }
              >
                <option value="TODAY">
                  Today
                </option>

                <option value="TOMORROW">
                  Tomorrow
                </option>

                <option value="YESTERDAY">
                  Yesterday
                </option>

                <option value="ALL">
                  All Days
                </option>

                <option value="LAST_7_DAYS">
                  Last 7 Days
                </option>

                <option value="LAST_30_DAYS">
                  Last 30 Days
                </option>
              </select>
            </div>

            <button
              type="button"
              className="refresh-action"
              disabled={
                refreshing
              }
              onClick={() =>
                void loadDashboard(
                  true,
                )
              }
            >
              <span
                className={
                  refreshing
                    ? 'spinning'
                    : ''
                }
              >
                ↻
              </span>

              <span className="refresh-label">
                {refreshing
                  ? 'Refreshing'
                  : 'Refresh'}
              </span>
            </button>
          </div>
        </header>

        <div className="dashboard-body">
          <section className="welcome-card">
            <div>
              <span className="welcome-tag">
                AGENT WORKSPACE
              </span>

              <h2>
                Good to see you,{' '}
                {dashboard.agent
                  .fullName
                  .split(' ')[0]}
              </h2>

              <p>
                Manage assigned
                pickups and keep
                every customer visit
                on track.
              </p>
            </div>

            <div className="vendor-summary">
              <span>
                WORKING WITH
              </span>

              <strong>
                {
                  dashboard.vendor
                    .businessName
                }
              </strong>

              <small>
                {
                  dashboard.vendor
                    .vendorCode
                }
              </small>
            </div>
          </section>

          <section className="kpi-grid">
            {cards.map(
              (card) => (
                <article
                  key={
                    card.key
                  }
                  className={`kpi-card ${card.className}`}
                >
                  <div className="kpi-accent" />

                  <div className="kpi-card-top">
                    <div className="kpi-symbol">
                      {
                        card.symbol
                      }
                    </div>

                    <span className="kpi-period">
                      {
                        dashboard
                          .filter
                          .label
                      }
                    </span>
                  </div>

                  <div className="kpi-number">
                    {
                      card.value
                    }
                  </div>

                  <strong className="kpi-name">
                    {
                      card.title
                    }
                  </strong>

                  <span className="kpi-caption">
                    {
                      card.caption
                    }
                  </span>
                </article>
              ),
            )}
          </section>

          <section className="operations-card">
            <div className="operations-header">
              <div>
                <span className="section-label">
                  FIELD OPERATIONS
                </span>

                <h2>
                  Pickup Schedule
                </h2>

                <p>
                  {
                    dashboard.filter
                      .label
                  }{' '}
                  assignments
                </p>
              </div>

              <button
                type="button"
                className="view-orders-link"
                onClick={() =>
                  router.push(
                    '/orders',
                  )
                }
              >
                View all orders
                <span>
                  →
                </span>
              </button>
            </div>

            {error && (
              <div className="dashboard-inline-error">
                {
                  error
                }
              </div>
            )}

            <div className="schedule-summary">
              <strong>
                {
                  dashboard.pickups
                    .length
                }{' '}
                pickup
                {dashboard.pickups
                  .length === 1
                  ? ''
                  : 's'}
              </strong>

              <span>
                {
                  dashboard.filter
                    .label
                }
              </span>
            </div>

            {dashboard.pickups
              .length === 0 ? (
              <div className="empty-schedule">
                <div className="empty-check">
                  ✓
                </div>

                <h3>
                  No pickups found
                </h3>

                <p>
                  No assigned pickups
                  for{' '}
                  {
                    dashboard.filter
                      .label
                  }
                  .
                </p>
              </div>
            ) : (
              <div className="schedule-list">
                {dashboard.pickups.map(
                  (pickup) => {
                    const deviceVariant =
                      formatDeviceVariant(
                        pickup.product
                          .variant,
                      );

                    return (
                      <article
                        key={
                          pickup.orderId
                        }
                        className="schedule-row"
                      >
                       <div className="schedule-product">
  <div className="device-info-box">
    <span className="order-code device-order-code">
      {pickup.orderNumber}
    </span>

    <div className="device-info-row">
      <span className="device-info-label">
        Device Name
      </span>

      <strong className="device-info-value device-name-value">
        {pickup.product.name}
      </strong>
    </div>

    <div className="device-info-row">
      <span className="device-info-label">
        RAM / ROM
      </span>

      <strong className="device-info-value device-memory-value">
        {deviceVariant.memory}
      </strong>
    </div>

    {deviceVariant.details && (
      <div className="device-info-row">
        <span className="device-info-label">
          Details
        </span>

        <span className="device-info-value">
          {deviceVariant.details}
        </span>
      </div>
    )}
  </div>
</div>

                        <div className="schedule-detail">
                          <span>
                            Customer
                          </span>

                          <strong>
                            {pickup.customer
                              ?.name ??
                              'Customer'}
                          </strong>

                          <small>
                            {pickup.customer
                              ?.phone ??
                              '—'}
                          </small>
                        </div>

                        <div className="schedule-detail">
                          <span>
                            Schedule
                          </span>

                          <strong>
                            {formatDate(
                              pickup.pickup
                                .date,
                            )}
                          </strong>

                          <small>
                            {
                              pickup.pickup
                                .slot
                                .label
                            }
                          </small>
                        </div>

                        <div className="schedule-detail location-detail">
                          <span>
                            Location
                          </span>

                          <strong>
                            {pickup.address
                              ?.locality ??
                              '—'}
                          </strong>

                          <small>
                            {locationText(
                              pickup,
                            )}
                          </small>
                        </div>

                        <div className="schedule-detail">
                          <span>
                            Value
                          </span>

                          <strong>
                            {formatMoney(
                              pickup.dealValue,
                            )}
                          </strong>

                          <small
                            className={`status-pill ${statusClass(
                              pickup.status,
                            )}`}
                          >
                            {formatStatus(
                              pickup.status,
                            )}
                          </small>
                        </div>

                        <button
                          type="button"
                          className="order-action"
                          onClick={() =>
                            router.push(
                              `/orders/${pickup.orderNumber}`,
                            )
                          }
                        >
                          View
                          <span>
                            →
                          </span>
                        </button>
                      </article>
                    );
                  },
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      <nav className="mobile-bottom-nav">
        <button
          type="button"
          className="mobile-nav-active"
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