"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { Session } from "./types";
import type { Message } from "ai";

type SessionStoreContextType = {
  sessions: Session[];
  currentSessionId: string | null;
  createSession: () => string;
  switchSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  updateSessionSandboxId: (sessionId: string, sandboxId: string | null) => void;
  loadSessions: () => void;
  saveSessions: () => void;
  loadMessages: (sessionId: string) => Message[];
  saveMessages: (sessionId: string, messages: Message[]) => void;
};

const SessionStoreContext = createContext<SessionStoreContextType | undefined>(undefined);

export function SessionStoreProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const loadSessions = useCallback(() => {
    try {
      const data = localStorage.getItem("ai-sessions");
      if (data) {
        const parsed = JSON.parse(data) as Session[];
        setSessions(parsed);
        if (parsed.length > 0 && !currentSessionId) {
          setCurrentSessionId(parsed[0].id);
        }
      } else {
        // Create default session if none exist
        const defaultSession: Session = {
          id: `session-${Date.now()}`,
          name: "Session 1",
          createdAt: Date.now(),
          sandboxId: null,
        };
        setSessions([defaultSession]);
        setCurrentSessionId(defaultSession.id);
      }
    } catch (error) {
      console.error("Failed to load sessions:", error);
      const defaultSession: Session = {
        id: `session-${Date.now()}`,
        name: "Session 1",
        createdAt: Date.now(),
        sandboxId: null,
      };
      setSessions([defaultSession]);
      setCurrentSessionId(defaultSession.id);
    }
  }, [currentSessionId]);

  const saveSessions = useCallback(() => {
    try {
      localStorage.setItem("ai-sessions", JSON.stringify(sessions));
    } catch (error) {
      console.error("Failed to save sessions:", error);
    }
  }, [sessions]);

  const createSession = useCallback((): string => {
    // thisFind the highest session number from existing sessions
    const maxSessionNumber = sessions.reduce((max, session) => {
      const match = session.name.match(/Session (\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return Math.max(max, num);
      }
      return max;
    }, 0);

    const newSession: Session = {
      id: `session-${Date.now()}`,
      name: `Session ${maxSessionNumber + 1}`,
      createdAt: Date.now(),
      sandboxId: null,
    };
    setSessions((prev) => {
      const updated = [...prev, newSession];
      localStorage.setItem("ai-sessions", JSON.stringify(updated));
      return updated;
    });
    setCurrentSessionId(newSession.id);
    return newSession.id;
  }, [sessions]);

  const switchSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
  }, []);

  const deleteSession = useCallback(
    (sessionId: string) => {
      setSessions((prev) => {
        const sessionToDelete = prev.find((s) => s.id === sessionId);
        
        // Kill desktop sandbox if it exists
        if (sessionToDelete?.sandboxId) {
          // Use sendBeacon for reliable cleanup even if page is closing
          try {
            navigator.sendBeacon(
              `/api/kill-desktop?sandboxId=${encodeURIComponent(sessionToDelete.sandboxId)}`
            );
          } catch {
            // Fallback to fetch if sendBeacon fails
            fetch("/api/kill-desktop", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sandboxId: sessionToDelete.sandboxId }),
            }).catch((err) => {
              console.warn("Failed to kill desktop sandbox:", err);
            });
          }
        }
        
        const filtered = prev.filter((s) => s.id !== sessionId);
        localStorage.setItem("ai-sessions", JSON.stringify(filtered));
        
        // Remove associated data
        localStorage.removeItem(`ai-messages-${sessionId}`);
        localStorage.removeItem(`ai-events-${sessionId}`);
        
        // Switch to first session if deleting current
        if (currentSessionId === sessionId && filtered.length > 0) {
          setCurrentSessionId(filtered[0].id);
        } else if (filtered.length === 0) {
          // Create new session if all deleted
          const newSession: Session = {
            id: `session-${Date.now()}`,
            name: "Session 1",
            createdAt: Date.now(),
            sandboxId: null,
          };
          setCurrentSessionId(newSession.id);
          return [newSession];
        }
        return filtered;
      });
    },
    [currentSessionId]
  );

  const updateSessionSandboxId = useCallback(
    (sessionId: string, sandboxId: string | null) => {
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, sandboxId } : s))
      );
    },
    []
  );

  const loadMessages = useCallback((sessionId: string): Message[] => {
    try {
      const data = localStorage.getItem(`ai-messages-${sessionId}`);
      if (data) {
        return JSON.parse(data) as Message[];
      }
      return [];
    } catch (error) {
      console.error("Failed to load messages:", error);
      return [];
    }
  }, []);

  const saveMessages = useCallback((sessionId: string, messages: Message[]) => {
    try {
      localStorage.setItem(`ai-messages-${sessionId}`, JSON.stringify(messages));
    } catch (error) {
      console.error("Failed to save messages:", error);
    }
  }, []);

  // Clear all stored data on initia mount even (fresh start on page reload/server restart)
  useEffect(() => {
    // Clears all session related data from localStorage for a fresh start..
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("ai-sessions") || key.startsWith("ai-messages-") || key.startsWith("ai-events-"))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Create a fresh default session
    const defaultSession: Session = {
      id: `session-${Date.now()}`,
      name: "Session 1",
      createdAt: Date.now(),
      sandboxId: null,
    };
    setSessions([defaultSession]);
    setCurrentSessionId(defaultSession.id);
    localStorage.setItem("ai-sessions", JSON.stringify([defaultSession]));
  }, []); // Empty dependenc only run once on mount..

  // Auto-save sessions when they change
  useEffect(() => {
    if (sessions.length > 0) {
      saveSessions();
    }
  }, [sessions, saveSessions]);

  return (
    <SessionStoreContext.Provider
      value={{
        sessions,
        currentSessionId,
        createSession,
        switchSession,
        deleteSession,
        updateSessionSandboxId,
        loadSessions,
        saveSessions,
        loadMessages,
        saveMessages,
      }}
    >
      {children}
    </SessionStoreContext.Provider>
  );
}

export function useSessionStore() {
  const context = useContext(SessionStoreContext);
  if (context === undefined) {
    throw new Error("useSessionStore must be used within SessionStoreProvider");
  }
  return context;
}

