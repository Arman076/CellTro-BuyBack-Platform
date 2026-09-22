"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import styles from "./VendorApplicationDetailClient.module.css";

type ApplicationStatus =
  | "PENDING"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED";

type VendorApplicationDetail = {
  id: string;

  businessName: string;
  contactName: string;

  email: string;
  mobile: string;

  emailVerifiedAt: string;

  panLast4: string | null;
  aadhaarLast4: string | null;

  status: ApplicationStatus;
  rejectionReason: string | null;

  submittedAt: string;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;

  approvedVendor: {
    id: number;
    vendorCode: string;
    businessName: string;
    contactName: string;
    phone: string;
    email: string | null;
    status: string;
    createdAt: string;

    memberships: Array<{
      user: {
        status: string;
        mustChangePassword: boolean;
        temporaryPasswordExpiresAt:
          | string
          | null;
      };
    }>;
  } | null;
};

type ActionResponse = {
  applicationId?: string;
  status?: string;
  vendorId?: number;
  vendorCode?: string;
  emailSent?: boolean | null;
  temporaryPasswordExpiresAt?: string;
  rejectionReason?: string | null;
  message?: string;
};

type Props = {
  applicationId: string;
};

function formatStatus(
  status: string,
) {
  return status
    .split("_")
    .map(
      (part) =>
        part.charAt(0) +
        part.slice(1).toLowerCase(),
    )
    .join(" ");
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
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
  ).format(date);
}

function maskLast4(
  last4: string | null,
) {
  if (!last4) {
    return "—";
  }

  return `•••• ${last4}`;
}

function getErrorMessage(
  payload: unknown,
  fallback: string,
) {
  if (
    payload &&
    typeof payload === "object" &&
    "message" in payload
  ) {
    const message = (
      payload as {
        message?: unknown;
      }
    ).message;

    if (typeof message === "string") {
      return message;
    }

    if (
      Array.isArray(message) &&
      message.every(
        (item) =>
          typeof item === "string",
      )
    ) {
      return message.join(", ");
    }
  }

  return fallback;
}

export default function VendorApplicationDetailClient({
  applicationId,
}: Props) {
  const [
    application,
    setApplication,
  ] =
    useState<VendorApplicationDetail | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const [
    actionError,
    setActionError,
  ] = useState<string | null>(
    null,
  );

  const [
    successMessage,
    setSuccessMessage,
  ] = useState<string | null>(
    null,
  );

  const [
    actionLoading,
    setActionLoading,
  ] = useState<
    | "approve"
    | "reject"
    | "resend"
    | null
  >(null);

  const [
    approveConfirmOpen,
    setApproveConfirmOpen,
  ] = useState(false);

  const [
    rejectModalOpen,
    setRejectModalOpen,
  ] = useState(false);

  const [
    rejectionReason,
    setRejectionReason,
  ] = useState("");

  const safeApplicationId =
    applicationId.trim();

  const loadApplication =
    useCallback(
      async (
        signal?: AbortSignal,
      ) => {
        if (
          !safeApplicationId
        ) {
          setError(
            "Invalid vendor application id.",
          );
          setLoading(false);
          return;
        }

        setLoading(true);
        setError(null);

        try {
          const response =
            await fetch(
              `/api/super-admin/vendor-applications/${encodeURIComponent(
                safeApplicationId,
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
            );

          const payload: unknown =
            await response.json();

          if (!response.ok) {
            throw new Error(
              getErrorMessage(
                payload,
                "Unable to load vendor application.",
              ),
            );
          }

          const detail =
            payload as VendorApplicationDetail;

          if (
            !detail ||
            typeof detail.id !==
              "string" ||
            typeof detail.status !==
              "string"
          ) {
            throw new Error(
              "Vendor application API returned an invalid response.",
            );
          }

          setApplication(
            detail,
          );
        } catch (fetchError) {
          if (
            fetchError instanceof
              DOMException &&
            fetchError.name ===
              "AbortError"
          ) {
            return;
          }

          setApplication(null);

          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Unable to load vendor application.",
          );
        } finally {
          if (
            !signal?.aborted
          ) {
            setLoading(false);
          }
        }
      },
      [safeApplicationId],
    );

  useEffect(() => {
    const controller =
      new AbortController();

    void loadApplication(
      controller.signal,
    );

    return () => {
      controller.abort();
    };
  }, [loadApplication]);

  async function runAction(
    action:
      | "approve"
      | "reject"
      | "resend",
    body?: object,
  ) {
    if (actionLoading) {
      return;
    }

    setActionLoading(action);
    setActionError(null);
    setSuccessMessage(null);

    const endpoint =
      action === "resend"
        ? "resend-credentials"
        : action;

    try {
      const response =
        await fetch(
          `/api/super-admin/vendor-applications/${encodeURIComponent(
            safeApplicationId,
          )}/${endpoint}`,
          {
            method: "POST",

            headers: {
              Accept:
                "application/json",

              ...(body
                ? {
                    "Content-Type":
                      "application/json",
                  }
                : {}),
            },

            body: body
              ? JSON.stringify(
                  body,
                )
              : undefined,
          },
        );

      const payload: unknown =
        await response.json();

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            payload,
            "Unable to complete the requested action.",
          ),
        );
      }

      const result =
        payload as ActionResponse;

      setSuccessMessage(
        result.message ??
          "Action completed successfully.",
      );

      setApproveConfirmOpen(
        false,
      );

      setRejectModalOpen(
        false,
      );

      setRejectionReason("");

      await loadApplication();
    } catch (actionFailure) {
      setActionError(
        actionFailure instanceof Error
          ? actionFailure.message
          : "Unable to complete the requested action.",
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function approve() {
    await runAction(
      "approve",
    );
  }

  async function reject() {
    const reason =
      rejectionReason.trim();

    if (reason.length < 3) {
      setActionError(
        "Please enter a rejection reason of at least 3 characters.",
      );
      return;
    }

    if (reason.length > 500) {
      setActionError(
        "Rejection reason must not exceed 500 characters.",
      );
      return;
    }

    await runAction(
      "reject",
      {
        reason,
      },
    );
  }

  async function resendCredentials() {
    await runAction(
      "resend",
    );
  }

  if (loading) {
    return (
      <main
        className={styles.page}
      >
        <div
          className={
            styles.loadingCard
          }
        >
          Loading vendor
          application...
        </div>
      </main>
    );
  }

  if (
    error ||
    !application
  ) {
    return (
      <main
        className={styles.page}
      >
        <Link
          href="/vendors/applications"
          className={
            styles.backLink
          }
        >
          ← Vendor Applications
        </Link>

        <div
          className={
            styles.errorCard
          }
        >
          <h1>
            Application
            unavailable
          </h1>

          <p>
            {error ??
              "Unable to load vendor application."}
          </p>

          <button
            type="button"
            onClick={() => {
              void loadApplication();
            }}
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  const canReview =
    application.status ===
      "PENDING" ||
    application.status ===
      "UNDER_REVIEW";

  const canResend =
    application.status ===
      "APPROVED" &&
    application.approvedVendor
      ?.memberships?.[0]?.user
      ?.status ===
      "PENDING_ACTIVATION";

  const ownerUser =
    application.approvedVendor
      ?.memberships?.[0]?.user ??
    null;

  return (
    <main className={styles.page}>
      <div
        className={
          styles.breadcrumb
        }
      >
        <Link href="/">
          Dashboard
        </Link>

        <span>/</span>

        <Link href="/vendors">
          Vendors
        </Link>

        <span>/</span>

        <Link href="/vendors/applications">
          Applications
        </Link>

        <span>/</span>

        <strong>Review</strong>
      </div>

      <Link
        href="/vendors/applications"
        className={
          styles.backLink
        }
      >
        ← Back to applications
      </Link>

      <section
        className={
          styles.hero
        }
      >
        <div
          className={
            styles.heroIdentity
          }
        >
          <div
            className={
              styles.avatar
            }
          >
            {application.businessName
              .charAt(0)
              .toUpperCase() ||
              "V"}
          </div>

          <div>
            <p
              className={
                styles.eyebrow
              }
            >
              Vendor application
            </p>

            <h1>
              {
                application.businessName
              }
            </h1>

            <p>
              Submitted{" "}
              {formatDate(
                application.submittedAt,
              )}
            </p>
          </div>
        </div>

        <span
          className={`${styles.status} ${
            styles[
              `status${application.status}`
            ]
          }`}
        >
          {formatStatus(
            application.status,
          )}
        </span>
      </section>

      {successMessage && (
        <div
          className={
            styles.successBanner
          }
          role="status"
        >
          {successMessage}
        </div>
      )}

      {actionError && (
        <div
          className={
            styles.errorBanner
          }
          role="alert"
        >
          {actionError}
        </div>
      )}

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
          <section
            className={
              styles.card
            }
          >
            <div
              className={
                styles.cardHeader
              }
            >
              <div>
                <h2>
                  Business Details
                </h2>

                <p>
                  Submitted vendor
                  information.
                </p>
              </div>
            </div>

            <dl
              className={
                styles.detailsGrid
              }
            >
              <div>
                <dt>
                  Business Name
                </dt>
                <dd>
                  {
                    application.businessName
                  }
                </dd>
              </div>

              <div>
                <dt>
                  Contact Person
                </dt>
                <dd>
                  {
                    application.contactName
                  }
                </dd>
              </div>

              <div>
                <dt>
                  Mobile
                </dt>
                <dd>
                  {
                    application.mobile
                  }
                </dd>
              </div>

              <div>
                <dt>
                  Email
                </dt>
                <dd
                  className={
                    styles.breakText
                  }
                >
                  {
                    application.email
                  }
                </dd>
              </div>
            </dl>
          </section>

          <section
            className={
              styles.card
            }
          >
            <div
              className={
                styles.cardHeader
              }
            >
              <div>
                <h2>
                  Verification
                </h2>

                <p>
                  Sensitive identifiers
                  remain masked.
                </p>
              </div>
            </div>

            <dl
              className={
                styles.detailsGrid
              }
            >
              <div>
                <dt>
                  Email Verification
                </dt>

                <dd>
                  <span
                    className={
                      styles.verified
                    }
                  >
                    Verified
                  </span>
                </dd>
              </div>

              <div>
                <dt>
                  Verified At
                </dt>

                <dd>
                  {formatDate(
                    application.emailVerifiedAt,
                  )}
                </dd>
              </div>

              <div>
                <dt>PAN</dt>
                <dd>
                  {maskLast4(
                    application.panLast4,
                  )}
                </dd>
              </div>

              <div>
                <dt>Aadhaar</dt>
                <dd>
                  {maskLast4(
                    application.aadhaarLast4,
                  )}
                </dd>
              </div>
            </dl>
          </section>

          {application.status ===
            "REJECTED" && (
            <section
              className={
                styles.card
              }
            >
              <div
                className={
                  styles.cardHeader
                }
              >
                <div>
                  <h2>
                    Rejection Details
                  </h2>
                </div>
              </div>

              <div
                className={
                  styles.rejectionReason
                }
              >
                {application.rejectionReason ??
                  "—"}
              </div>
            </section>
          )}

          {application.approvedVendor && (
            <section
              className={
                styles.card
              }
            >
              <div
                className={
                  styles.cardHeader
                }
              >
                <div>
                  <h2>
                    Approved Vendor
                  </h2>

                  <p>
                    Vendor account
                    created from this
                    application.
                  </p>
                </div>
              </div>

              <dl
                className={
                  styles.detailsGrid
                }
              >
                <div>
                  <dt>
                    Vendor ID /
                    Username
                  </dt>
                  <dd
                    className={
                      styles.vendorCode
                    }
                  >
                    {
                      application
                        .approvedVendor
                        .vendorCode
                    }
                  </dd>
                </div>

                <div>
                  <dt>
                    Vendor Status
                  </dt>
                  <dd>
                    {formatStatus(
                      application
                        .approvedVendor
                        .status,
                    )}
                  </dd>
                </div>

                <div>
                  <dt>
                    Login Status
                  </dt>
                  <dd>
                    {ownerUser
                      ? formatStatus(
                          ownerUser.status,
                        )
                      : "—"}
                  </dd>
                </div>

                <div>
                  <dt>
                    Temporary Password
                    Expires
                  </dt>
                  <dd>
                    {formatDate(
                      ownerUser
                        ?.temporaryPasswordExpiresAt ??
                        null,
                    )}
                  </dd>
                </div>
              </dl>
            </section>
          )}
        </div>

        <aside
          className={
            styles.sideColumn
          }
        >
          <section
            className={
              styles.reviewCard
            }
          >
            <h2>
              Review Application
            </h2>

            <p>
              Approval creates the
              vendor owner account and
              sends temporary login
              credentials by email.
            </p>

            {canReview ? (
              <div
                className={
                  styles.actionStack
                }
              >
                <button
                  type="button"
                  className={
                    styles.approveButton
                  }
                  disabled={
                    actionLoading !==
                    null
                  }
                  onClick={() => {
                    setActionError(
                      null,
                    );

                    setApproveConfirmOpen(
                      true,
                    );
                  }}
                >
                  Approve Vendor
                </button>

                <button
                  type="button"
                  className={
                    styles.rejectButton
                  }
                  disabled={
                    actionLoading !==
                    null
                  }
                  onClick={() => {
                    setActionError(
                      null,
                    );

                    setRejectModalOpen(
                      true,
                    );
                  }}
                >
                  Reject Application
                </button>
              </div>
            ) : (
              <div
                className={
                  styles.reviewComplete
                }
              >
                Review completed
                {application.reviewedAt
                  ? ` on ${formatDate(
                      application.reviewedAt,
                    )}`
                  : "."}
              </div>
            )}

            {canResend && (
              <button
                type="button"
                className={
                  styles.resendButton
                }
                disabled={
                  actionLoading !==
                  null
                }
                onClick={() => {
                  void resendCredentials();
                }}
              >
                {actionLoading ===
                "resend"
                  ? "Sending..."
                  : "Resend Credentials"}
              </button>
            )}
          </section>

          <section
            className={
              styles.timelineCard
            }
          >
            <h2>
              Application Timeline
            </h2>

            <div
              className={
                styles.timelineItem
              }
            >
              <span />
              <div>
                <strong>
                  Application
                  submitted
                </strong>

                <p>
                  {formatDate(
                    application.submittedAt,
                  )}
                </p>
              </div>
            </div>

            <div
              className={
                styles.timelineItem
              }
            >
              <span />
              <div>
                <strong>
                  Email verified
                </strong>

                <p>
                  {formatDate(
                    application.emailVerifiedAt,
                  )}
                </p>
              </div>
            </div>

            {application.reviewedAt && (
              <div
                className={
                  styles.timelineItem
                }
              >
                <span />
                <div>
                  <strong>
                    Application{" "}
                    {application.status ===
                    "APPROVED"
                      ? "approved"
                      : application.status ===
                          "REJECTED"
                        ? "rejected"
                        : "reviewed"}
                  </strong>

                  <p>
                    {formatDate(
                      application.reviewedAt,
                    )}
                  </p>
                </div>
              </div>
            )}
          </section>
        </aside>
      </div>

      {approveConfirmOpen && (
        <div
          className={
            styles.modalBackdrop
          }
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget &&
              !actionLoading
            ) {
              setApproveConfirmOpen(
                false,
              );
            }
          }}
        >
          <section
            className={
              styles.modal
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="approve-title"
          >
            <div
              className={
                styles.modalIconApprove
              }
            >
              ✓
            </div>

            <h2 id="approve-title">
              Approve this vendor?
            </h2>

            <p>
              This will create a
              permanent Vendor ID,
              owner login and temporary
              password. Credentials
              will be sent to{" "}
              <strong>
                {application.email}
              </strong>
              .
            </p>

            <div
              className={
                styles.modalActions
              }
            >
              <button
                type="button"
                className={
                  styles.cancelButton
                }
                disabled={
                  actionLoading !==
                  null
                }
                onClick={() =>
                  setApproveConfirmOpen(
                    false,
                  )
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className={
                  styles.approveButton
                }
                disabled={
                  actionLoading !==
                  null
                }
                onClick={() => {
                  void approve();
                }}
              >
                {actionLoading ===
                "approve"
                  ? "Approving..."
                  : "Confirm Approval"}
              </button>
            </div>
          </section>
        </div>
      )}

      {rejectModalOpen && (
        <div
          className={
            styles.modalBackdrop
          }
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget &&
              !actionLoading
            ) {
              setRejectModalOpen(
                false,
              );
            }
          }}
        >
          <section
            className={
              styles.modal
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-title"
          >
            <div
              className={
                styles.modalIconReject
              }
            >
              !
            </div>

            <h2 id="reject-title">
              Reject application
            </h2>

            <p>
              The reason below will be
              stored and sent to the
              applicant by email.
            </p>

            <label
              className={
                styles.reasonField
              }
            >
              <span>
                Rejection Reason
              </span>

              <textarea
                autoFocus
                value={
                  rejectionReason
                }
                maxLength={500}
                rows={5}
                placeholder="Enter a clear reason for rejection"
                onChange={(event) =>
                  setRejectionReason(
                    event.target
                      .value,
                  )
                }
              />

              <small>
                {
                  rejectionReason.length
                }
                /500
              </small>
            </label>

            <div
              className={
                styles.modalActions
              }
            >
              <button
                type="button"
                className={
                  styles.cancelButton
                }
                disabled={
                  actionLoading !==
                  null
                }
                onClick={() =>
                  setRejectModalOpen(
                    false,
                  )
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className={
                  styles.rejectConfirmButton
                }
                disabled={
                  actionLoading !==
                    null ||
                  rejectionReason.trim()
                    .length < 3
                }
                onClick={() => {
                  void reject();
                }}
              >
                {actionLoading ===
                "reject"
                  ? "Rejecting..."
                  : "Confirm Rejection"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}