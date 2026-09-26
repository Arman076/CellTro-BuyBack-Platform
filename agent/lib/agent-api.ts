const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type ApiErrorBody = {
  message?: string | string[];
  error?: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,

    headers: {
      "Content-Type": "application/json",

      ...options.headers,
    },

    credentials: "include",

    cache: "no-store",
  });

  if (!response.ok) {
    let body: ApiErrorBody = {};

    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      // Response body may be empty.
    }

    const message = Array.isArray(body.message)
      ? body.message[0]
      : (body.message ?? "Something went wrong. Please try again.");

    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

/* ============================================================
 * AGENT REGISTRATION / AUTH
 * ============================================================
 */

export type SendOtpResponse = {
  challengeId: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
};

export type VerifyOtpResponse = {
  verified: boolean;
  verificationToken: string;
};

export type RegistrationResponse = {
  registered: boolean;
  message: string;

  agent: {
    id: number;
    agentCode: string;
    fullName: string;
    email: string;
    mobile: string;
    status: string;
  };

  vendor: {
    vendorCode: string;
    businessName: string;
  };
};

export type AgentLoginResponse = {
  authenticated: boolean;

  agent: {
    id: number;
    agentCode: string;
    fullName: string;
    email: string;
    mobile: string;

    vendor: {
      vendorCode: string;
      businessName: string;
    };
  };
};

export type AgentMeResponse = {
  authenticated: boolean;

  agent: {
    id: number;
    agentCode: string;
    fullName: string;
    email: string;
    mobile: string;
    status: string;
  };

  vendor: {
    vendorCode: string;
    businessName: string;
  };
};

export function sendAgentOtp(email: string) {
  return request<SendOtpResponse>("/agent-auth/send-email-otp", {
    method: "POST",

    body: JSON.stringify({
      email,
    }),
  });
}

export function verifyAgentOtp(
  challengeId: string,
  email: string,
  otp: string,
) {
  return request<VerifyOtpResponse>("/agent-auth/verify-email-otp", {
    method: "POST",

    body: JSON.stringify({
      challengeId,
      email,
      otp,
    }),
  });
}

export function registerAgent(data: {
  fullName: string;
  email: string;
  mobile: string;
  aadhaarNumber: string;
  address: string;
  vendorCode: string;
  password: string;
  verificationToken: string;
}) {
  return request<RegistrationResponse>("/agent-auth/register", {
    method: "POST",

    body: JSON.stringify(data),
  });
}

export function loginAgent(identifier: string, password: string) {
  return request<AgentLoginResponse>("/agent-auth/login", {
    method: "POST",

    body: JSON.stringify({
      identifier,
      password,
    }),
  });
}

export function getAgentMe() {
  return request<AgentMeResponse>("/agent-account/me", {
    method: "GET",
  });
}

export function logoutAgent() {
  return request<{
    authenticated: boolean;
  }>("/agent-account/logout", {
    method: "POST",
  });
}

/* ============================================================
 * AGENT DASHBOARD
 * ============================================================
 */

export type DashboardRange =
  "TODAY" | "TOMORROW" | "YESTERDAY" | "ALL" | "LAST_7_DAYS" | "LAST_30_DAYS";

export type DashboardPickup = {
  assignmentId: number | null;

  assignedAt: string | null;

  orderId: string;
  orderNumber: string;

  product: {
    name: string;
    variant: string;
    image: string | null;
  };

  customer: {
    name: string;
    phone: string;
    email: string | null;
  } | null;

  pickup: {
    date: string;

    slot: {
      code: string;
      label: string;
      startTime: string;
      endTime: string;
    };
  };

  address: {
    house: string;
    street: string;
    locality: string;
    landmark: string | null;
    pincode: string;
    city: string;
    state: string;
    email: string | null;
  } | null;

  dealValue: number;
  status: string;
};

export type AgentDashboardResponse = {
  agent: {
    id: number;
    agentCode: string;
    fullName: string;
  };

  vendor: {
    vendorCode: string;
    businessName: string;
  };

  filter: {
    range: DashboardRange;
    label: string;
  };

  summary: {
    assigned: number;
    pickups: number;
    pending: number;
    completed: number;
    dealValue: number;
  };

  pickups: DashboardPickup[];
};

export function getAgentDashboard(range: DashboardRange = "TODAY") {
  const params = new URLSearchParams({
    range,
  });

  return request<AgentDashboardResponse>(
    `/agent-dashboard?${params.toString()}`,
    {
      method: "GET",
    },
  );
}

/* ============================================================
 * AGENT ORDERS
 * ============================================================
 */

export type AgentOrderStatusGroup =
  "ALL" | "PENDING" | "IN_PROCESS" | "COMPLETED";

export type AgentOrderDateFilter =
  "ALL" | "TODAY" | "TOMORROW" | "YESTERDAY" | "LAST_7_DAYS" | "LAST_30_DAYS";

export type AgentOrderListItem = {
  id: string;
  orderNumber: string;

  product: {
    name: string;
    variant: string;
    image: string | null;
  };

  customer: {
    name: string;
    phone: string;
  } | null;

  address: {
    house: string;
    street: string;
    locality: string;
    landmark: string | null;
    pincode: string;
    city: string;
    state: string;
  } | null;

  pickup: {
    date: string;

    slot: {
      code: string;
      label: string;
      startTime: string;
      endTime: string;
    };
  };

  status: string;
  dealValue: number;

  assignment: {
    id: number;
    source: string;
    assignedAt: string;
  } | null;

  createdAt: string;
  updatedAt: string;
};

export type AgentOrdersResponse = {
  data: AgentOrderListItem[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  filters: {
    search: string;
    statusGroup: AgentOrderStatusGroup;
    dateFilter: AgentOrderDateFilter;
  };
};

export async function getAgentOrders(
  options: {
    search?: string;
    statusGroup?: AgentOrderStatusGroup;
    dateFilter?: AgentOrderDateFilter;
    page?: number;
    limit?: number;
  } = {},
) {
  const params = new URLSearchParams();

  if (options.search?.trim()) {
    params.set("search", options.search.trim());
  }

  params.set("statusGroup", options.statusGroup ?? "ALL");

  params.set("dateFilter", options.dateFilter ?? "ALL");

  params.set("page", String(options.page ?? 1));

  params.set("limit", String(options.limit ?? 20));

  return request<AgentOrdersResponse>(`/agent-orders?${params.toString()}`, {
    method: "GET",
  });
}

/* ============================================================
 * AGENT ORDER DETAILS
 * ============================================================
 */

export type AgentOrderDetailResponse = {
  id: string;
  orderNumber: string;

  product: {
    id: number;
    variantId: number;
    name: string;
    variant: string;
    image: string | null;
  };

  customer: {
    name: string;
    phone: string;
    email: string | null;
  } | null;

  address: {
    fullName: string;
    phone: string;
    email: string | null;
    house: string;
    street: string;
    locality: string;
    landmark: string | null;
    pincode: string;
    city: string;
    state: string;
    type: string;
  } | null;

  pickup: {
    date: string;

    slot: {
      code: string;
      label: string;
      startTime: string;
      endTime: string;
    };
  };

  pricing: {
    basePrice: number;
    totalDeduction: number;
    finalPrice: number;
  };

  payoutMethod: string;
  status: string;

  assignment: {
    id: number;
    source: string;
    assignedAt: string;
  } | null;

  statusHistory: {
    id: number;
    status: string;
    note: string | null;
    createdAt: string;
  }[];

  createdAt: string;
  updatedAt: string;
};

export function getAgentOrder(orderNumber: string) {
  const normalized = orderNumber.trim();

  if (!normalized) {
    throw new Error("Order number is required.");
  }

  return request<AgentOrderDetailResponse>(
    `/agent-orders/${encodeURIComponent(normalized)}`,
    {
      method: "GET",
    },
  );
}

/* ============================================================
 * ORDER VERIFICATION
 *
 * Customer verification for:
 * - inspection start
 * - quote acceptance
 * - quote rejection
 *
 * Pricing is NOT calculated here.
 * ============================================================
 */

export type OrderVerificationPurpose =
  "INSPECTION_START" | "QUOTE_ACCEPT" | "QUOTE_REJECT";

export type OrderVerificationChannel = "SMS" | "EMAIL";

export type OrderVerificationSendResponse = {
  challengeId: string;

  purpose: OrderVerificationPurpose;

  channel: OrderVerificationChannel;

  destinationMasked: string;

  expiresAt: string;

  expiresInSeconds: number;
};

export type OrderVerificationVerifyResponse = {
  verified: boolean;

  challengeId: string;

  purpose: OrderVerificationPurpose;

  channel: OrderVerificationChannel;

  verifiedAt?: string;
};

export type StartInspectionResponse = {
  started: boolean;
  alreadyStarted: boolean;
  orderNumber: string;
  status: string;

  inspection: {
    id: string;
    started: boolean;

    challengeId: string;

    verificationPurpose: OrderVerificationPurpose;

    verificationChannel: OrderVerificationChannel;

    verifiedAt: string | null;

    startedAt: string | null;
  };

  evidence: {
    enabled: boolean;
  };
};

function normalizeOrderNumber(orderNumber: string) {
  const normalized = orderNumber.trim();

  if (!normalized) {
    throw new Error("Order number is required.");
  }

  return normalized;
}

export function sendOrderVerification(
  orderNumber: string,
  data: {
    destination: string;
    purpose: OrderVerificationPurpose;
  },
) {
  const normalizedOrderNumber = normalizeOrderNumber(orderNumber);

  const destination = data.destination.trim();

  if (!destination) {
    throw new Error("Mobile number or email is required.");
  }

  return request<OrderVerificationSendResponse>(
    `/agent-orders/${encodeURIComponent(
      normalizedOrderNumber,
    )}/verification/send`,
    {
      method: "POST",

      body: JSON.stringify({
        destination,
        purpose: data.purpose,
      }),
    },
  );
}

export function verifyOrderVerification(
  orderNumber: string,
  data: {
    challengeId: string;
    otp: string;
    destination?: string;
  },
) {
  const normalizedOrderNumber = normalizeOrderNumber(orderNumber);

  const challengeId = data.challengeId.trim();

  const otp = data.otp.replace(/\D/g, "").trim();

  if (!challengeId) {
    throw new Error("Verification challenge is required.");
  }

  if (!/^\d{4,9}$/.test(otp)) {
    throw new Error("Enter a valid OTP.");
  }

  return request<OrderVerificationVerifyResponse>(
    `/agent-orders/${encodeURIComponent(
      normalizedOrderNumber,
    )}/verification/verify`,
    {
      method: "POST",

      body: JSON.stringify({
        challengeId,
        otp,
        ...(data.destination?.trim()
          ? { destination: data.destination.trim() }
          : {}),
      }),
    },
  );
}

export function startOrderInspection(orderNumber: string, challengeId: string) {
  const normalizedOrderNumber = normalizeOrderNumber(orderNumber);

  const normalizedChallengeId = challengeId.trim();

  if (!normalizedChallengeId) {
    throw new Error("Verified challenge is required.");
  }

  return request<StartInspectionResponse>(
    `/agent-orders/${encodeURIComponent(
      normalizedOrderNumber,
    )}/verification/start-inspection`,
    {
      method: "POST",

      body: JSON.stringify({
        challengeId: normalizedChallengeId,
      }),
    },
  );
}

export type AgentQuoteDecision = "ACCEPTED" | "REJECTED";

export type AgentQuoteDecisionResponse = {
  decided: boolean;
  alreadyDecided: boolean;
  orderNumber: string;
  orderStatus: string;
  decision: AgentQuoteDecision;
  decisionAt: string;
  inspectionId: string;

  quote: {
    finalPrice: number;
    quoteHash: string;
    generatedAt: string;
  };

  nextStep: "PAYMENT" | "REJECTED";
};

export function commitAgentQuoteDecision(
  orderNumber: string,
  data: {
    challengeId: string;
    decision: AgentQuoteDecision;
  },
) {
  const normalizedOrderNumber = normalizeOrderNumber(orderNumber);

  const challengeId = data.challengeId.trim();

  if (!challengeId) {
    throw new Error("Verified quote decision challenge is required.");
  }

  if (data.decision !== "ACCEPTED" && data.decision !== "REJECTED") {
    throw new Error("Decision must be ACCEPTED or REJECTED.");
  }

  return request<AgentQuoteDecisionResponse>(
    `/agent-orders/${encodeURIComponent(
      normalizedOrderNumber,
    )}/verification/quote-decision`,
    {
      method: "POST",

      body: JSON.stringify({
        challengeId,
        decision: data.decision,
      }),
    },
  );
}

/* ============================================================
 * AGENT DEVICE INSPECTION
 * ============================================================
 */

export type AgentInspectionAnswer = {
  questionId: number;
  optionIds: number[];
};

export type AgentInspectionChildOption = {
  id: number;
  label: string;
  value: string;
  issueCode: string | null;
  severity: string | null;
  issueGroupId: number | null;
};

export type AgentInspectionOption = {
  id: number;
  label: string;
  value: string;
  issueCode: string | null;
  severity: string | null;

  showChildOptions: boolean;
  childPrompt: string | null;

  requireChildSelection: boolean;
  minChildSelections: number;
  maxChildSelections: number | null;

  childSelectionMode: "SINGLE" | "MULTIPLE" | string;

  issueGroups: {
    id: number;
    name: string;
    displayOrder: number;
  }[];

  childOptions: AgentInspectionChildOption[];
};

export type AgentInspectionQuestion = {
  id: number;
  code: string;
  name: string;
  questionText: string;

  answerType: "YES_NO" | "SINGLE_SELECT" | "MULTI_SELECT" | string;

  displayOrder: number;
  isRequired: boolean;

  section: {
    id: number;
    code: string;
    name: string;
    displayOrder: number;
    calculationMode: string;
  };

  dependsOnOptionIds: number[];

  options: AgentInspectionOption[];
};

export type AgentInspectionQuote = {
  basePrice: number;
  rawDeduction: number;
  totalDeduction: number;
  finalPrice: number;
  quoteHash: string;
  quoteGeneratedAt: string;
};

export type AgentInspectionResponse = {
  orderNumber: string;
  status: string;

  product: {
    id: number;
    variantId: number;
    name: string;
    variant: string;
    image: string | null;
  };

  inspection: {
    id: string;

    status: "IN_PROGRESS" | "COMPLETED";

    startedAt: string;
    completedAt: string | null;

    answers: AgentInspectionAnswer[];

    quote: AgentInspectionQuote | null;
  };

  questionnaire: AgentInspectionQuestion[];
};

export type SaveAgentInspectionAnswersResponse = {
  saved: boolean;
  orderNumber: string;
  inspectionId: string;
  answerCount: number;
};

export type CompleteAgentInspectionResponse = {
  completed: boolean;
  alreadyCompleted: boolean;
  orderNumber: string;
  status: string;

  inspection: {
    id: string;
    status: "COMPLETED";
    completedAt: string;
  };

  quote: AgentInspectionQuote;
};

export function getAgentInspection(orderNumber: string) {
  const normalized = normalizeOrderNumber(orderNumber);

  return request<AgentInspectionResponse>(
    `/agent-orders/${encodeURIComponent(normalized)}/inspection`,
    {
      method: "GET",
    },
  );
}

export function saveAgentInspectionAnswers(
  orderNumber: string,
  answers: AgentInspectionAnswer[],
) {
  const normalized = normalizeOrderNumber(orderNumber);

  return request<SaveAgentInspectionAnswersResponse>(
    `/agent-orders/${encodeURIComponent(normalized)}/inspection/answers`,
    {
      method: "PATCH",

      body: JSON.stringify({
        answers,
      }),
    },
  );
}

export function completeAgentInspection(
  orderNumber: string,
  answers: AgentInspectionAnswer[],
) {
  const normalized = normalizeOrderNumber(orderNumber);

  return request<CompleteAgentInspectionResponse>(
    `/agent-orders/${encodeURIComponent(normalized)}/inspection/complete`,
    {
      method: "POST",

      body: JSON.stringify({
        answers,
      }),
    },
  );
}
