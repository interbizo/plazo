"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  variant?: "primary" | "success" | "danger";
  size?: "sm" | "md" | "lg";
}

const variantActiveClasses = {
  primary: "bg-blue-600 border-blue-600",
  success: "bg-green-600 border-green-600",
  danger: "bg-red-600 border-red-600",
};

const sizeContainerClasses = {
  sm: "h-6 w-10 p-0.5",
  md: "h-7 w-12 p-1",
  lg: "h-8 w-14 p-1",
};

const sizeHandleClasses = {
  sm: "h-4.5 w-4.5",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

const sizeTranslateClasses = {
  sm: "translate-x-4",
  md: "translate-x-5",
  lg: "translate-x-6",
};

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      checked,
      onCheckedChange,
      variant = "success",
      size = "md",
      disabled,
      className,
      onClick,
      ...props
    },
    ref,
  ) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;
      onCheckedChange?.(!checked);
      onClick?.(e);
    };

    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        ref={ref}
        disabled={disabled}
        onClick={handleClick}
        className={cn(
          "inline-flex shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
          sizeContainerClasses[size],
          checked
            ? variantActiveClasses[variant]
            : "border-gray-300 bg-gray-200",
          className,
        )}
        {...props}
      >
        <span
          className={cn(
            "pointer-events-none rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform",
            sizeHandleClasses[size],
            checked ? sizeTranslateClasses[size] : "translate-x-0",
          )}
        />
      </button>
    );
  },
);

Switch.displayName = "Switch";
