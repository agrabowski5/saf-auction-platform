"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  TrendingUp,
  Factory,
  FileCheck,
  BarChart3,
  Gavel,
  Leaf,
  ClipboardCheck,
  Users,
  ScrollText,
  ShieldAlert,
  Fuel,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { UserRole } from "@/lib/constants/roles";
import { ROLE_LABELS } from "@/lib/constants/roles";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  TrendingUp,
  Factory,
  FileCheck,
  BarChart3,
  Gavel,
  Leaf,
  ClipboardCheck,
  Users,
  ScrollText,
  ShieldAlert,
};

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
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

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user?.role ?? "consumer") as UserRole;
  const items = NAV_ITEMS[role] ?? [];

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Fuel className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-sm font-bold tracking-tight">SAF Auction</h1>
          <p className="text-[10px] text-muted-foreground">Marketplace</p>
        </div>
      </div>

      <div className="px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {ROLE_LABELS[role]}
        </p>
      </div>

      <Separator />

      <ScrollArea className="flex-1 px-3 py-2">
        <nav className="flex flex-col gap-1">
          {items.map((item) => {
            const Icon = ICON_MAP[item.icon] ?? LayoutDashboard;
            const isActive =
              pathname === item.href ||
              (item.href !== `/${role}` && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Separator className="my-3" />

        <Link
          href="/auctions"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname.startsWith("/auctions")
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          )}
        >
          <Gavel className="h-4 w-4" />
          Browse Auctions
        </Link>
      </ScrollArea>
    </div>
  );
}
