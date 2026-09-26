'use client';

import {
  use,
  useEffect,
  useState,
} from 'react';

import {
  useRouter,
} from 'next/navigation';

import AgentSidebar from '@/components/agent-sidebar';

import {
  ApiError,
  getAgentOrder,
  sendOrderVerification,
  startOrderInspection,
  verifyOrderVerification,
  type AgentOrderDetailResponse,
} from '@/lib/agent-api';

import './order-details.css';

type PageProps = {
  params: Promise<{
    orderNumber: string;
  }>;
};

type DeviceVariant = {
  memory: string;
  details: string;
};

type VerificationStep =
  | 'DESTINATION'
  | 'OTP'
  | 'SUCCESS';

type VerificationMethod =
  | 'MOBILE'
  | 'EMAIL';

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

function formatDateTime(
  value: string,
) {
  return new Intl.DateTimeFormat(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
        part.charAt(0).toUpperCase() +
        part.slice(1),
    )
    .join(' ');
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
    /(?:GB|TB)$/i.test(clean)
  ) {
    return clean;
  }

  return `${clean} GB`;
}

function formatVariant(
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
      ...rest
    ] = parts;

    return {
      memory:
        `${normalizeMemory(
          ram,
        )} / ${normalizeMemory(
          storage,
        )}`,

      details: [
        battery,
        color,
        ...rest,
      ]
        .filter(Boolean)
        .join(' • '),
    };
  }

  return {
    memory:
      value.trim() ||
      'Variant unavailable',

    details: '',
  };
}

function buildAddress(
  order:
    AgentOrderDetailResponse,
) {
  const address =
    order.address;

  if (!address) {
    return 'Address unavailable';
  }

  return [
    address.house,
    address.street,
    address.locality,
    address.landmark,
    address.city,
    address.state,
    address.pincode,
  ]
    .map(
      (part) =>
        part?.trim(),
    )
    .filter(Boolean)
    .join(', ');
}

function getAction(
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
        label: 'Order Cancelled',
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

export default function AgentOrderDetailPage({
  params,
}: PageProps) {
  const router =
    useRouter();

  const {
    orderNumber,
  } = use(params);

  const [
    order,
    setOrder,
  ] =
    useState<AgentOrderDetailResponse | null>(
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

  const [
    verificationOpen,
    setVerificationOpen,
  ] =
    useState(false);

  const [
    verificationStep,
    setVerificationStep,
  ] =
    useState<VerificationStep>(
      'DESTINATION',
    );

  const [
    verificationMethod,
    setVerificationMethod,
  ] =
    useState<VerificationMethod>(
      'MOBILE',
    );

  const [
    destination,
    setDestination,
  ] =
    useState('');

  const [
    challengeId,
    setChallengeId,
  ] =
    useState('');

  const [
    maskedDestination,
    setMaskedDestination,
  ] =
    useState('');

  const [
    otp,
    setOtp,
  ] =
    useState('');

  const [
    verificationError,
    setVerificationError,
  ] =
    useState('');

  const [
    verificationBusy,
    setVerificationBusy,
  ] =
    useState(false);

  const [
    resendSeconds,
    setResendSeconds,
  ] =
    useState(0);

  useEffect(() => {
    let cancelled =
      false;

    async function fetchOrder() {
      try {
        const response =
          await getAgentOrder(
            orderNumber,
          );

        if (cancelled) {
          return;
        }

        setOrder(response);
        setError('');
      } catch (err) {
        if (cancelled) {
          return;
        }

        if (
          err instanceof ApiError &&
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
            : 'Unable to load order.',
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchOrder();

    return () => {
      cancelled = true;
    };
  }, [
    orderNumber,
    router,
  ]);

  useEffect(() => {
    if (
      resendSeconds <= 0
    ) {
      return;
    }

    const timer =
      window.setInterval(
        () => {
          setResendSeconds(
            (current) =>
              Math.max(
                0,
                current - 1,
              ),
          );
        },
        1000,
      );

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, [
    resendSeconds,
  ]);

  function handleApiError(
    err: unknown,
    fallback: string,
  ) {
    if (
      err instanceof ApiError &&
      err.status === 401
    ) {
      router.replace(
        '/login',
      );

      return;
    }

    setVerificationError(
      err instanceof Error
        ? err.message
        : fallback,
    );
  }

  function resetVerification() {
    setVerificationStep(
      'DESTINATION',
    );

    setVerificationMethod(
      'MOBILE',
    );

    setDestination(
      order?.customer?.phone ??
        order?.address?.phone ??
        '',
    );

    setChallengeId('');
    setMaskedDestination('');
    setOtp('');
    setVerificationError('');
    setVerificationBusy(false);
    setResendSeconds(0);
  }

  function openVerification() {
    resetVerification();

    setVerificationOpen(
      true,
    );
  }

  function closeVerification() {
    if (
      verificationBusy
    ) {
      return;
    }

    setVerificationOpen(
      false,
    );

    resetVerification();
  }

  function selectVerificationMethod(
    method:
      VerificationMethod,
  ) {
    if (
      verificationBusy
    ) {
      return;
    }

    setVerificationMethod(
      method,
    );

    setVerificationError('');
    setChallengeId('');
    setMaskedDestination('');
    setOtp('');
    setResendSeconds(0);

    if (
      method === 'MOBILE'
    ) {
      setDestination(
        order?.customer
          ?.phone ??
          order?.address
            ?.phone ??
          '',
      );

      return;
    }

    setDestination(
  order?.customer?.email ??
    order?.address?.email ??
    '',
);
  }

  async function sendOtp() {
    const cleanDestination =
      destination.trim();

    if (!cleanDestination) {
      setVerificationError(
        verificationMethod ===
        'MOBILE'
          ? 'Enter the customer mobile number.'
          : 'Enter the customer email address.',
      );

      return;
    }

    setVerificationBusy(
      true,
    );

    setVerificationError('');

    try {
      const response =
        await sendOrderVerification(
          orderNumber,
          {
            destination:
              cleanDestination,

            purpose:
              'INSPECTION_START',
          },
        );

      setChallengeId(
        response.challengeId,
      );

      setMaskedDestination(
        response.destinationMasked,
      );

      setOtp('');

      setVerificationStep(
        'OTP',
      );

      setResendSeconds(
        60,
      );
    } catch (err) {
      handleApiError(
        err,
        'Unable to send OTP.',
      );
    } finally {
      setVerificationBusy(
        false,
      );
    }
  }

  async function resendOtp() {
    if (
      verificationBusy ||
      resendSeconds > 0
    ) {
      return;
    }

    await sendOtp();
  }

  async function verifyAndStartInspection() {
    const cleanOtp =
      otp
        .replace(
          /\D/g,
          '',
        )
        .trim();

    if (
      !challengeId
    ) {
      setVerificationError(
        'Verification session is missing. Request a new OTP.',
      );

      setVerificationStep(
        'DESTINATION',
      );

      return;
    }

    if (
      !/^\d{4,9}$/.test(
        cleanOtp,
      )
    ) {
      setVerificationError(
        'Enter a valid OTP.',
      );

      return;
    }

    setVerificationBusy(
      true,
    );

    setVerificationError('');

    try {
      const verification =
        await verifyOrderVerification(
          orderNumber,
          {
            challengeId,
            otp:
              cleanOtp,
          },
        );

      if (
        !verification.verified
      ) {
        throw new Error(
          'Customer verification failed.',
        );
      }

      const inspection =
        await startOrderInspection(
          orderNumber,
          challengeId,
        );

      if (
  !inspection.started
) {
  throw new Error(
    'Unable to start inspection.',
  );
}

const refreshedOrder =
  await getAgentOrder(
    orderNumber,
  );

setOrder(
  refreshedOrder,
);

setOtp('');

router.push(
  `/orders/${encodeURIComponent(
    orderNumber,
  )}/inspection`,
);
    } catch (err) {
      handleApiError(
        err,
        'Unable to verify customer.',
      );
    } finally {
      setVerificationBusy(
        false,
      );
    }
  }

  function proceed(
    currentOrder:
      AgentOrderDetailResponse,
  ) {
    const currentAction =
      getAction(
        currentOrder.status,
      );

    if (
      currentAction.disabled ||
      currentAction.mode ===
        'view'
    ) {
      return;
    }

    if (
      currentAction.mode ===
        'quote'
    ) {
      openVerification();

      return;
    }

    /*
     * Questionnaire / quote route
     * will be connected in the
     * next feature task.
     *
     * Do not navigate to the
     * nonexistent /quote route.
     */
    if (
  currentAction.mode ===
    'inspection'
) {
  router.push(
    `/orders/${encodeURIComponent(
      currentOrder.orderNumber,
    )}/inspection`,
  );

  return;
}

   if (
  currentAction.mode ===
    'review'
) {
  router.push(
    `/orders/${encodeURIComponent(
      currentOrder.orderNumber,
    )}/quote`,
  );

  return;
}

    if (
      currentAction.mode ===
        'complete'
    ) {
      return;
    }
  }

  function openDirections(
    currentOrder:
      AgentOrderDetailResponse,
  ) {
    const address =
      currentOrder.address;

    if (!address) {
      return;
    }

    const addressText = [
      address.house,
      address.street,
      address.locality,
      address.landmark,
      address.city,
      address.state,
      address.pincode,
    ]
      .map(
        (part) =>
          part?.trim(),
      )
      .filter(Boolean)
      .join(', ');

    const query =
      encodeURIComponent(
        addressText,
      );

    window.open(
      `https://www.google.com/maps/search/?api=1&query=${query}`,
      '_blank',
      'noopener,noreferrer',
    );
  }

  if (loading) {
    return (
      <div className="detail-state-page">
        <div className="detail-state-card">
          <div className="detail-state-logo">
            C
          </div>

          <strong>
            Loading order
          </strong>

          <span>
            Getting pickup details...
          </span>
        </div>
      </div>
    );
  }

  if (
    error ||
    !order
  ) {
    return (
      <div className="detail-state-page">
        <div className="detail-state-card">
          <div className="detail-error-icon">
            !
          </div>

          <strong>
            Unable to open order
          </strong>

          <span>
            {error ||
              'Order not found.'}
          </span>

          <button
            type="button"
            onClick={() =>
              router.replace(
                '/orders',
              )
            }
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  const variant =
    formatVariant(
      order.product.variant,
    );

  const fullAddress =
    buildAddress(order);

  const action =
    getAction(
      order.status,
    );

  return (
    <div className="detail-shell">
      <AgentSidebar
        open={sidebarOpen}
        onClose={() =>
          setSidebarOpen(
            false,
          )
        }
      />

      <main className="detail-main">
        <header className="detail-topbar">
          <div className="detail-topbar-left">
            <button
              type="button"
              className="detail-menu"
              aria-label="Open menu"
              onClick={() =>
                setSidebarOpen(
                  true,
                )
              }
            >
              ☰
            </button>

            <button
              type="button"
              className="detail-back"
              aria-label="Back to orders"
              onClick={() =>
                router.push(
                  '/orders',
                )
              }
            >
              ←
            </button>

            <div>
              <h1>
                Order Details
              </h1>

              <p>
                {order.orderNumber}
              </p>
            </div>
          </div>

          <span className="detail-status">
            {formatStatus(
              order.status,
            )}
          </span>
        </header>

        <div className="detail-content">
          <section className="detail-summary">
            <div>
              <span className="detail-eyebrow">
                FIELD PICKUP
              </span>

              <h2>
                {order.product.name}
              </h2>

              <p>
                Review customer,
                device and pickup
                information before
                proceeding.
              </p>
            </div>

            <div className="detail-quote">
              <span>
                Current Quote
              </span>

              <strong>
                {formatMoney(
                  order.pricing
                    .finalPrice,
                )}
              </strong>
            </div>
          </section>

          <section className="detail-device-card">
            <div className="detail-section-heading">
              <div>
                <span>
                  DEVICE
                </span>

                <h3>
                  Device Information
                </h3>
              </div>
            </div>

            <div className="detail-device-grid">
              <div>
                <span>
                  Device Name
                </span>

                <strong>
                  {order.product.name}
                </strong>
              </div>

              <div>
                <span>
                  RAM / ROM
                </span>

                <strong className="detail-memory">
                  {variant.memory}
                </strong>
              </div>

              {variant.details && (
                <div>
                  <span>
                    Device Details
                  </span>

                  <strong>
                    {variant.details}
                  </strong>
                </div>
              )}
            </div>
          </section>

          <div className="detail-two-column">
            <section className="detail-card">
              <div className="detail-section-heading">
                <div>
                  <span>
                    CUSTOMER
                  </span>

                  <h3>
                    Customer
                    Information
                  </h3>
                </div>
              </div>

              <div className="detail-customer-row">
                <div>
                  <span>
                    Name
                  </span>

                  <strong>
                    {order.customer
                      ?.name ??
                      'Customer'}
                  </strong>
                </div>

                <div>
                  <span>
                    Mobile
                  </span>

                  {order.customer
                    ?.phone ? (
                    <a
                      href={`tel:${order.customer.phone}`}
                    >
                      {
                        order
                          .customer
                          .phone
                      }
                    </a>
                  ) : (
                    <strong>
                      —
                    </strong>
                  )}
                </div>
              </div>

              {order.customer
                ?.phone && (
                <a
                  className="detail-call-button"
                  href={`tel:${order.customer.phone}`}
                >
                  ☎ Call Customer
                </a>
              )}
            </section>

            <section className="detail-card">
              <div className="detail-section-heading">
                <div>
                  <span>
                    PICKUP
                  </span>

                  <h3>
                    Pickup Schedule
                  </h3>
                </div>
              </div>

              <div className="detail-pickup-grid">
                <div>
                  <span>
                    Date
                  </span>

                  <strong>
                    {formatDate(
                      order.pickup
                        .date,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Time Slot
                  </span>

                  <strong>
                    {
                      order.pickup
                        .slot.label
                    }
                  </strong>
                </div>
              </div>
            </section>
          </div>

          <section className="detail-card detail-address-card">
            <div className="detail-section-heading detail-address-heading">
              <div>
                <span>
                  LOCATION
                </span>

                <h3>
                  Pickup Address
                </h3>
              </div>

              {order.address && (
                <button
                  type="button"
                  onClick={() =>
                    openDirections(
                      order,
                    )
                  }
                >
                  Get Directions ↗
                </button>
              )}
            </div>

            <div className="detail-full-address">
              {fullAddress}
            </div>
          </section>

          <section className="detail-card">
            <div className="detail-section-heading">
              <div>
                <span>
                  QUOTE
                </span>

                <h3>
                  Current Pricing
                </h3>
              </div>
            </div>

            <div className="detail-price-grid">
              <div>
                <span>
                  Base Price
                </span>

                <strong>
                  {formatMoney(
                    order.pricing
                      .basePrice,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Existing Deduction
                </span>

                <strong>
                  {formatMoney(
                    order.pricing
                      .totalDeduction,
                  )}
                </strong>
              </div>

              <div className="detail-final-price">
                <span>
                  Current Quote
                </span>

                <strong>
                  {formatMoney(
                    order.pricing
                      .finalPrice,
                  )}
                </strong>
              </div>
            </div>

            <p className="detail-pricing-note">
              Inspection pricing is
              calculated by the server.
              The agent cannot manually
              change the authoritative
              deduction or final price
              from this screen.
            </p>
          </section>

          {order.statusHistory
            .length > 0 && (
            <section className="detail-card">
              <div className="detail-section-heading">
                <div>
                  <span>
                    HISTORY
                  </span>

                  <h3>
                    Order Activity
                  </h3>
                </div>
              </div>

              <div className="detail-history">
                {order.statusHistory.map(
                  (history) => (
                    <div
                      className="detail-history-item"
                      key={
                        history.id
                      }
                    >
                      <div className="history-dot" />

                      <div>
                        <strong>
                          {formatStatus(
                            history.status,
                          )}
                        </strong>

                        {history.note && (
                          <p>
                            {
                              history.note
                            }
                          </p>
                        )}

                        <span>
                          {formatDateTime(
                            history.createdAt,
                          )}
                        </span>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </section>
          )}

          <section className="detail-action-bar">
            <div>
              <span>
                Order Status
              </span>

              <strong>
                {formatStatus(
                  order.status,
                )}
              </strong>
            </div>

            <button
              type="button"
              disabled={
                action.disabled ||
                action.mode ===
                  'view'
              }
              onClick={() =>
                proceed(order)
              }
            >
              {action.label}

              {!action.disabled &&
                action.mode !==
                  'view' && (
                  <span>
                    →
                  </span>
                )}
            </button>
          </section>
        </div>
      </main>

      {verificationOpen && (
        <div
          className="detail-verification-overlay"
          role="presentation"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeVerification();
            }
          }}
        >
          <section
            className="detail-verification-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="verification-title"
          >
            {verificationStep !==
              'SUCCESS' && (
              <div className="detail-verification-header">
                <div>
                  <span>
                    CUSTOMER
                    VERIFICATION
                  </span>

                  <h2 id="verification-title">
                    {verificationStep ===
                    'DESTINATION'
                      ? 'Verify before inspection'
                      : 'Enter customer OTP'}
                  </h2>

                  <p>
                    Order{' '}
                    {
                      order.orderNumber
                    }
                  </p>
                </div>

                <button
                  type="button"
                  className="detail-verification-close"
                  aria-label="Close verification"
                  disabled={
                    verificationBusy
                  }
                  onClick={
                    closeVerification
                  }
                >
                  ×
                </button>
              </div>
            )}

            {verificationStep ===
              'DESTINATION' && (
              <>
                <div className="detail-verification-info">
                  <strong>
                    Customer approval
                    required
                  </strong>

                  <p>
                    Send an OTP to the
                    customer&apos;s
                    registered mobile
                    number or email
                    before starting the
                    device inspection.
                  </p>
                </div>

                <div className="detail-verification-methods">
                  <button
                    type="button"
                    className={
                      verificationMethod ===
                      'MOBILE'
                        ? 'active'
                        : ''
                    }
                    disabled={
                      verificationBusy
                    }
                    onClick={() =>
                      selectVerificationMethod(
                        'MOBILE',
                      )
                    }
                  >
                    <span>
                      SMS
                    </span>

                    <strong>
                      Mobile
                    </strong>
                  </button>

                  <button
                    type="button"
                    className={
                      verificationMethod ===
                      'EMAIL'
                        ? 'active'
                        : ''
                    }
                    disabled={
                      verificationBusy
                    }
                    onClick={() =>
                      selectVerificationMethod(
                        'EMAIL',
                      )
                    }
                  >
                    <span>
                      EMAIL
                    </span>

                    <strong>
                      Email
                    </strong>
                  </button>
                </div>

                <label className="detail-verification-field">
                  <span>
                    {verificationMethod ===
                    'MOBILE'
                      ? 'Customer mobile number'
                      : 'Customer email address'}
                  </span>

                  <input
                    type={
                      verificationMethod ===
                      'EMAIL'
                        ? 'email'
                        : 'tel'
                    }
                    autoComplete="off"
                    value={
                      destination
                    }
                    disabled={
                      verificationBusy
                    }
                    placeholder={
                      verificationMethod ===
                      'EMAIL'
                        ? 'customer@example.com'
                        : 'Enter mobile number'
                    }
                    onChange={(
                      event,
                    ) => {
                      setDestination(
                        event.target
                          .value,
                      );

                      setVerificationError(
                        '',
                      );
                    }}
                    onKeyDown={(
                      event,
                    ) => {
                      if (
                        event.key ===
                        'Enter'
                      ) {
                        event.preventDefault();

                        void sendOtp();
                      }
                    }}
                  />
                </label>

                <p className="detail-verification-security">
                  The entered contact
                  must match the
                  customer contact
                  registered against
                  this order.
                </p>

                {verificationError && (
                  <div
                    className="detail-verification-error"
                    role="alert"
                  >
                    {
                      verificationError
                    }
                  </div>
                )}

                <div className="detail-verification-actions">
                  <button
                    type="button"
                    className="secondary"
                    disabled={
                      verificationBusy
                    }
                    onClick={
                      closeVerification
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="primary"
                    disabled={
                      verificationBusy ||
                      !destination.trim()
                    }
                    onClick={() =>
                      void sendOtp()
                    }
                  >
                    {verificationBusy
                      ? 'Sending...'
                      : 'Send OTP'}
                  </button>
                </div>
              </>
            )}

            {verificationStep ===
              'OTP' && (
              <>
                <div className="detail-verification-info">
                  <strong>
                    OTP sent
                  </strong>

                  <p>
                    Enter the OTP sent
                    to{' '}
                    <b>
                      {
                        maskedDestination
                      }
                    </b>
                    .
                  </p>
                </div>

                <label className="detail-verification-field detail-otp-field">
                  <span>
                    Customer OTP
                  </span>

                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={9}
                    autoFocus
                    value={otp}
                    disabled={
                      verificationBusy
                    }
                    placeholder="Enter OTP"
                    onChange={(
                      event,
                    ) => {
                      setOtp(
                        event.target
                          .value
                          .replace(
                            /\D/g,
                            '',
                          )
                          .slice(
                            0,
                            9,
                          ),
                      );

                      setVerificationError(
                        '',
                      );
                    }}
                    onKeyDown={(
                      event,
                    ) => {
                      if (
                        event.key ===
                        'Enter'
                      ) {
                        event.preventDefault();

                        void verifyAndStartInspection();
                      }
                    }}
                  />
                </label>

                <div className="detail-verification-resend">
                  {resendSeconds >
                  0 ? (
                    <span>
                      Resend OTP in{' '}
                      {
                        resendSeconds
                      }
                      s
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={
                        verificationBusy
                      }
                      onClick={() =>
                        void resendOtp()
                      }
                    >
                      Resend OTP
                    </button>
                  )}
                </div>

                {verificationError && (
                  <div
                    className="detail-verification-error"
                    role="alert"
                  >
                    {
                      verificationError
                    }
                  </div>
                )}

                <div className="detail-verification-actions">
                  <button
                    type="button"
                    className="secondary"
                    disabled={
                      verificationBusy
                    }
                    onClick={() => {
                      setVerificationStep(
                        'DESTINATION',
                      );

                      setOtp('');
                      setChallengeId(
                        '',
                      );

                      setMaskedDestination(
                        '',
                      );

                      setVerificationError(
                        '',
                      );

                      setResendSeconds(
                        0,
                      );
                    }}
                  >
                    Back
                  </button>

                  <button
                    type="button"
                    className="primary"
                    disabled={
                      verificationBusy ||
                      otp.length < 4
                    }
                    onClick={() =>
                      void verifyAndStartInspection()
                    }
                  >
                    {verificationBusy
                      ? 'Verifying...'
                      : 'Verify & Start'}
                  </button>
                </div>
              </>
            )}

            {verificationStep ===
              'SUCCESS' && (
              <div className="detail-verification-success">
                <div className="detail-verification-success-icon">
                  ✓
                </div>

                <span>
                  VERIFIED
                </span>

                <h2 id="verification-title">
                  Inspection Started
                </h2>

                <p>
                  Customer verification
                  is complete and the
                  inspection session has
                  been started securely.
                </p>

                <div className="detail-verification-success-order">
                  <span>
                    Order
                  </span>

                  <strong>
                    {
                      order.orderNumber
                    }
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setVerificationOpen(
                      false,
                    );

                    resetVerification();
                  }}
                >
                  Continue
                </button>

                <small>
                  Device questionnaire
                  will be connected in
                  the next workflow
                  step.
                </small>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}