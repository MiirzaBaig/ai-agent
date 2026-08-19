import { refreshBrowserLiveViewUrl } from "@/lib/browser/session";

export async function POST(request: Request) {
  try {
    const { sandboxId } = await request.json();
    const liveViewUrl = await refreshBrowserLiveViewUrl(sandboxId || undefined);
    return Response.json({ liveViewUrl });
  } catch (error) {
    console.error("Failed to refresh browser live view:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to refresh browser live view";
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
