import {
  Activity,
  BadgeIndianRupee,
  Boxes,
  ClipboardCheck,
  FileQuestion,
  LayoutDashboard,
  MapPinned,
  PackageSearch,
  ReceiptIndianRupee,
  Route,
  Settings,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  UserCog,
  Users,
  UsersRound,
  WalletCards,
} from "lucide-react";

export type NavigationItem = {
  label: string;
  href: string;
  icon: React.ElementType;
};

export type NavigationSection = {
  title?: string;
  items: NavigationItem[];
};

export const navigationSections: NavigationSection[] = [
  {
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },

  {
    title: "OPERATIONS",

    items: [
      {
        label: "Orders",
        href: "/orders",
        icon: ShoppingBag,
      },

      {
        label: "Enquiries",
        href: "/enquiries",
        icon: PackageSearch,
      },

      {
        label: "Customers",
        href: "/customers",
        icon: Users,
      },

      {
        label: "Vendors",
        href: "/vendors",
        icon: Store,
      },

      {
        label: "Agents",
        href: "/agents",
        icon: UsersRound,
      },

      {
        label: "Service Areas",
        href: "/service-areas",
        icon: MapPinned,
      },

      {
        label: "Routing",
        href: "/routing",
        icon: Route,
      },
    ],
  },

  {
    title: "CATALOGUE",

    items: [
      {
        label: "Catalogue",
        href: "/catalogue",
        icon: Boxes,
      },

      {
        label: "Pricing",
        href: "/pricing",
        icon: SlidersHorizontal,
      },

      {
        label: "Questionnaire",
        href: "/questionnaire",
        icon: FileQuestion,
      },

      {
        label: "Approval Center",
        href: "/approvals",
        icon: ClipboardCheck,
      },
    ],
  },

  {
    title: "FINANCE",

    items: [
      {
        label: "Payments",
        href: "/payments",
        icon: WalletCards,
      },

      {
        label: "Payouts",
        href: "/payouts",
        icon: BadgeIndianRupee,
      },

      {
        label: "Transactions",
        href: "/transactions",
        icon: ReceiptIndianRupee,
      },
    ],
  },

  {
    title: "MANAGEMENT",

    items: [
      {
        label: "Admins",
        href: "/admins",
        icon: UserCog,
      },

      {
        label: "Roles & Permissions",
        href: "/roles",
        icon: ShieldCheck,
      },
    ],
  },

  {
    title: "SYSTEM",

    items: [
      {
        label: "Audit Logs",
        href: "/audit-logs",
        icon: Activity,
      },

      {
        label: "System Settings",
        href: "/settings",
        icon: Settings,
      },
    ],
  },
];