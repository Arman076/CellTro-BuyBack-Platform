"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Building2,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Save,
  Search,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000";

type Status =
  | "NEW"
  | "CONTACTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED";

type PartnerLead = {
  id: number;
  fullName: string;
  businessName: string | null;
  mobile: string;
  email: string | null;

  partnerType:
    | "BUYBACK_VENDOR"
    | "PICKUP_PARTNER"
    | "BUSINESS_PARTNER";

  city: string;
  pincode: string;
  businessAddress: string | null;
  gstNumber: string | null;
  message: string | null;

  status: Status;
  adminNotes: string | null;

  createdAt: string;
  updatedAt: string;
};

const statuses: Status[] = [
  "NEW",
  "CONTACTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
];

export default function PartnerApplicationsPage() {
  const [leads, setLeads] =
    useState<PartnerLead[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [savingId, setSavingId] =
    useState<number | null>(null);

  const [error, setError] =
    useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/partner-leads`,
        {
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error(
          "Unable to load partner applications.",
        );
      }

      const data =
        await response.json();

      setLeads(
        Array.isArray(data)
          ? data
          : [],
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load applications.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return leads.filter(
        (lead) => {
          const matchesStatus =
            statusFilter === "ALL" ||
            lead.status ===
              statusFilter;

          const matchesSearch =
            !query ||
            lead.fullName
              .toLowerCase()
              .includes(query) ||
            lead.businessName
              ?.toLowerCase()
              .includes(query) ||
            lead.mobile.includes(query) ||
            lead.city
              .toLowerCase()
              .includes(query) ||
            lead.pincode.includes(query);

          return (
            matchesStatus &&
            matchesSearch
          );
        },
      );
    }, [
      leads,
      search,
      statusFilter,
    ]);

  function updateLocal(
    id: number,
    changes: Partial<PartnerLead>,
  ) {
    setLeads((current) =>
      current.map((lead) =>
        lead.id === id
          ? {
              ...lead,
              ...changes,
            }
          : lead,
      ),
    );
  }

  async function saveLead(
    lead: PartnerLead,
  ) {
    setSavingId(lead.id);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/partner-leads/${lead.id}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            status: lead.status,

            adminNotes:
              lead.adminNotes || "",
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          "Unable to update application.",
        );
      }

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update application.",
      );
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <Building2 size={17} />

              PARTNERS
            </div>

            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Partner Applications
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Review and manage partnership
              requests submitted from the
              CELLTRO website.
            </p>
          </div>

          <button
            onClick={() => void load()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700"
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none"
            placeholder="Search name, business, mobile, city, pincode..."
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(
              e.target.value,
            )
          }
          className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none"
        >
          <option value="ALL">
            All Status
          </option>

          {statuses.map(
            (status) => (
              <option
                key={status}
                value={status}
              >
                {status.replaceAll(
                  "_",
                  " ",
                )}
              </option>
            ),
          )}
        </select>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2
            className="animate-spin"
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
          No partner applications found.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(
            (lead) => (
              <article
                key={lead.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-gray-900">
                        {lead.fullName}
                      </h2>

                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                        {lead.partnerType.replaceAll(
                          "_",
                          " ",
                        )}
                      </span>
                    </div>

                    {lead.businessName && (
                      <p className="mt-1 font-medium text-gray-600">
                        {
                          lead.businessName
                        }
                      </p>
                    )}

                    <div className="mt-4 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <Phone size={16} />
                        {lead.mobile}
                      </div>

                      {lead.email && (
                        <div className="flex items-center gap-2">
                          <Mail size={16} />
                          {lead.email}
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <MapPin size={16} />
                        {lead.city} -{" "}
                        {lead.pincode}
                      </div>

                      {lead.gstNumber && (
                        <div>
                          GST:{" "}
                          {lead.gstNumber}
                        </div>
                      )}
                    </div>

                    {lead.businessAddress && (
                      <p className="mt-4 text-sm leading-6 text-gray-600">
                        <strong>
                          Address:
                        </strong>{" "}
                        {
                          lead.businessAddress
                        }
                      </p>
                    )}

                    {lead.message && (
                      <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-600">
                        {lead.message}
                      </div>
                    )}

                    <p className="mt-4 text-xs text-gray-400">
                      Submitted:{" "}
                      {new Date(
                        lead.createdAt,
                      ).toLocaleString()}
                    </p>
                  </div>

                  <div className="w-full space-y-4 lg:w-80">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Status
                      </label>

                      <select
                        value={lead.status}
                        onChange={(e) =>
                          updateLocal(
                            lead.id,
                            {
                              status:
                                e.target
                                  .value as Status,
                            },
                          )
                        }
                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                      >
                        {statuses.map(
                          (status) => (
                            <option
                              key={status}
                              value={status}
                            >
                              {status.replaceAll(
                                "_",
                                " ",
                              )}
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Admin Notes
                      </label>

                      <textarea
                        rows={4}
                        value={
                          lead.adminNotes ||
                          ""
                        }
                        onChange={(e) =>
                          updateLocal(
                            lead.id,
                            {
                              adminNotes:
                                e.target
                                  .value,
                            },
                          )
                        }
                        className="w-full resize-y rounded-xl border border-gray-200 p-3 text-sm"
                        placeholder="Internal notes..."
                      />
                    </div>

                    <button
                      type="button"
                      disabled={
                        savingId ===
                        lead.id
                      }
                      onClick={() =>
                        void saveLead(
                          lead,
                        )
                      }
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {savingId ===
                      lead.id ? (
                        <Loader2
                          size={17}
                          className="animate-spin"
                        />
                      ) : (
                        <Save size={17} />
                      )}

                      Save Changes
                    </button>
                  </div>
                </div>
              </article>
            ),
          )}
        </div>
      )}
    </div>
  );
}