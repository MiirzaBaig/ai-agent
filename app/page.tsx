"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { toast } from "sonner";
import { ChatPanel } from "@/components/ChatPanel";
import { ActivityPanel } from "@/components/ActivityPanel";
import { Sidebar } from "@/components/Sidebar";
import { SettingsModal } from "@/components/SettingsModal";
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
import { PanelRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Chat() {
  const [, setSelectedToolCallId] = useState<string | null>(null);
  // Chrome launches lazily on the first task, so nothing is "initializing" at rest.
  const [isInitializing, setIsInitializing] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showActivity, setShowActivity] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const stoppingRef = useRef(false);

  // Browser session id. Browserbase sessions can also expose an embeddable live view.
  const [browserSessionId, setBrowserSessionId] = useState<string | null>(null);
  const [browserLiveViewUrl, setBrowserLiveViewUrl] = useState<string | null>(null);
  const [browserProvider, setBrowserProvider] = useState<string | null>(null);

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
  const sandboxIdRef = useRef(browserSessionId);
  sandboxIdRef.current = browserSessionId;
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

  // Reset the "stopping" guard once the agent settles. (Input is cleared on
  // send in handleSubmit — we no longer wipe it on finish, which was stomping
  // on text the user typed during the completion window.)
  const prevStatusRef = useRef(status);
  useEffect(() => {
    if (prevStatusRef.current !== "ready" && status === "ready") {
      stoppingRef.current = false;
    }
    prevStatusRef.current = status;
  }, [status]);

  const stop = () => {
    // v5's stop() halts the stream and settles any in-flight tool part cleanly.
    stoppingRef.current = true;
    stopGeneration();
  };

  // v5 removed managed input + handleSubmit — bridge to the existing ChatPanel
  // props with local state and sendMessage.
  const warmingRef = useRef(false);
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    // Pre-warm Chrome the moment the user starts typing, so by the time they
    // hit send the browser is ready and the message appears instantly.
    if (e.target.value && !browserSessionId && !warmingRef.current) {
      warmingRef.current = true;
      ensureBrowser().finally(() => {
        warmingRef.current = false;
      });
    }
  };
  // Lazily launch Chrome — only when the user actually sends a task, so a
  // hard-refresh doesn't pop open a browser window. Returns the session id.
  const ensureBrowser = async (): Promise<string | null> => {
    if (browserSessionId) return browserSessionId;
    try {
      setIsInitializing(true);
      const response = await fetch("/api/get-desktop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sandboxId: null }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to start browser");
      }
      const { id, liveViewUrl, provider } = (await response.json()) as {
        id: string;
        liveViewUrl?: string;
        provider?: string;
      };
      setBrowserSessionId(id);
      setBrowserLiveViewUrl(liveViewUrl || null);
      setBrowserProvider(provider || null);
      sandboxIdRef.current = id;
      if (currentSessionId) updateSessionSandboxId(currentSessionId, id);
      return id;
    } catch (err) {
      console.error("Failed to start browser session:", err);
      toast.error("Couldn't start Chrome", {
        description:
          err instanceof Error
            ? err.message
            : "Make sure Google Chrome is installed.",
      });
      return null;
    } finally {
      setIsInitializing(false);
    }
  };

  const refreshLiveView = useCallback(async () => {
    if (!browserSessionId) return;
    try {
      const response = await fetch("/api/browser-live-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sandboxId: browserSessionId }),
      });
      if (!response.ok) return;
      const { liveViewUrl } = (await response.json()) as {
        liveViewUrl?: string;
      };
      if (liveViewUrl) setBrowserLiveViewUrl(liveViewUrl);
    } catch (err) {
      console.error("Failed to refresh browser live view:", err);
    }
  }, [browserSessionId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status !== "ready") return;
    const text = input.trim();
    if (!text) return;
    stoppingRef.current = false;
    setInput("");

    // Fast path: Chrome already warming/ready (pre-warmed on typing) → send now
    // so the message appears instantly.
    if (browserSessionId) {
      sendMessage({ text });
      return;
    }
    // Cold path (e.g. paste + immediate send): make sure Chrome is up first.
    const id = await ensureBrowser();
    if (!id) return;
    sendMessage({ text });
  };

  const isLoading = status !== "ready";

  return (
    <ScrollProvider>
      <div className="flex h-dvh relative">
        {/* Desktop View */}
        <div className="w-full hidden xl:flex">
          {/* Left history sidebar */}
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((v) => !v)}
            onOpenSettings={() => setShowSettings(true)}
          />
          <ResizablePanelGroup direction="horizontal" className="h-full flex-1">
            {/* Chat Panel (Center) */}
            <ResizablePanel defaultSize={50} minSize={30} className="flex flex-col">
              {/* Slim top bar — sidebar owns the identity now. */}
              <div className="nb-paper flex items-center justify-end gap-1.5 border-b border-zinc-200 px-4 py-2.5">
                <ModelSelector
                  modelId={modelId}
                  onChange={setModelId}
                  disabled={isLoading}
                />
                <button
                  onClick={() => setShowActivity((v) => !v)}
                  className={cn(
                    "flex h-8 items-center gap-1.5 rounded-lg nb-border nb-shadow-sm nb-press px-2.5 text-[11px] font-black uppercase tracking-wide",
                    showActivity
                      ? "bg-[var(--nb-lime)] text-[var(--nb-ink)]"
                      : "bg-white text-[var(--nb-ink)]",
                  )}
                  title={showActivity ? "Hide activity" : "Show activity"}
                >
                  <PanelRight className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Activity</span>
                </button>
                <DeployButton />
              </div>
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

            {showActivity && (
              <>
                <ResizableHandle withHandle />
                {/* Live Activity Panel (Right) — collapsible */}
                <ResizablePanel
                  defaultSize={42}
                  minSize={28}
                  className="bg-zinc-950"
                >
                  <ActivityPanel
                    isConnected={!!browserSessionId && !isInitializing}
                    isStreaming={
                      status === "streaming" || status === "submitted"
                    }
                    liveViewUrl={browserLiveViewUrl}
                    provider={browserProvider}
                    onRefreshLiveView={refreshLiveView}
                  />
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </div>

        {/* Mobile View (Chat Only) */}
        <div className="w-full h-full xl:hidden flex flex-col overflow-hidden">
          <div className="flex-shrink-0 nb-paper px-3 pt-3 pb-3 flex">
            <div className="nb-border nb-shadow rounded-xl bg-white py-1.5 pl-2.5 pr-1.5 flex flex-1 justify-between items-center">
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

        <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
      </div>
    </ScrollProvider>
  );
}
