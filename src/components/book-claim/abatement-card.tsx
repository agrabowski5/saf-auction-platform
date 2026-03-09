"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { STATUS_CONFIG } from "@/lib/book-claim/lifecycle";
import type { BookClaimStatus } from "@/lib/book-claim/lifecycle";
import { ShoppingCart, ClipboardCheck, Archive, User } from "lucide-react";

export interface AbatementTransaction {
  id: string;
  abatementType: { name: string; code: string };
  sector: { name: string; color: string };
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  status: string;
  seller?: { name: string; company: string } | null;
}

interface AbatementCardProps {
  transaction: AbatementTransaction;
  onAction?: (id: string, action: string) => void;
}

const ACTION_CONFIG: Record<string, { label: string; action: string; icon: React.ReactNode }> = {
  listed: {
    label: "Purchase",
    action: "purchase",
    icon: <ShoppingCart className="mr-2 h-4 w-4" />,
  },
  purchased: {
    label: "Claim",
    action: "claim",
    icon: <ClipboardCheck className="mr-2 h-4 w-4" />,
  },
  claimed: {
    label: "Retire",
    action: "retire",
    icon: <Archive className="mr-2 h-4 w-4" />,
  },
};

export function AbatementCard({ transaction, onAction }: AbatementCardProps) {
  const statusConfig = STATUS_CONFIG[transaction.status as BookClaimStatus];
  const actionConfig = ACTION_CONFIG[transaction.status];

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4 transition-colors hover:border-muted-foreground/30">
      {/* Header: Abatement Type */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm leading-tight">
          {transaction.abatementType.name}
        </h3>
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: transaction.sector.color }}
          />
          <span className="text-xs text-muted-foreground">
            {transaction.sector.name}
          </span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Quantity
          </p>
          <p className="text-sm font-semibold tabular-nums">
            {transaction.quantity.toLocaleString()} tCO2e
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Price/Unit
          </p>
          <p className="text-sm font-semibold tabular-nums">
            ${transaction.pricePerUnit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Total
          </p>
          <p className="text-sm font-semibold tabular-nums">
            ${transaction.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Seller info */}
      {transaction.seller && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          <span>
            {transaction.seller.name} &mdash; {transaction.seller.company}
          </span>
        </div>
      )}

      {/* Footer: Status + Action */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <Badge
          className="text-[10px]"
          style={{
            backgroundColor: `${statusConfig?.color}20`,
            color: statusConfig?.color,
            borderColor: `${statusConfig?.color}40`,
          }}
        >
          {statusConfig?.label ?? transaction.status}
        </Badge>

        {actionConfig && onAction && (
          <Button
            size="sm"
            onClick={() => onAction(transaction.id, actionConfig.action)}
          >
            {actionConfig.icon}
            {actionConfig.label}
          </Button>
        )}
      </div>
    </div>
  );
}
