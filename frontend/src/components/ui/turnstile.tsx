"use client";

import { Turnstile as TurnstileWidget, TurnstileInstance } from "@marsidev/react-turnstile";
import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";

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

const DEV_TURNSTILE_TOKEN = "development-turnstile-bypass";

export const Turnstile = forwardRef<TurnstileRef, TurnstileProps>(
  ({ onSuccess, onError, onExpire, className, appearance = "normal" }, ref) => {
    const turnstileRef = useRef<TurnstileInstance>(null);
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
    const skipTurnstile = process.env.NODE_ENV === "development" && !siteKey;

    useEffect(() => {
      if (skipTurnstile) {
        onSuccess(DEV_TURNSTILE_TOKEN);
      }
    }, [skipTurnstile, onSuccess]);

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (!skipTurnstile) turnstileRef.current?.reset();
      },
      getResponse: () =>
        skipTurnstile ? DEV_TURNSTILE_TOKEN : turnstileRef.current?.getResponse(),
      execute: () => {
        if (skipTurnstile) onSuccess(DEV_TURNSTILE_TOKEN);
        else turnstileRef.current?.execute();
      },
    }), [skipTurnstile, onSuccess]);

    if (skipTurnstile) {
      return null;
    }

    return (
      <div className={className}>
        <TurnstileWidget
          ref={turnstileRef}
          siteKey={siteKey || ""}
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
