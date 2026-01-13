"use client";

import React from "react";

export const VNCViewer = React.memo(
  ({ streamUrl }: { streamUrl: string | null }) => {
    if (!streamUrl) {
      return (
        <div className="flex items-center justify-center h-full text-white">
          Loading stream...
        </div>
      );
    }

    return (
      <iframe
        src={streamUrl}
        className="w-full h-full"
        style={{
          transformOrigin: "center",
          width: "100%",
          height: "100%",
        }}
        allow="autoplay"
      />
    );
  },
  (prev, next) => prev.streamUrl === next.streamUrl
);

VNCViewer.displayName = "VNCViewer";

