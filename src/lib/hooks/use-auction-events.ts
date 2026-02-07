"use client";

import { useEffect, useCallback } from "react";
import type { AuctionEvent } from "@/lib/sse/event-emitter";

export function useAuctionEvents(
  auctionId: string | null,
  onEvent: (event: AuctionEvent) => void
) {
  const stableOnEvent = useCallback(onEvent, [onEvent]);

  useEffect(() => {
    if (!auctionId) return;

    const url = `/api/sse/auctions?auctionId=${auctionId}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as AuctionEvent;
        stableOnEvent(event);
      } catch {}
    };

    eventSource.onerror = () => {
      // Auto-reconnect handled by EventSource
    };

    return () => {
      eventSource.close();
    };
  }, [auctionId, stableOnEvent]);
}
