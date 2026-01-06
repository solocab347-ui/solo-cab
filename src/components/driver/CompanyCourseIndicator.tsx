import { Building2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CompanyCourseIndicatorProps {
  companyName: string;
  companyLogo?: string | null;
  className?: string;
}

/**
 * Affiche un indicateur visuel pour les courses entreprise
 * avec le logo et le nom de l'entreprise
 */
export function CompanyCourseIndicator({ 
  companyName, 
  companyLogo,
  className 
}: CompanyCourseIndicatorProps) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg bg-purple-500/10 border border-purple-500/30 ${className || ''}`}>
      <Avatar className="w-6 h-6 border border-purple-500/30">
        <AvatarImage src={companyLogo || undefined} alt={companyName} />
        <AvatarFallback className="bg-purple-600/20 text-purple-600 text-[10px]">
          <Building2 className="w-3 h-3" />
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <span className="text-[10px] text-purple-400 uppercase font-medium">Course Entreprise</span>
        <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 truncate max-w-[150px]">
          {companyName}
        </span>
      </div>
    </div>
  );
}
