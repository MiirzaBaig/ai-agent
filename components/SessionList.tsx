"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useSessionStore } from "@/lib/sessions/store";
import { useScrollState } from "@/lib/scroll-state";
import { Plus, Trash2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export function SessionList() {
  const {
    sessions,
    currentSessionId,
    createSession,
    switchSession,
    deleteSession,
  } = useSessionStore();

  const [isVisible, setIsVisible] = useState(true);
  const { isScrollingDown, scrollTop } = useScrollState();
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // React to scroll state changes
  useEffect(() => {
    // Clear any pending timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    // Always show when near top
    if (scrollTop < 30) {
      setIsVisible(true);
      return;
    }

    // Hide when scrolling down past threshold
    if (isScrollingDown && scrollTop > 50) {
      setIsVisible(false);
    }
    // Show when scrolling up
    else if (!isScrollingDown) {
      setIsVisible(true);
    }

    // Auto-show after inactivity
    hideTimeoutRef.current = setTimeout(() => {
      if (scrollTop < 100) {
        setIsVisible(true);
      }
    }, 1200);

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [isScrollingDown, scrollTop]);

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{
            height: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
            opacity: { duration: 0.15, ease: "easeOut" },
          }}
          className="overflow-hidden flex-shrink-0 border-b-[2.5px] border-[var(--nb-ink)] nb-paper"
        >
          <motion.div
            initial={{ y: -8 }}
            animate={{ y: 0 }}
            exit={{ y: -8 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            {/* Desktop View */}
            <div className="hidden sm:block px-4 py-2.5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.14em]">
                  Sessions
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {sessions.map((session) => (
                  <motion.div
                    key={session.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                      "group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer nb-border nb-shadow-sm nb-press",
                      currentSessionId === session.id
                        ? "bg-[var(--nb-ink)] text-white"
                        : "bg-white text-[var(--nb-ink)]"
                    )}
                    onClick={() => switchSession(session.id)}
                  >
                    <MessageSquare className="h-3 w-3 flex-shrink-0" />
                    <span className="font-medium whitespace-nowrap">
                      {session.name}
                    </span>
                    {sessions.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.id);
                        }}
                        className={cn(
                          "ml-0.5 p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-150",
                          currentSessionId === session.id
                            ? "hover:bg-zinc-700"
                            : "hover:bg-zinc-200"
                        )}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </motion.div>
                ))}
                <motion.button
                  onClick={createSession}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide",
                    "nb-border nb-shadow-sm nb-press bg-[var(--nb-lime)] text-[var(--nb-ink)] cursor-pointer"
                  )}
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={3} />
                  <span className="whitespace-nowrap">New</span>
                </motion.button>
              </div>
            </div>

            {/* Mobile View - Horizontal scroll */}
            <div className="sm:hidden px-3 py-2">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide touch-pan-x">
                {sessions.map((session) => (
                  <motion.div
                    key={session.id}
                    layout
                    className={cn(
                      "flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-bold cursor-pointer whitespace-nowrap flex-shrink-0 nb-border nb-shadow-sm",
                      currentSessionId === session.id
                        ? "bg-[var(--nb-ink)] text-white"
                        : "bg-white text-[var(--nb-ink)]"
                    )}
                    onClick={() => switchSession(session.id)}
                  >
                    <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="font-medium">{session.name}</span>
                    {sessions.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.id);
                        }}
                        className={cn(
                          "p-1 rounded-full min-h-[28px] min-w-[28px] flex items-center justify-center -mr-1",
                          currentSessionId === session.id
                            ? "active:bg-zinc-700"
                            : "active:bg-zinc-200"
                        )}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </motion.div>
                ))}
                <motion.button
                  onClick={createSession}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-black uppercase tracking-wide flex-shrink-0",
                    "nb-border nb-shadow-sm bg-[var(--nb-lime)] text-[var(--nb-ink)]",
                    "cursor-pointer whitespace-nowrap min-h-[40px]"
                  )}
                  whileTap={{ scale: 0.98 }}
                >
                  <Plus className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={3} />
                  <span>New</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
