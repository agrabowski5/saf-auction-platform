"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/lib/constants/roles";
import { ROLE_LABELS } from "@/lib/constants/roles";

const ROLES: UserRole[] = ["producer", "consumer", "admin"];

export function DemoBanner() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const currentRole = session?.user?.role;

  async function switchRole(role: UserRole) {
    if (role === currentRole) return;
    await fetch("/api/demo/switch-persona", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    await update({ role });
    router.push(`/${role}`);
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between bg-amber-500/10 border-b border-amber-500/20 px-6 py-1.5">
      <div className="flex items-center gap-2 text-amber-400">
        <Monitor className="h-3.5 w-3.5" />
        <span className="text-xs font-semibold">DEMO MODE</span>
      </div>
      <div className="flex items-center gap-1">
        {ROLES.map((role) => (
          <Button
            key={role}
            variant={currentRole === role ? "default" : "ghost"}
            size="sm"
            className="h-6 text-[10px] px-2"
            onClick={() => switchRole(role)}
          >
            {ROLE_LABELS[role]}
          </Button>
        ))}
      </div>
    </div>
  );
}
