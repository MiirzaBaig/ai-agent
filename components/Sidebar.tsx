"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  MessageSquare,
  Trash2,
  Pencil,
  Check,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
} from "lucide-react";
import { useSessionStore } from "@/lib/sessions/store";
import { SentryMark } from "@/components/icons";
import { cn } from "@/lib/utils";

export function Sidebar({
  collapsed,
  onToggle,
  onOpenSettings,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onOpenSettings: () => void;
}) {
  const {
    sessions,
    currentSessionId,
    createSession,
    switchSession,
    deleteSession,
    renameSession,
  } = useSessionStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const startRename = (id: string, name: string) => {
    setEditingId(id);
    setDraft(name);
  };
  const commitRename = () => {
    if (editingId) renameSession(editingId, draft);
    setEditingId(null);
  };

  // Collapsed rail — just the toggle + new chat.
  if (collapsed) {
    return (
      <div className="hidden xl:flex h-full w-14 flex-shrink-0 flex-col items-center gap-2 border-r-[2.5px] border-[var(--nb-ink)] nb-paper py-3">
        <button
          onClick={onToggle}
          className="nb-border nb-shadow-sm nb-press flex h-9 w-9 items-center justify-center rounded-lg bg-white"
          title="Expand sidebar"
        >
          <PanelLeftOpen className="h-4 w-4 text-[var(--nb-ink)]" />
        </button>
        <button
          onClick={createSession}
          className="nb-border nb-shadow-sm nb-press flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--nb-lime)]"
          title="New chat"
        >
          <Plus className="h-4 w-4 text-[var(--nb-ink)]" strokeWidth={3} />
        </button>
      </div>
    );
  }

  return (
    <div className="hidden xl:flex h-full w-64 flex-shrink-0 flex-col border-r-[2.5px] border-[var(--nb-ink)] nb-paper">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2">
          <span className="nb-border flex h-7 w-7 items-center justify-center rounded-md bg-[var(--nb-lime)]">
            <SentryMark size={16} />
          </span>
          <span className="text-base font-black uppercase tracking-tight text-[var(--nb-ink)]">
            Sentry
          </span>
        </div>
        <button
          onClick={onToggle}
          className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-200/60"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {/* New chat */}
      <div className="px-3 pb-2">
        <button
          onClick={createSession}
          className="nb-border nb-shadow-sm nb-press flex w-full items-center gap-2 rounded-lg bg-[var(--nb-lime)] px-3 py-2 text-xs font-black uppercase tracking-wide text-[var(--nb-ink)]"
        >
          <Plus className="h-4 w-4" strokeWidth={3} />
          New chat
        </button>
      </div>

      {/* History */}
      <div className="mb-1 px-3 pt-1 text-[9px] font-black uppercase tracking-[0.16em] text-zinc-400">
        History
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <AnimatePresence initial={false}>
          {sessions.map((session) => {
            const active = session.id === currentSessionId;
            const editing = editingId === session.id;
            return (
              <motion.div
                key={session.id}
                layout
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className={cn(
                  "group mb-1 flex items-center gap-2 rounded-lg px-2 py-2 text-sm cursor-pointer",
                  active
                    ? "nb-border bg-white font-bold text-[var(--nb-ink)]"
                    : "border-2 border-transparent text-zinc-600 hover:bg-white/70",
                )}
                onClick={() => !editing && switchSession(session.id)}
              >
                <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
                {editing ? (
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="min-w-0 flex-1 rounded border border-zinc-300 bg-white px-1 py-0.5 text-xs outline-none focus:border-[var(--nb-ink)]"
                  />
                ) : (
                  <span className="min-w-0 flex-1 truncate">{session.name}</span>
                )}

                {editing ? (
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        commitRename();
                      }}
                      className="rounded p-1 hover:bg-zinc-200"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(null);
                      }}
                      className="rounded p-1 hover:bg-zinc-200"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startRename(session.id, session.name);
                      }}
                      className="rounded p-1 hover:bg-zinc-200"
                      title="Rename"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    {sessions.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.id);
                        }}
                        className="rounded p-1 text-red-500 hover:bg-red-100"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Footer: settings */}
      <div className="border-t-2 border-zinc-300/70 p-2">
        <button
          onClick={onOpenSettings}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide text-zinc-600 hover:bg-white/70"
        >
          <Settings className="h-4 w-4" />
          Settings
        </button>
      </div>
    </div>
  );
}
