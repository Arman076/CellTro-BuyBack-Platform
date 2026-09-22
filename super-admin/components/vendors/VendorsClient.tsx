"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import styles from "./VendorsClient.module.css";

type VendorStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED";

type Vendor = {
  id: number;
  vendorCode: string;
  businessName: string;
  contactName: string;
  phone: string;
  email: string | null;
  status: VendorStatus;
  serviceAreaCount: number;
  createdAt: string;
};

type ApiResponse = {
  data: Vendor[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  summary: {
    totalVendors: number;
    activeVendors: number;
    ordersRouted: number | null;
  };
};

type Tab =
  | "ALL"
  | "ACTIVE"
  | "INACTIVE";

const PAGE_SIZE = 50;

function displayValue(
  value: string | number | null | undefined,
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

export default function VendorsClient() {
  const [data, setData] =
    useState<ApiResponse | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [searchInput, setSearchInput] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [activeTab, setActiveTab] =
    useState<Tab>("ALL");

  const [page, setPage] =
    useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchInput]);

  const loadVendors =
    useCallback(
      async (
        signal?: AbortSignal,
      ) => {
        setLoading(true);
        setError("");

        try {
          const params =
            new URLSearchParams({
              page: String(page),
              limit: String(PAGE_SIZE),
            });

          if (search) {
            params.set(
              "search",
              search,
            );
          }

          if (
            activeTab !==
            "ALL"
          ) {
            params.set(
              "status",
              activeTab,
            );
          }

          const response =
            await fetch(
              `/api/super-admin/vendors?${params.toString()}`,
              {
                method: "GET",
                cache: "no-store",
                signal,
              },
            );

          const payload =
            await response.json();

          if (!response.ok) {
            throw new Error(
              payload?.message ??
                "Unable to load vendors.",
            );
          }

          setData(payload);
        } catch (err) {
          if (
            err instanceof DOMException &&
            err.name ===
              "AbortError"
          ) {
            return;
          }

          setError(
            err instanceof Error
              ? err.message
              : "Unable to load vendors.",
          );
        } finally {
          if (!signal?.aborted) {
            setLoading(false);
          }
        }
      },
      [
        activeTab,
        page,
        search,
      ],
    );

  useEffect(() => {
    const controller =
      new AbortController();

    void loadVendors(
      controller.signal,
    );

    return () => {
      controller.abort();
    };
  }, [loadVendors]);

  const vendors =
    data?.data ?? [];

  const pagination =
    data?.pagination;

  const summary =
    data?.summary;

  return (
    <main className={styles.page}>
      <div className={styles.breadcrumb}>
        <span>Super Admin</span>
        <span>/</span>
        <strong>Vendors</strong>
      </div>

      <div className={styles.headingRow}>
        <div>
          <h1>Vendors</h1>
          <p>
            Manage vendors, service coverage and
            routing readiness.
          </p>
        </div>

        <Link
          href="/vendors/new"
          className={styles.addButton}
        >
          <span aria-hidden="true">+</span>
          Add Vendor
        </Link>
      </div>

      <section
        className={styles.statsGrid}
        aria-label="Vendor summary"
      >
        <article className={styles.statCard}>
          <span>Total Vendors</span>
          <strong>
            {displayValue(
              summary?.totalVendors,
            )}
          </strong>
        </article>

        <article className={styles.statCard}>
          <span>Active Vendors</span>
          <strong>
            {displayValue(
              summary?.activeVendors,
            )}
          </strong>
        </article>

        <article className={styles.statCard}>
          <span>Orders Routed</span>
          <strong>
            {displayValue(
              summary?.ordersRouted,
            )}
          </strong>
          <small>
            Available after routing is enabled
          </small>
        </article>
      </section>

      <section className={styles.panel}>
        <div className={styles.toolbar}>
          <label className={styles.searchBox}>
            <span aria-hidden="true">
              ⌕
            </span>

            <input
              type="search"
              value={searchInput}
              onChange={(event) =>
                setSearchInput(
                  event.target.value,
                )
              }
              placeholder="Search vendor, code, contact or mobile"
              maxLength={100}
              aria-label="Search vendors"
            />
          </label>
        </div>

        <div
          className={styles.tabs}
          role="tablist"
          aria-label="Vendor status"
        >
          {(
            [
              ["ALL", "All Vendors"],
              ["ACTIVE", "Active"],
              ["INACTIVE", "Inactive"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={
                activeTab === value
              }
              className={
                activeTab === value
                  ? styles.activeTab
                  : styles.tab
              }
              onClick={() => {
                setActiveTab(value);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {error ? (
          <div
            className={styles.errorBox}
            role="alert"
          >
            <strong>
              Vendors could not be loaded.
            </strong>
            <span>{error}</span>

            <button
              type="button"
              onClick={() =>
                void loadVendors()
              }
            >
              Retry
            </button>
          </div>
        ) : null}

        {!error && loading ? (
          <div className={styles.state}>
            Loading vendors…
          </div>
        ) : null}

        {!error &&
        !loading &&
        vendors.length === 0 ? (
          <div className={styles.state}>
            No vendors found.
          </div>
        ) : null}

        {!error &&
        !loading &&
        vendors.length > 0 ? (
          <>
            <div
              className={
                styles.tableWrap
              }
            >
              <table
                className={styles.table}
              >
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Contact</th>
                    <th>Mobile</th>
                    <th>Areas</th>
                    <th>Status</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>

                <tbody>
                  {vendors.map(
                    (vendor) => (
                      <tr key={vendor.id}>
                        <td>
                          <div
                            className={
                              styles.vendorCell
                            }
                          >
                            <strong>
                              {
                                vendor.businessName
                              }
                            </strong>

                            <span>
                              {
                                vendor.vendorCode
                              }
                            </span>
                          </div>
                        </td>

                        <td>
                          <strong>
                            {
                              vendor.contactName
                            }
                          </strong>

                          <span
                            className={
                              styles.secondary
                            }
                          >
                            {displayValue(
                              vendor.email,
                            )}
                          </span>
                        </td>

                        <td>
                          <strong>
                            {vendor.phone}
                          </strong>
                        </td>

                        <td>
                          <strong>
                            {
                              vendor.serviceAreaCount
                            }
                          </strong>
                        </td>

                        <td>
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
                            {
                              vendor.status
                            }
                          </span>
                        </td>

                        <td>
                          <Link
                            className={
                              styles.viewLink
                            }
                            href={`/vendors/${vendor.id}`}
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
              {vendors.map(
                (vendor) => (
                  <article
                    key={vendor.id}
                    className={
                      styles.mobileCard
                    }
                  >
                    <div
                      className={
                        styles.mobileCardTop
                      }
                    >
                      <div>
                        <strong>
                          {
                            vendor.businessName
                          }
                        </strong>

                        <span>
                          {
                            vendor.vendorCode
                          }
                        </span>
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
                        {vendor.status}
                      </span>
                    </div>

                    <dl
                      className={
                        styles.mobileDetails
                      }
                    >
                      <div>
                        <dt>Contact</dt>
                        <dd>
                          {
                            vendor.contactName
                          }
                        </dd>
                      </div>

                      <div>
                        <dt>Mobile</dt>
                        <dd>
                          {vendor.phone}
                        </dd>
                      </div>

                      <div>
                        <dt>Areas</dt>
                        <dd>
                          {
                            vendor.serviceAreaCount
                          }
                        </dd>
                      </div>
                    </dl>

                    <Link
                      href={`/vendors/${vendor.id}`}
                      className={
                        styles.mobileView
                      }
                    >
                      View Vendor
                    </Link>
                  </article>
                ),
              )}
            </div>

            {pagination ? (
              <div
                className={
                  styles.pagination
                }
              >
                <span>
                  {pagination.total === 0
                    ? "No vendors"
                    : `Page ${pagination.page} of ${Math.max(
                        pagination.totalPages,
                        1,
                      )}`}
                </span>

                <div>
                  <button
                    type="button"
                    disabled={
                      pagination.page <= 1
                    }
                    onClick={() =>
                      setPage(
                        (current) =>
                          Math.max(
                            1,
                            current - 1,
                          ),
                      )
                    }
                  >
                    Previous
                  </button>

                  <button
                    type="button"
                    disabled={
                      pagination.page >=
                      pagination.totalPages
                    }
                    onClick={() =>
                      setPage(
                        (current) =>
                          current + 1,
                      )
                    }
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    </main>
  );
}