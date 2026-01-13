"use client";

import { Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";

interface MobileVNCToggleProps {
  onClick: () => void;
  isActive: boolean;
  isInitializing: boolean;
}

export function MobileVNCToggle({
  onClick,
  isActive,
  isInitializing,
}: MobileVNCToggleProps) {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="fixed bottom-6 left-6 z-40 xl:hidden"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
      }}
    >
      <Button
        onClick={onClick}
        className="h-14 w-14 min-h-[56px] min-w-[56px] rounded-full shadow-lg bg-black hover:bg-zinc-900 text-white p-0 flex items-center justify-center touch-manipulation"
        size="icon"
        aria-label="Open VNC Viewer"
      >
        <Monitor className="h-6 w-6" />
        {isActive && !isInitializing && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white"
          />
        )}
      </Button>
    </motion.div>
  );
}

