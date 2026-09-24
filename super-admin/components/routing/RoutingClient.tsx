"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  History,
  MapPin,
  RefreshCw,
  Route,
  Search,
  Store,
  X,
} from "lucide-react";

import styles from "./RoutingClient.module.css";

type MainTab =
  | "SERVICE_AREAS"
  | "ORDER_ROUTING";

type AssignmentFilter =
  | "ALL"
  | "ASSIGNED"
  | "UNASSIGNED";

type CoverageFilter =
  | "ALL"
  | "COVERED"
  | "UNCOVERED";

type VendorStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED";

type RoutingSummary = {
  serviceablePincodes: number;
  coveredPincodes: number;
  uncoveredPincodes: number;
  assignedOpenOrders: number;
  unassignedOpenOrders: number;
};

type ServiceAreaVendor = {
  id: number;
  vendorCode: string;
  businessName: string;
  status: VendorStatus;
  priority: number;
};

type ServiceArea = {
  id: number;
  pincode: string;
  district: string | null;
  state: string | null;
  isActive: boolean;
  coverageCount: number;
  coverage:
    | "NO_COVERAGE"
    | "SINGLE_COVERAGE"
    | "MULTI_COVERAGE"
    | string;
  vendors: ServiceAreaVendor[];
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type ServiceAreaResponse = {
  data: ServiceArea[];
  pagination: Pagination;
};

type OrderVendor = {
  id: number;
  vendorCode: string;
  businessName: string;
  status: VendorStatus;
};

type RoutingOrder = {
  id: string;
  orderNumber: string;
  productName: string;
  productImage: string | null;
  variantLabel: string;
  finalPrice: string;
  status: string;
  pickupDate: string;
  createdAt: string;

  address: {
    pincode: string;
    city: string;
    state: string;
  } | null;

  vendor: OrderVendor | null;

  routing: {
    source: string;
    reason: string;
    assignedAt: string;
    prioritySnapshot: number | null;
  } | null;
};

type RoutingOrdersResponse = {
  data: RoutingOrder[];
  pagination: Pagination;
};

type EligibleVendor = {
  id: number;
  vendorCode: string;
  businessName: string;
  status: VendorStatus;
  priority: number;
};

type EligibleVendorsResponse =
  | EligibleVendor[]
  | {
      value?: EligibleVendor[];
      data?: EligibleVendor[];
      vendors?: EligibleVendor[];
    };

type VendorListItem = {
  id: number;
  vendorCode: string;
  businessName: string;
  status: VendorStatus;
};

type VendorListResponse = {
  data: VendorListItem[];
  pagination: Pagination;
};

type VendorServiceAreaOption = {
  id: number;
  pincode: string;
  district: string | null;
  state: string | null;
  mapped: boolean;
  priority: number | null;
};

type ManageVendorsDialogState = {
  area: ServiceArea;
  vendors: VendorListItem[];
  selectedVendorIds: number[];
  priorities: Record<number, number>;
};

type OrderDetail = {
  id: string;
  orderNumber: string;
  productId: number;
  variantId: number;
  productName: string;
  productImage: string | null;
  variantLabel: string;
  basePrice: string;
  totalDeduction: string;
  finalPrice: string;
  status: string;
  pickupDate: string;
  payoutMethod: string;
  createdAt: string;
  updatedAt: string;

  addressSnapshot: {
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

  currentVendor: {
    id: number;
    vendorCode: string;
    businessName: string;
    contactName: string;
    phone: string;
    email: string | null;
    status: VendorStatus;
  } | null;

  pickupSlot: {
    code: string;
    label: string;
    startTime: string;
    endTime: string;
  } | null;
};

type RoutingHistoryItem = {
  id: number;
  source: string;
  reason: string;
  prioritySnapshot: number | null;
  assignedAt: string;
  unassignedAt: string | null;
  unassignmentReason: string | null;

  vendor: {
    id: number;
    vendorCode: string;
    businessName: string;
  };
};

type RoutingHistoryResponse = {
  orderNumber: string;
  history: RoutingHistoryItem[];
};

type DrawerData = {
  detail: OrderDetail;
  history: RoutingHistoryItem[];
};

type AssignmentDialogState = {
  order: RoutingOrder;
  mode: "ASSIGN" | "REROUTE";
  serviceAreaId: number;
  eligibleVendors: EligibleVendor[];
};

const PAGE_SIZE = 20;

function getMessage(
  payload: unknown,
  fallback: string,
) {
  if (
    payload &&
    typeof payload === "object" &&
    "message" in payload
  ) {
    const message = (
      payload as {
        message?: unknown;
      }
    ).message;

    if (typeof message === "string") {
      return message;
    }

    if (
      Array.isArray(message) &&
      message.every(
        (item) =>
          typeof item === "string",
      )
    ) {
      return message.join(", ");
    }
  }

  return fallback;
}

async function readJson(
  response: Response,
) {
  const contentType =
    response.headers.get(
      "content-type",
    ) ?? "";

  if (
    !contentType.includes(
      "application/json",
    )
  ) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

function formatCurrency(
  value: string | number | null | undefined,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  const numericValue =
    typeof value === "number"
      ? value
      : Number(value);

  if (!Number.isFinite(numericValue)) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    },
  ).format(numericValue);
}

function formatDate(
  value: string | null | undefined,
) {
  if (!value) {
    return "—";
  }

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
    },
  ).format(date);
}

function formatDateTime(
  value: string | null | undefined,
) {
  if (!value) {
    return "—";
  }

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
    },
  ).format(date);
}

function formatStatus(
  value: string,
) {
  return value
    .toLowerCase()
    .split("_")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1),
    )
    .join(" ");
}

function operationalStatusLabel(
  status: string,
  vendorAssigned: boolean,
) {
  if (
    status === "PICKUP_REQUESTED"
  ) {
    return vendorAssigned
      ? "Vendor Assigned"
      : "Awaiting Vendor";
  }

  return formatStatus(status);
}

function coverageLabel(
  area: ServiceArea,
) {
  if (
    area.coverage ===
      "NO_COVERAGE" ||
    area.coverageCount === 0
  ) {
    return "No Coverage";
  }

  if (
    area.coverage ===
      "SINGLE_COVERAGE" ||
    area.coverageCount === 1
  ) {
    return "Single Coverage";
  }

  return "Multi Coverage";
}

function isReroutableStatus(
  status: string,
) {
  return (
    status ===
      "PICKUP_REQUESTED" ||
    status ===
      "PICKUP_CONFIRMED"
  );
}

function getServiceAreaLocation(
  area: ServiceArea,
) {
  const values = [
    area.district,
    area.state,
  ].filter(Boolean);

  return values.length > 0
    ? values.join(", ")
    : "Location unavailable";
}

export default function RoutingClient() {
  const [
    activeTab,
    setActiveTab,
  ] = useState<MainTab>(
    "SERVICE_AREAS",
  );

  const [
    summary,
    setSummary,
  ] =
    useState<RoutingSummary | null>(
      null,
    );

  const [
    summaryLoading,
    setSummaryLoading,
  ] = useState(true);

  const [
    summaryError,
    setSummaryError,
  ] = useState("");

  const [
    serviceAreas,
    setServiceAreas,
  ] =
    useState<ServiceAreaResponse | null>(
      null,
    );

  const [
    serviceAreasLoading,
    setServiceAreasLoading,
  ] = useState(false);

  const [
    serviceAreasError,
    setServiceAreasError,
  ] = useState("");

  const [
    serviceAreaSearchInput,
    setServiceAreaSearchInput,
  ] = useState("");

  const [
    serviceAreaSearch,
    setServiceAreaSearch,
  ] = useState("");

  const [
    coverageFilter,
    setCoverageFilter,
  ] =
    useState<CoverageFilter>("ALL");

  const [
    serviceAreaPage,
    setServiceAreaPage,
  ] = useState(1);

  const [
    orders,
    setOrders,
  ] =
    useState<RoutingOrdersResponse | null>(
      null,
    );

  const [
    ordersLoading,
    setOrdersLoading,
  ] = useState(false);

  const [
    ordersError,
    setOrdersError,
  ] = useState("");

  const [
    orderSearchInput,
    setOrderSearchInput,
  ] = useState("");

  const [
    orderSearch,
    setOrderSearch,
  ] = useState("");

  const [
    assignmentFilter,
    setAssignmentFilter,
  ] =
    useState<AssignmentFilter>(
      "ALL",
    );

  const [
    orderPage,
    setOrderPage,
  ] = useState(1);

  const [
    drawer,
    setDrawer,
  ] =
    useState<DrawerData | null>(
      null,
    );

  const [
    drawerLoading,
    setDrawerLoading,
  ] = useState(false);

  const [
    drawerError,
    setDrawerError,
  ] = useState("");

  const [
    assignmentDialog,
    setAssignmentDialog,
  ] =
    useState<AssignmentDialogState | null>(
      null,
    );

  const [
    assignmentLoading,
    setAssignmentLoading,
  ] = useState(false);

  const [
    assignmentError,
    setAssignmentError,
  ] = useState("");

  const [
    selectedVendorId,
    setSelectedVendorId,
  ] =
    useState<number | null>(null);

  const [
    manageVendorsDialog,
    setManageVendorsDialog,
  ] =
    useState<ManageVendorsDialogState | null>(
      null,
    );

  const [
    manageVendorsLoading,
    setManageVendorsLoading,
  ] = useState(false);

  const [
    manageVendorsError,
    setManageVendorsError,
  ] = useState("");

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        setServiceAreaPage(1);
        setServiceAreaSearch(
          serviceAreaSearchInput.trim(),
        );
      }, 350);

    return () =>
      window.clearTimeout(timer);
  }, [serviceAreaSearchInput]);

  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        setOrderPage(1);
        setOrderSearch(
          orderSearchInput.trim(),
        );
      }, 350);

    return () =>
      window.clearTimeout(timer);
  }, [orderSearchInput]);

  const loadSummary =
    useCallback(
      async (
        signal?: AbortSignal,
      ) => {
        setSummaryLoading(true);
        setSummaryError("");

        try {
          const response =
            await fetch(
              "/api/super-admin/routing/summary",
              {
                method: "GET",
                cache: "no-store",
                signal,
              },
            );

          const payload =
            await readJson(response);

          if (!response.ok) {
            throw new Error(
              getMessage(
                payload,
                "Unable to load routing summary.",
              ),
            );
          }

          if (!payload) {
            throw new Error(
              "Routing summary returned an invalid response.",
            );
          }

          setSummary(
            payload as RoutingSummary,
          );
        } catch (error) {
          if (
            error instanceof DOMException &&
            error.name ===
              "AbortError"
          ) {
            return;
          }

          setSummary(null);

          setSummaryError(
            error instanceof Error
              ? error.message
              : "Unable to load routing summary.",
          );
        } finally {
          if (!signal?.aborted) {
            setSummaryLoading(false);
          }
        }
      },
      [],
    );

  const loadServiceAreas =
    useCallback(
      async (
        signal?: AbortSignal,
      ) => {
        setServiceAreasLoading(true);
        setServiceAreasError("");

        try {
          const params =
            new URLSearchParams({
              page: String(
                serviceAreaPage,
              ),
              limit: String(
                PAGE_SIZE,
              ),
            });

          if (serviceAreaSearch) {
            params.set(
              "search",
              serviceAreaSearch,
            );
          }

          if (
            coverageFilter !==
            "ALL"
          ) {
            params.set(
              "coverage",
              coverageFilter,
            );
          }

          const response =
            await fetch(
              `/api/super-admin/routing/service-areas?${params.toString()}`,
              {
                method: "GET",
                cache: "no-store",
                signal,
              },
            );

          const payload =
            await readJson(response);

          if (!response.ok) {
            throw new Error(
              getMessage(
                payload,
                "Unable to load service areas.",
              ),
            );
          }

          if (!payload) {
            throw new Error(
              "Service area service returned an invalid response.",
            );
          }

          setServiceAreas(
            payload as ServiceAreaResponse,
          );
        } catch (error) {
          if (
            error instanceof DOMException &&
            error.name ===
              "AbortError"
          ) {
            return;
          }

          setServiceAreas(null);

          setServiceAreasError(
            error instanceof Error
              ? error.message
              : "Unable to load service areas.",
          );
        } finally {
          if (!signal?.aborted) {
            setServiceAreasLoading(
              false,
            );
          }
        }
      },
      [
        coverageFilter,
        serviceAreaPage,
        serviceAreaSearch,
      ],
    );

  const loadOrders =
    useCallback(
      async (
        signal?: AbortSignal,
      ) => {
        setOrdersLoading(true);
        setOrdersError("");

        try {
          const params =
            new URLSearchParams({
              page: String(orderPage),
              limit: String(
                PAGE_SIZE,
              ),
            });

          if (orderSearch) {
            params.set(
              "search",
              orderSearch,
            );
          }

          if (
            assignmentFilter !==
            "ALL"
          ) {
            params.set(
              "assignment",
              assignmentFilter,
            );
          }

          const response =
            await fetch(
              `/api/super-admin/routing/orders?${params.toString()}`,
              {
                method: "GET",
                cache: "no-store",
                signal,
              },
            );

          const payload =
            await readJson(response);

          if (!response.ok) {
            throw new Error(
              getMessage(
                payload,
                "Unable to load routing orders.",
              ),
            );
          }

          if (!payload) {
            throw new Error(
              "Routing orders returned an invalid response.",
            );
          }

          setOrders(
            payload as RoutingOrdersResponse,
          );
        } catch (error) {
          if (
            error instanceof DOMException &&
            error.name ===
              "AbortError"
          ) {
            return;
          }

          setOrders(null);

          setOrdersError(
            error instanceof Error
              ? error.message
              : "Unable to load routing orders.",
          );
        } finally {
          if (!signal?.aborted) {
            setOrdersLoading(false);
          }
        }
      },
      [
        assignmentFilter,
        orderPage,
        orderSearch,
      ],
    );

  useEffect(() => {
    const controller =
      new AbortController();

    void loadSummary(
      controller.signal,
    );

    return () =>
      controller.abort();
  }, [loadSummary]);

  useEffect(() => {
    if (
      activeTab !==
      "SERVICE_AREAS"
    ) {
      return;
    }

    const controller =
      new AbortController();

    void loadServiceAreas(
      controller.signal,
    );

    return () =>
      controller.abort();
  }, [
    activeTab,
    loadServiceAreas,
  ]);

  useEffect(() => {
    if (
      activeTab !==
      "ORDER_ROUTING"
    ) {
      return;
    }

    const controller =
      new AbortController();

    void loadOrders(
      controller.signal,
    );

    return () =>
      controller.abort();
  }, [
    activeTab,
    loadOrders,
  ]);

  const summaryCards =
    useMemo(
      () => [
        {
          label:
            "Serviceable Pincodes",
          value:
            summary?.serviceablePincodes,
          hint:
            "Active customer service areas",
          icon: MapPin,
        },
        {
          label:
            "Covered Pincodes",
          value:
            summary?.coveredPincodes,
          hint:
            "At least one active vendor",
          icon: Store,
        },
        {
          label:
            "Uncovered Pincodes",
          value:
            summary?.uncoveredPincodes,
          hint:
            "Needs vendor coverage",
          icon: AlertCircle,
        },
        {
          label:
            "Unassigned Orders",
          value:
            summary?.unassignedOpenOrders,
          hint:
            "Open orders needing routing",
          icon: Route,
        },
      ],
      [summary],
    );

  async function refreshCurrentView() {
    setRefreshing(true);

    try {
      await Promise.all([
        loadSummary(),

        activeTab ===
        "SERVICE_AREAS"
          ? loadServiceAreas()
          : loadOrders(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }

  async function openOrder(
    orderNumber: string,
  ) {
    setDrawer(null);
    setDrawerError("");
    setDrawerLoading(true);

    try {
      const encodedOrderNumber =
        encodeURIComponent(
          orderNumber,
        );

      const [
        detailResponse,
        historyResponse,
      ] = await Promise.all([
        fetch(
          `/api/super-admin/routing/orders/${encodedOrderNumber}`,
          {
            method: "GET",
            cache: "no-store",
          },
        ),

        fetch(
          `/api/super-admin/routing/orders/${encodedOrderNumber}/history`,
          {
            method: "GET",
            cache: "no-store",
          },
        ),
      ]);

      const [
        detailPayload,
        historyPayload,
      ] = await Promise.all([
        readJson(detailResponse),
        readJson(historyResponse),
      ]);

      if (!detailResponse.ok) {
        throw new Error(
          getMessage(
            detailPayload,
            "Unable to load order details.",
          ),
        );
      }

      if (!historyResponse.ok) {
        throw new Error(
          getMessage(
            historyPayload,
            "Unable to load routing history.",
          ),
        );
      }

      if (
        !detailPayload ||
        !historyPayload
      ) {
        throw new Error(
          "Routing detail service returned an invalid response.",
        );
      }

      const historyResponseData =
        historyPayload as RoutingHistoryResponse;

      setDrawer({
        detail:
          detailPayload as OrderDetail,
        history:
          historyResponseData.history ??
          [],
      });
    } catch (error) {
      setDrawerError(
        error instanceof Error
          ? error.message
          : "Unable to load order details.",
      );
    } finally {
      setDrawerLoading(false);
    }
  }

  async function findServiceAreaForOrder(
    order: RoutingOrder,
  ) {
    if (!order.address?.pincode) {
      throw new Error(
        "Order pincode is unavailable.",
      );
    }

    const params =
      new URLSearchParams({
        page: "1",
        limit: "20",
        search:
          order.address.pincode,
      });

    const response =
      await fetch(
        `/api/super-admin/routing/service-areas?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

    const payload =
      await readJson(response);

    if (!response.ok) {
      throw new Error(
        getMessage(
          payload,
          "Unable to resolve the order service area.",
        ),
      );
    }

    const result =
      payload as
        | ServiceAreaResponse
        | null;

    const exactArea =
      result?.data?.find(
        (area) =>
          area.pincode ===
          order.address?.pincode,
      );

    if (!exactArea) {
      throw new Error(
        `No active service area was found for pincode ${order.address.pincode}.`,
      );
    }

    return exactArea;
  }

  async function openAssignmentDialog(
    order: RoutingOrder,
  ) {
    setAssignmentError("");
    setAssignmentLoading(true);
    setSelectedVendorId(null);

    try {
      const area =
        await findServiceAreaForOrder(
          order,
        );

      const response =
        await fetch(
          `/api/super-admin/routing/service-areas/${area.id}/eligible-vendors`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

      const payload =
        await readJson(response);

      if (!response.ok) {
        throw new Error(
          getMessage(
            payload,
            "Unable to load eligible vendors.",
          ),
        );
      }

      if (!payload) {
        throw new Error(
          "Eligible vendor service returned an invalid response.",
        );
      }

      const eligible =
        payload as EligibleVendorsResponse;

      const vendors =
        Array.isArray(eligible)
          ? eligible
          : Array.isArray(eligible.value)
            ? eligible.value
            : Array.isArray(eligible.data)
              ? eligible.data
              : Array.isArray(
                    eligible.vendors,
                  )
                ? eligible.vendors
                : [];

      setAssignmentDialog({
        order,
        mode: order.vendor
          ? "REROUTE"
          : "ASSIGN",
        serviceAreaId: area.id,
        eligibleVendors:
          vendors,
      });
    } catch (error) {
      setAssignmentError(
        error instanceof Error
          ? error.message
          : "Unable to load eligible vendors.",
      );
    } finally {
      setAssignmentLoading(false);
    }
  }

  async function openManageVendors(
    area: ServiceArea,
  ) {
    setManageVendorsLoading(true);
    setManageVendorsError("");

    try {
      const response =
        await fetch(
          "/api/super-admin/vendors?page=1&limit=100&status=ACTIVE",
          {
            method: "GET",
            cache: "no-store",
          },
        );

      const payload =
        await readJson(response);

      if (!response.ok) {
        throw new Error(
          getMessage(
            payload,
            "Unable to load active vendors.",
          ),
        );
      }

      if (!payload) {
        throw new Error(
          "Vendor service returned an invalid response.",
        );
      }

      const result =
        payload as VendorListResponse;

      const vendorMap =
        new Map<number, VendorListItem>();

      for (
        const vendor of
          result.data ?? []
      ) {
        vendorMap.set(
          vendor.id,
          vendor,
        );
      }

      for (
        const mapped of area.vendors
      ) {
        vendorMap.set(
          mapped.id,
          {
            id: mapped.id,
            vendorCode:
              mapped.vendorCode,
            businessName:
              mapped.businessName,
            status: mapped.status,
          },
        );
      }

      const priorities:
        Record<number, number> = {};

      for (
        const vendor of area.vendors
      ) {
        priorities[vendor.id] =
          vendor.priority;
      }

      setManageVendorsDialog({
        area,
        vendors:
          [...vendorMap.values()].sort(
            (left, right) =>
              left.businessName.localeCompare(
                right.businessName,
              ),
          ),
        selectedVendorIds:
          area.vendors.map(
            (vendor) => vendor.id,
          ),
        priorities,
      });
    } catch (error) {
      setManageVendorsError(
        error instanceof Error
          ? error.message
          : "Unable to load vendors.",
      );
    } finally {
      setManageVendorsLoading(false);
    }
  }

  function toggleManagedVendor(
    vendorId: number,
  ) {
    setManageVendorsDialog(
      (current) => {
        if (!current) {
          return current;
        }

        const selected =
          current.selectedVendorIds.includes(
            vendorId,
          );

        const selectedVendorIds =
          selected
            ? current.selectedVendorIds.filter(
                (id) =>
                  id !== vendorId,
              )
            : [
                ...current.selectedVendorIds,
                vendorId,
              ];

        return {
          ...current,
          selectedVendorIds,
          priorities: {
            ...current.priorities,
            [vendorId]:
              current.priorities[
                vendorId
              ] ?? 100,
          },
        };
      },
    );
  }

  function updateManagedPriority(
    vendorId: number,
    value: string,
  ) {
    const priority =
      Number(value);

    if (
      !Number.isInteger(priority) ||
      priority < 1 ||
      priority > 10000
    ) {
      return;
    }

    setManageVendorsDialog(
      (current) =>
        current
          ? {
              ...current,
              priorities: {
                ...current.priorities,
                [vendorId]:
                  priority,
              },
            }
          : current,
    );
  }

  async function loadVendorServiceAreas(
    vendorId: number,
  ) {
    const response =
      await fetch(
        `/api/super-admin/vendors/${vendorId}/service-areas`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

    const payload =
      await readJson(response);

    if (!response.ok) {
      throw new Error(
        getMessage(
          payload,
          "Unable to load vendor service areas.",
        ),
      );
    }

    if (!Array.isArray(payload)) {
      throw new Error(
        "Vendor service-area service returned an invalid response.",
      );
    }

    const areas =
      payload as VendorServiceAreaOption[];

    /*
     * Backend currently caps this endpoint at 200 rows.
     * Refuse a destructive replace when the response can
     * be truncated instead of risking loss of mappings.
     */
    if (areas.length >= 200) {
      throw new Error(
        "This vendor has too many service-area records for a safe inline update. Use the dedicated vendor service-area screen.",
      );
    }

    return areas;
  }

  async function saveManagedVendors() {
    if (!manageVendorsDialog) {
      return;
    }

    setManageVendorsLoading(true);
    setManageVendorsError("");

    try {
      const {
        area,
        selectedVendorIds,
        priorities,
      } = manageVendorsDialog;

      const originalIds =
        new Set(
          area.vendors.map(
            (vendor) => vendor.id,
          ),
        );

      const desiredIds =
        new Set(selectedVendorIds);

      const changedVendorIds =
        new Set<number>();

      for (const id of originalIds) {
        if (!desiredIds.has(id)) {
          changedVendorIds.add(id);
        }
      }

      for (const id of desiredIds) {
        const original =
          area.vendors.find(
            (vendor) =>
              vendor.id === id,
          );

        if (
          !original ||
          original.priority !==
            priorities[id]
        ) {
          changedVendorIds.add(id);
        }
      }

      if (
        changedVendorIds.size === 0
      ) {
        setManageVendorsDialog(null);
        return;
      }

      /*
       * Update vendors one-by-one. This is an admin-only
       * mutation path and avoids a burst of concurrent
       * replace operations against the same mapping table.
       */
      for (
        const vendorId of
          changedVendorIds
      ) {
        const vendorAreas =
          await loadVendorServiceAreas(
            vendorId,
          );

        const preserved =
          vendorAreas
            .filter(
              (item) =>
                item.mapped &&
                item.id !== area.id,
            )
            .map((item) => ({
              serviceablePincodeId:
                item.id,
              priority:
                item.priority ?? 100,
            }));

        if (
          desiredIds.has(vendorId)
        ) {
          preserved.push({
            serviceablePincodeId:
              area.id,
            priority:
              priorities[vendorId] ??
              100,
          });
        }

        const response =
          await fetch(
            `/api/super-admin/vendors/${vendorId}/service-areas`,
            {
              method: "PATCH",
              headers: {
                "Content-Type":
                  "application/json",
                Accept:
                  "application/json",
              },
              body: JSON.stringify({
                areas: preserved,
              }),
            },
          );

        const payload =
          await readJson(response);

        if (!response.ok) {
          throw new Error(
            getMessage(
              payload,
              "Unable to update vendor service areas.",
            ),
          );
        }
      }

      setManageVendorsDialog(null);

      await Promise.all([
        loadSummary(),
        loadServiceAreas(),
      ]);
    } catch (error) {
      setManageVendorsError(
        error instanceof Error
          ? error.message
          : "Unable to update service-area vendors.",
      );
    } finally {
      setManageVendorsLoading(false);
    }
  }

  async function submitAssignment() {
    if (
      !assignmentDialog ||
      selectedVendorId === null
    ) {
      return;
    }

    setAssignmentLoading(true);
    setAssignmentError("");

    try {
      const {
        order,
        mode,
      } = assignmentDialog;

      if (
        mode === "REROUTE" &&
        order.vendor?.id ===
          selectedVendorId
      ) {
        throw new Error(
          "Select a different vendor for rerouting.",
        );
      }

      const action =
        mode === "ASSIGN"
          ? "assign"
          : "reroute";

      const response =
        await fetch(
          `/api/super-admin/routing/orders/${encodeURIComponent(
            order.orderNumber,
          )}/${action}`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Accept:
                "application/json",
            },
            body: JSON.stringify({
              vendorId:
                selectedVendorId,
            }),
          },
        );

      const payload =
        await readJson(response);

      if (!response.ok) {
        throw new Error(
          getMessage(
            payload,
            mode === "ASSIGN"
              ? "Unable to assign vendor."
              : "Unable to reroute order.",
          ),
        );
      }

      setAssignmentDialog(null);
      setSelectedVendorId(null);

      await Promise.all([
        loadSummary(),
        loadOrders(),
      ]);

      if (
        drawer?.detail.orderNumber ===
        order.orderNumber
      ) {
        await openOrder(
          order.orderNumber,
        );
      }
    } catch (error) {
      setAssignmentError(
        error instanceof Error
          ? error.message
          : "Unable to update routing.",
      );
    } finally {
      setAssignmentLoading(false);
    }
  }

  function renderPagination(
    pagination: Pagination,
    onPageChange: (
      page: number,
    ) => void,
  ) {
    if (
      pagination.totalPages <= 1
    ) {
      return null;
    }

    return (
      <div
        className={
          styles.pagination
        }
      >
        <span>
          Page {pagination.page} of{" "}
          {pagination.totalPages}
          {" · "}
          {pagination.total} records
        </span>

        <div
          className={
            styles.paginationActions
          }
        >
          <button
            type="button"
            disabled={
              pagination.page <= 1
            }
            onClick={() =>
              onPageChange(
                pagination.page - 1,
              )
            }
          >
            <ArrowLeft size={15} />
            Previous
          </button>

          <button
            type="button"
            disabled={
              pagination.page >=
              pagination.totalPages
            }
            onClick={() =>
              onPageChange(
                pagination.page + 1,
              )
            }
          >
            Next
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div
        className={
          styles.breadcrumb
        }
      >
        <span>Super Admin</span>
        <ChevronRight size={14} />
        <strong>
          Service Areas & Routing
        </strong>
      </div>

      <header
        className={
          styles.pageHeader
        }
      >
        <div>
          <h1>
            Service Areas & Routing
          </h1>

          <p>
            Manage vendor coverage and
            route customer orders from
            one operational workspace.
          </p>
        </div>

        <button
          type="button"
          className={
            styles.refreshButton
          }
          disabled={refreshing}
          onClick={() =>
            void refreshCurrentView()
          }
        >
          <RefreshCw
            size={16}
            className={
              refreshing
                ? styles.spinning
                : ""
            }
          />

          {refreshing
            ? "Refreshing"
            : "Refresh"}
        </button>
      </header>

      {summaryError ? (
        <div
          className={
            styles.summaryError
          }
          role="alert"
        >
          <AlertCircle size={17} />

          <span>
            {summaryError}
          </span>

          <button
            type="button"
            onClick={() =>
              void loadSummary()
            }
          >
            Retry
          </button>
        </div>
      ) : null}

      <section
        className={
          styles.statsGrid
        }
        aria-label="Routing summary"
      >
        {summaryCards.map(
          ({
            label,
            value,
            hint,
            icon: Icon,
          }) => (
            <article
              key={label}
              className={
                styles.statCard
              }
            >
              <div
                className={
                  styles.statTop
                }
              >
                <span>{label}</span>

                <div
                  className={
                    styles.statIcon
                  }
                >
                  <Icon size={18} />
                </div>
              </div>

              <strong>
                {summaryLoading
                  ? "—"
                  : value ??
                    "—"}
              </strong>

              <small>{hint}</small>
            </article>
          ),
        )}
      </section>

      <section
        className={
          styles.workspace
        }
      >
        <div
          className={
            styles.mainTabs
          }
          role="tablist"
          aria-label="Routing workspace"
        >
          <button
            type="button"
            role="tab"
            aria-selected={
              activeTab ===
              "SERVICE_AREAS"
            }
            className={
              activeTab ===
              "SERVICE_AREAS"
                ? styles.mainTabActive
                : styles.mainTab
            }
            onClick={() =>
              setActiveTab(
                "SERVICE_AREAS",
              )
            }
          >
            <MapPin size={17} />
            Service Areas
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={
              activeTab ===
              "ORDER_ROUTING"
            }
            className={
              activeTab ===
              "ORDER_ROUTING"
                ? styles.mainTabActive
                : styles.mainTab
            }
            onClick={() =>
              setActiveTab(
                "ORDER_ROUTING",
              )
            }
          >
            <Route size={17} />
            Order Routing

            {summary &&
            summary.unassignedOpenOrders >
              0 ? (
              <span
                className={
                  styles.tabCount
                }
              >
                {
                  summary.unassignedOpenOrders
                }
              </span>
            ) : null}
          </button>
        </div>

        {activeTab ===
        "SERVICE_AREAS" ? (
          <>
            <div
              className={
                styles.toolbar
              }
            >
              <label
                className={
                  styles.searchBox
                }
              >
                <Search size={17} />

                <input
                  type="search"
                  value={
                    serviceAreaSearchInput
                  }
                  onChange={(event) =>
                    setServiceAreaSearchInput(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Search pincode, district or state"
                  maxLength={100}
                  aria-label="Search service areas"
                />
              </label>

              <div
                className={
                  styles.filterButtons
                }
              >
                {(
                  [
                    [
                      "ALL",
                      "All Areas",
                    ],
                    [
                      "COVERED",
                      "Covered",
                    ],
                    [
                      "UNCOVERED",
                      "Uncovered",
                    ],
                  ] as const
                ).map(
                  ([
                    value,
                    label,
                  ]) => (
                    <button
                      key={value}
                      type="button"
                      className={
                        coverageFilter ===
                        value
                          ? styles.filterActive
                          : styles.filterButton
                      }
                      onClick={() => {
                        setCoverageFilter(
                          value,
                        );
                        setServiceAreaPage(
                          1,
                        );
                      }}
                    >
                      {label}
                    </button>
                  ),
                )}
              </div>
            </div>

            {serviceAreasError ? (
              <div
                className={
                  styles.errorState
                }
                role="alert"
              >
                <AlertCircle
                  size={20}
                />

                <div>
                  <strong>
                    Service areas
                    could not be
                    loaded.
                  </strong>

                  <span>
                    {
                      serviceAreasError
                    }
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void loadServiceAreas()
                  }
                >
                  Retry
                </button>
              </div>
            ) : null}

            {!serviceAreasError &&
            serviceAreasLoading ? (
              <div
                className={
                  styles.loadingState
                }
              >
                Loading service
                areas…
              </div>
            ) : null}

            {!serviceAreasError &&
            !serviceAreasLoading &&
            serviceAreas?.data
              .length === 0 ? (
              <div
                className={
                  styles.emptyState
                }
              >
                <MapPin size={28} />

                <strong>
                  No service areas
                  found
                </strong>

                <span>
                  No records match
                  the current filters.
                </span>
              </div>
            ) : null}

            {!serviceAreasError &&
            !serviceAreasLoading &&
            serviceAreas &&
            serviceAreas.data
              .length > 0 ? (
              <>
                <div
                  className={
                    styles.tableWrap
                  }
                >
                  <table
                    className={
                      styles.table
                    }
                  >
                    <thead>
                      <tr>
                        <th>Pincode</th>
                        <th>Location</th>
                        <th>
                          Serviceability
                        </th>
                        <th>Coverage</th>
                        <th>Vendors</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {serviceAreas.data.map(
                        (area) => (
                          <tr
                            key={
                              area.id
                            }
                          >
                            <td>
                              <strong
                                className={
                                  styles.pincode
                                }
                              >
                                {
                                  area.pincode
                                }
                              </strong>
                            </td>

                            <td>
                              <span
                                className={
                                  styles.location
                                }
                              >
                                {getServiceAreaLocation(
                                  area,
                                )}
                              </span>
                            </td>

                            <td>
                              <span
                                className={`${styles.badge} ${
                                  area.isActive
                                    ? styles.badgeSuccess
                                    : styles.badgeNeutral
                                }`}
                              >
                                {area.isActive
                                  ? "Serviceable"
                                  : "Inactive"}
                              </span>
                            </td>

                            <td>
                              <span
                                className={`${styles.badge} ${
                                  area.coverageCount ===
                                  0
                                    ? styles.badgeDanger
                                    : area.coverageCount ===
                                        1
                                      ? styles.badgeWarning
                                      : styles.badgeSuccess
                                }`}
                              >
                                {coverageLabel(
                                  area,
                                )}
                              </span>
                            </td>

                            <td>
                              {area
                                .vendors
                                .length >
                              0 ? (
                                <div
                                  className={
                                    styles.vendorStack
                                  }
                                >
                                  {area.vendors.map(
                                    (
                                      vendor,
                                    ) => (
                                      <div
                                        key={
                                          vendor.id
                                        }
                                        className={
                                          styles.vendorLine
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
                                          className={
                                            styles.priority
                                          }
                                        >
                                          P
                                          {
                                            vendor.priority
                                          }
                                        </span>
                                      </div>
                                    ),
                                  )}
                                </div>
                              ) : (
                                <span
                                  className={
                                    styles.noVendor
                                  }
                                >
                                  No vendor
                                  mapped
                                </span>
                              )}
                            </td>

                            <td>
                              <button
                                type="button"
                                className={
                                  styles.primaryAction
                                }
                                onClick={() =>
                                  void openManageVendors(
                                    area,
                                  )
                                }
                              >
                                <Store
                                  size={15}
                                />
                                Manage Vendors
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
                    styles.mobileList
                  }
                >
                  {serviceAreas.data.map(
                    (area) => (
                      <article
                        key={area.id}
                        className={
                          styles.mobileCard
                        }
                      >
                        <div
                          className={
                            styles.mobileCardHeader
                          }
                        >
                          <div>
                            <span
                              className={
                                styles.mobileLabel
                              }
                            >
                              Pincode
                            </span>

                            <strong>
                              {
                                area.pincode
                              }
                            </strong>
                          </div>

                          <span
                            className={`${styles.badge} ${
                              area.coverageCount ===
                              0
                                ? styles.badgeDanger
                                : area.coverageCount ===
                                    1
                                  ? styles.badgeWarning
                                  : styles.badgeSuccess
                            }`}
                          >
                            {coverageLabel(
                              area,
                            )}
                          </span>
                        </div>

                        <div
                          className={
                            styles.mobileLocation
                          }
                        >
                          <MapPin
                            size={14}
                          />

                          {getServiceAreaLocation(
                            area,
                          )}
                        </div>

                        <div
                          className={
                            styles.mobileSection
                          }
                        >
                          <span
                            className={
                              styles.mobileLabel
                            }
                          >
                            Vendors
                          </span>

                          {area
                            .vendors
                            .length >
                          0 ? (
                            <div
                              className={
                                styles.vendorStack
                              }
                            >
                              {area.vendors.map(
                                (
                                  vendor,
                                ) => (
                                  <div
                                    key={
                                      vendor.id
                                    }
                                    className={
                                      styles.vendorLine
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
                                      className={
                                        styles.priority
                                      }
                                    >
                                      P
                                      {
                                        vendor.priority
                                      }
                                    </span>
                                  </div>
                                ),
                              )}
                            </div>
                          ) : (
                            <span
                              className={
                                styles.noVendor
                              }
                            >
                              No vendor
                              mapped
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          className={
                            styles.primaryAction
                          }
                          onClick={() =>
                            void openManageVendors(
                              area,
                            )
                          }
                        >
                          <Store
                            size={15}
                          />
                          Manage Vendors
                        </button>
                      </article>
                    ),
                  )}
                </div>

                {renderPagination(
                  serviceAreas.pagination,
                  setServiceAreaPage,
                )}
              </>
            ) : null}
          </>
        ) : (
          <>
            <div
              className={
                styles.toolbar
              }
            >
              <label
                className={
                  styles.searchBox
                }
              >
                <Search size={17} />

                <input
                  type="search"
                  value={
                    orderSearchInput
                  }
                  onChange={(event) =>
                    setOrderSearchInput(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Search order, device or pincode"
                  maxLength={100}
                  aria-label="Search routing orders"
                />
              </label>

              <div
                className={
                  styles.filterButtons
                }
              >
                {(
                  [
                    [
                      "ALL",
                      "All Orders",
                    ],
                    [
                      "ASSIGNED",
                      "Assigned",
                    ],
                    [
                      "UNASSIGNED",
                      "Unassigned",
                    ],
                  ] as const
                ).map(
                  ([
                    value,
                    label,
                  ]) => (
                    <button
                      key={value}
                      type="button"
                      className={
                        assignmentFilter ===
                        value
                          ? styles.filterActive
                          : styles.filterButton
                      }
                      onClick={() => {
                        setAssignmentFilter(
                          value,
                        );
                        setOrderPage(
                          1,
                        );
                      }}
                    >
                      {label}
                    </button>
                  ),
                )}
              </div>
            </div>

            {ordersError ? (
              <div
                className={
                  styles.errorState
                }
                role="alert"
              >
                <AlertCircle
                  size={20}
                />

                <div>
                  <strong>
                    Routing orders
                    could not be
                    loaded.
                  </strong>

                  <span>
                    {ordersError}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void loadOrders()
                  }
                >
                  Retry
                </button>
              </div>
            ) : null}

            {!ordersError &&
            ordersLoading ? (
              <div
                className={
                  styles.loadingState
                }
              >
                Loading routing
                orders…
              </div>
            ) : null}

            {!ordersError &&
            !ordersLoading &&
            orders?.data.length ===
              0 ? (
              <div
                className={
                  styles.emptyState
                }
              >
                <Route size={28} />

                <strong>
                  No routing orders
                  found
                </strong>

                <span>
                  No records match
                  the current filters.
                </span>
              </div>
            ) : null}

            {!ordersError &&
            !ordersLoading &&
            orders &&
            orders.data.length >
              0 ? (
              <>
                <div
                  className={
                    styles.tableWrap
                  }
                >
                  <table
                    className={
                      styles.table
                    }
                  >
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Device</th>
                        <th>Pincode</th>
                        <th>Pickup</th>
                        <th>
                          Current Vendor
                        </th>
                        <th>Routing</th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>

                    <tbody>
                      {orders.data.map(
                        (order) => (
                          <tr
                            key={
                              order.id
                            }
                          >
                            <td>
                              <button
                                type="button"
                                className={
                                  styles.orderLink
                                }
                                onClick={() =>
                                  void openOrder(
                                    order.orderNumber,
                                  )
                                }
                              >
                                {
                                  order.orderNumber
                                }
                              </button>

                              <span
                                className={
                                  styles.secondaryText
                                }
                              >
                                {formatCurrency(
                                  order.finalPrice,
                                )}
                              </span>
                            </td>

                            <td>
                              <strong>
                                {
                                  order.productName
                                }
                              </strong>

                              <span
                                className={
                                  styles.secondaryText
                                }
                              >
                                {
                                  order.variantLabel
                                }
                              </span>
                            </td>

                            <td>
                              <strong>
                                {order
                                  .address
                                  ?.pincode ??
                                  "—"}
                              </strong>

                              <span
                                className={
                                  styles.secondaryText
                                }
                              >
                                {order
                                  .address
                                  ? `${order.address.city}, ${order.address.state}`
                                  : "—"}
                              </span>
                            </td>

                            <td>
                              {formatDate(
                                order.pickupDate,
                              )}
                            </td>

                            <td>
                              {order.vendor ? (
                                <div
                                  className={
                                    styles.vendorCell
                                  }
                                >
                                  <strong>
                                    {
                                      order.vendor.businessName
                                    }
                                  </strong>

                                  <span>
                                    {
                                      order.vendor.vendorCode
                                    }
                                  </span>
                                </div>
                              ) : (
                                <span
                                  className={
                                    styles.unassigned
                                  }
                                >
                                  Unassigned
                                </span>
                              )}
                            </td>

                            <td>
                              {order.routing ? (
                                <div
                                  className={
                                    styles.routingCell
                                  }
                                >
                                  <strong>
                                    {formatStatus(
                                      order.routing.source,
                                    )}
                                  </strong>

                                  <span>
                                    {order
                                      .routing
                                      .prioritySnapshot !==
                                    null
                                      ? `Priority ${order.routing.prioritySnapshot}`
                                      : formatStatus(
                                          order.routing.reason,
                                        )}
                                  </span>
                                </div>
                              ) : (
                                "—"
                              )}
                            </td>

                            <td>
                              <span
                                className={
                                  styles.orderStatus
                                }
                              >
                                {operationalStatusLabel(
                                  order.status,
                                  Boolean(
                                    order.vendor,
                                  ),
                                )}
                              </span>
                            </td>

                            <td>
                              {order.vendor &&
                              !isReroutableStatus(
                                order.status,
                              ) ? (
                                <button
                                  type="button"
                                  className={
                                    styles.secondaryAction
                                  }
                                  onClick={() =>
                                    void openOrder(
                                      order.orderNumber,
                                    )
                                  }
                                >
                                  View
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className={
                                    order.vendor
                                      ? styles.secondaryAction
                                      : styles.primaryAction
                                  }
                                  disabled={
                                    assignmentLoading
                                  }
                                  onClick={() =>
                                    void openAssignmentDialog(
                                      order,
                                    )
                                  }
                                >
                                  {order.vendor
                                    ? "Reroute"
                                    : "Assign"}
                                </button>
                              )}
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
                  {orders.data.map(
                    (order) => (
                      <article
                        key={order.id}
                        className={
                          styles.mobileCard
                        }
                      >
                        <div
                          className={
                            styles.mobileCardHeader
                          }
                        >
                          <div>
                            <button
                              type="button"
                              className={
                                styles.mobileOrderLink
                              }
                              onClick={() =>
                                void openOrder(
                                  order.orderNumber,
                                )
                              }
                            >
                              {
                                order.orderNumber
                              }
                            </button>

                            <span
                              className={
                                styles.secondaryText
                              }
                            >
                              {formatCurrency(
                                order.finalPrice,
                              )}
                            </span>
                          </div>

                          <span
                            className={
                              styles.orderStatus
                            }
                          >
                            {operationalStatusLabel(
                              order.status,
                              Boolean(
                                order.vendor,
                              ),
                            )}
                          </span>
                        </div>

                        <div
                          className={
                            styles.mobileOrderDevice
                          }
                        >
                          <strong>
                            {
                              order.productName
                            }
                          </strong>

                          <span>
                            {
                              order.variantLabel
                            }
                          </span>
                        </div>

                        <dl
                          className={
                            styles.mobileOrderGrid
                          }
                        >
                          <div>
                            <dt>Pincode</dt>
                            <dd>
                              {order
                                .address
                                ?.pincode ??
                                "—"}
                            </dd>
                          </div>

                          <div>
                            <dt>Pickup</dt>
                            <dd>
                              {formatDate(
                                order.pickupDate,
                              )}
                            </dd>
                          </div>

                          <div>
                            <dt>Vendor</dt>
                            <dd>
                              {order
                                .vendor
                                ?.businessName ??
                                "Unassigned"}
                            </dd>
                          </div>

                          <div>
                            <dt>Routing</dt>
                            <dd>
                              {order.routing
                                ? formatStatus(
                                    order.routing.source,
                                  )
                                : "—"}
                            </dd>
                          </div>
                        </dl>

                        <div
                          className={
                            styles.mobileActions
                          }
                        >
                          <button
                            type="button"
                            className={
                              styles.secondaryAction
                            }
                            onClick={() =>
                              void openOrder(
                                order.orderNumber,
                              )
                            }
                          >
                            View Details
                          </button>

                          {(!order.vendor ||
                            isReroutableStatus(
                              order.status,
                            )) && (
                            <button
                              type="button"
                              className={
                                styles.primaryAction
                              }
                              disabled={
                                assignmentLoading
                              }
                              onClick={() =>
                                void openAssignmentDialog(
                                  order,
                                )
                              }
                            >
                              {order.vendor
                                ? "Reroute"
                                : "Assign Vendor"}
                            </button>
                          )}
                        </div>
                      </article>
                    ),
                  )}
                </div>

                {renderPagination(
                  orders.pagination,
                  setOrderPage,
                )}
              </>
            ) : null}
          </>
        )}
      </section>

      {drawerLoading ? (
        <>
          <button
            type="button"
            aria-label="Close order details"
            className={
              styles.drawerOverlay
            }
            onClick={() =>
              setDrawerLoading(false)
            }
          />

          <aside
            className={
              styles.drawer
            }
          >
            <div
              className={
                styles.drawerLoading
              }
            >
              Loading order
              details…
            </div>
          </aside>
        </>
      ) : null}

      {drawerError ? (
        <>
          <button
            type="button"
            aria-label="Close order details"
            className={
              styles.drawerOverlay
            }
            onClick={() =>
              setDrawerError("")
            }
          />

          <aside
            className={
              styles.drawer
            }
          >
            <div
              className={
                styles.drawerHeader
              }
            >
              <div>
                <span>
                  Order Details
                </span>

                <strong>
                  Unable to load
                </strong>
              </div>

              <button
                type="button"
                className={
                  styles.iconButton
                }
                onClick={() =>
                  setDrawerError("")
                }
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div
              className={
                styles.drawerError
              }
            >
              <AlertCircle
                size={22}
              />

              <span>
                {drawerError}
              </span>
            </div>
          </aside>
        </>
      ) : null}

      {drawer ? (
        <>
          <button
            type="button"
            aria-label="Close order details"
            className={
              styles.drawerOverlay
            }
            onClick={() =>
              setDrawer(null)
            }
          />

          <aside
            className={
              styles.drawer
            }
            aria-label="Order routing details"
          >
            <div
              className={
                styles.drawerHeader
              }
            >
              <div>
                <span>
                  Order Details
                </span>

                <strong>
                  {
                    drawer.detail
                      .orderNumber
                  }
                </strong>
              </div>

              <button
                type="button"
                className={
                  styles.iconButton
                }
                onClick={() =>
                  setDrawer(null)
                }
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div
              className={
                styles.drawerBody
              }
            >
              <section
                className={
                  styles.detailSection
                }
              >
                <h3>Device</h3>

                <div
                  className={
                    styles.deviceSummary
                  }
                >
                  <div>
                    <strong>
                      {
                        drawer.detail
                          .productName
                      }
                    </strong>

                    <span>
                      {
                        drawer.detail
                          .variantLabel
                      }
                    </span>
                  </div>

                  <strong
                    className={
                      styles.price
                    }
                  >
                    {formatCurrency(
                      drawer.detail
                        .finalPrice,
                    )}
                  </strong>
                </div>

                <dl
                  className={
                    styles.detailGrid
                  }
                >
                  <div>
                    <dt>Base Price</dt>
                    <dd>
                      {formatCurrency(
                        drawer.detail
                          .basePrice,
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt>
                      Total Deduction
                    </dt>
                    <dd>
                      {formatCurrency(
                        drawer.detail
                          .totalDeduction,
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt>Status</dt>
                    <dd>
                      {operationalStatusLabel(
                        drawer.detail
                          .status,
                        Boolean(
                          drawer.detail
                            .currentVendor,
                        ),
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt>
                      Payout Method
                    </dt>
                    <dd>
                      {
                        drawer.detail
                          .payoutMethod
                      }
                    </dd>
                  </div>
                </dl>
              </section>

              <section
                className={
                  styles.detailSection
                }
              >
                <h3>
                  Pickup & Customer
                </h3>

                <dl
                  className={
                    styles.detailGrid
                  }
                >
                  <div>
                    <dt>
                      Pickup Date
                    </dt>
                    <dd>
                      {formatDate(
                        drawer.detail
                          .pickupDate,
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt>
                      Pickup Slot
                    </dt>
                    <dd>
                      {drawer.detail
                        .pickupSlot
                        ?.label ??
                        "—"}
                    </dd>
                  </div>
                </dl>

                {drawer.detail
                  .addressSnapshot ? (
                  <div
                    className={
                      styles.addressBox
                    }
                  >
                    <strong>
                      {
                        drawer.detail
                          .addressSnapshot
                          .fullName
                      }
                    </strong>

                    <span>
                      {
                        drawer.detail
                          .addressSnapshot
                          .phone
                      }
                    </span>

                    <p>
                      {
                        drawer.detail
                          .addressSnapshot
                          .house
                      }
                      ,{" "}
                      {
                        drawer.detail
                          .addressSnapshot
                          .street
                      }
                      ,{" "}
                      {
                        drawer.detail
                          .addressSnapshot
                          .locality
                      }
                      {drawer.detail
                        .addressSnapshot
                        .landmark
                        ? `, ${drawer.detail.addressSnapshot.landmark}`
                        : ""}
                      ,{" "}
                      {
                        drawer.detail
                          .addressSnapshot
                          .city
                      }{" "}
                      -{" "}
                      {
                        drawer.detail
                          .addressSnapshot
                          .pincode
                      }
                      ,{" "}
                      {
                        drawer.detail
                          .addressSnapshot
                          .state
                      }
                    </p>
                  </div>
                ) : (
                  <span
                    className={
                      styles.muted
                    }
                  >
                    Address unavailable
                  </span>
                )}
              </section>

              <section
                className={
                  styles.detailSection
                }
              >
                <div
                  className={
                    styles.sectionHeading
                  }
                >
                  <h3>
                    Current Vendor
                  </h3>

                  {drawer.detail
                    .currentVendor ? (
                    <CheckCircle2
                      size={18}
                    />
                  ) : (
                    <AlertCircle
                      size={18}
                    />
                  )}
                </div>

                {drawer.detail
                  .currentVendor ? (
                  <div
                    className={
                      styles.currentVendorCard
                    }
                  >
                    <strong>
                      {
                        drawer.detail
                          .currentVendor
                          .businessName
                      }
                    </strong>

                    <span>
                      {
                        drawer.detail
                          .currentVendor
                          .vendorCode
                      }
                    </span>

                    <small>
                      {
                        drawer.detail
                          .currentVendor
                          .contactName
                      }{" "}
                      ·{" "}
                      {
                        drawer.detail
                          .currentVendor
                          .phone
                      }
                    </small>
                  </div>
                ) : (
                  <div
                    className={
                      styles.unassignedBox
                    }
                  >
                    This order is
                    currently
                    unassigned.
                  </div>
                )}
              </section>

              <section
                className={
                  styles.detailSection
                }
              >
                <div
                  className={
                    styles.sectionHeading
                  }
                >
                  <h3>
                    Routing History
                  </h3>

                  <History size={18} />
                </div>

                {drawer.history
                  .length === 0 ? (
                  <div
                    className={
                      styles.noHistory
                    }
                  >
                    No routing history
                    is available.
                  </div>
                ) : (
                  <div
                    className={
                      styles.timeline
                    }
                  >
                    {drawer.history.map(
                      (item) => (
                        <div
                          key={
                            item.id
                          }
                          className={
                            styles.timelineItem
                          }
                        >
                          <div
                            className={
                              styles.timelineMarker
                            }
                          />

                          <div
                            className={
                              styles.timelineContent
                            }
                          >
                            <div
                              className={
                                styles.timelineTop
                              }
                            >
                              <strong>
                                {
                                  item.vendor
                                    .businessName
                                }
                              </strong>

                              <span>
                                {formatStatus(
                                  item.source,
                                )}
                              </span>
                            </div>

                            <span>
                              {
                                item.vendor
                                  .vendorCode
                              }
                              {item.prioritySnapshot !==
                              null
                                ? ` · Priority ${item.prioritySnapshot}`
                                : ""}
                            </span>

                            <small>
                              Assigned{" "}
                              {formatDateTime(
                                item.assignedAt,
                              )}
                            </small>

                            {item.unassignedAt ? (
                              <small>
                                Ended{" "}
                                {formatDateTime(
                                  item.unassignedAt,
                                )}
                                {item.unassignmentReason
                                  ? ` · ${formatStatus(
                                      item.unassignmentReason,
                                    )}`
                                  : ""}
                              </small>
                            ) : (
                              <small
                                className={
                                  styles.currentAssignment
                                }
                              >
                                Current
                                assignment
                              </small>
                            )}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </section>
            </div>
          </aside>
        </>
      ) : null}

      {manageVendorsLoading &&
      !manageVendorsDialog ? (
        <>
          <button
            type="button"
            className={
              styles.modalOverlay
            }
            aria-label="Close vendor management"
            onClick={() => {
              setManageVendorsLoading(
                false,
              );
              setManageVendorsError(
                "",
              );
            }}
          />

          <div
            className={
              styles.modal
            }
            role="dialog"
            aria-modal="true"
          >
            <div
              className={
                styles.modalLoading
              }
            >
              Loading vendors…
            </div>
          </div>
        </>
      ) : null}

      {manageVendorsError &&
      !manageVendorsDialog &&
      !manageVendorsLoading ? (
        <>
          <button
            type="button"
            className={
              styles.modalOverlay
            }
            aria-label="Close vendor management error"
            onClick={() =>
              setManageVendorsError("")
            }
          />

          <div
            className={
              styles.modal
            }
            role="dialog"
            aria-modal="true"
          >
            <div
              className={
                styles.modalHeader
              }
            >
              <div>
                <span>
                  Service Area
                </span>
                <strong>
                  Unable to continue
                </strong>
              </div>

              <button
                type="button"
                className={
                  styles.iconButton
                }
                onClick={() =>
                  setManageVendorsError(
                    "",
                  )
                }
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div
              className={
                styles.modalError
              }
            >
              <AlertCircle
                size={20}
              />
              <span>
                {
                  manageVendorsError
                }
              </span>
            </div>
          </div>
        </>
      ) : null}

      {manageVendorsDialog ? (
        <>
          <button
            type="button"
            className={
              styles.modalOverlay
            }
            aria-label="Close vendor management"
            onClick={() => {
              if (
                !manageVendorsLoading
              ) {
                setManageVendorsDialog(
                  null,
                );
                setManageVendorsError(
                  "",
                );
              }
            }}
          />

          <div
            className={
              styles.modal
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="manage-vendors-title"
          >
            <div
              className={
                styles.modalHeader
              }
            >
              <div>
                <span>
                  Service Area Vendors
                </span>

                <strong
                  id="manage-vendors-title"
                >
                  {
                    manageVendorsDialog
                      .area.pincode
                  }
                </strong>
              </div>

              <button
                type="button"
                className={
                  styles.iconButton
                }
                disabled={
                  manageVendorsLoading
                }
                onClick={() => {
                  setManageVendorsDialog(
                    null,
                  );
                  setManageVendorsError(
                    "",
                  );
                }}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div
              className={
                styles.modalBody
              }
            >
              <div
                className={
                  styles.orderContext
                }
              >
                <div>
                  <span>Pincode</span>
                  <strong>
                    {
                      manageVendorsDialog
                        .area.pincode
                    }
                  </strong>
                </div>

                <div>
                  <span>Location</span>
                  <strong>
                    {getServiceAreaLocation(
                      manageVendorsDialog
                        .area,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Selected Vendors
                  </span>
                  <strong>
                    {
                      manageVendorsDialog
                        .selectedVendorIds
                        .length
                    }
                  </strong>
                </div>
              </div>

              <div
                className={
                  styles.vendorSelectionHeader
                }
              >
                <strong>
                  Active Vendors
                </strong>

                <span>
                  Select vendors and
                  set routing priority
                </span>
              </div>

              <div
                className={
                  styles.vendorOptions
                }
              >
                {manageVendorsDialog.vendors.map(
                  (vendor) => {
                    const selected =
                      manageVendorsDialog.selectedVendorIds.includes(
                        vendor.id,
                      );

                    return (
                      <button
                        key={vendor.id}
                        type="button"
                        disabled={
                          manageVendorsLoading
                        }
                        className={`${styles.vendorOption} ${
                          selected
                            ? styles.vendorOptionSelected
                            : ""
                        }`}
                        onClick={() =>
                          toggleManagedVendor(
                            vendor.id,
                          )
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

                        <div
                          className={
                            styles.vendorOptionMeta
                          }
                        >
                          {selected ? (
                            <>
                              <span>
                                Priority
                              </span>

                              <input
                                type="number"
                                min={1}
                                max={10000}
                                value={
                                  manageVendorsDialog
                                    .priorities[
                                    vendor.id
                                  ] ?? 100
                                }
                                disabled={
                                  manageVendorsLoading
                                }
                                onClick={(
                                  event,
                                ) =>
                                  event.stopPropagation()
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateManagedPriority(
                                    vendor.id,
                                    event
                                      .target
                                      .value,
                                  )
                                }
                                aria-label={`Priority for ${vendor.businessName}`}
                              />

                              <CheckCircle2
                                size={18}
                              />
                            </>
                          ) : (
                            <span>
                              Not mapped
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  },
                )}
              </div>

              {manageVendorsError ? (
                <div
                  className={
                    styles.inlineError
                  }
                  role="alert"
                >
                  <AlertCircle
                    size={16}
                  />
                  {
                    manageVendorsError
                  }
                </div>
              ) : null}
            </div>

            <div
              className={
                styles.modalFooter
              }
            >
              <button
                type="button"
                className={
                  styles.cancelButton
                }
                disabled={
                  manageVendorsLoading
                }
                onClick={() => {
                  setManageVendorsDialog(
                    null,
                  );
                  setManageVendorsError(
                    "",
                  );
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className={
                  styles.confirmButton
                }
                disabled={
                  manageVendorsLoading
                }
                onClick={() =>
                  void saveManagedVendors()
                }
              >
                {manageVendorsLoading
                  ? "Saving…"
                  : "Save Vendor Mapping"}
              </button>
            </div>
          </div>
        </>
      ) : null}

      {assignmentLoading &&
      !assignmentDialog ? (
        <>
          <button
            type="button"
            className={
              styles.modalOverlay
            }
            aria-label="Close vendor selection"
            onClick={() => {
              setAssignmentLoading(
                false,
              );
              setAssignmentError(
                "",
              );
            }}
          />

          <div
            className={
              styles.modal
            }
            role="dialog"
            aria-modal="true"
          >
            <div
              className={
                styles.modalLoading
              }
            >
              Loading eligible
              vendors…
            </div>
          </div>
        </>
      ) : null}

      {assignmentError &&
      !assignmentDialog &&
      !assignmentLoading ? (
        <>
          <button
            type="button"
            className={
              styles.modalOverlay
            }
            aria-label="Close error"
            onClick={() =>
              setAssignmentError("")
            }
          />

          <div
            className={
              styles.modal
            }
            role="dialog"
            aria-modal="true"
          >
            <div
              className={
                styles.modalHeader
              }
            >
              <div>
                <span>
                  Vendor Routing
                </span>

                <strong>
                  Unable to continue
                </strong>
              </div>

              <button
                type="button"
                className={
                  styles.iconButton
                }
                onClick={() =>
                  setAssignmentError("")
                }
              >
                <X size={20} />
              </button>
            </div>

            <div
              className={
                styles.modalError
              }
            >
              <AlertCircle
                size={20}
              />

              <span>
                {assignmentError}
              </span>
            </div>
          </div>
        </>
      ) : null}

      {assignmentDialog ? (
        <>
          <button
            type="button"
            className={
              styles.modalOverlay
            }
            aria-label="Close vendor selection"
            onClick={() => {
              if (
                !assignmentLoading
              ) {
                setAssignmentDialog(
                  null,
                );
                setAssignmentError(
                  "",
                );
                setSelectedVendorId(
                  null,
                );
              }
            }}
          />

          <div
            className={
              styles.modal
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="routing-modal-title"
          >
            <div
              className={
                styles.modalHeader
              }
            >
              <div>
                <span>
                  {assignmentDialog.mode ===
                  "ASSIGN"
                    ? "Manual Assignment"
                    : "Order Reroute"}
                </span>

                <strong
                  id="routing-modal-title"
                >
                  {
                    assignmentDialog
                      .order
                      .orderNumber
                  }
                </strong>
              </div>

              <button
                type="button"
                className={
                  styles.iconButton
                }
                disabled={
                  assignmentLoading
                }
                onClick={() => {
                  setAssignmentDialog(
                    null,
                  );
                  setAssignmentError(
                    "",
                  );
                  setSelectedVendorId(
                    null,
                  );
                }}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div
              className={
                styles.modalBody
              }
            >
              <div
                className={
                  styles.orderContext
                }
              >
                <div>
                  <span>Device</span>
                  <strong>
                    {
                      assignmentDialog
                        .order
                        .productName
                    }
                  </strong>
                </div>

                <div>
                  <span>Pincode</span>
                  <strong>
                    {assignmentDialog
                      .order.address
                      ?.pincode ??
                      "—"}
                  </strong>
                </div>

                <div>
                  <span>
                    Current Vendor
                  </span>
                  <strong>
                    {assignmentDialog
                      .order.vendor
                      ?.businessName ??
                      "Unassigned"}
                  </strong>
                </div>
              </div>

              <div
                className={
                  styles.vendorSelectionHeader
                }
              >
                <strong>
                  Eligible Vendors
                </strong>

                <span>
                  {
                    assignmentDialog
                      .eligibleVendors
                      .length
                  }{" "}
                  available
                </span>
              </div>

              {assignmentDialog
                .eligibleVendors
                .length === 0 ? (
                <div
                  className={
                    styles.noEligibleVendor
                  }
                >
                  <AlertCircle
                    size={22}
                  />

                  <strong>
                    No eligible vendor
                  </strong>

                  <span>
                    This pincode
                    currently has no
                    active eligible
                    vendor.
                  </span>
                </div>
              ) : (
                <div
                  className={
                    styles.vendorOptions
                  }
                >
                  {assignmentDialog.eligibleVendors.map(
                    (vendor) => {
                      const isCurrent =
                        assignmentDialog
                          .order.vendor
                          ?.id ===
                        vendor.id;

                      const selected =
                        selectedVendorId ===
                        vendor.id;

                      return (
                        <button
                          key={
                            vendor.id
                          }
                          type="button"
                          disabled={
                            isCurrent ||
                            assignmentLoading
                          }
                          className={`${styles.vendorOption} ${
                            selected
                              ? styles.vendorOptionSelected
                              : ""
                          } ${
                            isCurrent
                              ? styles.vendorOptionCurrent
                              : ""
                          }`}
                          onClick={() =>
                            setSelectedVendorId(
                              vendor.id,
                            )
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

                          <div
                            className={
                              styles.vendorOptionMeta
                            }
                          >
                            <span>
                              Priority{" "}
                              {
                                vendor.priority
                              }
                            </span>

                            {isCurrent ? (
                              <small>
                                Current
                              </small>
                            ) : selected ? (
                              <CheckCircle2
                                size={18}
                              />
                            ) : null}
                          </div>
                        </button>
                      );
                    },
                  )}
                </div>
              )}

              {assignmentError ? (
                <div
                  className={
                    styles.inlineError
                  }
                  role="alert"
                >
                  <AlertCircle
                    size={16}
                  />
                  {
                    assignmentError
                  }
                </div>
              ) : null}
            </div>

            <div
              className={
                styles.modalFooter
              }
            >
              <button
                type="button"
                className={
                  styles.cancelButton
                }
                disabled={
                  assignmentLoading
                }
                onClick={() => {
                  setAssignmentDialog(
                    null,
                  );
                  setAssignmentError(
                    "",
                  );
                  setSelectedVendorId(
                    null,
                  );
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className={
                  styles.confirmButton
                }
                disabled={
                  selectedVendorId ===
                    null ||
                  assignmentLoading
                }
                onClick={() =>
                  void submitAssignment()
                }
              >
                {assignmentLoading
                  ? "Saving…"
                  : assignmentDialog.mode ===
                      "ASSIGN"
                    ? "Assign Vendor"
                    : "Confirm Reroute"}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}