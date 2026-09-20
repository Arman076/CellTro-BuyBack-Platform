"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Filter,
  Info,
  RefreshCw,
  Search,
  UsersRound,
} from "lucide-react";

import styles from "./EnquiriesClient.module.css";

type Enquiry = {
  id: string;
  sessionId: string;
  phone: string;

  productId: number | null;
  productName: string | null;

  variantId: number | null;
  variantLabel: string | null;

  quoteAmount: number | null;
  quoteViewedAt: string | null;

  questionnaireCompletedAt: string | null;

  otpSentAt: string | null;
  otpVerifiedAt: string | null;
  identityVerifiedAt: string | null;

  createdAt: string;
  updatedAt: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type EnquiriesResponse = {
  data?: Enquiry[];

  pagination?: Partial<Pagination>;

  definition?: {
    abandonmentMinutes?: number;
  };

  message?: string;
};

type DatePreset =
  | "TODAY"
  | "LAST_7_DAYS"
  | "LAST_30_DAYS"
  | "LAST_90_DAYS"
  | "CUSTOM"
  | "ALL_TIME";

const DEFAULT_PAGINATION: Pagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,
};

function formatMoney(value: number | null) {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function compactId(value: string) {
  if (!value) {
    return "—";
  }

  if (value.length <= 15) {
    return value;
  }

  return `${value.slice(0, 7)}…${value.slice(-5)}`;
}

function verificationLabel(enquiry: Enquiry) {
  return enquiry.identityVerifiedAt
    ? "Verified"
    : "Unavailable";
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getPresetRange(
  preset: DatePreset,
): {
  from: string;
  to: string;
} {
  if (
    preset === "ALL_TIME" ||
    preset === "CUSTOM"
  ) {
    return {
      from: "",
      to: "",
    };
  }

  const today = new Date();

  const end = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const start = new Date(end);

  if (preset === "LAST_7_DAYS") {
    start.setDate(start.getDate() - 6);
  }

  if (preset === "LAST_30_DAYS") {
    start.setDate(start.getDate() - 29);
  }

  if (preset === "LAST_90_DAYS") {
    start.setDate(start.getDate() - 89);
  }

  return {
    from: toDateInputValue(start),
    to: toDateInputValue(end),
  };
}

export default function EnquiriesClient() {
  const router = useRouter();

  const [enquiries, setEnquiries] =
    useState<Enquiry[]>([]);

  const [pagination, setPagination] =
    useState<Pagination>(
      DEFAULT_PAGINATION,
    );

  const [
    abandonmentMinutes,
    setAbandonmentMinutes,
  ] = useState<number | null>(null);

  const [search, setSearch] =
    useState("");

  const [datePreset, setDatePreset] =
    useState<DatePreset>("ALL_TIME");

  const [from, setFrom] =
    useState("");

  const [to, setTo] =
    useState("");

  const [
    appliedSearch,
    setAppliedSearch,
  ] = useState("");

  const [
    appliedFrom,
    setAppliedFrom,
  ] = useState("");

  const [
    appliedTo,
    setAppliedTo,
  ] = useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const loadEnquiries = useCallback(
    async (
      requestedPage: number,
      signal?: AbortSignal,
    ) => {
      setLoading(true);
      setError(null);

      try {
        const params =
          new URLSearchParams();

        params.set(
          "page",
          String(requestedPage),
        );

        params.set("limit", "20");

        if (appliedSearch) {
          params.set(
            "search",
            appliedSearch,
          );
        }

        if (appliedFrom) {
          params.set(
            "from",
            appliedFrom,
          );
        }

        if (appliedTo) {
          params.set(
            "to",
            appliedTo,
          );
        }

        const response = await fetch(
          `/api/super-admin/enquiries?${params.toString()}`,
          {
            method: "GET",
            cache: "no-store",
            signal,
          },
        );

        const body: EnquiriesResponse =
          await response.json();

        if (!response.ok) {
          throw new Error(
            body.message ||
              "Unable to load enquiries.",
          );
        }

        setEnquiries(
          Array.isArray(body.data)
            ? body.data
            : [],
        );

        const backendPagination =
          body.pagination ?? {};

        setPagination({
          page:
            typeof backendPagination.page ===
            "number"
              ? backendPagination.page
              : requestedPage,

          limit:
            typeof backendPagination.limit ===
            "number"
              ? backendPagination.limit
              : 20,

          total:
            typeof backendPagination.total ===
            "number"
              ? backendPagination.total
              : 0,

          totalPages:
            typeof backendPagination.totalPages ===
            "number"
              ? Math.max(
                  1,
                  backendPagination.totalPages,
                )
              : 1,
        });

        const minutes =
          body.definition
            ?.abandonmentMinutes;

        setAbandonmentMinutes(
          typeof minutes === "number"
            ? minutes
            : null,
        );
      } catch (caught) {
        if (
          caught instanceof DOMException &&
          caught.name === "AbortError"
        ) {
          return;
        }

        setEnquiries([]);

        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to load enquiries.",
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [
      appliedSearch,
      appliedFrom,
      appliedTo,
    ],
  );

  useEffect(() => {
    const controller =
      new AbortController();

    void loadEnquiries(
      1,
      controller.signal,
    );

    return () =>
      controller.abort();
  }, [loadEnquiries]);

  function handlePresetChange(
    value: DatePreset,
  ) {
    setDatePreset(value);

    if (value === "CUSTOM") {
      return;
    }

    const range =
      getPresetRange(value);

    setFrom(range.from);
    setTo(range.to);
  }

  function applyFilters(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (
      datePreset === "CUSTOM" &&
      from &&
      to &&
      from > to
    ) {
      setError(
        "From date cannot be after To date.",
      );

      return;
    }

    const range =
      datePreset === "CUSTOM"
        ? {
            from,
            to,
          }
        : getPresetRange(
            datePreset,
          );

    setError(null);

    setAppliedSearch(
      search.trim(),
    );

    setAppliedFrom(range.from);
    setAppliedTo(range.to);
  }

  function clearFilters() {
    setSearch("");

    setDatePreset("ALL_TIME");

    setFrom("");
    setTo("");

    setAppliedSearch("");
    setAppliedFrom("");
    setAppliedTo("");

    setError(null);
  }

  function changePage(page: number) {
    if (
      loading ||
      page < 1 ||
      page > pagination.totalPages ||
      page === pagination.page
    ) {
      return;
    }

    void loadEnquiries(page);
  }

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <span>Home</span>
        <ChevronRight size={15} />
        <span>
          Customer Management
        </span>
        <ChevronRight size={15} />
        <strong>Enquiries</strong>
      </div>

      <section
        className={styles.pageHeader}
      >
        <div>
          <p className={styles.eyebrow}>
            Customer Management
          </p>

          <h1 className={styles.title}>
            Customer Enquiries
          </h1>

          <p
            className={
              styles.description
            }
          >
            Track customers who viewed
            their device quote but have
            not completed an order.
            {abandonmentMinutes !== null
              ? ` Enquiries appear after ${abandonmentMinutes} minutes without an order.`
              : ""}
          </p>
        </div>
      </section>

      <section
        className={styles.summaryGrid}
      >
        <article
          className={styles.summaryCard}
        >
          <div
            className={`${styles.summaryIcon} ${styles.blueIcon}`}
          >
            <UsersRound size={24} />
          </div>

          <div
            className={
              styles.summaryContent
            }
          >
            <span
              className={
                styles.summaryLabel
              }
            >
              Active Enquiries
            </span>

            <strong
              className={
                styles.summaryValue
              }
            >
              {loading
                ? "—"
                : pagination.total}
            </strong>

            <span
              className={
                styles.summaryHint
              }
            >
              Awaiting order placement
            </span>
          </div>
        </article>

        <article
          className={styles.summaryCard}
        >
          <div
            className={`${styles.summaryIcon} ${styles.greenIcon}`}
          >
            <Clock3 size={24} />
          </div>

          <div
            className={
              styles.summaryContent
            }
          >
            <span
              className={
                styles.summaryLabel
              }
            >
              Qualification Window
            </span>

            <strong
              className={
                styles.summaryValue
              }
            >
              {abandonmentMinutes !== null
                ? `${abandonmentMinutes} min`
                : "—"}
            </strong>

            <span
              className={
                styles.summaryHint
              }
            >
              Quote viewed without order
            </span>
          </div>
        </article>

        <article
          className={`${styles.summaryCard} ${styles.qualificationCard}`}
        >
          <div
            className={`${styles.summaryIcon} ${styles.orangeIcon}`}
          >
            <Info size={24} />
          </div>

          <div
            className={
              styles.summaryContent
            }
          >
            <span
              className={
                styles.summaryLabel
              }
            >
              Enquiry Qualification
            </span>

            <strong
              className={
                styles.qualificationText
              }
            >
              Quote viewed and no order
              placed
            </strong>

            <span
              className={
                styles.summaryHint
              }
            >
              Converted journeys
              automatically leave this
              active list.
            </span>
          </div>
        </article>
      </section>

      <form
        className={styles.filterCard}
        onSubmit={applyFilters}
      >
        <div
          className={styles.searchField}
        >
          <label
            htmlFor="enquiry-search"
            className={styles.label}
          >
            Search enquiries
          </label>

          <div
            className={
              styles.inputWithIcon
            }
          >
            <Search size={18} />

            <input
              id="enquiry-search"
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Mobile, device, variant or session ID"
              maxLength={100}
            />
          </div>
        </div>

        <div
          className={
            styles.periodField
          }
        >
          <label
            htmlFor="enquiry-period"
            className={styles.label}
          >
            Date range
          </label>

          <select
            id="enquiry-period"
            className={
              styles.selectInput
            }
            value={datePreset}
            onChange={(event) =>
              handlePresetChange(
                event.target
                  .value as DatePreset,
              )
            }
          >
            <option value="ALL_TIME">
              All time
            </option>

            <option value="TODAY">
              Today
            </option>

            <option value="LAST_7_DAYS">
              Last 7 days
            </option>

            <option value="LAST_30_DAYS">
              Last 30 days
            </option>

            <option value="LAST_90_DAYS">
              Last 90 days
            </option>

            <option value="CUSTOM">
              Custom range
            </option>
          </select>
        </div>

        {datePreset === "CUSTOM" ? (
          <>
            <div
              className={
                styles.dateField
              }
            >
              <label
                htmlFor="enquiry-from"
                className={styles.label}
              >
                From date
              </label>

              <input
                id="enquiry-from"
                type="date"
                className={
                  styles.dateInput
                }
                value={from}
                onChange={(event) =>
                  setFrom(
                    event.target.value,
                  )
                }
              />
            </div>

            <div
              className={
                styles.dateField
              }
            >
              <label
                htmlFor="enquiry-to"
                className={styles.label}
              >
                To date
              </label>

              <input
                id="enquiry-to"
                type="date"
                className={
                  styles.dateInput
                }
                value={to}
                onChange={(event) =>
                  setTo(
                    event.target.value,
                  )
                }
              />
            </div>
          </>
        ) : null}

        <div
          className={
            styles.filterActions
          }
        >
          <button
            type="submit"
            className={
              styles.applyButton
            }
            disabled={loading}
          >
            <Filter size={17} />
            <span>Apply</span>
          </button>

          <button
            type="button"
            className={
              styles.clearButton
            }
            disabled={loading}
            onClick={clearFilters}
          >
            <RefreshCw size={16} />
            <span>Reset</span>
          </button>
        </div>
      </form>

      {error ? (
        <div
          className={styles.error}
          role="alert"
        >
          <div>
            <strong>
              Could not load enquiries
            </strong>

            <p>{error}</p>
          </div>

          <button
            type="button"
            className={
              styles.clearButton
            }
            onClick={() =>
              void loadEnquiries(
                pagination.page,
              )
            }
          >
            Retry
          </button>
        </div>
      ) : null}

      <section
        className={
          styles.enquiriesCard
        }
        aria-busy={loading}
      >
        <div
          className={styles.cardHeader}
        >
          <div
            className={
              styles.cardTitleGroup
            }
          >
            <div
              className={
                styles.cardTitleIcon
              }
            >
              <UsersRound size={20} />
            </div>

            <div>
              <h2>
                Active enquiries
              </h2>

              <p>
                One row represents one
                device quote journey.
              </p>
            </div>
          </div>

          {!loading && !error ? (
            <span
              className={
                styles.resultBadge
              }
            >
              {pagination.total}{" "}
              {pagination.total === 1
                ? "result"
                : "results"}
            </span>
          ) : null}
        </div>

        {loading ? (
          <div className={styles.state}>
            <span
              className={styles.loader}
            />
            Loading enquiries...
          </div>
        ) : !error &&
          enquiries.length === 0 ? (
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
              <Search size={25} />
            </div>

            <strong>
              No active enquiries found
            </strong>

            <p>
              Try changing your search
              or date filters.
            </p>
          </div>
        ) : !error ? (
          <>
            <div
              className={
                styles.desktopTable
              }
            >
              <table
                className={styles.table}
              >
                <thead>
                  <tr>
                    <th>Enquiry</th>
                    <th>Mobile</th>
                    <th>
                      Device / Model
                    </th>
                    <th>Quote</th>
                    <th>Quote Viewed</th>
                    <th>Verification</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {enquiries.map(
                    (enquiry) => (
                      <tr
                        key={enquiry.id}
                      >
                        <td>
                          <div
                            className={
                              styles.idCell
                            }
                          >
                            <strong
                              title={
                                enquiry.id
                              }
                            >
                              {compactId(
                                enquiry.id,
                              )}
                            </strong>

                            <span
                              title={
                                enquiry.sessionId
                              }
                            >
                              Session{" "}
                              {compactId(
                                enquiry.sessionId,
                              )}
                            </span>
                          </div>
                        </td>

                        <td>
                          <strong
                            className={
                              styles.phone
                            }
                          >
                            {enquiry.phone ||
                              "—"}
                          </strong>
                        </td>

                        <td>
                          <div
                            className={
                              styles.deviceCell
                            }
                          >
                            <strong>
                              {enquiry.productName ||
                                "—"}
                            </strong>

                            <span>
                              {enquiry.variantLabel ||
                                "—"}
                            </span>
                          </div>
                        </td>

                        <td>
                          <strong
                            className={
                              styles.quote
                            }
                          >
                            {formatMoney(
                              enquiry.quoteAmount,
                            )}
                          </strong>
                        </td>

                        <td>
                          <span
                            className={
                              styles.dateValue
                            }
                          >
                            {formatDateTime(
                              enquiry.quoteViewedAt,
                            )}
                          </span>
                        </td>

                        <td>
                          <span
                            className={
                              enquiry.identityVerifiedAt
                                ? styles.verifiedBadge
                                : styles.unavailableBadge
                            }
                          >
                            <span
                              className={
                                styles.badgeDot
                              }
                            />

                            {verificationLabel(
                              enquiry,
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
                                `/enquiries/${encodeURIComponent(
                                  enquiry.id,
                                )}`,
                              )
                            }
                          >
                            <Eye
                              size={17}
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
                styles.cardList
              }
            >
              {enquiries.map(
                (enquiry) => (
                  <article
                    className={
                      styles.enquiryMobileCard
                    }
                    key={enquiry.id}
                  >
                    <div
                      className={
                        styles.mobileCardHeader
                      }
                    >
                      <div
                        className={
                          styles.mobileDevice
                        }
                      >
                        <span
                          className={
                            styles.mobileCaption
                          }
                        >
                          Device
                        </span>

                        <strong>
                          {enquiry.productName ||
                            "—"}
                        </strong>

                        <small>
                          {enquiry.variantLabel ||
                            "—"}
                        </small>
                      </div>

                      <strong
                        className={
                          styles.mobileQuote
                        }
                      >
                        {formatMoney(
                          enquiry.quoteAmount,
                        )}
                      </strong>
                    </div>

                    <div
                      className={
                        styles.mobileDetails
                      }
                    >
                      <div>
                        <span>
                          Mobile
                        </span>
                        <strong>
                          {enquiry.phone ||
                            "—"}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Quote Viewed
                        </span>
                        <strong>
                          {formatDateTime(
                            enquiry.quoteViewedAt,
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Verification
                        </span>

                        <strong>
                          {verificationLabel(
                            enquiry,
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Enquiry ID
                        </span>

                        <strong
                          title={
                            enquiry.id
                          }
                        >
                          {compactId(
                            enquiry.id,
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
                          `/enquiries/${encodeURIComponent(
                            enquiry.id,
                          )}`,
                        )
                      }
                    >
                      <Eye size={17} />
                      View enquiry
                    </button>
                  </article>
                ),
              )}
            </div>

            <footer
              className={
                styles.pagination
              }
            >
              <span
                className={
                  styles.pageInfo
                }
              >
                Page{" "}
                <strong>
                  {pagination.page}
                </strong>{" "}
                of{" "}
                <strong>
                  {
                    pagination.totalPages
                  }
                </strong>
              </span>

              <div
                className={
                  styles.pageButtons
                }
              >
                <button
                  type="button"
                  disabled={
                    loading ||
                    pagination.page <= 1
                  }
                  onClick={() =>
                    changePage(
                      pagination.page -
                        1,
                    )
                  }
                >
                  <ChevronLeft
                    size={16}
                  />
                  Previous
                </button>

                <span
                  className={
                    styles.currentPage
                  }
                >
                  {pagination.page}
                </span>

                <button
                  type="button"
                  disabled={
                    loading ||
                    pagination.page >=
                      pagination.totalPages
                  }
                  onClick={() =>
                    changePage(
                      pagination.page +
                        1,
                    )
                  }
                >
                  Next
                  <ChevronRight
                    size={16}
                  />
                </button>
              </div>
            </footer>
          </>
        ) : null}
      </section>
    </div>
  );
}