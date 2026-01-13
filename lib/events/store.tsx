"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { AgentEvent, EventCounts, AgentStatus } from "./types";

type EventStoreContextType = {
  events: AgentEvent[];
  addEvent: (event: AgentEvent) => void;
  updateEvent: (id: string, status: AgentEvent["status"], duration?: number) => void;
  getEventCounts: () => EventCounts;
  getAgentStatus: () => AgentStatus;
  clearEvents: () => void;
  loadEvents: (sessionId: string) => void;
  saveEvents: (sessionId: string) => void;
  getEventsSortedByTime: () => AgentEvent[];
};

const EventStoreContext = createContext<EventStoreContextType | undefined>(undefined);

export function EventStoreProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const addEvent = useCallback((event: AgentEvent) => {
    setEvents((prev) => {
      // Avoid duplicates
      if (prev.find((e) => e.id === event.id)) {
        return prev;
      }
      return [...prev, event];
    });
  }, []);

  const updateEvent = useCallback(
    (id: string, status: AgentEvent["status"], duration?: number) => {
      setEvents((prev) =>
        prev.map((event) =>
          event.id === id
            ? { ...event, status, ...(duration !== undefined && { duration }) }
            : event
        )
      );
    },
    []
  );

  const getEventCounts = useCallback((): EventCounts => {
    const counts: EventCounts = {};
    events.forEach((event) => {
      counts[event.type] = (counts[event.type] || 0) + 1;
    });
    return counts;
  }, [events]);

  const getAgentStatus = useCallback((): AgentStatus => {
    const hasPending = events.some((e) => e.status === "pending");
    if (hasPending) {
      return "executing";
    }
    const hasRecent = events.some(
      (e) => e.status === "complete" && Date.now() - e.timestamp < 5000
    );
    if (hasRecent) {
      return "thinking";
    }
    return "idle";
  }, [events]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const loadEvents = useCallback((sessionId: string) => {
    try {
      const data = localStorage.getItem(`ai-events-${sessionId}`);
      if (data) {
        const parsed = JSON.parse(data) as AgentEvent[];
        setEvents(parsed);
        setCurrentSessionId(sessionId);
      } else {
        setEvents([]);
        setCurrentSessionId(sessionId);
      }
    } catch (error) {
      console.error("Failed to load events:", error);
      setEvents([]);
      setCurrentSessionId(sessionId);
    }
  }, []);

  const saveEvents = useCallback(
    (sessionId: string) => {
      try {
        localStorage.setItem(`ai-events-${sessionId}`, JSON.stringify(events));
        setCurrentSessionId(sessionId);
      } catch (error) {
        console.error("Failed to save events:", error);
      }
    },
    [events]
  );

  const getEventsSortedByTime = useCallback((): AgentEvent[] => {
    return [...events].sort((a, b) => a.timestamp - b.timestamp);
  }, [events]);

  // Auto-save when events change and we have a session
  useEffect(() => {
    if (currentSessionId && events.length > 0) {
      try {
        localStorage.setItem(`ai-events-${currentSessionId}`, JSON.stringify(events));
      } catch (error) {
        console.error("Failed to auto-save events:", error);
      }
    }
  }, [events, currentSessionId]);

  return (
    <EventStoreContext.Provider
      value={{
        events,
        addEvent,
        updateEvent,
        getEventCounts,
        getAgentStatus,
        clearEvents,
        loadEvents,
        saveEvents,
        getEventsSortedByTime,
      }}
    >
      {children}
    </EventStoreContext.Provider>
  );
}

export function useEventStore() {
  const context = useContext(EventStoreContext);
  if (context === undefined) {
    throw new Error("useEventStore must be used within EventStoreProvider");
  }
  return context;
}

