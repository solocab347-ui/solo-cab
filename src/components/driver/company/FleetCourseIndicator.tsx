import { Truck, Phone, User, Mail } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface FleetCourseIndicatorProps {
  fleetManagerName: string;
  fleetManagerLogo?: string | null;
  fleetManagerPhone?: string | null;
  clientName?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  className?: string;
}

/**
 * Affiche un indicateur visuel pour les courses gestionnaire de flotte
 * avec le logo, le nom du gestionnaire et les infos du client
 */
export function FleetCourseIndicator({ 
  fleetManagerName, 
  fleetManagerLogo,
  fleetManagerPhone,
  clientName,
  clientPhone,
  clientEmail,
  className 
}: FleetCourseIndicatorProps) {
  return (
    <div className={`flex flex-col gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 ${className || ''}`}>
      {/* Fleet Manager Info */}
      <div className="flex items-center gap-2">
        <Avatar className="w-8 h-8 border border-amber-500/30">
          <AvatarImage src={fleetManagerLogo || undefined} alt={fleetManagerName} />
          <AvatarFallback className="bg-amber-600/20 text-amber-600 text-xs">
            <Truck className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-[10px] text-amber-400 uppercase font-medium">Gestionnaire</span>
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 truncate">
            {fleetManagerName}
          </span>
        </div>
        {fleetManagerPhone && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
            asChild
          >
            <a href={`tel:${fleetManagerPhone}`}>
              <Phone className="w-3 h-3" />
            </a>
          </Button>
        )}
      </div>
      
      {/* Client Info - if available */}
      {clientName && (
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-amber-500/20">
          <div className="flex items-center gap-2 min-w-0">
            <User className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span className="text-xs text-foreground truncate">{clientName}</span>
          </div>
          <div className="flex items-center gap-1">
            {clientPhone && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                asChild
              >
                <a href={`tel:${clientPhone}`}>
                  <Phone className="w-3 h-3 mr-1" />
                  Appeler
                </a>
              </Button>
            )}
            {clientEmail && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                asChild
              >
                <a href={`mailto:${clientEmail}`}>
                  <Mail className="w-3 h-3" />
                </a>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
