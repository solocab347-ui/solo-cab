import { cn } from "@/lib/utils";

interface PioneerBadgeProps {
  size?: "xs" | "sm" | "md";
  className?: string;
  showLabel?: boolean;
}

export function PioneerBadge({ size = "sm", className, showLabel = true }: PioneerBadgeProps) {
  const sizeClasses = {
    xs: "text-[9px] px-1.5 py-0.5 gap-0.5",
    sm: "text-[10px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full",
        "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
        "border border-amber-200 dark:border-amber-700/50",
        sizeClasses[size],
        className
      )}
    >
      <span className="text-amber-500">★</span>
      {showLabel && <span>Pionnier</span>}
    </span>
  );
}
