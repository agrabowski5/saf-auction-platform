import { NextRequest } from "next/server";
import { auctionEmitter, type AuctionEvent } from "@/lib/sse/event-emitter";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auctionId = req.nextUrl.searchParams.get("auctionId");

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const channel = auctionId ? `auction:${auctionId}` : "auction:all";

      function onEvent(event: AuctionEvent) {
        try {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch {
          // Stream closed
        }
      }

      // Send keepalive every 30s
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          clearInterval(keepalive);
        }
      }, 30000);

      auctionEmitter.on(channel, onEvent);

      // Cleanup on close
      req.signal.addEventListener("abort", () => {
        auctionEmitter.off(channel, onEvent);
        clearInterval(keepalive);
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
