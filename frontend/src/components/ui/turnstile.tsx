"use client";

import { Turnstile as TurnstileWidget, TurnstileInstance } from "@marsidev/react-turnstile";
import { useRef, forwardRef, useImperativeHandle } from "react";

interface TurnstileProps {
  onSuccess: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  className?: string;
  /**
   * Widget appearance mode
   * - "normal": Standard visible widget (default - recommended)
   * - "compact": Smaller visible widget
   * - "invisible": No visible widget (advanced use case)
   */
  appearance?: "normal" | "compact" | "invisible";
}

export interface TurnstileRef {
  reset: () => void;
  getResponse: () => string | undefined;
  execute: () => void;
}

export const Turnstile = forwardRef<TurnstileRef, TurnstileProps>(
  ({ onSuccess, onError, onExpire, className, appearance = "normal" }, ref) => {
    const turnstileRef = useRef<TurnstileInstance>(null);

    useImperativeHandle(ref, () => ({
      reset: () => {
        turnstileRef.current?.reset();
      },
      getResponse: () => {
        return turnstileRef.current?.getResponse();
      },
      execute: () => {
        turnstileRef.current?.execute();
      },
    }));

    return (
      <div className={className}>
        <TurnstileWidget
          ref={turnstileRef}
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "0x4AAAAAADNW_HxnoYmWYaON"}
          onSuccess={onSuccess}
          onError={onError}
          onExpire={onExpire}
          options={{
            theme: "light",
            size: appearance,
            language: "id",
          }}
        />
      </div>
    );
  }
);

Turnstile.displayName = "Turnstile";
