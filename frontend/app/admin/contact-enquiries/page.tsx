"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Loader2,
  Mail,
  MessageSquare,
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
  | "RESOLVED"
  | "CLOSED";

type ContactLead = {
  id: number;
  fullName: string;
  mobile: string;
  email: string | null;
  subject: string | null;
  message: string;

  status: Status;
  adminNotes: string | null;

  createdAt: string;
  updatedAt: string;
};

const statuses: Status[] = [
  "NEW",
  "CONTACTED",
  "RESOLVED",
  "CLOSED",
];

export default function ContactEnquiriesPage() {
  const [leads, setLeads] =
    useState<ContactLead[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [savingId, setSavingId] =
    useState<number | null>(null);

  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState("ALL");

  const [error, setError] =
    useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/contact-leads`,
        {
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error(
          "Unable to load contact enquiries.",
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
          : "Unable to load enquiries.",
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

      return leads.filter((lead) => {
        const statusMatch =
          status === "ALL" ||
          lead.status === status;

        const searchMatch =
          !query ||
          lead.fullName
            .toLowerCase()
            .includes(query) ||
          lead.mobile.includes(query) ||
          lead.email
            ?.toLowerCase()
            .includes(query) ||
          lead.subject
            ?.toLowerCase()
            .includes(query);

        return (
          statusMatch &&
          searchMatch
        );
      });
    }, [
      leads,
      search,
      status,
    ]);

  function updateLocal(
    id: number,
    changes: Partial<ContactLead>,
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

  async function save(
    lead: ContactLead,
  ) {
    setSavingId(lead.id);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/contact-leads/${lead.id}`,
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
          "Unable to update enquiry.",
        );
      }

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update enquiry.",
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
              <MessageSquare size={17} />
              CUSTOMER SUPPORT
            </div>

            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Contact Enquiries
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Review and manage messages
              submitted from the Contact Us page.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void load()
            }
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
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none"
            placeholder="Search name, mobile, email or subject..."
          />
        </div>

        <select
          value={status}
          onChange={(event) =>
            setStatus(
              event.target.value,
            )
          }
          className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none"
        >
          <option value="ALL">
            All Status
          </option>

          {statuses.map(
            (item) => (
              <option
                key={item}
                value={item}
              >
                {item}
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
          <Loader2 className="animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
          No contact enquiries found.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(
            (lead) => (
              <article
                key={lead.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-gray-900">
                        {lead.fullName}
                      </h2>

                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                        {lead.status}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
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
                    </div>

                    {lead.subject && (
                      <p className="mt-4 text-sm font-semibold text-gray-800">
                        Subject:{" "}
                        {lead.subject}
                      </p>
                    )}

                    <div className="mt-4 whitespace-pre-line rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-600">
                      {lead.message}
                    </div>

                    <p className="mt-4 text-xs text-gray-400">
                      Received:{" "}
                      {new Date(
                        lead.createdAt,
                      ).toLocaleString()}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Status
                      </label>

                      <select
                        value={lead.status}
                        onChange={(event) =>
                          updateLocal(
                            lead.id,
                            {
                              status:
                                event.target
                                  .value as Status,
                            },
                          )
                        }
                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                      >
                        {statuses.map(
                          (item) => (
                            <option
                              key={item}
                              value={item}
                            >
                              {item}
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
                        rows={5}
                        value={
                          lead.adminNotes ||
                          ""
                        }
                        onChange={(event) =>
                          updateLocal(
                            lead.id,
                            {
                              adminNotes:
                                event.target
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
                        void save(lead)
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