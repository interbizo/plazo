import { Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface BoostBadgeProps {
  isBoosted: boolean;
  boostedUntil?: string;
  size?: "sm" | "md" | "lg";
  showExpiry?: boolean;
}

export function BoostBadge({
  isBoosted,
  boostedUntil,
  size = "md",
  showExpiry = false,
}: BoostBadgeProps) {
  if (!isBoosted) return null;

  const isExpired = boostedUntil && new Date(boostedUntil) < new Date();
  if (isExpired) return null;

  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-[10px]",
    md: "px-2 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  };

  const iconSizes = {
    sm: "h-2.5 w-2.5",
    md: "h-3 w-3",
    lg: "h-3.5 w-3.5",
  };

  const timeLeft = boostedUntil
    ? formatDistanceToNow(new Date(boostedUntil), {
        addSuffix: true,
        locale: localeId,
      })
    : null;

  return (
    <div className="inline-flex flex-col gap-0.5">
      <div
        className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 font-bold text-white shadow-lg ${sizeClasses[size]}`}
      >
        <Zap className={`${iconSizes[size]} fill-white`} />
        <span>BOOSTED</span>
      </div>
      {showExpiry && timeLeft && (
        <span className="text-[10px] text-gray-500">Berakhir {timeLeft}</span>
      )}
    </div>
  );
}
