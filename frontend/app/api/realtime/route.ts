import { NextRequest } from "next/server";
import { subscribeRealtime, RealtimeMessage } from "@/lib/serverDb";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const encoder = new TextEncoder();

    let unsubscribe: (() => void) | null = null;
    let keepAliveInterval: NodeJS.Timeout | null = null;

    const stream = new ReadableStream({
        start(controller) {
            // Send initial connection handshake
            const initMsg = JSON.stringify({
                type: "CONNECTED",
                payload: { client_time: new Date().toISOString() },
                timestamp: new Date().toISOString(),
            });
            controller.enqueue(encoder.encode(`data: ${initMsg}\n\n`));

            // Subscribe to all server realtime broadcasts
            unsubscribe = subscribeRealtime((msg: RealtimeMessage) => {
                try {
                    const data = `data: ${JSON.stringify(msg)}\n\n`;
                    controller.enqueue(encoder.encode(data));
                } catch (err) {
                    // Controller might be closed
                }
            });

            // Keepalive ping every 25 seconds to prevent gateway timeout
            keepAliveInterval = setInterval(() => {
                try {
                    const ping = `data: ${JSON.stringify({ type: "PING", timestamp: new Date().toISOString() })}\n\n`;
                    controller.enqueue(encoder.encode(ping));
                } catch (err) {
                    // Controller might be closed
                }
            }, 25000);
        },
        cancel() {
            if (unsubscribe) {
                unsubscribe();
                unsubscribe = null;
            }
            if (keepAliveInterval) {
                clearInterval(keepAliveInterval);
                keepAliveInterval = null;
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
}
