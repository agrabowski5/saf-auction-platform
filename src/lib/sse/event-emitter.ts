import { EventEmitter } from "events";

// Global singleton event emitter for SSE (replaces Redis pub/sub in dev)
const globalForEmitter = globalThis as unknown as {
  auctionEmitter: EventEmitter | undefined;
};

export const auctionEmitter =
  globalForEmitter.auctionEmitter ?? new EventEmitter();

if (process.env.NODE_ENV !== "production") {
  globalForEmitter.auctionEmitter = auctionEmitter;
}

auctionEmitter.setMaxListeners(100);

export type AuctionEvent = {
  type: "bid_count" | "ask_count" | "status_change" | "auction_cleared";
  auctionId: string;
  data: Record<string, unknown>;
};

export function emitAuctionEvent(event: AuctionEvent) {
  auctionEmitter.emit(`auction:${event.auctionId}`, event);
  auctionEmitter.emit("auction:all", event);
}
