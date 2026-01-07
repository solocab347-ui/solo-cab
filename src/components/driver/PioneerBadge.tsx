import { Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface PioneerBadgeProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export const PioneerBadge = ({ size = "md", showText = true, className }: PioneerBadgeProps) => {
  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-1",
    lg: "text-base px-3 py-1.5",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          className={cn(
            "bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 font-semibold shadow-md",
            sizeClasses[size],
            className
          )}
        >
          <Crown className={cn(iconSizes[size], showText && "mr-1")} />
          {showText && "Pionnier"}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-sm">Membre fondateur de SoloCab</p>
      </TooltipContent>
    </Tooltip>
  );
};

// Version overlay pour les photos
interface PioneerBadgeOverlayProps {
  className?: string;
}

export const PioneerBadgeOverlay = ({ className }: PioneerBadgeOverlayProps) => {
  return (
    <div className={cn(
      "absolute -top-1 -right-1 z-10",
      className
    )}>
      <div className="relative">
        <div className="absolute inset-0 bg-amber-500 rounded-full blur-sm opacity-50" />
        <div className="relative bg-gradient-to-r from-amber-500 to-amber-600 rounded-full p-1.5 shadow-lg">
          <Crown className="h-3 w-3 text-white" />
        </div>
      </div>
    </div>
  );
};