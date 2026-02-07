"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Gavel, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function ClearAuctionButton({ auctionId }: { auctionId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClear() {
    setLoading(true);
    const res = await fetch(`/api/auctions/${auctionId}/clear`, {
      method: "POST",
    });

    if (res.ok) {
      const result = await res.json();
      toast.success(
        `Auction cleared! ${result.totalVolume.toLocaleString()} gal at avg $${result.averagePrice.toFixed(2)}/gal`
      );
      router.refresh();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to clear auction");
    }
    setLoading(false);
  }

  return (
    <Button onClick={handleClear} disabled={loading}>
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Gavel className="mr-2 h-4 w-4" />
      )}
      {loading ? "Clearing..." : "Clear Auction"}
    </Button>
  );
}
