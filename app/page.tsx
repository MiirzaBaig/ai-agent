"use client";

import { useEffect, useState, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { toast } from "sonner";
import { ChatPanel } from "@/components/ChatPanel";
import { VNCPanel } from "@/components/VNCPanel";
import { VNCModal } from "@/components/VNCModal";
import { SessionList } from "@/components/SessionList";
import { useSessionStore } from "@/lib/sessions/store";
import { useEventStore } from "@/lib/events/store";
import { useExtractEvents } from "@/lib/events/hooks";
import { ScrollProvider } from "@/lib/scroll-state";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { SentryLogo } from "@/components/icons";
import { DeployButton } from "@/components/project-info";
import { ModelSelector } from "@/components/ModelSelector";
import { SessionTelemetry } from "@/components/SessionTelemetry";
import { V2Announcement } from "@/components/V2Announcement";
import { useModel } from "@/lib/use-model";
import { useUsage } from "@/lib/use-usage";
import { Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Chat() {
  const [selectedToolCallId, setSelectedToolCallId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showVNCModal, setShowVNCModal] = useState(false);
  const stoppingRef = useRef(false);

  // VNC state - isolated from chat/event updates
  const [vncStreamUrl, setVncStreamUrl] = useState<string | null>(null);
  const [vncSandboxId, setVncSandboxId] = useState<string | null>(null);

  // Track which session the current sandbox belongs to
  const currentSandboxSessionRef = useRef<string | null>(null);

  const {
    currentSessionId,
    loadMessages,
    saveMessages,
    updateSessionSandboxId,
  } = useSessionStore();

  const { loadEvents, clearEvents } = useEventStore();

  const { modelId, setModelId } = useModel();
  const { usage, recordRun, cost } = useUsage(currentSessionId);

  // v5 no longer manages input state — we own it locally.
  const [input, setInput] = useState("");

  // Per-request body (sandboxId, modelId) changes during a session. v5 captures
  // the transport body once, so read the latest values from refs at send time.
  const sandboxIdRef = useRef(vncSandboxId);
  sandboxIdRef.current = vncSandboxId;
  const modelIdRef = useRef(modelId);
  modelIdRef.current = modelId;

  const {
    messages,
    sendMessage,
    status,
    stop: stopGeneration,
    setMessages,
  } = useChat({
    id: currentSessionId ?? undefined,

    onFinish: ({ message }) => {
      // Total usage is attached as message metadata by the route on finish.
      const totalUsage = (
        message.metadata as { totalUsage?: { inputTokens?: number; outputTokens?: number } } | undefined
      )?.totalUsage;
      if (totalUsage) {
        recordRun(modelIdRef.current, {
          inputTokens: totalUsage.inputTokens,
          outputTokens: totalUsage.outputTokens,
        });
      }
    },

    onError: (error) => {
      console.error(error);
      const message = error instanceof Error ? error.message : String(error);
      const benignInterruption =
        stoppingRef.current ||
        error instanceof DOMException ||
        /abort|cancel|interrupted/i.test(message);

      if (benignInterruption) {
        stoppingRef.current = false;
        return;
      }

      toast.error("There was an error", {
        description: message || "Please try again later.",
        richColors: true,
        position: "top-center",
      });
    },

    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: () => ({
        sandboxId: sandboxIdRef.current,
        modelId: modelIdRef.current,
      }),
    }),
  });

  // Load session data when session changes
  useEffect(() => {
    if (!currentSessionId) return;

    // thisClear's existing data first before the  loading new session data
    clearEvents();
    setMessages([]);

    // Load messages and events for this session
    const sessionMessages = loadMessages(currentSessionId);
    loadEvents(currentSessionId);

    // Set messages in chat
    if (sessionMessages.length > 0) {
      setMessages(sessionMessages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSessionId]); // Only re-run when session changes

  // Extract events from messages
  useExtractEvents(messages, currentSessionId || "");

  // Save messages when they change
  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
      saveMessages(currentSessionId, messages);
    }
  }, [messages, currentSessionId, saveMessages]);

  // Clear input when agent finishes (status becomes "ready" after streaming)
  const prevStatusRef = useRef(status);
  useEffect(() => {
    // If status changed from streaming/submitted to ready, clear input
    if (
      prevStatusRef.current !== "ready" &&
      (prevStatusRef.current === "streaming" || prevStatusRef.current === "submitted") &&
      status === "ready"
    ) {
      stoppingRef.current = false;
      // Small delay to ensure user sees the completion, then clear
      const timer = setTimeout(() => {
        setInput("");
        // Force blur input to ensure placeholder shows (especially on desktop)
        const inputElement = document.querySelector('input[placeholder="Tell me what to do..."]') as HTMLInputElement;
        if (inputElement) {
          inputElement.blur();
          // Re-focus after a moment to show placeholder
          setTimeout(() => {
            inputElement.focus();
          }, 200);
        }
      }, 800);
      return () => clearTimeout(timer);
    }
    prevStatusRef.current = status;
  }, [status, setInput]);

  const stop = () => {
    // v5's stop() halts the stream and settles any in-flight tool part cleanly,
    // so no manual result-injection is needed (unlike v4).
    stoppingRef.current = true;
    stopGeneration();
    setInput("");
    setTimeout(() => setInput(""), 100);
  };

  // v5 removed managed input + handleSubmit — bridge to the existing ChatPanel
  // props with local state and sendMessage.
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status !== "ready" || isInitializing) return;
    const text = input.trim();
    if (!text) return;
    stoppingRef.current = false;
    sendMessage({ text });
    setInput("");
  };

  const isLoading = status !== "ready";

  const refreshDesktop = async () => {
    try {
      setIsInitializing(true);
      // Always create a fresh desktop when user clicks refresh
      const response = await fetch("/api/get-desktop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sandboxId: null }), // Always create new on manual refresh
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || "Failed to get desktop URL";
        throw new Error(errorMessage);
      }
      const { streamUrl, id } = await response.json();
      setVncStreamUrl(streamUrl);
      setVncSandboxId(id);
      if (currentSessionId) {
        currentSandboxSessionRef.current = currentSessionId;
        updateSessionSandboxId(currentSessionId, id);
      }
    } catch (err) {
      console.error("Failed to refresh desktop:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to refresh desktop";
      toast.error("Failed to refresh desktop", {
        description: errorMessage,
      });
    } finally {
      setIsInitializing(false);
    }
  };

  // Initialize desktop on mount or session change
  useEffect(() => {
    if (!currentSessionId) return;

    const init = async () => {
      try {
        setIsInitializing(true);

        // Check if we're switching sessions - if so liek, we need a fresh desktop
        // E2B desktops are ephemeral, so foreach session should get its own VM
        const isNewSession = currentSandboxSessionRef.current !== currentSessionId;

        // Don't try to reuse the old sandbox as it belongs to another session
        const sandboxToUse = isNewSession ? null : vncSandboxId;

        const response = await fetch("/api/get-desktop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sandboxId: sandboxToUse }),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || "Failed to get desktop URL";
          throw new Error(errorMessage);
        }
        const { streamUrl, id } = await response.json();
        setVncStreamUrl(streamUrl);
        setVncSandboxId(id);
        currentSandboxSessionRef.current = currentSessionId;
        updateSessionSandboxId(currentSessionId, id);
      } catch (err) {
        console.error("Failed to initialize desktop:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to initialize desktop";
        toast.error("Failed to initialize desktop", {
          description: errorMessage,
        });
      } finally {
        setIsInitializing(false);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSessionId]);

  // Kill desktop on page close
  useEffect(() => {
    if (!vncSandboxId) return;

    const killDesktop = () => {
      if (!vncSandboxId) return;
      navigator.sendBeacon(
        `/api/kill-desktop?sandboxId=${encodeURIComponent(vncSandboxId)}`,
      );
    };

    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    if (isIOS || isSafari) {
      window.addEventListener("pagehide", killDesktop);
      return () => {
        window.removeEventListener("pagehide", killDesktop);
        killDesktop();
      };
    } else {
      window.addEventListener("beforeunload", killDesktop);
      return () => {
        window.removeEventListener("beforeunload", killDesktop);
        killDesktop();
      };
    }
  }, [vncSandboxId]);

  return (
    <ScrollProvider>
      <div className="flex h-dvh relative">
        {/* Desktop View */}
        <div className="w-full hidden xl:block">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Chat Panel (Left) */}
            <ResizablePanel defaultSize={50} minSize={30} className="flex flex-col">
              {/* Floating brutalist nav pill */}
              <div className="nb-paper px-4 pt-4 pb-3">
                <div className="nb-border nb-shadow rounded-xl bg-white py-2 pl-3 pr-2 flex justify-between items-center">
                  <SentryLogo />
                  <div className="flex items-center gap-1.5">
                    <ModelSelector
                      modelId={modelId}
                      onChange={setModelId}
                      disabled={isLoading}
                    />
                    <DeployButton />
                  </div>
                </div>
              </div>
              <SessionList />
              <V2Announcement />
              {usage.runs > 0 && (
                <SessionTelemetry usage={usage} cost={cost} />
              )}
              <ChatPanel
                messages={messages}
                input={input}
                handleInputChange={handleInputChange}
                handleSubmit={handleSubmit}
                isLoading={isLoading}
                status={status}
                isInitializing={isInitializing}
                stop={stop}
                setInput={setInput}
                onToolCallClick={setSelectedToolCallId}
              />
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* VNC Panel (Right) */}
            <ResizablePanel defaultSize={50} minSize={30} className="bg-black">
              <VNCPanel
                streamUrl={vncStreamUrl}
                isInitializing={isInitializing}
                onRefreshDesktop={refreshDesktop}
                selectedToolCallId={selectedToolCallId}
                isStreaming={status === "streaming" || status === "submitted"}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* Mobile View (Chat Only) */}
        <div className="w-full h-full xl:hidden flex flex-col overflow-hidden">
          <div className="flex-shrink-0 nb-paper px-3 pt-3 pb-3 flex">
            <div className="nb-border nb-shadow rounded-xl bg-white py-1.5 pl-2.5 pr-1.5 flex flex-1 justify-between items-center">
              <SentryLogo />
              <div className="flex items-center gap-1.5">
                {/* VNC Toggle Button in Header */}
                <Button
                  onClick={() => setShowVNCModal(true)}
                  size="sm"
                  variant="outline"
                  className={cn(
                    "h-8 px-2.5 gap-1.5 rounded-lg nb-border nb-shadow-sm bg-white text-xs font-bold",
                    vncStreamUrl && "bg-[var(--nb-lime)]"
                  )}
                >
                  <Monitor className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="font-medium hidden min-[375px]:inline">
                    {isInitializing ? "Starting..." : "Desktop"}
                  </span>
                  {vncStreamUrl && !isInitializing && (
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                  )}
                </Button>
                <ModelSelector
                  modelId={modelId}
                  onChange={setModelId}
                  disabled={isLoading}
                />
                <DeployButton />
              </div>
            </div>
          </div>
          <SessionList />
          <V2Announcement />
          {usage.runs > 0 && <SessionTelemetry usage={usage} cost={cost} />}
          <div className="flex-1 min-h-0 flex flex-col">
            <ChatPanel
              messages={messages}
              input={input}
              handleInputChange={handleInputChange}
              handleSubmit={handleSubmit}
              isLoading={isLoading}
              status={status}
              isInitializing={isInitializing}
              stop={stop}
              setInput={setInput}
              onToolCallClick={setSelectedToolCallId}
            />
          </div>
        </div>

        {/* Mobile VNC Modal */}
        <VNCModal
          isOpen={showVNCModal}
          onClose={() => setShowVNCModal(false)}
          streamUrl={vncStreamUrl}
          isInitializing={isInitializing}
          onRefreshDesktop={refreshDesktop}
          selectedToolCallId={selectedToolCallId}
          isStreaming={status === "streaming" || status === "submitted"}
        />
      </div>
    </ScrollProvider>
  );
}
