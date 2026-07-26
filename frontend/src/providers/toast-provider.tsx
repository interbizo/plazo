"use client";

import { Toaster } from "react-hot-toast";

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: "#1f2937",
          color: "#f9fafb",
          borderRadius: "0.5rem",
          fontSize: "0.875rem",
        },
        success: {
          iconTheme: { primary: "#10b981", secondary: "#f9fafb" },
        },
        error: {
          iconTheme: { primary: "#ef4444", secondary: "#f9fafb" },
        },
      }}
    />
  );
}
