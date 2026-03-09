export type UserRole = "producer" | "consumer" | "admin";

export const ROLES = {
  PRODUCER: "producer" as const,
  CONSUMER: "consumer" as const,
  ADMIN: "admin" as const,
};

export const ROLE_LABELS: Record<UserRole, string> = {
  producer: "Abatement Provider",
  consumer: "Company / Emitter",
  admin: "Market Administrator",
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  producer: "List abatements, manage facilities, track transactions",
  consumer: "Track emissions, purchase abatements, manage targets",
  admin: "Manage auctions, oversee transactions, platform analytics",
};

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export const ROLE_NAV_ITEMS: Record<UserRole, NavItem[]> = {
  producer: [
    { label: "Dashboard", href: "/producer", icon: "LayoutDashboard" },
    { label: "My Asks", href: "/producer/asks", icon: "TrendingUp" },
    { label: "Facilities", href: "/producer/facilities", icon: "Factory" },
    { label: "Certificates", href: "/producer/certificates", icon: "FileCheck" },
    { label: "Transactions", href: "/producer/transactions", icon: "ArrowLeftRight" },
    { label: "Analytics", href: "/producer/analytics", icon: "BarChart3" },
  ],
  consumer: [
    { label: "Dashboard", href: "/consumer", icon: "LayoutDashboard" },
    { label: "Emissions", href: "/consumer/emissions", icon: "Leaf" },
    { label: "Targets", href: "/consumer/targets", icon: "Target" },
    { label: "Marketplace", href: "/consumer/marketplace", icon: "ShoppingCart" },
    { label: "Book & Claim", href: "/consumer/book-claim", icon: "ArrowLeftRight" },
    { label: "Demand Pools", href: "/consumer/pools", icon: "Users" },
    { label: "My Bids", href: "/consumer/bids", icon: "Gavel" },
    { label: "Certificates", href: "/consumer/certificates", icon: "FileCheck" },
    { label: "Reports", href: "/consumer/reports", icon: "FileText" },
  ],
  admin: [
    { label: "Dashboard", href: "/admin", icon: "LayoutDashboard" },
    { label: "Emissions", href: "/admin/emissions", icon: "Leaf" },
    { label: "Auctions", href: "/admin/auctions", icon: "Gavel" },
    { label: "Transactions", href: "/admin/transactions", icon: "ArrowLeftRight" },
    { label: "Demand Pools", href: "/admin/pools", icon: "Users" },
    { label: "Users", href: "/admin/users", icon: "Users" },
    { label: "Audit Log", href: "/admin/audit", icon: "ScrollText" },
    { label: "Analytics", href: "/admin/analytics", icon: "BarChart3" },
  ],
};
