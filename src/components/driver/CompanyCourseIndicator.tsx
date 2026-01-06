import { Building2, Phone, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface CompanyCourseIndicatorProps {
  companyName: string;
  companyLogo?: string | null;
  employeeName?: string | null;
  employeePhone?: string | null;
  className?: string;
}

/**
 * Affiche un indicateur visuel pour les courses entreprise
 * avec le logo, le nom de l'entreprise et les infos du collaborateur
 */
export function CompanyCourseIndicator({ 
  companyName, 
  companyLogo,
  employeeName,
  employeePhone,
  className 
}: CompanyCourseIndicatorProps) {
  return (
    <div className={`flex flex-col gap-2 p-2 rounded-lg bg-purple-500/10 border border-purple-500/30 ${className || ''}`}>
      {/* Company Info */}
      <div className="flex items-center gap-2">
        <Avatar className="w-8 h-8 border border-purple-500/30">
          <AvatarImage src={companyLogo || undefined} alt={companyName} />
          <AvatarFallback className="bg-purple-600/20 text-purple-600 text-xs">
            <Building2 className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-[10px] text-purple-400 uppercase font-medium">Entreprise</span>
          <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 truncate">
            {companyName}
          </span>
        </div>
      </div>
      
      {/* Employee Info - if available */}
      {employeeName && (
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-purple-500/20">
          <div className="flex items-center gap-2 min-w-0">
            <User className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
            <span className="text-xs text-foreground truncate">{employeeName}</span>
          </div>
          {employeePhone && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-500/10"
              asChild
            >
              <a href={`tel:${employeePhone}`}>
                <Phone className="w-3 h-3 mr-1" />
                Appeler
              </a>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
