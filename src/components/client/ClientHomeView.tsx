import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  CalendarPlus, 
  Clock, 
  FileText, 
  MessageSquare, 
  Car,
  Star,
  Heart,
  Phone,
  ChevronRight,
  Sparkles,
  MapPin,
  Search
} from "lucide-react";
import { NoDriversBanner } from "@/components/client/NoDriversBanner";
import { cn } from "@/lib/utils";

interface ClientHomeViewProps {
  clientProfile: any;
  stats: {
    upcomingCourses: number;
    pendingDevis: number;
    unpaidInvoices: number;
  };
  onNewReservation: () => void;
  onNavigate: (tab: string, subtab?: string | null) => void;
  onViewFavoriteDriver: () => void;
}

export function ClientHomeView({
  clientProfile,
  stats,
  onNewReservation,
  onNavigate,
  onViewFavoriteDriver,
}: ClientHomeViewProps) {
  const navigate = useNavigate();
  
  const hasDrivers = clientProfile?.client?.is_exclusive 
    ? !!clientProfile?.client?.driver_id 
    : (clientProfile?.client?.driver_ids?.length || 0) > 0;

  const favoriteDriver = clientProfile?.client?.drivers;
  
  const getDriverDisplayName = (driver: any): string => {
    if (!driver) return "Chauffeur VTC";
    const fullName = driver.profiles?.full_name?.trim();
    return fullName || "Chauffeur VTC";
  };

  const getVehicleDescription = (driver: any): string => {
    if (!driver) return "";
    const parts = [];
    if (driver.vehicle_brand) parts.push(driver.vehicle_brand);
    if (driver.vehicle_model && driver.vehicle_model !== driver.vehicle_brand) parts.push(driver.vehicle_model);
    if (driver.vehicle_color) parts.push(driver.vehicle_color);
    return parts.join(' ') || '';
  };

  return (
    <div className="space-y-8 max-w-lg mx-auto pb-8">
      {/* Banner for clients without drivers */}
      {!hasDrivers && <NoDriversBanner variant="full" />}

      {/* Main CTA - Book a ride */}
      {hasDrivers && (
        <button
          onClick={onNewReservation}
          className="w-full group relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-orange-500 p-6 text-white shadow-2xl shadow-primary/30 transition-all duration-500 hover:shadow-primary/50 hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-400/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl" />
          
          <div className="relative flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <CalendarPlus className="w-8 h-8" />
            </div>
            <div className="flex-1 text-left">
              <h2 className="text-2xl font-bold mb-1">Réserver une course</h2>
              <p className="text-white/80 text-sm">Votre chauffeur vous attend</p>
            </div>
            <ChevronRight className="w-6 h-6 opacity-70 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      )}

      {/* Find a driver CTA for clients without drivers */}
      {!hasDrivers && (
        <button
          onClick={() => navigate("/chauffeurs")}
          className="w-full group relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-6 text-white shadow-2xl shadow-orange-500/30 transition-all duration-500 hover:shadow-orange-500/50 hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          
          <div className="relative flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <Search className="w-8 h-8" />
            </div>
            <div className="flex-1 text-left">
              <h2 className="text-2xl font-bold mb-1">Trouver un chauffeur</h2>
              <p className="text-white/80 text-sm">Explorez notre réseau de chauffeurs VTC</p>
            </div>
            <ChevronRight className="w-6 h-6 opacity-70 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      )}

      {/* Quick Stats - Beautiful cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card 
          className={cn(
            "relative overflow-hidden p-5 cursor-pointer transition-all duration-300",
            "hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]",
            "bg-gradient-to-br from-sky-50 to-blue-100/50 dark:from-sky-950/50 dark:to-blue-900/30",
            "border-sky-200/50 dark:border-sky-800/50"
          )}
          onClick={() => onNavigate("courses", "confirmed")}
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-sky-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <Clock className="w-7 h-7 text-sky-600 dark:text-sky-400 mb-3" />
          <p className="text-3xl font-bold text-sky-700 dark:text-sky-300 mb-1">{stats.upcomingCourses}</p>
          <p className="text-sm text-sky-600/80 dark:text-sky-400/80 font-medium">Courses à venir</p>
        </Card>

        <Card 
          className={cn(
            "relative overflow-hidden p-5 cursor-pointer transition-all duration-300",
            "hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]",
            "bg-gradient-to-br from-amber-50 to-orange-100/50 dark:from-amber-950/50 dark:to-orange-900/30",
            "border-amber-200/50 dark:border-amber-800/50",
            stats.pendingDevis > 0 && "ring-2 ring-amber-400 ring-offset-2 ring-offset-background"
          )}
          onClick={() => onNavigate("devis-factures", "devis")}
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          {stats.pendingDevis > 0 && (
            <span className="absolute top-3 right-3 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
          )}
          <FileText className="w-7 h-7 text-amber-600 dark:text-amber-400 mb-3" />
          <p className="text-3xl font-bold text-amber-700 dark:text-amber-300 mb-1">{stats.pendingDevis}</p>
          <p className="text-sm text-amber-600/80 dark:text-amber-400/80 font-medium">Devis en attente</p>
        </Card>
      </div>

      {/* Quick Actions - Horizontal scroll */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
          Accès rapide
        </h3>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          <QuickActionButton
            icon={MessageSquare}
            label="Messages"
            color="violet"
            onClick={() => onNavigate("messages")}
          />
          <QuickActionButton
            icon={FileText}
            label="Factures"
            badge={stats.unpaidInvoices > 0 ? stats.unpaidInvoices : undefined}
            color="emerald"
            onClick={() => onNavigate("devis-factures", "factures")}
          />
          <QuickActionButton
            icon={MapPin}
            label="Historique"
            color="rose"
            onClick={() => onNavigate("courses", "completed")}
          />
          {!clientProfile?.client?.is_exclusive && (
            <QuickActionButton
              icon={Sparkles}
              label="Découvrir"
              color="purple"
              onClick={() => navigate("/chauffeurs")}
            />
          )}
        </div>
      </div>

      {/* Favorite Driver Card - Large and prominent at bottom */}
      {hasDrivers && favoriteDriver && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
            {clientProfile?.client?.is_exclusive ? "Mon chauffeur exclusif" : "Mon chauffeur favori"}
          </h3>
          <Card 
            className="group relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 hover:border-primary/40 hover:shadow-xl transition-all duration-300 cursor-pointer"
            onClick={onViewFavoriteDriver}
          >
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
            
            <div className="relative p-5">
              <div className="flex items-start gap-4">
                {/* Large Avatar */}
                <div className="relative flex-shrink-0">
                  <Avatar className="w-20 h-20 ring-4 ring-primary/20 ring-offset-2 ring-offset-background shadow-xl">
                    <AvatarImage 
                      src={favoriteDriver.profiles?.profile_photo_url || undefined} 
                      alt={getDriverDisplayName(favoriteDriver)} 
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-orange-500 text-white text-2xl font-bold">
                      {getDriverDisplayName(favoriteDriver).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center shadow-lg ring-2 ring-background">
                    <Heart className="w-4 h-4 text-white fill-white" />
                  </div>
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-foreground truncate">
                      {getDriverDisplayName(favoriteDriver)}
                    </h3>
                    {favoriteDriver.rating && favoriteDriver.rating > 0 && (
                      <Badge variant="secondary" className="gap-1 px-2 py-0.5">
                        <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                        <span className="font-semibold">{favoriteDriver.rating.toFixed(1)}</span>
                      </Badge>
                    )}
                  </div>
                  
                  {getVehicleDescription(favoriteDriver) && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mb-3">
                      <Car className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{getVehicleDescription(favoriteDriver)}</span>
                    </p>
                  )}
                  
                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <Button 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNewReservation();
                      }}
                      className="bg-primary hover:bg-primary/90 gap-1.5 h-9 px-4"
                    >
                      <CalendarPlus className="w-4 h-4" />
                      Réserver
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate("messages");
                      }}
                      className="gap-1.5 h-9"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Message
                    </Button>
                    {favoriteDriver.profiles?.phone && (
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = `tel:${favoriteDriver.profiles.phone}`;
                        }}
                        className="h-9 w-9 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                      >
                        <Phone className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// Quick Action Button Component
interface QuickActionButtonProps {
  icon: React.ElementType;
  label: string;
  color: "violet" | "emerald" | "rose" | "purple" | "sky";
  badge?: number;
  onClick: () => void;
}

const colorMap = {
  violet: {
    bg: "bg-violet-100 dark:bg-violet-950/50",
    icon: "text-violet-600 dark:text-violet-400",
    border: "border-violet-200 dark:border-violet-800",
    hover: "hover:bg-violet-200 dark:hover:bg-violet-900/50",
  },
  emerald: {
    bg: "bg-emerald-100 dark:bg-emerald-950/50",
    icon: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
    hover: "hover:bg-emerald-200 dark:hover:bg-emerald-900/50",
  },
  rose: {
    bg: "bg-rose-100 dark:bg-rose-950/50",
    icon: "text-rose-600 dark:text-rose-400",
    border: "border-rose-200 dark:border-rose-800",
    hover: "hover:bg-rose-200 dark:hover:bg-rose-900/50",
  },
  purple: {
    bg: "bg-purple-100 dark:bg-purple-950/50",
    icon: "text-purple-600 dark:text-purple-400",
    border: "border-purple-200 dark:border-purple-800",
    hover: "hover:bg-purple-200 dark:hover:bg-purple-900/50",
  },
  sky: {
    bg: "bg-sky-100 dark:bg-sky-950/50",
    icon: "text-sky-600 dark:text-sky-400",
    border: "border-sky-200 dark:border-sky-800",
    hover: "hover:bg-sky-200 dark:hover:bg-sky-900/50",
  },
};

function QuickActionButton({ icon: Icon, label, color, badge, onClick }: QuickActionButtonProps) {
  const colors = colorMap[color];
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-200",
        "min-w-[90px] flex-shrink-0",
        "hover:scale-105 active:scale-95 hover:shadow-md",
        colors.bg,
        colors.border,
        colors.hover
      )}
    >
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5 shadow-lg">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", colors.bg)}>
        <Icon className={cn("w-5 h-5", colors.icon)} />
      </div>
      <span className="text-xs font-medium text-foreground">{label}</span>
    </button>
  );
}
