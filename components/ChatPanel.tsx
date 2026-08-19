"use client";

import { useRef, useCallback } from "react";
import type { UIMessage } from "ai";
import { PreviewMessage } from "@/components/message";
import { Input } from "@/components/input";
import { PromptSuggestions } from "@/components/prompt-suggestions";
import { ProjectInfo } from "@/components/project-info";
import { AgentActivity } from "@/components/AgentActivity";
import { useScrollToBottom } from "@/lib/use-scroll-to-bottom";
import { useScrollState } from "@/lib/scroll-state";

interface ChatPanelProps {
  messages: UIMessage[];
  input: string;
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  status: "error" | "submitted" | "streaming" | "ready";
  isInitializing: boolean;
  stop: () => void;
  setInput: (input: string) => void;
  onToolCallClick?: (toolCallId: string) => void;
}

export function ChatPanel({
  messages,
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  status,
  isInitializing,
  stop,
  setInput,
  onToolCallClick,
}: ChatPanelProps) {
  const [containerRef, endRef] = useScrollToBottom();
  const lastScrollTop = useRef(0);
  const { setScrollState } = useScrollState();

  // Handle scroll events to update global scroll state
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      const currentScrollTop = target.scrollTop;
      const isScrollingDown = currentScrollTop > lastScrollTop.current;

      // Only update if there's a significant scroll change
      if (Math.abs(currentScrollTop - lastScrollTop.current) > 5) {
        setScrollState(isScrollingDown, currentScrollTop);
        lastScrollTop.current = currentScrollTop;
      }
    },
    [setScrollState]
  );

  // Handle touch events for mobile
  const touchStartY = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const currentY = e.touches[0].clientY;
      const deltaY = touchStartY.current - currentY;
      const scrollTop = (e.currentTarget as HTMLDivElement).scrollTop;

      // Swiping up (scrolling down) - deltaY > 0
      // Swiping down (scrolling up) - deltaY < 0
      if (Math.abs(deltaY) > 5) {
        setScrollState(deltaY > 0, scrollTop);
        touchStartY.current = currentY;
      }
    },
    [setScrollState]
  );

  return (
    <div className="flex flex-col h-full min-h-0 nb-paper nb-grid overflow-hidden">
      {/* Messages Area (relative so the progressive blur overlays its base) */}
      <div className="relative flex-1 min-h-0">
        <div
          className="h-full space-y-4 py-4 overflow-y-auto px-4"
          ref={containerRef}
          onScroll={handleScroll}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
        >
          {messages.length === 0 ? <ProjectInfo /> : null}
          {messages.map((message, i) => (
            <PreviewMessage
              message={message}
              key={message.id}
              isLoading={isLoading}
              status={status}
              isLatestMessage={i === messages.length - 1}
              onToolCallClick={onToolCallClick}
            />
          ))}
          <AgentActivity
            active={status === "streaming" || status === "submitted"}
          />
          <div ref={endRef} className="pb-2" />
        </div>

        {/* Progressive blur — messages dissolve into the input area */}
        <div className="progressive-blur pointer-events-none absolute inset-x-0 bottom-0 h-20 z-10" />
      </div>

      {/* Prompt Suggestions */}
      {messages.length === 0 && (
        <PromptSuggestions
          disabled={isInitializing}
          onSelectPrompt={(prompt: string) => setInput(prompt)}
        />
      )}

      {/* Input Area */}
      <div className="flex-shrink-0 border-t-[2.5px] border-[var(--nb-ink)] nb-paper">
        <form
          onSubmit={handleSubmit}
          className="p-4 sm:p-5"
          style={{
            paddingBottom: "calc(1rem + env(safe-area-inset-bottom))",
          }}
        >
          <Input
            handleInputChange={handleInputChange}
            input={input}
            isInitializing={isInitializing}
            isLoading={isLoading}
            status={status}
            stop={stop}
          />
        </form>
      </div>
    </div>
  );
}
