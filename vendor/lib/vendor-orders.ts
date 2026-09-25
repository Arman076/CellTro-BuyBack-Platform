import { vendorApi } from "./vendor-api";

export type DateFilter =
  | "ALL"
  | "TODAY"
  | "YESTERDAY"
  | "LAST_7_DAYS"
  | "LAST_30_DAYS";

export type StatusGroup =
  | "ALL"
  | "PENDING"
  | "IN_PROCESS"
  | "COMPLETED"
  | "CANCELLED";

export type OrderAddress = {
  fullName?: string | null;
  phone?: string | null;
  house?: string | null;
  street?: string | null;
  locality?: string | null;
  landmark?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
};

export type OrderAgent = {
  id: number;
  agentCode?: string | null;
  name: string;
  fullName?: string | null;
  mobile: string | null;
  email?: string | null;
};

export type ActiveVendorAgent = {
  id: number;
  agentCode: string;
  fullName: string;
  mobile: string;
  email?: string | null;
  status: string;
  assignmentCount?: number;
};

export type VendorOrder = {
  id: string;
  orderNumber: string;
  productName: string;
  productImage: string | null;
  variantLabel: string;
  finalPrice: string | number;
  status: string;
  pickupDate: string;

  pickupSlot: {
    code: string;
    label: string;
    startTime: string;
    endTime: string;
  } | null;

  customer: {
    name: string;
    phone: string;
  } | null;

  address: OrderAddress | null;

  location?: {
    locality?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
  } | null;

  assignment?: {
    id: number;
    source: string;
    reason: string;
    assignedAt: string;
  } | null;

  agent: OrderAgent | null;

  createdAt: string;
  updatedAt: string;
};

export type VendorOrdersResponse = {
  data: VendorOrder[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  filters?: {
    dateFilter: DateFilter;
    status?: string;
    statusGroup?: StatusGroup;
    search: string;
  };
};

export type VendorDashboardOrder = {
  id: string;
  orderNumber: string;
  productName: string;
  productImage: string | null;
  variantLabel: string;
  finalPrice: string | number;
  status: string;
  pickupDate: string;
  customerName: string | null;

  location: {
    city: string;
    pincode: string;
  } | null;

  assignedAt: string | null;
  createdAt: string;
};

export type VendorDashboardResponse = {
  dateFilter: DateFilter;
  totalAssigned: number;
  statusCounts: Record<string, number>;

  statusGroups: {
    pending: number;
    inProcess: number;
    completed: number;
    cancelled: number;
  };

  recentOrders: VendorDashboardOrder[];
};

export type QuestionnaireSelection = {
  itemId: number;
  optionId?: number | null;
  optionIds?: number[];
  childOptionIds?: number[];
};

export type DeviceReportAnswer = {
  id: number;
  label: string;
  severity?: string | null;
  selectionType: string;

  issueGroup?: {
    name?: string | null;
  } | null;
};

export type DeviceReportCheck = {
  itemId: number;
  name: string;
  question: string;
  selectedAnswers: DeviceReportAnswer[];
};

export type DeviceReportSection = {
  id: number | string;
  name: string;
  checks: DeviceReportCheck[];
};

export type VendorOrderDetails = {
  id: string;
  orderNumber: string;

  product: {
    id: number;
    variantId: number;
    name: string;
    image: string | null;
    variant: string;
  };

  pricing: {
    basePrice: string | number;
    totalDeduction: string | number;
    finalPrice: string | number;
  };

  questionnaire: unknown;

  deviceReport?: {
    available: boolean;
    sections: DeviceReportSection[];
  } | null;

  status: string;

  pickup: {
    date: string;

    slot: {
      code: string;
      label: string;
      startTime: string;
      endTime: string;
    } | null;
  };

  payout: {
    method: string;
    upiMobile: string | null;
  };

  customer: {
    name: string;
    phone: string;
  } | null;

  address: OrderAddress | null;

  statusHistory: Array<{
    id: number;
    status: string;
    note: string | null;
    createdAt: string;
  }>;

  reschedules: Array<{
    id: number;
    oldPickupDate: string;
    newPickupDate: string;
    oldSlotLabel: string | null;
    newSlotLabel: string | null;
    createdAt: string;
  }>;

  assignmentHistory: Array<{
    id: number;
    source: string;
    reason: string;
    assignedAt: string;
    unassignedAt: string | null;
    unassignmentReason: string | null;
  }>;

  agentAssignmentHistory?: Array<{
    id: number;
    source: string;
    assignedAt: string;
    unassignedAt: string | null;
    unassignmentReason: string | null;
    agent: OrderAgent;
  }>;

  agent: OrderAgent | null;

  createdAt: string;
  updatedAt: string;
};

type VendorAgentsResponse =
  | ActiveVendorAgent[]
  | {
      data?: ActiveVendorAgent[];
      agents?: ActiveVendorAgent[];
    };

export type AssignOrderAgentResponse = {
  changed?: boolean;
  message?: string;
  agent?: OrderAgent | null;
  assignment?: {
    id: number;
    source: string;
    assignedAt: string;
  };
};

export async function getVendorOrders(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  statusGroup?: StatusGroup;
  dateFilter?: DateFilter;
}) {
  const query = new URLSearchParams();

  query.set("page", String(params?.page ?? 1));
  query.set("limit", String(params?.limit ?? 20));

  if (params?.search?.trim()) {
    query.set("search", params.search.trim());
  }

  if (params?.status?.trim()) {
    query.set("status", params.status.trim());
  }

  if (
    params?.statusGroup &&
    params.statusGroup !== "ALL"
  ) {
    query.set("statusGroup", params.statusGroup);
  }

  if (
    params?.dateFilter &&
    params.dateFilter !== "ALL"
  ) {
    query.set("dateFilter", params.dateFilter);
  }

  return vendorApi<VendorOrdersResponse>(
    `/vendor-orders?${query.toString()}`,
  );
}

export async function getVendorOrder(
  orderNumber: string,
) {
  return vendorApi<VendorOrderDetails>(
    `/vendor-orders/${encodeURIComponent(orderNumber)}`,
  );
}

export async function getVendorDashboard(
  dateFilter: DateFilter = "ALL",
) {
  const query = new URLSearchParams();

  if (dateFilter !== "ALL") {
    query.set("dateFilter", dateFilter);
  }

  const suffix =
    query.size > 0 ? `?${query.toString()}` : "";

  return vendorApi<VendorDashboardResponse>(
    `/vendor-orders/dashboard${suffix}`,
  );
}

/*
 * Reuses the existing Vendor Agents module.
 * No duplicate agent-list endpoint is required.
 */
export async function getActiveVendorAgents() {
  const response = await vendorApi<VendorAgentsResponse>(
    "/vendor-agents?status=ACTIVE",
  );

  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response.data)) {
    return response.data;
  }

  if (Array.isArray(response.agents)) {
    return response.agents;
  }

  return [];
}

/*
 * Backend must validate:
 * - order belongs to logged-in vendor
 * - agent belongs to logged-in vendor
 * - agent is ACTIVE
 * - reassignment is transactional
 *
 * Frontend never sends vendorId.
 */
export async function assignVendorOrderAgent(
  orderNumber: string,
  agentId: number,
) {
  return vendorApi<AssignOrderAgentResponse>(
    `/vendor-orders/${encodeURIComponent(
      orderNumber,
    )}/agent`,
    {
      method: "POST",
      body: JSON.stringify({
        agentId,
      }),
    },
  );
}

export function formatMoney(
  value: string | number | null | undefined,
) {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return "₹0";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(
  value: string | null | undefined,
) {
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
    timeZone: "Asia/Kolkata",
  }).format(date);
}

export function formatDateTime(
  value: string | null | undefined,
) {
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
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

export function formatStatus(status: string) {
  return String(status ?? "")
    .trim()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

export function dateFilterLabel(
  dateFilter: DateFilter,
) {
  switch (dateFilter) {
    case "TODAY":
      return "Assigned today";

    case "YESTERDAY":
      return "Assigned yesterday";

    case "LAST_7_DAYS":
      return "Assigned in last 7 days";

    case "LAST_30_DAYS":
      return "Assigned in last 30 days";

    default:
      return "All assignment dates";
  }
}