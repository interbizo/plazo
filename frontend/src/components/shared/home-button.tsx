"use client";

import Link from "next/link";
import { Home } from "lucide-react";

interface HomeButtonProps {
  variant?: "default" | "minimal" | "floating";
  className?: string;
  showText?: boolean;
}

export function HomeButton({ 
  variant = "default", 
  className = "",
  showText = true 
}: HomeButtonProps) {
  
  if (variant === "floating") {
    return (
      <Link
        href="/"
        className={`fixed bottom-6 left-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300 group ${className}`}
        title="Kembali ke Homepage"
      >
        <Home className="h-5 w-5 group-hover:scale-110 transition-transform" />
        {showText && (
          <span className="text-sm font-semibold">Home</span>
        )}
      </Link>
    );
  }

  if (variant === "minimal") {
    return (
      <Link
        href="/"
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200 group ${className}`}
        title="Kembali ke Homepage"
      >
        <Home className="h-4 w-4 group-hover:scale-110 transition-transform" />
        {showText && (
          <span className="text-sm font-medium">Home</span>
        )}
      </Link>
    );
  }

  // Default variant
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-700 hover:from-blue-100 hover:to-indigo-100 hover:border-blue-300 hover:shadow-md transition-all duration-300 group ${className}`}
      title="Kembali ke Homepage"
    >
      <Home className="h-5 w-5 group-hover:scale-110 transition-transform" />
      {showText && (
        <span className="text-sm font-semibold">Home</span>
      )}
    </Link>
  );
}
