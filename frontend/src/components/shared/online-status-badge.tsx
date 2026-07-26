"use client";

import { getOnlineStatus } from "@/lib/activity";

interface OnlineStatusBadgeProps {
  lastActiveAt: Date | string | null;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function OnlineStatusBadge({
  lastActiveAt,
  showText = true,
  size = "md",
  className = "",
}: OnlineStatusBadgeProps) {
  const status = getOnlineStatus(lastActiveAt);

  const dotSizes = {
    sm: "h-2 w-2",
    md: "h-2.5 w-2.5",
    lg: "h-3 w-3",
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <div
          className={`${dotSizes[size]} rounded-full ${
            status.isOnline
              ? "bg-green-500 animate-pulse"
              : "bg-gray-400"
          }`}
        />
        {status.isOnline && (
          <div
            className={`absolute inset-0 ${dotSizes[size]} rounded-full bg-green-500 opacity-75 animate-ping`}
          />
        )}
      </div>
      {showText && (
        <span
          className={`${textSizes[size]} font-medium ${
            status.isOnline ? "text-green-600" : "text-gray-500"
          }`}
        >
          {status.lastSeenText}
        </span>
      )}
    </div>
  );
}
