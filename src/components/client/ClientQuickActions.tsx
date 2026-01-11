import { useNavigate } from "react-router-dom";
import {
  CalendarPlus,
  Clock,
  FileText,
  MessageSquare,
  Users,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAction {
  id: string;
  icon: React.ElementType;
  label: string;
  sublabel?: string;
  gradient: string;
  iconColor: string;
  onClick: () => void;
  badge?: number;
}

interface ClientQuickActionsProps {
  onNewReservation: () => void;
  onNavigate: (tab: string, subtab?: string) => void;
  stats: {
    upcomingCourses: number;
    pendingDevis: number;
    unpaidInvoices: number;
  };
  isExclusive?: boolean;
  hasDrivers?: boolean;
}

export function ClientQuickActions({
  onNewReservation,
  onNavigate,
  stats,
  isExclusive,
  hasDrivers = true,
}: ClientQuickActionsProps) {
  const navigate = useNavigate();

  const quickActions: QuickAction[] = [
    {
      id: "new-course",
      icon: hasDrivers ? CalendarPlus : Search,
      label: hasDrivers ? "Réserver" : "Trouver",
      sublabel: hasDrivers ? "une course" : "un chauffeur",
      gradient: hasDrivers 
        ? "bg-gradient-to-br from-primary via-primary to-orange-500"
        : "bg-gradient-to-br from-amber-500 via-orange-500 to-red-500",
      iconColor: "text-white",
      onClick: hasDrivers ? onNewReservation : () => navigate("/chauffeurs"),
    },
    {
      id: "upcoming",
      icon: Clock,
      label: "À venir",
      gradient: "bg-gradient-to-br from-sky-400/20 to-blue-500/20 dark:from-sky-500/30 dark:to-blue-600/30",
      iconColor: "text-sky-600 dark:text-sky-400",
      onClick: () => onNavigate("courses", "confirmed"),
      badge: stats.upcomingCourses,
    },
    {
      id: "devis",
      icon: FileText,
      label: "Devis",
      gradient: "bg-gradient-to-br from-amber-400/20 to-orange-500/20 dark:from-amber-500/30 dark:to-orange-600/30",
      iconColor: "text-amber-600 dark:text-amber-400",
      onClick: () => onNavigate("courses", "pending"),
      badge: stats.pendingDevis,
    },
    {
      id: "messages",
      icon: MessageSquare,
      label: "Messages",
      gradient: "bg-gradient-to-br from-violet-400/20 to-purple-500/20 dark:from-violet-500/30 dark:to-purple-600/30",
      iconColor: "text-violet-600 dark:text-violet-400",
      onClick: () => onNavigate("messages"),
    },
    {
      id: "drivers",
      icon: Users,
      label: isExclusive ? "Chauffeur" : "Chauffeurs",
      gradient: "bg-gradient-to-br from-emerald-400/20 to-teal-500/20 dark:from-emerald-500/30 dark:to-teal-600/30",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      onClick: () => onNavigate("chauffeurs"),
    },
    ...(!isExclusive
      ? [
          {
            id: "discover",
            icon: Search,
            label: "Découvrir",
            gradient: "bg-gradient-to-br from-rose-400/20 to-pink-500/20 dark:from-rose-500/30 dark:to-pink-600/30",
            iconColor: "text-rose-600 dark:text-rose-400",
            onClick: () => navigate("/chauffeurs"),
          },
        ]
      : []),
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {quickActions.map((action) => (
        <button
          key={action.id}
          onClick={action.onClick}
          className={cn(
            "relative flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-300",
            "hover:scale-[1.03] active:scale-[0.97] hover:shadow-xl",
            "border border-transparent",
            action.id === "new-course" 
              ? "hover:shadow-primary/25" 
              : "hover:border-border/50",
            action.gradient
          )}
        >
          {action.badge !== undefined && action.badge > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5 shadow-lg animate-pulse">
              {action.badge > 9 ? "9+" : action.badge}
            </span>
          )}
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center mb-2",
            action.id === "new-course" ? "bg-white/20" : "bg-background/60 backdrop-blur-sm"
          )}>
            <action.icon className={cn("w-6 h-6", action.iconColor)} />
          </div>
          <span className={cn(
            "text-xs font-semibold text-center leading-tight",
            action.id === "new-course" ? "text-white" : "text-foreground"
          )}>
            {action.label}
          </span>
          {action.sublabel && (
            <span className={cn(
              "text-[10px] mt-0.5",
              action.id === "new-course" ? "text-white/80" : "text-muted-foreground"
            )}>
              {action.sublabel}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
