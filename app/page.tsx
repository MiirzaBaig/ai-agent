"use client";

import { useEffect, useState, useRef } from "react";
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

export default function Chat() {
  const [selectedToolCallId, setSelectedToolCallId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const stoppingRef = useRef(false);

  // Local browser session id (Chrome runs on the user's machine — no VNC).
  const [browserSessionId, setBrowserSessionId] = useState<string | null>(null);

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

  // Connect the local Chrome browser session once on mount. Unlike the cloud
  // build there's a single persistent browser — no per-session ephemeral VMs,
  // and we never kill the user's Chrome on tab close.
  useEffect(() => {
    let cancelled = false;
    const connect = async () => {
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
        const { id } = await response.json();
        if (cancelled) return;
        setBrowserSessionId(id);
        if (currentSessionId) updateSessionSandboxId(currentSessionId, id);
      } catch (err) {
        console.error("Failed to start browser session:", err);
        toast.error("Couldn't start Chrome", {
          description:
            err instanceof Error
              ? err.message
              : "Make sure Google Chrome is installed.",
        });
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    };
    connect();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
              {/* Slim top bar: model selector (name lives in the sidebar now) */}
              <div className="nb-paper px-4 pt-4 pb-3">
                <div className="nb-border nb-shadow rounded-xl bg-white py-2 pl-3 pr-2 flex justify-end items-center gap-1.5">
                  <ModelSelector
                    modelId={modelId}
                    onChange={setModelId}
                    disabled={isLoading}
                  />
                  <DeployButton />
                </div>
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

            <ResizableHandle withHandle />

            {/* Live Activity Panel (Right) — the real Chrome is on your screen */}
            <ResizablePanel defaultSize={50} minSize={30} className="bg-zinc-950">
              <ActivityPanel
                isConnected={!!browserSessionId && !isInitializing}
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
