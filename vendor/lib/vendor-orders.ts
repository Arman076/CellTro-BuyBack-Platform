import { vendorApi } from "./vendor-api";

export type DateFilter =
  | "ALL"
  | "TODAY"
  | "YESTERDAY"
  | "LAST_7_DAYS"
  | "LAST_30_DAYS";

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

  location: {
    locality: string;
    city: string;
    state: string;
    pincode: string;
  } | null;

  assignment: {
    id: number;
    source: string;
    reason: string;
    assignedAt: string;
  } | null;

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
    status: string;
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
  dateFilter?: DateFilter;

  totalAssigned: number;

  statusCounts: Record<
    string,
    number
  >;

  recentOrders:
    VendorDashboardOrder[];
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

  address: {
    fullName: string;
    phone: string;

    house: string;
    street: string;
    locality: string;
    landmark: string | null;

    pincode: string;
    city: string;
    state: string;
    type: string;
  } | null;

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

    oldSlotLabel: string;
    newSlotLabel: string;

    createdAt: string;
  }>;

  assignmentHistory: Array<{
    id: number;

    source: string;
    reason: string;

    assignedAt: string;

    unassignedAt: string | null;

    unassignmentReason:
      | string
      | null;
  }>;

  agent: null;

  createdAt: string;
  updatedAt: string;
};

export async function getVendorOrders(
  params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    dateFilter?: DateFilter;
  },
) {
  const query =
    new URLSearchParams();

  query.set(
    "page",
    String(params?.page ?? 1),
  );

  query.set(
    "limit",
    String(params?.limit ?? 20),
  );

  if (params?.search?.trim()) {
    query.set(
      "search",
      params.search.trim(),
    );
  }

  if (params?.status?.trim()) {
    query.set(
      "status",
      params.status,
    );
  }

  if (
    params?.dateFilter &&
    params.dateFilter !== "ALL"
  ) {
    query.set(
      "dateFilter",
      params.dateFilter,
    );
  }

  return vendorApi<VendorOrdersResponse>(
    `/vendor-orders?${query.toString()}`,
  );
}

export async function getVendorDashboard(
  dateFilter: DateFilter = "ALL",
) {
  const query =
    new URLSearchParams();

  if (dateFilter !== "ALL") {
    query.set(
      "dateFilter",
      dateFilter,
    );
  }

  const suffix =
    query.toString()
      ? `?${query.toString()}`
      : "";

  return vendorApi<VendorDashboardResponse>(
    `/vendor-orders/dashboard${suffix}`,
  );
}

export async function getVendorOrder(
  orderNumber: string,
) {
  return vendorApi<VendorOrderDetails>(
    `/vendor-orders/${encodeURIComponent(
      orderNumber,
    )}`,
  );
}

export function formatMoney(
  value:
    | string
    | number
    | null
    | undefined,
) {
  const amount =
    Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return "₹0";
  }

  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    },
  ).format(amount);
}

export function formatDate(
  value:
    | string
    | null
    | undefined,
) {
  if (!value) return "—";

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    },
  ).format(date);
}

export function formatDateTime(
  value:
    | string
    | null
    | undefined,
) {
  if (!value) return "—";

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
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
      timeZone: "Asia/Kolkata",
    },
  ).format(date);
}

export function formatStatus(
  status: string,
) {
  return String(status ?? "")
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1),
    )
    .join(" ");
}

export function dateFilterLabel(
  value: DateFilter,
) {
  switch (value) {
    case "TODAY":
      return "Today";

    case "YESTERDAY":
      return "Yesterday";

    case "LAST_7_DAYS":
      return "Last 7 Days";

    case "LAST_30_DAYS":
      return "Last 30 Days";

    default:
      return "All Time";
  }
}