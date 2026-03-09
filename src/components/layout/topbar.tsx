"use client";

import { useSession, signOut } from "next-auth/react";
import { LogOut, User, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { DemoBanner } from "./demo-banner";

export function Topbar() {
  const { data: session } = useSession();

  return (
    <div className="flex flex-col">
      {session?.user?.isDemo && <DemoBanner />}
      <header className="flex h-14 items-center justify-between border-b bg-card px-6">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Carbon Abatement Marketplace
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {session?.user && (
            <>
              <Badge variant="outline" className="text-xs">
                {session.user.role.toUpperCase()}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <User className="h-4 w-4" />
                    <span className="text-sm">{session.user.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span>{session.user.name}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {session.user.email}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </header>
    </div>
  );
}
