import { getBrowserSessionInfo } from "@/lib/browser/session";

export async function POST(request: Request) {
  try {
    const { sandboxId } = await request.json();
    // Launch/connect the dedicated local Chrome and return its session id.
    // (No VNC stream in the local build — the real browser is on screen.)
    const result = await getBrowserSessionInfo(sandboxId || undefined);
    return Response.json(result);
  } catch (error) {
    console.error("Failed to start browser session:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to start browser session";
    return Response.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.stack : String(error),
      },
      { status: 500 },
    );
  }
}
