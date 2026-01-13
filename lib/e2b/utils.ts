"use server";

import { Sandbox } from "@e2b/desktop";
import { resolution } from "./tool";

export const getDesktop = async (id?: string) => {
  try {
    const apiKey = process.env.E2B_API_KEY;
    if (!apiKey) {
      throw new Error("E2B_API_KEY is not set in environment variables");
    }

    if (id) {
      const connected = await Sandbox.connect(id, { apiKey });
      const isRunning = await connected.isRunning();
      if (isRunning) {
        // Start the stream if it's not already running
        try {
          await connected.stream.start();
        } catch (error) {
          // Stream might already be running, which is fine
          console.log("Stream may already be running:", error);
        }
        return connected;
      }
    }

    const desktop = await Sandbox.create({
      apiKey,
      resolution: [resolution.x, resolution.y], // Custom resolution
      timeoutMs: 300000, // Container timeout in milliseconds
    });
    await desktop.stream.start();
    return desktop;
  } catch (error) {
    console.error("Error in getDesktop:", error);
    throw error;
  }
};

export const getDesktopURL = async (id?: string) => {
  try {
    const desktop = await getDesktop(id);
    
    // Ensure stream is started before getting URL
    try {
      await desktop.stream.start();
    } catch (error) {
      // Stream might already be running, which is fine
      console.log("Stream start check:", error);
    }
    
    const streamUrl = desktop.stream.getUrl();
    if (!streamUrl) {
      throw new Error("Failed to get stream URL - stream may not be initialized");
    }

    return { streamUrl, id: desktop.sandboxId };
  } catch (error) {
    console.error("Error in getDesktopURL:", error);
    throw error;
  }
};

export const killDesktop = async (id: string = "desktop") => {
  try {
    const apiKey = process.env.E2B_API_KEY;
    if (!apiKey) {
      throw new Error("E2B_API_KEY is not set in environment variables");
    }
    const desktop = await Sandbox.connect(id, { apiKey });
    await desktop.kill();
  } catch (error) {
    console.error("Error in killDesktop:", error);
    throw error;
  }
};
