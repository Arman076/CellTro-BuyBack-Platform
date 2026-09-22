export type VendorOrderStatus =
  | "ALLOCATED"
  | "PICKED"
  | "PENDING"
  | "INSPECTION"
  | "COMPLETED"
  | "CANCELLED";

export interface VendorDashboardSummary {
  allocatedOrders: number;
  pickedOrders: number;
  pendingActions: number;
  completedToday: number;
}

export interface VendorDashboardOrder {
  orderNumber: string;
  customerName: string;
  deviceName: string;
  pickupSlot: string;
  status: VendorOrderStatus;
}

export interface VendorAgentAvailability {
  total: number;
  active: number;
  onDuty: number;
  offline: number;
  onLeave: number;
}

export interface VendorActivity {
  id: string;
  message: string;
  occurredAt: string;
}

export interface VendorDashboardData {
  summary: VendorDashboardSummary;
  todaysOrders: VendorDashboardOrder[];
  agents: VendorAgentAvailability;
  recentActivity: VendorActivity[];
}