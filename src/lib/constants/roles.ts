export type UserRole = "producer" | "consumer" | "admin";

export const ROLES = {
  PRODUCER: "producer" as const,
  CONSUMER: "consumer" as const,
  ADMIN: "admin" as const,
};

export const ROLE_LABELS: Record<UserRole, string> = {
  producer: "SAF Producer",
  consumer: "SAF Consumer (Airline)",
  admin: "Market Administrator",
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  producer: "Submit asks, manage facilities, upload certificates",
  consumer: "Submit bids, track emissions, generate compliance reports",
  admin: "Create auctions, clear markets, manage users",
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
    { label: "Analytics", href: "/producer/analytics", icon: "BarChart3" },
  ],
  consumer: [
    { label: "Dashboard", href: "/consumer", icon: "LayoutDashboard" },
    { label: "My Bids", href: "/consumer/bids", icon: "Gavel" },
    { label: "Certificates", href: "/consumer/certificates", icon: "FileCheck" },
    { label: "Emissions", href: "/consumer/emissions", icon: "Leaf" },
    { label: "Compliance", href: "/consumer/compliance", icon: "ClipboardCheck" },
    { label: "Analytics", href: "/consumer/analytics", icon: "BarChart3" },
  ],
  admin: [
    { label: "Dashboard", href: "/admin", icon: "LayoutDashboard" },
    { label: "Auctions", href: "/admin/auctions", icon: "Gavel" },
    { label: "Users", href: "/admin/users", icon: "Users" },
    { label: "Audit Log", href: "/admin/audit", icon: "ScrollText" },
    { label: "Fraud Detection", href: "/admin/fraud", icon: "ShieldAlert" },
    { label: "Analytics", href: "/admin/analytics", icon: "BarChart3" },
  ],
};
