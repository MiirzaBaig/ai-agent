import { getBrowserSessionInfo } from "@/lib/browser/session";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { sandboxId } = await request.json();
    // Launch/connect the browser and return its session id plus live view URL
    // when the session is hosted remotely.
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
