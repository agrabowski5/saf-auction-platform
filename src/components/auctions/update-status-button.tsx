"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  auctionId: string;
  newStatus: string;
  label: string;
}

export function UpdateStatusButton({ auctionId, newStatus, label }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleUpdate() {
    setLoading(true);
    const res = await fetch(`/api/auctions/${auctionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    if (res.ok) {
      toast.success(`Auction status updated to ${newStatus}`);
      router.refresh();
    } else {
      toast.error("Failed to update auction status");
    }
    setLoading(false);
  }

  return (
    <Button variant="outline" onClick={handleUpdate} disabled={loading}>
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {label}
    </Button>
  );
}
