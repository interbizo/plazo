"use client";

import { useSocket } from "@/hooks/use-socket";

export function SocketProvider({ children }: { children: React.ReactNode }) {
  useSocket();
  return <>{children}</>;
}
