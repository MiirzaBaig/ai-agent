import { getDesktopURL } from "@/lib/e2b/utils";

export async function POST(request: Request) {
  try {
    const { sandboxId } = await request.json();
    const result = await getDesktopURL(sandboxId || undefined);
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

