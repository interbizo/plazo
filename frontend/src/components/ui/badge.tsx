import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "secondary";
  size?: "sm" | "md";
  className?: string;
}

export function Badge({
  children,
  variant = "default",
  size = "md",
  className,
}: BadgeProps) {
  const variants = {
    default: "bg-gray-100 text-gray-700",
    success: "bg-green-100 text-green-700",
    warning: "bg-yellow-100 text-yellow-700",
    danger: "bg-red-100 text-red-700",
    info: "bg-blue-100 text-blue-700",
    secondary: "bg-gray-200 text-gray-600",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-0.5 text-xs",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeProps["variant"] }> =
    {
      PENDING: { label: "Pending", variant: "warning" },
      PENDING_PAYMENT: { label: "Menunggu Pembayaran", variant: "warning" },
      PAYMENT_UPLOADED: { label: "Bukti Dikirim", variant: "info" },
      PAYMENT_VERIFIED: { label: "Pembayaran Terverifikasi", variant: "success" },
      PROCESSING: { label: "Processing", variant: "info" },
      DELIVERED: { label: "Delivered", variant: "info" },
      COMPLETED: { label: "Completed", variant: "success" },
      CANCELLED: { label: "Cancelled", variant: "danger" },
      DISPUTED: { label: "Disputed", variant: "danger" },
      EXPIRED: { label: "Expired", variant: "danger" },
      OPEN: { label: "Open", variant: "success" },
      IN_REVIEW: { label: "In Review", variant: "info" },
      HIRED: { label: "Hired", variant: "info" },
      ACCEPTED: { label: "Accepted", variant: "success" },
      REJECTED: { label: "Rejected", variant: "danger" },
    };

  const config = map[status] || { label: status, variant: "default" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
