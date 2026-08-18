"use client";

import { type UIMessage, isToolUIPart, getToolName } from "ai";
import { AnimatePresence, motion } from "motion/react";
import { memo } from "react";
import equal from "fast-deep-equal";
import { Streamdown } from "streamdown";

import { ABORTED, cn } from "@/lib/utils";
import {
  Camera,
  CheckCircle,
  CircleSlash,
  Clock,
  Keyboard,
  KeyRound,
  Loader2,
  MousePointer,
  MousePointerClick,
  ScrollText,
  StopCircle,
} from "lucide-react";

const PurePreviewMessage = ({
  message,
  isLatestMessage,
  status,
  onToolCallClick,
}: {
  message: UIMessage;
  isLoading: boolean;
  status: "error" | "submitted" | "streaming" | "ready";
  isLatestMessage: boolean;
  onToolCallClick?: (toolCallId: string) => void;
}) => {
  return (
    <AnimatePresence key={message.id}>
      <motion.div
        className="w-full mx-auto px-4 group/message"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        key={`message-${message.id}`}
        data-role={message.role}
      >
        <div
          className={cn(
            "flex gap-4 w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl",
            "group-data-[role=user]/message:w-fit",
          )}
        >
          {/* {message.role === "assistant" && (
            <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background">
              <div className="translate-y-px">
                <SparklesIcon size={14} />
              </div>
            </div>
          )} */}

          <div className="flex flex-col w-full">
            {message.parts?.map((part, i) => {
              switch (part.type) {
                case "text":
                  return (
                    <motion.div
                      initial={{ y: 5, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      key={`message-${message.id}-part-${i}`}
                      className="flex flex-row gap-2 items-start w-full pb-4"
                    >
                      <div
                        className={cn("flex flex-col gap-4", {
                          "bg-secondary text-secondary-foreground px-3 py-2 rounded-xl":
                            message.role === "user",
                        })}
                      >
                        <Streamdown>{part.text}</Streamdown>
                      </div>
                    </motion.div>
                  );
                default:
                  // AI SDK v5: tool parts are typed (`tool-computer`,
                  // `tool-bash`) with input/output/state. Map onto the field
                  // names the rest of this block already uses.
                  if (!isToolUIPart(part)) return null;
                  const toolName = getToolName(part);
                  const toolCallId = part.toolCallId;
                  const state =
                    part.state === "output-available"
                      ? "result"
                      : part.state === "input-available" ||
                          part.state === "input-streaming"
                        ? "call"
                        : part.state;
                  const args = (part.input ?? {}) as Record<string, unknown>;
                  const output =
                    part.state === "output-available" ? part.output : undefined;

                  if (toolName === "computer") {
                    const {
                      action,
                      coordinate,
                      text,
                      duration,
                      scroll_amount,
                      scroll_direction,
                    } = args as {
                      action?: string;
                      coordinate?: [number, number];
                      text?: string;
                      duration?: number;
                      scroll_amount?: number;
                      scroll_direction?: string;
                    };
                    let actionLabel = "";
                    let actionDetail = "";
                    let ActionIcon = null;

                    switch (action) {
                      case "screenshot":
                        actionLabel = "Taking screenshot";
                        ActionIcon = Camera;
                        break;
                      case "left_click":
                        actionLabel = "Left clicking";
                        actionDetail = coordinate
                          ? `at (${coordinate[0]}, ${coordinate[1]})`
                          : "";
                        ActionIcon = MousePointer;
                        break;
                      case "right_click":
                        actionLabel = "Right clicking";
                        actionDetail = coordinate
                          ? `at (${coordinate[0]}, ${coordinate[1]})`
                          : "";
                        ActionIcon = MousePointerClick;
                        break;
                      case "double_click":
                        actionLabel = "Double clicking";
                        actionDetail = coordinate
                          ? `at (${coordinate[0]}, ${coordinate[1]})`
                          : "";
                        ActionIcon = MousePointerClick;
                        break;
                      case "mouse_move":
                        actionLabel = "Moving mouse";
                        actionDetail = coordinate
                          ? `to (${coordinate[0]}, ${coordinate[1]})`
                          : "";
                        ActionIcon = MousePointer;
                        break;
                      case "type":
                        actionLabel = "Typing";
                        actionDetail = text ? `"${text}"` : "";
                        ActionIcon = Keyboard;
                        break;
                      case "key":
                        actionLabel = "Pressing key";
                        actionDetail = text ? `"${text}"` : "";
                        ActionIcon = KeyRound;
                        break;
                      case "wait":
                        actionLabel = "Waiting";
                        actionDetail = duration ? `${duration} seconds` : "";
                        ActionIcon = Clock;
                        break;
                      case "scroll":
                        actionLabel = "Scrolling";
                        actionDetail =
                          scroll_direction && scroll_amount
                            ? `${scroll_direction} by ${scroll_amount}`
                            : "";
                        ActionIcon = ScrollText;
                        break;
                      default:
                        actionLabel = action ?? "";
                        ActionIcon = MousePointer;
                        break;
                    }

                    return (
                      <motion.div
                        initial={{ y: 8, opacity: 0, scale: 0.98 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                        key={`message-${message.id}-part-${i}`}
                        className={cn(
                          "flex flex-col gap-3 mb-4 text-sm",
                          "bg-gradient-to-br from-zinc-50 to-zinc-100/50 dark:from-zinc-900 dark:to-zinc-950/50",
                          "rounded-xl border border-zinc-200/80 dark:border-zinc-800/80",
                          "cursor-pointer transition-all duration-200",
                          "hover:bg-zinc-100 dark:hover:bg-zinc-800/80",
                          "hover:border-zinc-300 dark:hover:border-zinc-700",
                          "active:bg-zinc-200 dark:active:bg-zinc-700/50",
                          "active:scale-[0.98]",
                          "shadow-sm hover:shadow-md",
                          "min-h-[72px] sm:min-h-[64px]",
                          "p-4 sm:p-3.5",
                          "touch-manipulation"
                        )}
                        onClick={() => onToolCallClick?.(toolCallId)}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex-1 flex items-center gap-3 sm:gap-2.5">
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.1, duration: 0.2 }}
                            className={cn(
                              "flex items-center justify-center",
                              "w-12 h-12 sm:w-10 sm:h-10",
                              "bg-white dark:bg-zinc-800/80",
                              "rounded-xl shadow-sm",
                              "border border-zinc-200/50 dark:border-zinc-700/50",
                              "flex-shrink-0"
                            )}
                          >
                            {ActionIcon && (
                              <ActionIcon className="w-5 h-5 sm:w-4 sm:h-4 text-zinc-700 dark:text-zinc-300" />
                            )}
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2.5">
                              <span className="text-sm sm:text-base">{actionLabel}</span>
                              {actionDetail && (
                                <span className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 font-normal">
                                  {actionDetail}
                                </span>
                              )}
                            </div>
                          </div>
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
                            className="w-7 h-7 sm:w-6 sm:h-6 flex items-center justify-center flex-shrink-0"
                          >
                            {state === "call" ? (
                              isLatestMessage && status !== "ready" ? (
                                <Loader2 className="animate-spin h-5 w-5 sm:h-4 sm:w-4 text-blue-500" />
                              ) : (
                                <StopCircle className="h-5 w-5 sm:h-4 sm:w-4 text-red-500" />
                              )
                            ) : state === "result" ? (
                              output === ABORTED ? (
                                <CircleSlash
                                  size={18}
                                  className="text-amber-500 sm:w-4 sm:h-4"
                                />
                              ) : (
                                <CheckCircle
                                  size={18}
                                  className="text-green-500 sm:w-4 sm:h-4"
                                />
                              )
                            ) : null}
                          </motion.div>
                        </div>
                        {state === "result" ? (
                          (output as { type?: string })?.type === "image" && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2, duration: 0.3 }}
                              className="mt-2 p-2 bg-white dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={`data:image/png;base64,${(output as { data?: string }).data}`}
                                alt="Generated Image"
                                className="w-full aspect-[1024/768] rounded-md object-cover shadow-sm"
                              />
                            </motion.div>
                          )
                        ) : action === "screenshot" ? (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="w-full aspect-[1024/768] rounded-lg bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-900 animate-pulse border border-zinc-300 dark:border-zinc-700"
                          />
                        ) : null}
                      </motion.div>
                    );
                  }
                  if (toolName === "bash") {
                    const { command } = args as { command: string };

                    return (
                      <motion.div
                        initial={{ y: 8, opacity: 0, scale: 0.98 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                        key={`message-${message.id}-part-${i}`}
                        className={cn(
                          "flex items-center gap-3 sm:gap-2.5 mb-4 text-sm",
                          "bg-gradient-to-br from-zinc-50 to-zinc-100/50 dark:from-zinc-900 dark:to-zinc-950/50",
                          "rounded-xl border border-zinc-200/80 dark:border-zinc-800/80",
                          "cursor-pointer transition-all duration-200",
                          "hover:bg-zinc-100 dark:hover:bg-zinc-800/80",
                          "hover:border-zinc-300 dark:hover:border-zinc-700",
                          "active:bg-zinc-200 dark:active:bg-zinc-700/50",
                          "active:scale-[0.98]",
                          "shadow-sm hover:shadow-md",
                          "min-h-[72px] sm:min-h-[64px]",
                          "p-4 sm:p-3.5",
                          "touch-manipulation"
                        )}
                        onClick={() => onToolCallClick?.(toolCallId)}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.1, duration: 0.2 }}
                          className={cn(
                            "flex items-center justify-center",
                            "w-12 h-12 sm:w-10 sm:h-10",
                            "bg-white dark:bg-zinc-800/80",
                            "rounded-xl shadow-sm",
                            "border border-zinc-200/50 dark:border-zinc-700/50",
                            "flex-shrink-0"
                          )}
                        >
                          <ScrollText className="w-5 h-5 sm:w-4 sm:h-4 text-zinc-700 dark:text-zinc-300" />
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2.5">
                            <span className="text-sm sm:text-base">Running command</span>
                            <span className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 font-normal font-mono truncate">
                              {command.length > 40 ? `${command.slice(0, 40)}...` : command}
                            </span>
                          </div>
                        </div>
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
                          className="w-7 h-7 sm:w-6 sm:h-6 flex items-center justify-center flex-shrink-0"
                        >
                          {state === "call" ? (
                            isLatestMessage && status !== "ready" ? (
                              <Loader2 className="animate-spin h-5 w-5 sm:h-4 sm:w-4 text-blue-500" />
                            ) : (
                              <StopCircle className="h-5 w-5 sm:h-4 sm:w-4 text-red-500" />
                            )
                          ) : state === "result" ? (
                            <CheckCircle size={18} className="text-green-500 sm:w-4 sm:h-4" />
                          ) : null}
                        </motion.div>
                      </motion.div>
                    );
                  }
                  return (
                    <div key={toolCallId}>
                      <h3>
                        {toolName}: {state}
                      </h3>
                      <pre>{JSON.stringify(args, null, 2)}</pre>
                    </div>
                  );
              }
            })}
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
