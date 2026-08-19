import { killBrowserSession } from "@/lib/browser/session";

export const runtime = "nodejs";

// Common handler for both GET and POST requests
async function handleKillDesktop(request: Request) {
  // Enable CORS to ensure this works across all browsers

  const { searchParams } = new URL(request.url);
  const sandboxId = searchParams.get("sandboxId");

  console.log(`Kill desktop request received via ${request.method} for ID: ${sandboxId}`);

  if (!sandboxId) {
    return new Response("No sandboxId provided", { status: 400 });
  }

  try {
    await killBrowserSession(sandboxId);
    return new Response("Desktop killed successfully", { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (/not found|already.*(stopped|killed)|paused sandbox/i.test(message)) {
      console.log(`Desktop already stopped for ID: ${sandboxId}`);
      return new Response("Desktop already stopped", { status: 200 });
    }

    console.error(`Failed to kill desktop with ID: ${sandboxId}`, error);
    return new Response("Failed to kill desktop", { status: 500 });
  }
}

// Handle POST requests
export async function POST(request: Request) {
  return handleKillDesktop(request);
}
