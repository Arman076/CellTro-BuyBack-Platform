"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import styles from "./VendorApplicationsClient.module.css";

const PAGE_SIZE = 20;

type ApplicationStatus =
  | "PENDING"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED";

type StatusFilter =
  | "ALL"
  | ApplicationStatus;

type VendorApplication = {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  mobile: string;
  panLast4: string | null;
  aadhaarLast4: string | null;
  status: ApplicationStatus;
  submittedAt: string;
  reviewedAt: string | null;

  approvedVendor: {
    id: number;
    vendorCode: string;
    status: string;
  } | null;
};

type ApplicationsResponse = {
  data: VendorApplication[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  summary: {
    pending: number;
    underReview: number;
    approved: number;
    rejected: number;
  };
};

const tabs: Array<{
  key: StatusFilter;
  label: string;
}> = [
  {
    key: "ALL",
    label: "All",
  },
  {
    key: "PENDING",
    label: "Pending",
  },
  {
    key: "UNDER_REVIEW",
    label: "Under Review",
  },
  {
    key: "APPROVED",
    label: "Approved",
  },
  {
    key: "REJECTED",
    label: "Rejected",
  },
];

function formatStatus(
  status: ApplicationStatus,
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

export default function VendorApplicationsClient() {
  const [
    applications,
    setApplications,
  ] = useState<VendorApplication[]>([]);

  const [
    summary,
    setSummary,
  ] = useState<
    ApplicationsResponse["summary"] | null
  >(null);

  const [
    pagination,
    setPagination,
  ] = useState<
    ApplicationsResponse["pagination"] | null
  >(null);

  const [
    activeTab,
    setActiveTab,
  ] = useState<StatusFilter>(
    "ALL",
  );

  const [
    searchInput,
    setSearchInput,
  ] = useState("");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    page,
    setPage,
  ] = useState(1);

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

  const queryString =
    useMemo(() => {
      const params =
        new URLSearchParams();

      params.set(
        "page",
        String(page),
      );

      params.set(
        "limit",
        String(PAGE_SIZE),
      );

      if (
        activeTab !== "ALL"
      ) {
        params.set(
          "status",
          activeTab,
        );
      }

      if (search) {
        params.set(
          "search",
          search,
        );
      }

      return params.toString();
    }, [
      activeTab,
      page,
      search,
    ]);

  const loadApplications =
    useCallback(
      async (
        signal?: AbortSignal,
      ) => {
        setLoading(true);
        setError(null);

        try {
          const response =
            await fetch(
              `/api/super-admin/vendor-applications?${queryString}`,
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
                "Unable to load vendor applications.",
              ),
            );
          }

          const data =
            payload as ApplicationsResponse;

          if (
            !Array.isArray(
              data.data,
            ) ||
            !data.pagination ||
            !data.summary
          ) {
            throw new Error(
              "Vendor applications API returned an invalid response.",
            );
          }

          setApplications(
            data.data,
          );

          setPagination(
            data.pagination,
          );

          setSummary(
            data.summary,
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

          setApplications([]);
          setPagination(null);
          setSummary(null);

          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Unable to load vendor applications.",
          );
        } finally {
          if (
            !signal?.aborted
          ) {
            setLoading(false);
          }
        }
      },
      [queryString],
    );

  useEffect(() => {
    const controller =
      new AbortController();

    void loadApplications(
      controller.signal,
    );

    return () => {
      controller.abort();
    };
  }, [loadApplications]);

  function submitSearch(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setPage(1);

    setSearch(
      searchInput
        .trim()
        .slice(0, 100),
    );
  }

  function clearSearch() {
    setSearchInput("");
    setSearch("");
    setPage(1);
  }

  function selectTab(
    tab: StatusFilter,
  ) {
    setActiveTab(tab);
    setPage(1);
  }

  const totalApplications =
    summary
      ? summary.pending +
        summary.underReview +
        summary.approved +
        summary.rejected
      : null;

  return (
    <main className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link
          href="/"
          className={styles.breadcrumbLink}
        >
          Dashboard
        </Link>

        <span>/</span>

        <Link
          href="/vendors"
          className={styles.breadcrumbLink}
        >
          Vendors
        </Link>

        <span>/</span>

        <strong>
          Applications
        </strong>
      </div>

      <section
        className={styles.header}
      >
        <div>
          <p
            className={
              styles.eyebrow
            }
          >
            Vendor onboarding
          </p>

          <h1>
            Vendor Applications
          </h1>

          <p
            className={
              styles.subtitle
            }
          >
            Review vendor
            registrations and
            approve or reject
            submitted applications.
          </p>
        </div>

        <button
          type="button"
          className={
            styles.refreshButton
          }
          disabled={loading}
          onClick={() => {
            void loadApplications();
          }}
        >
          {loading
            ? "Refreshing..."
            : "Refresh"}
        </button>
      </section>

      <section
        className={styles.statsGrid}
      >
        <article
          className={styles.statCard}
        >
          <span>
            Total Applications
          </span>

          <strong>
            {totalApplications ??
              "—"}
          </strong>
        </article>

        <article
          className={styles.statCard}
        >
          <span>Pending</span>

          <strong>
            {summary?.pending ??
              "—"}
          </strong>
        </article>

        <article
          className={styles.statCard}
        >
          <span>
            Under Review
          </span>

          <strong>
            {summary?.underReview ??
              "—"}
          </strong>
        </article>

        <article
          className={styles.statCard}
        >
          <span>Approved</span>

          <strong>
            {summary?.approved ??
              "—"}
          </strong>
        </article>

        <article
          className={styles.statCard}
        >
          <span>Rejected</span>

          <strong>
            {summary?.rejected ??
              "—"}
          </strong>
        </article>
      </section>

      <section
        className={styles.panel}
      >
        <div
          className={styles.tabs}
          role="tablist"
          aria-label="Vendor application status"
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={
                activeTab ===
                tab.key
              }
              className={`${styles.tab} ${
                activeTab ===
                tab.key
                  ? styles.activeTab
                  : ""
              }`}
              onClick={() =>
                selectTab(tab.key)
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form
          className={
            styles.filterBar
          }
          onSubmit={
            submitSearch
          }
        >
          <div
            className={
              styles.searchBox
            }
          >
            <span
              className={
                styles.searchIcon
              }
              aria-hidden="true"
            >
              ⌕
            </span>

            <input
              value={
                searchInput
              }
              maxLength={100}
              onChange={(event) =>
                setSearchInput(
                  event.target
                    .value,
                )
              }
              placeholder="Search business, contact, email or mobile"
              aria-label="Search vendor applications"
            />
          </div>

          <button
            type="submit"
            className={
              styles.searchButton
            }
          >
            Search
          </button>

          {search && (
            <button
              type="button"
              className={
                styles.clearButton
              }
              onClick={
                clearSearch
              }
            >
              Clear
            </button>
          )}
        </form>

        {error && (
          <div
            className={
              styles.errorBox
            }
            role="alert"
          >
            <div>
              <strong>
                Could not load
                applications
              </strong>

              <p>{error}</p>
            </div>

            <button
              type="button"
              onClick={() => {
                void loadApplications();
              }}
            >
              Retry
            </button>
          </div>
        )}

        {!error &&
          loading &&
          applications.length ===
            0 && (
            <div
              className={
                styles.stateBox
              }
            >
              Loading vendor
              applications...
            </div>
          )}

        {!error &&
          !loading &&
          applications.length ===
            0 && (
            <div
              className={
                styles.emptyState
              }
            >
              <div
                className={
                  styles.emptyIcon
                }
              >
                ✓
              </div>

              <h2>
                No applications
                found
              </h2>

              <p>
                There are no
                vendor applications
                matching the current
                filters.
              </p>
            </div>
          )}

        {applications.length >
          0 && (
          <>
            <div
              className={
                styles.tableWrapper
              }
            >
              <table
                className={
                  styles.table
                }
              >
                <thead>
                  <tr>
                    <th>
                      Business
                    </th>

                    <th>
                      Contact
                    </th>

                    <th>
                      Mobile
                    </th>

                    <th>
                      Submitted
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Vendor ID
                    </th>

                    <th>
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {applications.map(
                    (
                      application,
                    ) => (
                      <tr
                        key={
                          application.id
                        }
                      >
                        <td>
                          <div
                            className={
                              styles.businessCell
                            }
                          >
                            <span
                              className={
                                styles.avatar
                              }
                            >
                              {application.businessName
                                .charAt(
                                  0,
                                )
                                .toUpperCase() ||
                                "V"}
                            </span>

                            <div>
                              <strong>
                                {
                                  application.businessName
                                }
                              </strong>

                              <span>
                                {
                                  application.email
                                }
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          {
                            application.contactName
                          }
                        </td>

                        <td>
                          {
                            application.mobile
                          }
                        </td>

                        <td>
                          {formatDate(
                            application.submittedAt,
                          )}
                        </td>

                        <td>
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
                        </td>

                        <td>
                          {application
                            .approvedVendor
                            ?.vendorCode ??
                            "—"}
                        </td>

                        <td>
                          <Link
                            href={`/vendors/applications/${encodeURIComponent(
                              application.id,
                            )}`}
                            className={
                              styles.viewButton
                            }
                          >
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
                styles.mobileList
              }
            >
              {applications.map(
                (
                  application,
                ) => (
                  <article
                    key={
                      application.id
                    }
                    className={
                      styles.mobileCard
                    }
                  >
                    <div
                      className={
                        styles.mobileCardHeader
                      }
                    >
                      <div
                        className={
                          styles.businessCell
                        }
                      >
                        <span
                          className={
                            styles.avatar
                          }
                        >
                          {application.businessName
                            .charAt(0)
                            .toUpperCase() ||
                            "V"}
                        </span>

                        <div>
                          <strong>
                            {
                              application.businessName
                            }
                          </strong>

                          <span>
                            {
                              application.contactName
                            }
                          </span>
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
                    </div>

                    <dl
                      className={
                        styles.mobileDetails
                      }
                    >
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
                          Submitted
                        </dt>
                        <dd>
                          {formatDate(
                            application.submittedAt,
                          )}
                        </dd>
                      </div>

                      <div>
                        <dt>
                          Vendor ID
                        </dt>
                        <dd>
                          {application
                            .approvedVendor
                            ?.vendorCode ??
                            "—"}
                        </dd>
                      </div>
                    </dl>

                    <Link
                      href={`/vendors/applications/${encodeURIComponent(
                        application.id,
                      )}`}
                      className={
                        styles.mobileViewButton
                      }
                    >
                      View Application
                    </Link>
                  </article>
                ),
              )}
            </div>
          </>
        )}

        {pagination &&
          pagination.totalPages >
            1 && (
            <div
              className={
                styles.pagination
              }
            >
              <span>
                Page{" "}
                {
                  pagination.page
                }{" "}
                of{" "}
                {
                  pagination.totalPages
                }
              </span>

              <div>
                <button
                  type="button"
                  disabled={
                    loading ||
                    page <= 1
                  }
                  onClick={() =>
                    setPage(
                      (
                        current,
                      ) =>
                        Math.max(
                          1,
                          current -
                            1,
                        ),
                    )
                  }
                >
                  Previous
                </button>

                <button
                  type="button"
                  disabled={
                    loading ||
                    page >=
                      pagination.totalPages
                  }
                  onClick={() =>
                    setPage(
                      (
                        current,
                      ) =>
                        current +
                        1,
                    )
                  }
                >
                  Next
                </button>
              </div>
            </div>
          )}
      </section>
    </main>
  );
}