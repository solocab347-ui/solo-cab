import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CalendarPlus,
  Clock,
  FileText,
  MessageSquare,
  Users,
  Search,
  Car,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAction {
  id: string;
  icon: React.ElementType;
  label: string;
  sublabel?: string;
  color: string;
  bgColor: string;
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
}

export function ClientQuickActions({
  onNewReservation,
  onNavigate,
  stats,
  isExclusive,
}: ClientQuickActionsProps) {
  const navigate = useNavigate();

  const quickActions: QuickAction[] = [
    {
      id: "new-course",
      icon: CalendarPlus,
      label: "Réserver",
      sublabel: "une course",
      color: "text-white",
      bgColor: "bg-gradient-to-br from-primary to-orange-500",
      onClick: onNewReservation,
    },
    {
      id: "upcoming",
      icon: Clock,
      label: "À venir",
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      onClick: () => onNavigate("courses", "confirmed"),
      badge: stats.upcomingCourses,
    },
    {
      id: "devis",
      icon: FileText,
      label: "Devis",
      color: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-900/20",
      onClick: () => onNavigate("courses", "pending"),
      badge: stats.pendingDevis,
    },
    {
      id: "messages",
      icon: MessageSquare,
      label: "Messages",
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
      onClick: () => onNavigate("messages"),
    },
    {
      id: "drivers",
      icon: Users,
      label: isExclusive ? "Chauffeur" : "Chauffeurs",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
      onClick: () => onNavigate("chauffeurs"),
    },
    ...(!isExclusive
      ? [
          {
            id: "discover",
            icon: Search,
            label: "Découvrir",
            color: "text-pink-600",
            bgColor: "bg-pink-50 dark:bg-pink-900/20",
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
            "relative flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-200",
            "hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg",
            action.bgColor
          )}
        >
          {action.badge !== undefined && action.badge > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {action.badge > 9 ? "9+" : action.badge}
            </span>
          )}
          <action.icon className={cn("w-7 h-7 mb-2", action.color)} />
          <span className={cn("text-xs font-medium text-center", action.id === "new-course" ? "text-white" : "text-foreground")}>
            {action.label}
          </span>
          {action.sublabel && (
            <span className={cn("text-[10px] opacity-80", action.id === "new-course" ? "text-white" : "text-muted-foreground")}>
              {action.sublabel}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
