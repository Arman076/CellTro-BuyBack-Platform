"use client";

import {
  AlertCircle,
  BadgeCheck,
  Check,
  Clock3,
  Eye,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  X,
  XCircle,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { vendorApi } from "@/lib/vendor-api";

import styles from "./VendorAgents.module.css";

type Tab =
  | "PENDING"
  | "ACTIVE"
  | "INACTIVE"
  | "REJECTED";

interface PendingAgent {
  id: number;
  agentCode: string;
  fullName: string;
  email: string | null;
  mobile: string;
  aadhaarMasked: string;
  createdAt: string;
}

interface ManagedAgent {
  id: number;
  agentCode: string;
  fullName: string;
  email: string | null;
  mobile: string;
  status:
    | "ACTIVE"
    | "INACTIVE"
    | "REJECTED"
    | "SUSPENDED";
  reviewedAt: string | null;
  rejectionReason: string | null;
  assignmentCount: number;
  createdAt: string;
  updatedAt: string;
}

interface PendingResponse {
  agents: PendingAgent[];
}

interface ManagedResponse {
  agents: ManagedAgent[];
}

interface AgentDetails {
  id: number;
  agentCode: string;
  fullName: string;
  email: string | null;
  mobile: string;
  aadhaarMasked?: string;
  address: string | null;
  emailVerifiedAt: string | null;
  status?: string;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  assignmentCount?: number;
  createdAt: string;
  updatedAt?: string;
}

interface ActionResponse {
  approved?: boolean;
  rejected?: boolean;
  alreadyProcessed?: boolean;
  message: string;
}

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

function initials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "A";
  }

  return parts
    .slice(0, 2)
    .map(
      (part) =>
        part[0]?.toUpperCase(),
    )
    .join("");
}

function getErrorMessage(
  error: unknown,
) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function getStatusLabel(
  status: ManagedAgent["status"],
) {
  switch (status) {
    case "ACTIVE":
      return "Active Agent";

    case "INACTIVE":
      return "Inactive";

    case "REJECTED":
      return "Rejected";

    case "SUSPENDED":
      return "Suspended";

    default:
      return status;
  }
}

export default function VendorAgents() {
  const [
    pendingAgents,
    setPendingAgents,
  ] = useState<PendingAgent[]>([]);

  const [
    managedAgents,
    setManagedAgents,
  ] = useState<ManagedAgent[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [activeTab, setActiveTab] =
    useState<Tab>("PENDING");

  const [
    selectedAgent,
    setSelectedAgent,
  ] = useState<AgentDetails | null>(
    null,
  );

  const [
    detailsLoadingId,
    setDetailsLoadingId,
  ] = useState<number | null>(null);

  const [
    approvingId,
    setApprovingId,
  ] = useState<number | null>(null);

  const [
    rejectingAgent,
    setRejectingAgent,
  ] = useState<PendingAgent | null>(
    null,
  );

  const [
    rejectionReason,
    setRejectionReason,
  ] = useState("");

  const [
    rejecting,
    setRejecting,
  ] = useState(false);

  /*
   * Pending requests have a dedicated API.
   */
  const loadPending =
    useCallback(async () => {
      const response =
        await vendorApi<PendingResponse>(
          "/vendor-agents/requests",
          {
            method: "GET",
            cache: "no-store",
          },
        );

      setPendingAgents(
        Array.isArray(response.agents)
          ? response.agents
          : [],
      );
    }, []);

  /*
   * ACTIVE / INACTIVE / REJECTED
   * use the management API.
   */
  const loadManaged =
    useCallback(
      async (
        status:
          | "ACTIVE"
          | "INACTIVE"
          | "REJECTED",
      ) => {
        const response =
          await vendorApi<ManagedResponse>(
            `/vendor-agents?status=${status}`,
            {
              method: "GET",
              cache: "no-store",
            },
          );

        setManagedAgents(
          Array.isArray(response.agents)
            ? response.agents
            : [],
        );
      },
      [],
    );

  const loadCurrentTab =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        if (
          activeTab === "PENDING"
        ) {
          await loadPending();
          setManagedAgents([]);
        } else {
          await loadManaged(
            activeTab,
          );
        }
      } catch (requestError) {
        setError(
          getErrorMessage(
            requestError,
          ),
        );
      } finally {
        setLoading(false);
      }
    }, [
      activeTab,
      loadManaged,
      loadPending,
    ]);

  useEffect(() => {
    void loadCurrentTab();
  }, [loadCurrentTab]);

  useEffect(() => {
    if (!success) {
      return;
    }

    const timer =
      window.setTimeout(() => {
        setSuccess("");
      }, 3500);

    return () =>
      window.clearTimeout(timer);
  }, [success]);

  const pendingCount =
    pendingAgents.length;

  const displayedAgents =
    useMemo(() => {
      const source =
        activeTab === "PENDING"
          ? pendingAgents
          : managedAgents;

      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return source;
      }

      return source.filter(
        (agent) =>
          agent.fullName
            .toLowerCase()
            .includes(query) ||
          agent.agentCode
            .toLowerCase()
            .includes(query) ||
          agent.mobile.includes(
            query,
          ) ||
          agent.email
            ?.toLowerCase()
            .includes(query),
      );
    }, [
      activeTab,
      managedAgents,
      pendingAgents,
      search,
    ]);

  async function openDetails(
    agentId: number,
  ) {
    setDetailsLoadingId(agentId);
    setError("");

    try {
      const endpoint =
        activeTab === "PENDING"
          ? `/vendor-agents/requests/${agentId}`
          : `/vendor-agents/${agentId}`;

      const response =
        await vendorApi<AgentDetails>(
          endpoint,
          {
            method: "GET",
            cache: "no-store",
          },
        );

      setSelectedAgent(response);
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
        ),
      );
    } finally {
      setDetailsLoadingId(null);
    }
  }

  async function approveAgent(
    agentId: number,
  ) {
    if (approvingId !== null) {
      return;
    }

    setApprovingId(agentId);
    setError("");

    try {
      const response =
        await vendorApi<ActionResponse>(
          `/vendor-agents/${agentId}/approve`,
          {
            method: "POST",
          },
        );

      setPendingAgents(
        (current) =>
          current.filter(
            (agent) =>
              agent.id !== agentId,
          ),
      );

      if (
        selectedAgent?.id ===
        agentId
      ) {
        setSelectedAgent(null);
      }

      setSuccess(
        response.message ||
          "Agent approved successfully.",
      );

      /*
       * User can immediately switch
       * to Active Agents and see it.
       */
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
        ),
      );
    } finally {
      setApprovingId(null);
    }
  }

  function startReject(
    agent: PendingAgent,
  ) {
    setError("");
    setRejectionReason("");
    setRejectingAgent(agent);
  }

  async function confirmReject() {
    if (!rejectingAgent) {
      return;
    }

    const reason =
      rejectionReason.trim();

    if (reason.length < 3) {
      setError(
        "Please enter a valid rejection reason.",
      );
      return;
    }

    if (reason.length > 500) {
      setError(
        "Rejection reason cannot exceed 500 characters.",
      );
      return;
    }

    setRejecting(true);
    setError("");

    try {
      const response =
        await vendorApi<ActionResponse>(
          `/vendor-agents/${rejectingAgent.id}/reject`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              reason,
            }),
          },
        );

      setPendingAgents(
        (current) =>
          current.filter(
            (agent) =>
              agent.id !==
              rejectingAgent.id,
          ),
      );

      if (
        selectedAgent?.id ===
        rejectingAgent.id
      ) {
        setSelectedAgent(null);
      }

      setSuccess(
        response.message ||
          "Agent registration rejected.",
      );

      setRejectingAgent(null);
      setRejectionReason("");
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
        ),
      );
    } finally {
      setRejecting(false);
    }
  }

  function changeTab(tab: Tab) {
    setSearch("");
    setError("");
    setSelectedAgent(null);
    setActiveTab(tab);
  }

  const emptyTitle =
    search
      ? "No matching agents"
      : activeTab === "PENDING"
        ? "No pending requests"
        : activeTab === "ACTIVE"
          ? "No active agents"
          : activeTab ===
              "INACTIVE"
            ? "No inactive agents"
            : "No rejected applications";

  const emptyDescription =
    search
      ? "Try a different name, agent code, email or mobile number."
      : activeTab === "PENDING"
        ? "New agent registration requests will appear here automatically."
        : activeTab === "ACTIVE"
          ? "Approved agents will appear here."
          : activeTab ===
              "INACTIVE"
            ? "Inactive agents will appear here."
            : "Rejected agent applications will appear here.";

  return (
    <div className={styles.page}>
      {success && (
        <div
          className={
            styles.successToast
          }
          role="status"
        >
          <span
            className={
              styles.successIcon
            }
          >
            <Check size={18} />
          </span>

          <div>
            <strong>
              Success
            </strong>

            <span>
              {success}
            </span>
          </div>
        </div>
      )}

      <section
        className={styles.header}
      >
        <div>
          <div
            className={
              styles.eyebrow
            }
          >
            <Users size={15} />
            AGENT MANAGEMENT
          </div>

          <h1>Agents</h1>

          <p>
            Review applications and
            manage your pickup
            workforce.
          </p>
        </div>

        <div
          className={
            styles.headerStats
          }
        >
          <div
            className={
              styles.statIcon
            }
          >
            {activeTab ===
            "PENDING" ? (
              <Clock3 size={21} />
            ) : (
              <Users size={21} />
            )}
          </div>

          <div>
            <span>
              {activeTab ===
              "PENDING"
                ? "Pending Requests"
                : activeTab ===
                    "ACTIVE"
                  ? "Active Agents"
                  : activeTab ===
                      "INACTIVE"
                    ? "Inactive Agents"
                    : "Rejected"}
            </span>

            <strong>
              {activeTab ===
              "PENDING"
                ? pendingAgents.length
                : managedAgents.length}
            </strong>
          </div>
        </div>
      </section>

      {error && (
        <div
          className={
            styles.errorBox
          }
          role="alert"
        >
          <AlertCircle size={19} />

          <span>{error}</span>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
            aria-label="Dismiss error"
          >
            <X size={17} />
          </button>
        </div>
      )}

      <section
        className={
          styles.toolbarCard
        }
      >
        <div
          className={styles.tabs}
        >
          <button
            type="button"
            className={
              activeTab ===
              "PENDING"
                ? styles.activeTab
                : ""
            }
            onClick={() =>
              changeTab("PENDING")
            }
          >
            Pending Requests

            {pendingCount > 0 && (
              <span>
                {pendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            className={
              activeTab ===
              "ACTIVE"
                ? styles.activeTab
                : ""
            }
            onClick={() =>
              changeTab("ACTIVE")
            }
          >
            Active Agents
          </button>

          <button
            type="button"
            className={
              activeTab ===
              "INACTIVE"
                ? styles.activeTab
                : ""
            }
            onClick={() =>
              changeTab(
                "INACTIVE",
              )
            }
          >
            Inactive
          </button>

          <button
            type="button"
            className={
              activeTab ===
              "REJECTED"
                ? styles.activeTab
                : ""
            }
            onClick={() =>
              changeTab(
                "REJECTED",
              )
            }
          >
            Rejected
          </button>
        </div>

        <div
          className={styles.search}
        >
          <Search size={18} />

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="Search agent..."
            aria-label="Search agents"
          />
        </div>
      </section>

      {loading ? (
        <section
          className={
            styles.loadingState
          }
        >
          <LoaderCircle
            size={30}
            className={
              styles.spinner
            }
          />

          <strong>
            Loading agents...
          </strong>

          <span>
            Fetching vendor agent
            records.
          </span>
        </section>
      ) : displayedAgents.length ===
        0 ? (
        <section
          className={
            styles.emptyState
          }
        >
          <div
            className={
              styles.emptyIcon
            }
          >
            <BadgeCheck size={30} />
          </div>

          <h2>{emptyTitle}</h2>

          <p>
            {emptyDescription}
          </p>
        </section>
      ) : (
        <section
          className={
            styles.agentGrid
          }
        >
          {displayedAgents.map(
            (agent) => {
              const isPending =
                activeTab ===
                "PENDING";

              const pendingAgent =
                isPending
                  ? (agent as PendingAgent)
                  : null;

              const managedAgent =
                !isPending
                  ? (agent as ManagedAgent)
                  : null;

              return (
                <article
                  key={agent.id}
                  className={
                    styles.agentCard
                  }
                >
                  <div
                    className={
                      styles.cardTop
                    }
                  >
                    <div
                      className={
                        styles.identity
                      }
                    >
                      <div
                        className={
                          styles.avatar
                        }
                      >
                        {initials(
                          agent.fullName,
                        )}
                      </div>

                      <div>
                        <div
                          className={
                            styles.pendingBadge
                          }
                        >
                          {isPending ? (
                            <>
                              <Clock3
                                size={
                                  12
                                }
                              />
                              Pending
                              Review
                            </>
                          ) : (
                            <>
                              <BadgeCheck
                                size={
                                  12
                                }
                              />
                              {getStatusLabel(
                                managedAgent!
                                  .status,
                              )}
                            </>
                          )}
                        </div>

                        <h2>
                          {
                            agent.fullName
                          }
                        </h2>

                        <span
                          className={
                            styles.agentCode
                          }
                        >
                          {
                            agent.agentCode
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    className={
                      styles.infoList
                    }
                  >
                    <div>
                      <span
                        className={
                          styles.infoIcon
                        }
                      >
                        <Phone
                          size={16}
                        />
                      </span>

                      <div>
                        <small>
                          Mobile
                        </small>

                        <strong>
                          {
                            agent.mobile
                          }
                        </strong>
                      </div>
                    </div>

                    <div>
                      <span
                        className={
                          styles.infoIcon
                        }
                      >
                        <Mail
                          size={16}
                        />
                      </span>

                      <div>
                        <small>
                          Email
                        </small>

                        <strong>
                          {agent.email ||
                            "—"}
                        </strong>
                      </div>
                    </div>

                    {pendingAgent ? (
                      <div>
                        <span
                          className={
                            styles.infoIcon
                          }
                        >
                          <ShieldCheck
                            size={
                              16
                            }
                          />
                        </span>

                        <div>
                          <small>
                            Aadhaar
                          </small>

                          <strong>
                            {
                              pendingAgent.aadhaarMasked
                            }
                          </strong>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span
                          className={
                            styles.infoIcon
                          }
                        >
                          <Users
                            size={
                              16
                            }
                          />
                        </span>

                        <div>
                          <small>
                            Order
                            Assignments
                          </small>

                          <strong>
                            {
                              managedAgent!
                                .assignmentCount
                            }
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>

                  <div
                    className={
                      styles.requested
                    }
                  >
                    <Clock3
                      size={14}
                    />

                    <span>
                      {isPending
                        ? "Requested "
                        : "Registered "}

                      {formatDate(
                        agent.createdAt,
                      )}
                    </span>
                  </div>

                  {managedAgent
                    ?.status ===
                    "REJECTED" &&
                    managedAgent.rejectionReason && (
                      <div
                        className={
                          styles.requested
                        }
                      >
                        <XCircle
                          size={
                            14
                          }
                        />

                        <span>
                          Reason:{" "}
                          {
                            managedAgent.rejectionReason
                          }
                        </span>
                      </div>
                    )}

                  <div
                    className={
                      styles.actions
                    }
                  >
                    <button
                      type="button"
                      className={
                        styles.viewButton
                      }
                      disabled={
                        detailsLoadingId ===
                        agent.id
                      }
                      onClick={() =>
                        void openDetails(
                          agent.id,
                        )
                      }
                    >
                      {detailsLoadingId ===
                      agent.id ? (
                        <LoaderCircle
                          size={17}
                          className={
                            styles.spinner
                          }
                        />
                      ) : (
                        <Eye
                          size={17}
                        />
                      )}

                      View
                    </button>

                    {pendingAgent && (
                      <>
                        <button
                          type="button"
                          className={
                            styles.rejectButton
                          }
                          onClick={() =>
                            startReject(
                              pendingAgent,
                            )
                          }
                        >
                          <XCircle
                            size={
                              17
                            }
                          />
                          Reject
                        </button>

                        <button
                          type="button"
                          className={
                            styles.approveButton
                          }
                          disabled={
                            approvingId !==
                            null
                          }
                          onClick={() =>
                            void approveAgent(
                              pendingAgent.id,
                            )
                          }
                        >
                          {approvingId ===
                          pendingAgent.id ? (
                            <LoaderCircle
                              size={
                                17
                              }
                              className={
                                styles.spinner
                              }
                            />
                          ) : (
                            <Check
                              size={
                                17
                              }
                            />
                          )}

                          {approvingId ===
                          pendingAgent.id
                            ? "Approving"
                            : "Approve"}
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            },
          )}
        </section>
      )}

      {selectedAgent && (
        <div
          className={
            styles.modalBackdrop
          }
          role="presentation"
          onMouseDown={() =>
            setSelectedAgent(null)
          }
        >
          <section
            className={
              styles.detailModal
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="agent-detail-title"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div
              className={
                styles.modalHeader
              }
            >
              <div>
                <span
                  className={
                    styles.modalLabel
                  }
                >
                  AGENT DETAILS
                </span>

                <h2
                  id="agent-detail-title"
                >
                  {activeTab ===
                  "PENDING"
                    ? "Review Application"
                    : "Agent Profile"}
                </h2>
              </div>

              <button
                type="button"
                className={
                  styles.closeButton
                }
                onClick={() =>
                  setSelectedAgent(
                    null,
                  )
                }
                aria-label="Close agent details"
              >
                <X size={20} />
              </button>
            </div>

            <div
              className={
                styles.profileHeader
              }
            >
              <div
                className={
                  styles.largeAvatar
                }
              >
                {initials(
                  selectedAgent.fullName,
                )}
              </div>

              <div>
                <div
                  className={
                    styles.pendingBadge
                  }
                >
                  {activeTab ===
                  "PENDING" ? (
                    <>
                      <Clock3
                        size={12}
                      />
                      Pending
                      Approval
                    </>
                  ) : (
                    <>
                      <BadgeCheck
                        size={12}
                      />
                      {selectedAgent.status ||
                        activeTab}
                    </>
                  )}
                </div>

                <h3>
                  {
                    selectedAgent.fullName
                  }
                </h3>

                <span>
                  {
                    selectedAgent.agentCode
                  }
                </span>
              </div>
            </div>

            <div
              className={
                styles.detailGrid
              }
            >
              <div
                className={
                  styles.detailItem
                }
              >
                <Phone size={18} />

                <div>
                  <span>
                    Mobile Number
                  </span>

                  <strong>
                    {
                      selectedAgent.mobile
                    }
                  </strong>
                </div>
              </div>

              <div
                className={
                  styles.detailItem
                }
              >
                <Mail size={18} />

                <div>
                  <span>
                    Email Address
                  </span>

                  <strong>
                    {selectedAgent.email ||
                      "—"}
                  </strong>
                </div>
              </div>

              <div
                className={
                  styles.detailItem
                }
              >
                <ShieldCheck
                  size={18}
                />

                <div>
                  <span>
                    Aadhaar
                  </span>

                  <strong>
                    {selectedAgent.aadhaarMasked ||
                      "—"}
                  </strong>
                </div>
              </div>

              <div
                className={
                  styles.detailItem
                }
              >
                <BadgeCheck
                  size={18}
                />

                <div>
                  <span>
                    Email Verification
                  </span>

                  <strong>
                    {selectedAgent.emailVerifiedAt
                      ? "Verified"
                      : "Not verified"}
                  </strong>
                </div>
              </div>

              {activeTab !==
                "PENDING" && (
                <div
                  className={
                    styles.detailItem
                  }
                >
                  <Users size={18} />

                  <div>
                    <span>
                      Order
                      Assignments
                    </span>

                    <strong>
                      {selectedAgent.assignmentCount ??
                        0}
                    </strong>
                  </div>
                </div>
              )}

              {selectedAgent.reviewedAt && (
                <div
                  className={
                    styles.detailItem
                  }
                >
                  <Clock3
                    size={18}
                  />

                  <div>
                    <span>
                      Reviewed At
                    </span>

                    <strong>
                      {formatDate(
                        selectedAgent.reviewedAt,
                      )}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            <div
              className={
                styles.addressCard
              }
            >
              <MapPin size={20} />

              <div>
                <span>
                  Residential
                  Address
                </span>

                <strong>
                  {selectedAgent.address ||
                    "—"}
                </strong>
              </div>
            </div>

            {selectedAgent.rejectionReason && (
              <div
                className={
                  styles.registeredCard
                }
              >
                <XCircle
                  size={18}
                />

                <div>
                  <span>
                    Rejection
                    Reason
                  </span>

                  <strong>
                    {
                      selectedAgent.rejectionReason
                    }
                  </strong>
                </div>
              </div>
            )}

            <div
              className={
                styles.registeredCard
              }
            >
              <UserRound size={18} />

              <div>
                <span>
                  Registered
                </span>

                <strong>
                  {formatDate(
                    selectedAgent.createdAt,
                  )}
                </strong>
              </div>
            </div>

            {activeTab ===
              "PENDING" && (
              <div
                className={
                  styles.modalActions
                }
              >
                <button
                  type="button"
                  className={
                    styles.modalReject
                  }
                  onClick={() => {
                    const pending =
                      pendingAgents.find(
                        (agent) =>
                          agent.id ===
                          selectedAgent.id,
                      );

                    if (pending) {
                      setSelectedAgent(
                        null,
                      );

                      startReject(
                        pending,
                      );
                    }
                  }}
                >
                  <XCircle
                    size={18}
                  />
                  Reject Application
                </button>

                <button
                  type="button"
                  className={
                    styles.modalApprove
                  }
                  disabled={
                    approvingId !==
                    null
                  }
                  onClick={() =>
                    void approveAgent(
                      selectedAgent.id,
                    )
                  }
                >
                  {approvingId ===
                  selectedAgent.id ? (
                    <LoaderCircle
                      size={18}
                      className={
                        styles.spinner
                      }
                    />
                  ) : (
                    <Check
                      size={18}
                    />
                  )}

                  {approvingId ===
                  selectedAgent.id
                    ? "Approving..."
                    : "Approve Agent"}
                </button>
              </div>
            )}
          </section>
        </div>
      )}

      {rejectingAgent && (
        <div
          className={
            styles.modalBackdrop
          }
          role="presentation"
          onMouseDown={() => {
            if (!rejecting) {
              setRejectingAgent(
                null,
              );
            }
          }}
        >
          <section
            className={
              styles.rejectModal
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-title"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div
              className={
                styles.rejectIcon
              }
            >
              <XCircle size={27} />
            </div>

            <h2 id="reject-title">
              Reject application?
            </h2>

            <p>
              You are rejecting{" "}
              <strong>
                {
                  rejectingAgent.fullName
                }
              </strong>
              . Please provide a
              reason.
            </p>

            <label
              className={
                styles.reasonField
              }
            >
              <span>
                Rejection reason
              </span>

              <textarea
                value={
                  rejectionReason
                }
                onChange={(event) =>
                  setRejectionReason(
                    event.target.value,
                  )
                }
                maxLength={500}
                rows={4}
                placeholder="Enter reason..."
                disabled={rejecting}
                autoFocus
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
                styles.rejectActions
              }
            >
              <button
                type="button"
                className={
                  styles.cancelButton
                }
                disabled={rejecting}
                onClick={() =>
                  setRejectingAgent(
                    null,
                  )
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className={
                  styles.confirmReject
                }
                disabled={
                  rejecting ||
                  rejectionReason
                    .trim()
                    .length < 3
                }
                onClick={() =>
                  void confirmReject()
                }
              >
                {rejecting ? (
                  <LoaderCircle
                    size={17}
                    className={
                      styles.spinner
                    }
                  />
                ) : (
                  <XCircle
                    size={17}
                  />
                )}

                {rejecting
                  ? "Rejecting..."
                  : "Reject Agent"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}