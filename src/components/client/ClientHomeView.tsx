import { useState } from "react";
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
  Search,
  Globe,
  Eye,
  Users
} from "lucide-react";
import { NoDriversBanner } from "@/components/client/NoDriversBanner";
import { DriverProfileDialog } from "@/components/DriverProfileDialog";
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
  const [showDriverProfile, setShowDriverProfile] = useState(false);
  
  const isExclusive = clientProfile?.client?.is_exclusive;
  const hasDrivers = isExclusive 
    ? !!clientProfile?.client?.driver_id 
    : (clientProfile?.client?.driver_ids?.length || 0) > 0;

  const favoriteDriver = clientProfile?.client?.drivers;
  
  const getDriverDisplayName = (driver: any, isExclusive: boolean = false): string => {
    if (!driver) return "Chauffeur VTC";
    const fullName = driver.profiles?.full_name?.trim();
    if (!fullName) return "Chauffeur VTC";
    if (isExclusive) return fullName;
    // Non-exclusive: Prénom + initiale nom
    const parts = fullName.split(/\s+/);
    if (parts.length <= 1) return parts[0] || "Chauffeur VTC";
    return `${parts[0]} ${parts[parts.length - 1][0]?.toUpperCase()}.`;
  };

  const getVehicleDescription = (driver: any): string => {
    if (!driver) return "";
    const parts = [];
    if (driver.vehicle_brand) parts.push(driver.vehicle_brand);
    if (driver.vehicle_model && driver.vehicle_model !== driver.vehicle_brand) parts.push(driver.vehicle_model);
    if (driver.vehicle_color) parts.push(driver.vehicle_color);
    return parts.join(' ') || '';
  };

  // Rating always visible
  const shouldShowRating = favoriteDriver?.rating > 0;
  const shouldShowPhone = favoriteDriver?.show_phone !== false && favoriteDriver?.profiles?.phone;

  return (
    <div className="space-y-6 max-w-lg mx-auto pb-8">
      {/* Banner for clients without drivers */}
      {!hasDrivers && <NoDriversBanner variant="full" />}

      {/* Main CTA - Book a ride */}
      {hasDrivers && (
        <>
          <button
            onClick={onNewReservation}
            className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-dark p-5 text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl" />
            
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <CalendarPlus className="w-7 h-7" />
              </div>
              <div className="flex-1 text-left">
                <h2 className="text-xl font-bold mb-0.5">
                  {isExclusive && favoriteDriver
                    ? `Réserver avec ${getDriverDisplayName(favoriteDriver)}`
                    : "Réserver une course"}
                </h2>
                <p className="text-white/80 text-sm">
                  {isExclusive ? "Votre chauffeur exclusif" : "Votre chauffeur vous attend"}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 opacity-70 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Storefront access - HIDDEN for exclusive clients */}
          {!isExclusive && (
            <button
              onClick={() => navigate("/chauffeurs")}
              className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-br from-muted to-muted/80 p-4 text-foreground shadow transition-all duration-300 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] border border-border/50"
            >
              <div className="relative flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Search className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-base font-semibold mb-0.5">Trouver un chauffeur</h3>
                  <p className="text-muted-foreground text-xs">Explorez notre réseau VTC</p>
                </div>
                <ChevronRight className="w-5 h-5 opacity-50 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          )}
        </>
      )}

      {/* Find a driver CTA for clients without drivers */}
      {!hasDrivers && (
        <button
          onClick={() => navigate("/chauffeurs")}
          className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-br from-secondary to-secondary-dark p-5 text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
          
          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <Search className="w-7 h-7" />
            </div>
            <div className="flex-1 text-left">
              <h2 className="text-xl font-bold mb-0.5">Trouver un chauffeur</h2>
              <p className="text-white/80 text-sm">Explorez notre réseau VTC</p>
            </div>
            <ChevronRight className="w-5 h-5 opacity-70 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      )}

      {/* Quick Stats - Clean neutral design */}
      <div className="grid grid-cols-2 gap-3">
        <Card 
          className={cn(
            "relative overflow-hidden p-4 cursor-pointer transition-all duration-200",
            "hover:shadow-md active:scale-[0.98]",
            "bg-card/80 backdrop-blur border-border/50"
          )}
          onClick={() => onNavigate("courses", "confirmed")}
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <Clock className="w-6 h-6 text-primary mb-2" />
          <p className="text-2xl font-bold text-foreground mb-0.5">{stats.upcomingCourses}</p>
          <p className="text-xs text-muted-foreground font-medium">Courses à venir</p>
        </Card>

        <Card 
          className={cn(
            "relative overflow-hidden p-4 cursor-pointer transition-all duration-200",
            "hover:shadow-md active:scale-[0.98]",
            "bg-card/80 backdrop-blur border-border/50",
            stats.pendingDevis > 0 && "ring-1 ring-secondary/50"
          )}
          onClick={() => onNavigate("devis-factures", "devis")}
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-secondary/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          {stats.pendingDevis > 0 && (
            <span className="absolute top-2 right-2 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
            </span>
          )}
          <FileText className="w-6 h-6 text-secondary mb-2" />
          <p className="text-2xl font-bold text-foreground mb-0.5">{stats.pendingDevis}</p>
          <p className="text-xs text-muted-foreground font-medium">Devis en attente</p>
        </Card>
      </div>

      {/* Quick Actions - Full width grid */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
          Accès rapide
        </h3>
        <div className="grid grid-cols-4 gap-2">
          <QuickActionButton
            icon={MessageSquare}
            label="Messages"
            variant="primary"
            onClick={() => onNavigate("messages")}
          />
          <QuickActionButton
            icon={FileText}
            label="Factures"
            badge={stats.unpaidInvoices > 0 ? stats.unpaidInvoices : undefined}
            variant="success"
            onClick={() => onNavigate("devis-factures", "factures")}
          />
          <QuickActionButton
            icon={MapPin}
            label="Historique"
            variant="muted"
            onClick={() => onNavigate("courses", "completed")}
          />
          {!isExclusive && (
            <QuickActionButton
              icon={Globe}
              label="Vitrine"
              variant="accent"
              onClick={() => navigate("/chauffeurs")}
            />
          )}
        </div>
      </div>

      {/* Favorite Driver Card - Large and prominent */}
      {hasDrivers && favoriteDriver && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            {isExclusive ? "Mon chauffeur exclusif" : "Mon chauffeur favori"}
          </h3>
          <Card 
            className="group relative overflow-hidden border border-primary/30 bg-card hover:border-primary/50 hover:shadow-lg transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="relative p-4">
              <div className="flex items-start gap-4">
                {/* Avatar cliquable pour voir le profil */}
                <button
                  onClick={() => setShowDriverProfile(true)}
                  className="relative flex-shrink-0 group/avatar"
                >
                  <Avatar className="w-20 h-20 ring-2 ring-primary/30 ring-offset-2 ring-offset-card shadow-lg transition-transform group-hover/avatar:scale-105">
                    <AvatarImage 
                      src={favoriteDriver.profiles?.profile_photo_url || undefined} 
                      alt={getDriverDisplayName(favoriteDriver)} 
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                      {getDriverDisplayName(favoriteDriver).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-destructive rounded-full flex items-center justify-center shadow ring-2 ring-card">
                    <Heart className="w-3 h-3 text-white fill-white" />
                  </div>
                  {/* Indicateur de profil cliquable */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                    <Eye className="w-5 h-5 text-white" />
                  </div>
                </button>
                
                {/* Info */}
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <button
                      onClick={() => setShowDriverProfile(true)}
                      className="text-lg font-bold text-foreground hover:text-primary transition-colors truncate"
                    >
                      {getDriverDisplayName(favoriteDriver)}
                    </button>
                    {shouldShowRating && (
                      <Badge variant="secondary" className="gap-1 px-2 py-0.5 bg-secondary/10 text-secondary border-0">
                        <Star className="w-3 h-3 fill-current" />
                        <span className="font-semibold text-xs">{favoriteDriver.rating.toFixed(1)}</span>
                      </Badge>
                    )}
                  </div>
                  
                  {getVehicleDescription(favoriteDriver) && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-3">
                      <Car className="w-4 h-4 flex-shrink-0 text-primary/70" />
                      <span className="truncate">{getVehicleDescription(favoriteDriver)}</span>
                    </p>
                  )}
                  
                  {/* Action buttons */}
                  <div className="flex gap-2 flex-wrap">
                    <Button 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNewReservation();
                      }}
                      className="gap-1.5 h-8 px-3 text-xs"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                      Réserver
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate("messages");
                      }}
                      className="gap-1.5 h-8 px-3 text-xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Message
                    </Button>
                    {shouldShowPhone && (
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = `tel:${favoriteDriver.profiles.phone}`;
                        }}
                        className="h-8 w-8 text-success hover:text-success hover:bg-success/10 border-success/30"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Driver Profile Dialog */}
      {favoriteDriver && (
        <DriverProfileDialog
          driverId={favoriteDriver.id}
          open={showDriverProfile}
          onOpenChange={setShowDriverProfile}
          isRegistered={true}
        />
      )}
    </div>
  );
}

// Quick Action Button Component
interface QuickActionButtonProps {
  icon: React.ElementType;
  label: string;
  variant: "primary" | "success" | "muted" | "accent";
  badge?: number;
  onClick: () => void;
}

const variantStyles = {
  primary: {
    bg: "bg-primary/10",
    icon: "text-primary",
    hover: "hover:bg-primary/20",
  },
  success: {
    bg: "bg-success/10",
    icon: "text-success",
    hover: "hover:bg-success/20",
  },
  muted: {
    bg: "bg-muted/50",
    icon: "text-muted-foreground",
    hover: "hover:bg-muted",
  },
  accent: {
    bg: "bg-accent/10",
    icon: "text-accent",
    hover: "hover:bg-accent/20",
  },
};

function QuickActionButton({ icon: Icon, label, variant, badge, onClick }: QuickActionButtonProps) {
  const styles = variantStyles[variant];
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl transition-all duration-200 w-full",
        "active:scale-95",
        styles.bg,
        styles.hover
      )}
    >
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
      <div className="w-9 h-9 rounded-lg flex items-center justify-center">
        <Icon className={cn("w-5 h-5", styles.icon)} />
      </div>
      <span className="text-[11px] font-medium text-foreground">{label}</span>
    </button>
  );
}
