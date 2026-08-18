"use client";

import { motion } from "motion/react";
import { useSessionStore } from "@/lib/sessions/store";
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

  return (
    <div className="flex-shrink-0 nb-paper">
          <div>
            {/* Desktop View — inline label + compact pills, no slab border */}
            <div className="hidden sm:flex items-center gap-2 px-4 pb-2 pt-0.5">
              <span className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.16em] flex-shrink-0">
                Sessions
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {sessions.map((session) => (
                  <motion.div
                    key={session.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                      "group flex items-center gap-1 h-6 px-2 rounded-md text-[11px] font-bold cursor-pointer nb-border nb-press",
                      currentSessionId === session.id
                        ? "bg-[var(--nb-ink)] text-white"
                        : "bg-white text-[var(--nb-ink)]"
                    )}
                    onClick={() => switchSession(session.id)}
                  >
                    <MessageSquare className="h-2.5 w-2.5 flex-shrink-0" />
                    <span className="whitespace-nowrap">{session.name}</span>
                    {sessions.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.id);
                        }}
                        className={cn(
                          "ml-0.5 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-all duration-150",
                          currentSessionId === session.id
                            ? "hover:bg-zinc-700"
                            : "hover:bg-zinc-200"
                        )}
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </motion.div>
                ))}
                <motion.button
                  onClick={createSession}
                  className={cn(
                    "flex items-center gap-1 h-6 px-2 rounded-md text-[11px] font-black uppercase tracking-wide",
                    "nb-border nb-press bg-[var(--nb-lime)] text-[var(--nb-ink)] cursor-pointer"
                  )}
                >
                  <Plus className="h-3 w-3" strokeWidth={3} />
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
          </div>
    </div>
  );
}
