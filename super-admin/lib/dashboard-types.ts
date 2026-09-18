export interface DashboardSummary {
  /*
   * Grouped active enquiry customers.
   */
  totalEnquiries: number;
  activeInquiryCustomers: number;

  /*
   * Individual product/variant journeys currently active.
   */
  activeDeviceEnquiries: number;

  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  customerCancelledOrders: number;
  agentCancelledOrders: number;
  pendingOrders: number;

  enquiryConversionRate:
    | number
    | null;

  orderSuccessRate:
    | number
    | null;

  /*
   * Device-level active quote journeys.
   * Retained for API compatibility.
   */
  quoteViewedNoOrder: number;

  activeVendors:
    | number
    | null;

  activeAgents:
    | number
    | null;

  totalPayout:
    | number
    | null;
}

export interface FunnelData {
  questionnaireCompleted: number;

  /*
   * OTP OR valid 24-hour verified customer session.
   */
  identityVerified: number;

  /*
   * Actual SMS OTP verification only.
   */
  otpVerified: number;

  quoteViewed: number;
  orderPlaced: number;
  completed: number;
}

export interface TrendData {
  date: string;
  enquiries: number;
  orders: number;
  completed: number;
  cancelled: number;
}

export interface OrderStatusData {
  status: string;
  count: number;
}

export interface EnquiryInsight {
  id: string;
  mobile: string;

  deviceName:
    | string
    | null;

  quoteAmount:
    | number
    | null;

  quoteViewedAt:
    | string
    | null;

  identityVerifiedAt:
    | string
    | null;

  orderPlaced: boolean;
}

export interface InquiryCustomerGroup {
  mobile: string;
  deviceCount: number;

  latestQuoteViewedAt:
    | string
    | null;

  devices: EnquiryInsight[];
}

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  createdAt: string;

  type:
    | "ORDER"
    | "ENQUIRY"
    | "VENDOR"
    | "PAYMENT"
    | "SYSTEM";
}

export interface DashboardResponse {
  summary: DashboardSummary;

  funnel:
    | FunnelData
    | null;

  trend: TrendData[];

  orderStatuses:
    OrderStatusData[];

  /*
   * Temporary flat compatibility response.
   */
  recentEnquiries:
    EnquiryInsight[];

  /*
   * Preferred grouped enquiry response.
   */
  inquiryCustomers:
    InquiryCustomerGroup[];

  recentActivity:
    ActivityItem[];

  meta?: {
    enquiryWaitMinutes: number;
    totalQuoteSessions: number;
    quoteConverted?: number;

    actualOtpVerified?: number;

    activeInquiryCustomers?:
      number;

    activeDeviceEnquiries?:
      number;
  };
}
