"use client";

import { type UIMessage, isToolUIPart } from "ai";
import { AnimatePresence, motion } from "motion/react";
import { memo } from "react";
import equal from "fast-deep-equal";
import { Streamdown } from "streamdown";

import { cn } from "@/lib/utils";
import { SentryMark } from "./icons";

const messageVariants = {
  hidden: { y: 6, opacity: 0, filter: "blur(3px)" },
  visible: {
    y: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: { duration: 0.24, ease: "easeOut" as const },
  },
};

const PurePreviewMessage = ({
  message,
  isLatestMessage,
  status,
}: {
  message: UIMessage;
  isLoading: boolean;
  status: "error" | "submitted" | "streaming" | "ready";
  isLatestMessage: boolean;
  onToolCallClick?: (toolCallId: string) => void;
}) => {
  // Only text parts render in the chat. Tool calls (navigate/click/read/…) are
  // shown in the Evidence timeline on the right, not inline here.
  const textParts = (message.parts ?? []).filter(
    (p) => p.type === "text" && !isToolUIPart(p),
  );
  if (textParts.length === 0) return null;

  return (
    <AnimatePresence key={message.id}>
      <motion.div
        layout="position"
        className="w-full mx-auto px-4 group/message"
        variants={messageVariants}
        initial="hidden"
        animate="visible"
        key={`message-${message.id}`}
        data-role={message.role}
      >
        <div
          className={cn(
            "flex gap-2.5 w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl",
            "group-data-[role=user]/message:w-fit",
          )}
        >
          {message.role === "assistant" && (
            <motion.span
              className="nb-border flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--nb-lime)] mt-0.5"
              animate={
                isLatestMessage && status !== "ready"
                  ? { scale: [1, 1.04, 1], opacity: [1, 0.86, 1] }
                  : { scale: 1, opacity: 1 }
              }
              transition={
                isLatestMessage && status !== "ready"
                  ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" }
                  : { duration: 0.2 }
              }
            >
              <SentryMark size={16} />
            </motion.span>
          )}

          <div className="flex flex-col w-full min-w-0">
            {textParts.map((part, i) =>
              part.type === "text" ? (
                <motion.div
                  initial={{ y: 5, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  key={`message-${message.id}-part-${i}`}
                  className="flex flex-row gap-2 items-start w-full pb-4"
                >
                  <div
                    className={cn(
                      "flex flex-col gap-4 text-[15px] leading-relaxed",
                      message.role === "user"
                        ? "nb-border nb-shadow-sm bg-white text-[var(--nb-ink)] px-3.5 py-2.5 rounded-xl rounded-tr-sm font-medium"
                        : "sentry-prose text-zinc-800 pt-0.5",
                    )}
                  >
                    <Streamdown>{part.text}</Streamdown>
                  </div>
                </motion.div>
              ) : null,
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.status !== nextProps.status) return false;
    if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;
    if (prevProps.onToolCallClick !== nextProps.onToolCallClick) return false;
    return true;
  },
);
