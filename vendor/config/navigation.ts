import {
  Bell,
  ChartNoAxesCombined,
  ClipboardList,
  LayoutDashboard,
  MapPin,
  ReceiptText,
  UserRound,
  UsersRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

export interface VendorNavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const vendorNavigation: VendorNavigationItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Orders",
    href: "/orders",
    icon: ClipboardList,
  },
  {
    label: "Agents",
    href: "/agents",
    icon: UsersRound,
  },
  {
    label: "Service Areas",
    href: "/service-areas",
    icon: MapPin,
  },
  {
    label: "Wallet",
    href: "/wallet",
    icon: WalletCards,
  },
  {
    label: "Transactions",
    href: "/transactions",
    icon: ReceiptText,
  },
  {
    label: "Performance",
    href: "/performance",
    icon: ChartNoAxesCombined,
  },
  {
    label: "Notifications",
    href: "/notifications",
    icon: Bell,
  },
  {
    label: "Profile",
    href: "/profile",
    icon: UserRound,
  },
];