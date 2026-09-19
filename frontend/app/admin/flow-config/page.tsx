"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CircleX,
  ClipboardCheck,
  MapPin,
  MessageSquareText,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000";

type Tab =
  | "SERVICEABILITY"
  | "CANCELLATION"
  | "FEEDBACK";

type PincodeRow = {
  id: number;
  pincode: string;
  district?: string | null;
  state?: string | null;
  isActive: boolean;
};

type PincodeLookup = {
  pincode: string;
  district: string;
  state: string;
};

type ConfigOption = {
  id: number;
  code: string;
  label: string;
  requiresFreeText: boolean;
  isActive: boolean;
  displayOrder: number;
};

async function json(
  url: string,
  key: string,
  init?: RequestInit,
) {
  const response =
    await fetch(
      url,
      {
        ...init,

        cache:
          "no-store",

        headers: {
          "Content-Type":
            "application/json",

          "x-admin-config-key":
            key,

          ...(init?.headers ||
            {}),
        },
      },
    );

  const data =
    await response
      .json()
      .catch(
        () => ({}),
      );

  if (!response.ok) {
    throw new Error(
      Array.isArray(
        data?.message,
      )
        ? data.message.join(
            ", ",
          )
        : data?.message ||
            `Request failed (${response.status})`,
    );
  }

  return data;
}

function statusBadge(
  active: boolean,
) {
  return active
    ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
    : "bg-slate-100 text-slate-500 ring-1 ring-slate-200";
}

export default function FlowConfigPage() {
  const [
    tab,
    setTab,
  ] =
    useState<Tab>(
      "SERVICEABILITY",
    );

  const [
    adminKey,
    setAdminKey,
  ] =
    useState("");

  const [
    loaded,
    setLoaded,
  ] =
    useState(false);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    success,
    setSuccess,
  ] =
    useState("");

  const [
    pincodes,
    setPincodes,
  ] =
    useState<
      PincodeRow[]
    >([]);

  const [
    pincode,
    setPincode,
  ] =
    useState("");

  const [
    lookup,
    setLookup,
  ] =
    useState<PincodeLookup | null>(
      null,
    );

  const [
    lookupLoading,
    setLookupLoading,
  ] =
    useState(false);

  const [
    lookupError,
    setLookupError,
  ] =
    useState("");

  const [
    pincodeSearch,
    setPincodeSearch,
  ] =
    useState("");

  const [
    customerReasons,
    setCustomerReasons,
  ] =
    useState<
      ConfigOption[]
    >([]);

  const [
    agentReasons,
    setAgentReasons,
  ] =
    useState<
      ConfigOption[]
    >([]);

  const [
    feedbackOptions,
    setFeedbackOptions,
  ] =
    useState<
      ConfigOption[]
    >([]);

  const [
    customerReasonLabel,
    setCustomerReasonLabel,
  ] =
    useState("");

  const [
    agentReasonLabel,
    setAgentReasonLabel,
  ] =
    useState("");

  const [
    feedbackLabel,
    setFeedbackLabel,
  ] =
    useState("");

  const [
    customerOther,
    setCustomerOther,
  ] =
    useState(false);

  const [
    agentOther,
    setAgentOther,
  ] =
    useState(false);

  const [
    feedbackOther,
    setFeedbackOther,
  ] =
    useState(false);

  useEffect(
    () => {
      const stored =
        sessionStorage.getItem(
          "celltroAdminConfigKey",
        );

      if (stored) {
        setAdminKey(
          stored,
        );
      }
    },
    [],
  );

  useEffect(
    () => {
      setLookup(
        null,
      );

      setLookupError(
        "",
      );

      if (
        !loaded ||
        !adminKey ||
        !/^[1-9]\d{5}$/.test(
          pincode,
        )
      ) {
        return;
      }

      const timer =
        window.setTimeout(
          async () => {
            try {
              setLookupLoading(
                true,
              );

              const data =
                await json(
                  `${API}/admin/flow-config/pincode-lookup?pincode=${encodeURIComponent(
                    pincode,
                  )}`,
                  adminKey,
                );

              setLookup({
                pincode:
                  String(
                    data.pincode,
                  ),

                district:
                  String(
                    data.district,
                  ),

                state:
                  String(
                    data.state,
                  ),
              });
            } catch (e) {
              setLookupError(
                e instanceof Error
                  ? e.message
                  : "Unable to lookup pincode.",
              );
            } finally {
              setLookupLoading(
                false,
              );
            }
          },
          450,
        );

      return () =>
        window.clearTimeout(
          timer,
        );
    },
    [
      pincode,
      adminKey,
      loaded,
    ],
  );

  const activePincodes =
    useMemo(
      () =>
        pincodes.filter(
          (item) =>
            item.isActive,
        ).length,
      [
        pincodes,
      ],
    );

  const filteredPincodes =
    useMemo(
      () => {
        const term =
          pincodeSearch
            .trim()
            .toLowerCase();

        if (!term) {
          return pincodes;
        }

        return pincodes.filter(
          (row) =>
            row.pincode.includes(
              term,
            ) ||
            String(
              row.district ??
                "",
            )
              .toLowerCase()
              .includes(
                term,
              ) ||
            String(
              row.state ??
                "",
            )
              .toLowerCase()
              .includes(
                term,
              ),
        );
      },
      [
        pincodes,
        pincodeSearch,
      ],
    );

  async function loadAll(
    key =
      adminKey,
  ) {
    if (!key.trim()) {
      setError(
        "Enter the admin configuration key.",
      );
      return;
    }

    setLoading(
      true,
    );

    setError(
      "",
    );

    setSuccess(
      "",
    );

    try {
      const [
        pincodeData,
        customerData,
        agentData,
        feedbackData,
      ] =
        await Promise.all([
          json(
            `${API}/admin/flow-config/pincodes`,
            key,
          ),

          json(
            `${API}/admin/flow-config/cancellation-reasons?audience=CUSTOMER`,
            key,
          ),

          json(
            `${API}/admin/flow-config/cancellation-reasons?audience=AGENT`,
            key,
          ),

          json(
            `${API}/admin/flow-config/feedback-options`,
            key,
          ),
        ]);

      sessionStorage.setItem(
        "celltroAdminConfigKey",
        key,
      );

      setPincodes(
        Array.isArray(
          pincodeData,
        )
          ? pincodeData
          : [],
      );

      setCustomerReasons(
        Array.isArray(
          customerData,
        )
          ? customerData
          : [],
      );

      setAgentReasons(
        Array.isArray(
          agentData,
        )
          ? agentData
          : [],
      );

      setFeedbackOptions(
        Array.isArray(
          feedbackData,
        )
          ? feedbackData
          : [],
      );

      setLoaded(
        true,
      );
    } catch (e) {
      setLoaded(
        false,
      );

      setError(
        e instanceof Error
          ? e.message
          : "Unable to load configuration.",
      );
    } finally {
      setLoading(
        false,
      );
    }
  }

  async function addPincode(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (
      !lookup ||
      lookup.pincode !==
        pincode
    ) {
      setError(
        "Wait for district and state to load before adding the pincode.",
      );
      return;
    }

    try {
      setError(
        "",
      );

      setSuccess(
        "",
      );

      await json(
        `${API}/admin/flow-config/pincodes`,
        adminKey,
        {
          method:
            "POST",

          body:
            JSON.stringify(
              {
                pincode,
              },
            ),
        },
      );

      setSuccess(
        `${pincode} · ${lookup.district}, ${lookup.state} is now serviceable.`,
      );

      setPincode(
        "",
      );

      setLookup(
        null,
      );

      await loadAll();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to save pincode.",
      );
    }
  }

  async function togglePincode(
    row: PincodeRow,
  ) {
    try {
      setError(
        "",
      );

      await json(
        `${API}/admin/flow-config/pincodes/${row.id}`,
        adminKey,
        {
          method:
            "PATCH",

          body:
            JSON.stringify(
              {
                isActive:
                  !row.isActive,
              },
            ),
        },
      );

      await loadAll();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to update pincode.",
      );
    }
  }

  async function addReason(
    audience:
      | "CUSTOMER"
      | "AGENT",
    label: string,
    requiresFreeText: boolean,
  ) {
    if (
      !label.trim()
    ) {
      setError(
        "Reason label is required.",
      );
      return;
    }

    try {
      setError(
        "",
      );

      await json(
        `${API}/admin/flow-config/cancellation-reasons`,
        adminKey,
        {
          method:
            "POST",

          body:
            JSON.stringify(
              {
                audience,
                label:
                  label.trim(),
                requiresFreeText,
              },
            ),
        },
      );

      if (
        audience ===
        "CUSTOMER"
      ) {
        setCustomerReasonLabel(
          "",
        );

        setCustomerOther(
          false,
        );
      } else {
        setAgentReasonLabel(
          "",
        );

        setAgentOther(
          false,
        );
      }

      await loadAll();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to add reason.",
      );
    }
  }

  async function toggleReason(
    row: ConfigOption,
  ) {
    try {
      setError(
        "",
      );

      await json(
        `${API}/admin/flow-config/cancellation-reasons/${row.id}`,
        adminKey,
        {
          method:
            "PATCH",

          body:
            JSON.stringify(
              {
                isActive:
                  !row.isActive,
              },
            ),
        },
      );

      await loadAll();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to update reason.",
      );
    }
  }

  async function addFeedbackOption() {
    if (
      !feedbackLabel.trim()
    ) {
      setError(
        "Feedback option label is required.",
      );
      return;
    }

    try {
      setError(
        "",
      );

      await json(
        `${API}/admin/flow-config/feedback-options`,
        adminKey,
        {
          method:
            "POST",

          body:
            JSON.stringify(
              {
                label:
                  feedbackLabel.trim(),

                requiresFreeText:
                  feedbackOther,
              },
            ),
        },
      );

      setFeedbackLabel(
        "",
      );

      setFeedbackOther(
        false,
      );

      await loadAll();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to add feedback option.",
      );
    }
  }

  async function toggleFeedback(
    row: ConfigOption,
  ) {
    try {
      setError(
        "",
      );

      await json(
        `${API}/admin/flow-config/feedback-options/${row.id}`,
        adminKey,
        {
          method:
            "PATCH",

          body:
            JSON.stringify(
              {
                isActive:
                  !row.isActive,
              },
            ),
        },
      );

      await loadAll();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to update feedback option.",
      );
    }
  }

  function ConfigRows({
    rows,
    onToggle,
  }: {
    rows: ConfigOption[];
    onToggle: (
      row: ConfigOption,
    ) => void;
  }) {
    return (
      <div className="mt-5 space-y-3">
        {rows.length ===
          0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
            No options configured yet.
          </div>
        )}

        {rows.map(
          (
            row,
          ) => (
            <article
              key={
                row.id
              }
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-sm text-slate-900 sm:text-base">
                    {
                      row.label
                    }
                  </strong>

                  {row.requiresFreeText && (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200">
                      Details required
                    </span>
                  )}

                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusBadge(
                      row.isActive,
                    )}`}
                  >
                    {row.isActive
                      ? "Active"
                      : "Inactive"}
                  </span>
                </div>

                <p className="mt-1 truncate text-xs text-slate-400">
                  {
                    row.code
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  onToggle(
                    row,
                  )
                }
                className="shrink-0 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {row.isActive
                  ? "Deactivate"
                  : "Activate"}
              </button>
            </article>
          ),
        )}
      </div>
    );
  }

  const tabs = [
    {
      id:
        "SERVICEABILITY" as const,
      label:
        "Serviceability",
      description:
        "Pincodes, district & state",
      icon:
        MapPin,
    },
    {
      id:
        "CANCELLATION" as const,
      label:
        "Cancellation",
      description:
        "Customer & agent reasons",
      icon:
        CircleX,
    },
    {
      id:
        "FEEDBACK" as const,
      label:
        "Feedback",
      description:
        "Completed-order responses",
      icon:
        MessageSquareText,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
        <header className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl shadow-slate-200">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-emerald-300">
                  <ShieldCheck
                    size={
                      17
                    }
                  />

                  <span className="text-xs font-bold uppercase tracking-[.2em]">
                    Celltro Admin
                  </span>
                </div>

                <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                  Customer Flow
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
                  Control pickup serviceability, cancellation responses and
                  completed-order feedback from one place.
                </p>
              </div>

              {loaded && (
                <button
                  type="button"
                  onClick={() =>
                    loadAll()
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <RefreshCw
                    size={
                      16
                    }
                  />
                  Refresh
                </button>
              )}
            </div>
          </div>

          {loaded && (
            <div className="grid border-t border-slate-800 sm:grid-cols-3">
              <div className="p-4 sm:p-5">
                <p className="text-xs uppercase tracking-wider text-slate-400">
                  Active pincodes
                </p>
                <strong className="mt-1 block text-2xl">
                  {
                    activePincodes
                  }
                </strong>
              </div>

              <div className="border-t border-slate-800 p-4 sm:border-l sm:border-t-0 sm:p-5">
                <p className="text-xs uppercase tracking-wider text-slate-400">
                  Cancellation options
                </p>
                <strong className="mt-1 block text-2xl">
                  {customerReasons.length +
                    agentReasons.length}
                </strong>
              </div>

              <div className="border-t border-slate-800 p-4 sm:border-l sm:border-t-0 sm:p-5">
                <p className="text-xs uppercase tracking-wider text-slate-400">
                  Feedback options
                </p>
                <strong className="mt-1 block text-2xl">
                  {
                    feedbackOptions.length
                  }
                </strong>
              </div>
            </div>
          )}
        </header>

        {!loaded && (
          <section className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-bold text-slate-900">
              Admin configuration access
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Enter the backend ADMIN_CONFIG_KEY to manage customer-flow
              settings.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input
                type="password"
                value={
                  adminKey
                }
                onChange={(
                  event,
                ) =>
                  setAdminKey(
                    event.target
                      .value,
                  )
                }
                onKeyDown={(
                  event,
                ) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    void loadAll();
                  }
                }}
                className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
                placeholder="ADMIN_CONFIG_KEY"
              />

              <button
                type="button"
                disabled={
                  loading
                }
                onClick={() =>
                  loadAll()
                }
                className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {loading
                  ? "Loading..."
                  : "Open Customer Flow"}
              </button>
            </div>
          </section>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {
              error
            }
          </div>
        )}

        {success && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            {
              success
            }
          </div>
        )}

        {loaded && (
          <>
            <nav className="grid gap-3 md:grid-cols-3">
              {tabs.map(
                (
                  item,
                ) => {
                  const Icon =
                    item.icon;

                  const active =
                    tab ===
                    item.id;

                  return (
                    <button
                      key={
                        item.id
                      }
                      type="button"
                      onClick={() =>
                        setTab(
                          item.id,
                        )
                      }
                      className={`rounded-2xl border p-4 text-left transition ${
                        active
                          ? "border-slate-900 bg-slate-950 text-white shadow-lg shadow-slate-200"
                          : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                            active
                              ? "bg-white/10"
                              : "bg-slate-100"
                          }`}
                        >
                          <Icon
                            size={
                              19
                            }
                          />
                        </span>

                        <div>
                          <strong className="block text-sm sm:text-base">
                            {
                              item.label
                            }
                          </strong>

                          <span
                            className={`mt-0.5 block text-xs ${
                              active
                                ? "text-slate-300"
                                : "text-slate-500"
                            }`}
                          >
                            {
                              item.description
                            }
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                },
              )}
            </nav>

            {tab ===
              "SERVICEABILITY" && (
              <section className="space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                        Add Serviceable Pincode
                      </h2>

                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Enter a 6-digit pincode. District and state are looked
                        up automatically before it can be added.
                      </p>
                    </div>

                    <span className="text-sm font-semibold text-emerald-700">
                      {activePincodes} active
                    </span>
                  </div>

                  <form
                    onSubmit={
                      addPincode
                    }
                    className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto]"
                  >
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                        Pincode
                      </label>

                      <div className="relative">
                        <input
                          value={
                            pincode
                          }
                          onChange={(
                            event,
                          ) => {
                            const value =
                              event.target.value
                                .replace(
                                  /\D/g,
                                  "",
                                )
                                .slice(
                                  0,
                                  6,
                                );

                            setPincode(
                              value,
                            );

                            setError(
                              "",
                            );

                            setSuccess(
                              "",
                            );
                          }}
                          inputMode="numeric"
                          maxLength={
                            6
                          }
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-10 outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
                          placeholder="400040"
                        />

                        {lookupLoading && (
                          <RefreshCw
                            size={
                              16
                            }
                            className="absolute right-3 top-3.5 animate-spin text-slate-400"
                          />
                        )}
                      </div>

                      {lookupError && (
                        <p className="mt-2 text-xs font-medium text-red-600">
                          {
                            lookupError
                          }
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                        District
                      </label>

                      <input
                        value={
                          lookup?.district ??
                          ""
                        }
                        readOnly
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700"
                        placeholder="Auto-filled"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                        State
                      </label>

                      <input
                        value={
                          lookup?.state ??
                          ""
                        }
                        readOnly
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700"
                        placeholder="Auto-filled"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={
                        !lookup ||
                        lookupLoading
                      }
                      className="self-end rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Add Pincode
                    </button>
                  </form>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        Serviceable Areas
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Activate or deactivate pickup coverage without deleting
                        history.
                      </p>
                    </div>

                    <div className="relative w-full md:max-w-sm">
                      <Search
                        size={
                          17
                        }
                        className="absolute left-3 top-3.5 text-slate-400"
                      />

                      <input
                        value={
                          pincodeSearch
                        }
                        onChange={(
                          event,
                        ) =>
                          setPincodeSearch(
                            event.target
                              .value,
                          )
                        }
                        className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 outline-none focus:border-slate-500"
                        placeholder="Search pincode, district or state"
                      />
                    </div>
                  </div>

                  <div className="mt-5 hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left">
                      <thead>
                        <tr className="text-xs uppercase tracking-wider text-slate-400">
                          <th className="border-b border-slate-200 px-4 py-3">
                            Pincode
                          </th>
                          <th className="border-b border-slate-200 px-4 py-3">
                            District
                          </th>
                          <th className="border-b border-slate-200 px-4 py-3">
                            State
                          </th>
                          <th className="border-b border-slate-200 px-4 py-3">
                            Status
                          </th>
                          <th className="border-b border-slate-200 px-4 py-3 text-right">
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredPincodes.map(
                          (
                            row,
                          ) => (
                            <tr
                              key={
                                row.id
                              }
                              className="text-sm"
                            >
                              <td className="border-b border-slate-100 px-4 py-4 font-bold text-slate-900">
                                {
                                  row.pincode
                                }
                              </td>

                              <td className="border-b border-slate-100 px-4 py-4 text-slate-600">
                                {row.district ||
                                  "—"}
                              </td>

                              <td className="border-b border-slate-100 px-4 py-4 text-slate-600">
                                {row.state ||
                                  "—"}
                              </td>

                              <td className="border-b border-slate-100 px-4 py-4">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusBadge(
                                    row.isActive,
                                  )}`}
                                >
                                  {row.isActive
                                    ? "Active"
                                    : "Inactive"}
                                </span>
                              </td>

                              <td className="border-b border-slate-100 px-4 py-4 text-right">
                                <button
                                  type="button"
                                  onClick={() =>
                                    togglePincode(
                                      row,
                                    )
                                  }
                                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                >
                                  {row.isActive
                                    ? "Deactivate"
                                    : "Activate"}
                                </button>
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-5 space-y-3 md:hidden">
                    {filteredPincodes.map(
                      (
                        row,
                      ) => (
                        <article
                          key={
                            row.id
                          }
                          className="rounded-2xl border border-slate-200 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <strong className="text-lg text-slate-900">
                                {
                                  row.pincode
                                }
                              </strong>

                              <p className="mt-1 text-sm text-slate-600">
                                {row.district ||
                                  "District unavailable"}
                              </p>

                              <p className="text-xs text-slate-400">
                                {row.state ||
                                  "State unavailable"}
                              </p>
                            </div>

                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusBadge(
                                row.isActive,
                              )}`}
                            >
                              {row.isActive
                                ? "Active"
                                : "Inactive"}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              togglePincode(
                                row,
                              )
                            }
                            className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700"
                          >
                            {row.isActive
                              ? "Deactivate"
                              : "Activate"}
                          </button>
                        </article>
                      ),
                    )}
                  </div>

                  {filteredPincodes.length ===
                    0 && (
                    <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-7 text-center text-sm text-slate-500">
                      No matching pincodes.
                    </div>
                  )}
                </div>
              </section>
            )}

            {tab ===
              "CANCELLATION" && (
              <div className="grid gap-6 xl:grid-cols-2">
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                      <ClipboardCheck
                        size={
                          19
                        }
                      />
                    </span>

                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        Customer Cancellation
                      </h2>

                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Reason is optional for the customer. If they select an
                        option marked for details, text becomes required.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    <input
                      value={
                        customerReasonLabel
                      }
                      onChange={(
                        event,
                      ) =>
                        setCustomerReasonLabel(
                          event.target
                            .value,
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 px-4 py-3"
                      placeholder="e.g. Expected a better price"
                    />

                    <label className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={
                          customerOther
                        }
                        onChange={(
                          event,
                        ) =>
                          setCustomerOther(
                            event.target
                              .checked,
                          )
                        }
                      />
                      Require written details for this option
                    </label>

                    <button
                      type="button"
                      onClick={() =>
                        addReason(
                          "CUSTOMER",
                          customerReasonLabel,
                          customerOther,
                        )
                      }
                      className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
                    >
                      Add Customer Reason
                    </button>
                  </div>

                  <ConfigRows
                    rows={
                      customerReasons
                    }
                    onToggle={
                      toggleReason
                    }
                  />
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-700">
                      <CircleX
                        size={
                          19
                        }
                      />
                    </span>

                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        Agent Cancellation
                      </h2>

                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Agent must select one active reason when the Agent Panel
                        cancellation action is connected.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    <input
                      value={
                        agentReasonLabel
                      }
                      onChange={(
                        event,
                      ) =>
                        setAgentReasonLabel(
                          event.target
                            .value,
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 px-4 py-3"
                      placeholder="e.g. Customer unavailable"
                    />

                    <label className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={
                          agentOther
                        }
                        onChange={(
                          event,
                        ) =>
                          setAgentOther(
                            event.target
                              .checked,
                          )
                        }
                      />
                      Require written details for this option
                    </label>

                    <button
                      type="button"
                      onClick={() =>
                        addReason(
                          "AGENT",
                          agentReasonLabel,
                          agentOther,
                        )
                      }
                      className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
                    >
                      Add Agent Reason
                    </button>
                  </div>

                  <ConfigRows
                    rows={
                      agentReasons
                    }
                    onToggle={
                      toggleReason
                    }
                  />
                </section>
              </div>
            )}

            {tab ===
              "FEEDBACK" && (
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                    <MessageSquareText
                      size={
                        19
                      }
                    />
                  </span>

                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Completed Order Feedback
                    </h2>

                    <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                      Create the selectable feedback responses shown only after
                      a customer order reaches COMPLETED.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto]">
                  <div className="space-y-3">
                    <input
                      value={
                        feedbackLabel
                      }
                      onChange={(
                        event,
                      ) =>
                        setFeedbackLabel(
                          event.target
                            .value,
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 px-4 py-3"
                      placeholder="e.g. Smooth pickup experience"
                    />

                    <label className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={
                          feedbackOther
                        }
                        onChange={(
                          event,
                        ) =>
                          setFeedbackOther(
                            event.target
                              .checked,
                          )
                        }
                      />
                      Require customer to write details for this option
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={
                      addFeedbackOption
                    }
                    className="h-fit rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
                  >
                    Add Feedback Option
                  </button>
                </div>

                <ConfigRows
                  rows={
                    feedbackOptions
                  }
                  onToggle={
                    toggleFeedback
                  }
                />
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
