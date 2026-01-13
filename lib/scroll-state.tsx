"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface ScrollState {
  isScrollingDown: boolean;
  scrollTop: number;
  setScrollState: (isScrollingDown: boolean, scrollTop: number) => void;
}

const ScrollContext = createContext<ScrollState | null>(null);

export function ScrollProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState({ isScrollingDown: false, scrollTop: 0 });

  const setScrollState = useCallback((isScrollingDown: boolean, scrollTop: number) => {
    setState({ isScrollingDown, scrollTop });
  }, []);

  return (
    <ScrollContext.Provider value={{ ...state, setScrollState }}>
      {children}
    </ScrollContext.Provider>
  );
}

export function useScrollState() {
  const context = useContext(ScrollContext);
  if (!context) {
    return {
      isScrollingDown: false,
      scrollTop: 0,
      setScrollState: () => {},
    };
  }
  return context;
}
