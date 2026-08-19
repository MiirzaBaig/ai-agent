import { getBrowserStreamURL } from "@/lib/browser/session";

export async function POST(request: Request) {
  try {
    const { sandboxId } = await request.json();
    // Provisions the sandbox + Chrome browser session and returns the live
    // VNC stream URL so the user can watch the agent drive the browser.
    const result = await getBrowserStreamURL(sandboxId || undefined);
    return Response.json(result);
  } catch (error) {
    console.error("Failed to get desktop URL:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to get desktop URL";
    return Response.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.stack : String(error)
      },
      { status: 500 }
    );
  }
}

