"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import styles from "./VendorsClient.module.css";

type VendorStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
type Tab = "ALL" | VendorStatus;

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
  performance: {
    routedOrders: number;
    completedOrders: number;
    completionRate: number | null;
  };
};

type ApiResponse = {
  data: Vendor[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  summary: {
    totalVendors: number;
    activeVendors: number;
    inactiveVendors: number;
    suspendedVendors: number;
    ordersRouted: number;
    completedOrders: number;
    completionRate: number | null;
  };
};

const PAGE_SIZE = 50;

function value(v: string | number | null | undefined) {
  return v === null || v === undefined || v === "" ? "—" : String(v);
}

function rate(v: number | null | undefined) {
  return v === null || v === undefined ? "—" : `${v}%`;
}

function statusClass(status: VendorStatus) {
  if (status === "ACTIVE") return styles.statusActive;
  if (status === "SUSPENDED") return styles.statusSuspended;
  return styles.statusInactive;
}

export default function VendorsClient() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("ALL");
  const [page, setPage] = useState(1);
  const [changingVendorId, setChangingVendorId] = useState<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadVendors = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search) params.set("search", search);
      if (activeTab !== "ALL") params.set("status", activeTab);

      const response = await fetch(`/api/super-admin/vendors?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
        signal,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message ?? "Unable to load vendors.");
      setData(payload);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Unable to load vendors.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [activeTab, page, search]);

  useEffect(() => {
    const controller = new AbortController();
    void loadVendors(controller.signal);
    return () => controller.abort();
  }, [loadVendors]);

  async function changeStatus(vendor: Vendor, nextStatus: VendorStatus) {
    if (changingVendorId !== null || vendor.status === nextStatus) return;

    const action = nextStatus === "SUSPENDED" ? "suspend" : nextStatus === "ACTIVE" ? "activate" : "deactivate";
    if (!window.confirm(`${action.charAt(0).toUpperCase()}${action.slice(1)} ${vendor.businessName}?`)) return;

    setChangingVendorId(vendor.id);
    setError("");
    try {
      const response = await fetch(`/api/super-admin/vendors/${vendor.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message ?? `Unable to ${action} vendor.`);
      await loadVendors();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Unable to ${action} vendor.`);
    } finally {
      setChangingVendorId(null);
    }
  }

  const vendors = data?.data ?? [];
  const pagination = data?.pagination;
  const summary = data?.summary;

  return (
    <main className={styles.page}>
      <div className={styles.breadcrumb}><span>Super Admin</span><span>/</span><strong>Vendors</strong></div>

      <div className={styles.headingRow}>
        <div><h1>Vendor Management</h1><p>Monitor vendor performance, service coverage and operational status.</p></div>
        <Link href="/vendors/applications" className={styles.applicationsButton}>Vendor Applications</Link>
      </div>

      <section className={styles.statsGrid} aria-label="Vendor performance summary">
        <article className={styles.statCard}><span>Total Vendors</span><strong>{value(summary?.totalVendors)}</strong><small>Approved vendor accounts</small></article>
        <article className={styles.statCard}><span>Active Vendors</span><strong>{value(summary?.activeVendors)}</strong><small>Eligible for new routing</small></article>
        <article className={styles.statCard}><span>Suspended</span><strong>{value(summary?.suspendedVendors)}</strong><small>Blocked from new routing</small></article>
        <article className={styles.statCard}><span>Orders Routed</span><strong>{value(summary?.ordersRouted)}</strong><small>Currently assigned orders</small></article>
        <article className={styles.statCard}><span>Completed Orders</span><strong>{value(summary?.completedOrders)}</strong><small>Currently assigned and completed</small></article>
        <article className={styles.statCard}><span>Completion Rate</span><strong>{rate(summary?.completionRate)}</strong><small>Completed / currently routed</small></article>
      </section>

      <section className={styles.panel}>
        <div className={styles.toolbar}>
          <label className={styles.searchBox}><span aria-hidden="true">⌕</span><input type="search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search vendor, code, contact or mobile" maxLength={100} aria-label="Search vendors" /></label>
        </div>

        <div className={styles.tabs} role="tablist" aria-label="Vendor status">
          {([ ["ALL", "All"], ["ACTIVE", "Active"], ["INACTIVE", "Inactive"], ["SUSPENDED", "Suspended"] ] as const).map(([v,l]) => (
            <button key={v} type="button" role="tab" aria-selected={activeTab === v} className={activeTab === v ? styles.activeTab : styles.tab} onClick={() => { setActiveTab(v); setPage(1); }}>{l}</button>
          ))}
        </div>

        {error ? <div className={styles.errorBox} role="alert"><strong>Request failed.</strong><span>{error}</span><button type="button" onClick={() => void loadVendors()}>Retry</button></div> : null}
        {!error && loading ? <div className={styles.state}>Loading vendors…</div> : null}
        {!error && !loading && vendors.length === 0 ? <div className={styles.state}>No vendors found.</div> : null}

        {!loading && vendors.length > 0 ? <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Vendor</th><th>Contact</th><th>Areas</th><th>Routed</th><th>Completed</th><th>Rate</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>{vendors.map((vendor) => <tr key={vendor.id}>
                <td><div className={styles.vendorCell}><strong>{vendor.businessName}</strong><span>{vendor.vendorCode}</span></div></td>
                <td><strong>{vendor.contactName}</strong><span className={styles.secondary}>{vendor.phone} · {value(vendor.email)}</span></td>
                <td><strong>{vendor.serviceAreaCount}</strong></td>
                <td><strong>{vendor.performance.routedOrders}</strong></td>
                <td><strong>{vendor.performance.completedOrders}</strong></td>
                <td><strong>{rate(vendor.performance.completionRate)}</strong></td>
                <td><span className={`${styles.status} ${statusClass(vendor.status)}`}>{vendor.status}</span></td>
                <td><div className={styles.actions}>
                  <Link className={styles.viewLink} href={`/vendors/${vendor.id}`}>View</Link>
                  {vendor.status !== "ACTIVE" ? <button type="button" className={styles.activateButton} disabled={changingVendorId !== null} onClick={() => void changeStatus(vendor,"ACTIVE")}>Activate</button> : null}
                  {vendor.status !== "SUSPENDED" ? <button type="button" className={styles.suspendButton} disabled={changingVendorId !== null} onClick={() => void changeStatus(vendor,"SUSPENDED")}>Suspend</button> : null}
                  {vendor.status !== "INACTIVE" ? <button type="button" className={styles.deactivateButton} disabled={changingVendorId !== null} onClick={() => void changeStatus(vendor,"INACTIVE")}>Deactivate</button> : null}
                </div></td>
              </tr>)}</tbody>
            </table>
          </div>

          <div className={styles.mobileList}>{vendors.map((vendor) => <article key={vendor.id} className={styles.mobileCard}>
            <div className={styles.mobileCardTop}><div><strong>{vendor.businessName}</strong><span>{vendor.vendorCode}</span></div><span className={`${styles.status} ${statusClass(vendor.status)}`}>{vendor.status}</span></div>
            <dl className={styles.mobileDetails}><div><dt>Contact</dt><dd>{vendor.contactName}</dd></div><div><dt>Areas</dt><dd>{vendor.serviceAreaCount}</dd></div><div><dt>Routed</dt><dd>{vendor.performance.routedOrders}</dd></div><div><dt>Completed</dt><dd>{vendor.performance.completedOrders}</dd></div><div><dt>Completion</dt><dd>{rate(vendor.performance.completionRate)}</dd></div></dl>
            <div className={styles.mobileActions}><Link href={`/vendors/${vendor.id}`} className={styles.mobileView}>View Vendor</Link>{vendor.status !== "ACTIVE" ? <button type="button" onClick={() => void changeStatus(vendor,"ACTIVE")}>Activate</button> : null}{vendor.status !== "SUSPENDED" ? <button type="button" onClick={() => void changeStatus(vendor,"SUSPENDED")}>Suspend</button> : null}{vendor.status !== "INACTIVE" ? <button type="button" onClick={() => void changeStatus(vendor,"INACTIVE")}>Deactivate</button> : null}</div>
          </article>)}</div>

          {pagination ? <div className={styles.pagination}><span>{pagination.total === 0 ? "No vendors" : `Page ${pagination.page} of ${Math.max(pagination.totalPages,1)}`}</span><div><button type="button" disabled={pagination.page <= 1} onClick={() => setPage((p) => Math.max(1,p-1))}>Previous</button><button type="button" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage((p) => p+1)}>Next</button></div></div> : null}
        </> : null}
      </section>
    </main>
  );
}
