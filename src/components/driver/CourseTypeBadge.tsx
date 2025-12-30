import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { User, Handshake, Building2, Truck } from "lucide-react";
import { CourseTypeInfo, CourseType } from "@/lib/courseTypeUtils";
import { cn } from "@/lib/utils";

interface CourseTypeBadgeProps {
  typeInfo: CourseTypeInfo;
  showLabel?: boolean;
  showPartnerName?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const iconMap = {
  user: User,
  handshake: Handshake,
  building: Building2,
  truck: Truck
};

export function CourseTypeBadge({ 
  typeInfo, 
  showLabel = true, 
  showPartnerName = false,
  size = 'sm',
  className 
}: CourseTypeBadgeProps) {
  const IconComponent = iconMap[typeInfo.icon as keyof typeof iconMap] || User;
  
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5'
  };
  
  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  };

  const content = (
    <Badge 
      variant="outline" 
      className={cn(
        "flex items-center gap-1 font-medium",
        typeInfo.bgColor,
        typeInfo.color,
        typeInfo.borderColor,
        sizeClasses[size],
        className
      )}
    >
      <IconComponent className={iconSizes[size]} />
      {showLabel && (
        <span>{showPartnerName && typeInfo.partnerName ? typeInfo.partnerName : typeInfo.shortLabel}</span>
      )}
      {typeInfo.partnerType && showLabel && (
        <span className="opacity-70">({typeInfo.partnerType})</span>
      )}
    </Badge>
  );

  if (!showLabel || !typeInfo.partnerName) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">{typeInfo.label}</p>
            {typeInfo.partnerName && (
              <p className="text-xs text-muted-foreground">{typeInfo.partnerName}</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}

interface CourseTypeIndicatorProps {
  type: CourseType;
  className?: string;
}

export function CourseTypeIndicator({ type, className }: CourseTypeIndicatorProps) {
  const colorMap: Record<CourseType, string> = {
    personal: 'bg-primary',
    partner: 'bg-purple-500',
    company: 'bg-blue-500',
    fleet: 'bg-amber-500'
  };

  return (
    <div 
      className={cn(
        "w-1 h-full rounded-full",
        colorMap[type],
        className
      )}
    />
  );
}
