import { useEffect, useRef, type RefObject } from 'react';

export function useScrollToBottom(): [
  RefObject<HTMLDivElement | null>,
  RefObject<HTMLDivElement | null>,
] {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollTopRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    const end = endRef.current;

    if (!container || !end) return;

    // Check if user is near the bottom (within 100px)
    const isNearBottom = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      return scrollHeight - scrollTop - clientHeight < 100;
    };

    // Smooth scroll to bottom only if user is near bottom
    const scrollToBottom = () => {
      if (!isUserScrollingRef.current && isNearBottom()) {
        end.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    };

    // Handle user scroll events
    const handleScroll = () => {
      const currentScrollTop = container.scrollTop;
      
      // Detect if user is scrolling up
      if (currentScrollTop < lastScrollTopRef.current) {
        isUserScrollingRef.current = true;
        
        // Clear any existing timeout
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        
        // Reset flag after user stops scrolling for 1 second
        scrollTimeoutRef.current = setTimeout(() => {
          // Only re-enable if user scrolled back near bottom
          if (isNearBottom()) {
            isUserScrollingRef.current = false;
          }
        }, 1000);
      } else if (isNearBottom()) {
        // User scrolled back to bottom, re-enable auto-scroll
        isUserScrollingRef.current = false;
      }
      
      lastScrollTopRef.current = currentScrollTop;
    };

    // Handle wheel events for better detection
    const handleWheel = () => {
      isUserScrollingRef.current = true;
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        if (isNearBottom()) {
          isUserScrollingRef.current = false;
        }
      }, 1500);
    };

    // Handle touch events for mobile
    const handleTouchStart = () => {
      isUserScrollingRef.current = true;
    };

    const handleTouchEnd = () => {
      setTimeout(() => {
        if (isNearBottom()) {
          isUserScrollingRef.current = false;
        }
      }, 500);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    container.addEventListener('wheel', handleWheel, { passive: true });
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Use MutationObserver with throttling
    let rafId: number | null = null;
    const observer = new MutationObserver(() => {
      if (rafId) return;
      
      rafId = requestAnimationFrame(() => {
        scrollToBottom();
        rafId = null;
      });
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: false, // Don't observe attribute changes
      characterData: true,
    });

    // Initial scroll to bottom
    setTimeout(() => {
      if (isNearBottom()) {
        end.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }, 100);

    return () => {
      observer.disconnect();
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return [containerRef, endRef];
}