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
  MapPin,
  Search,
  Globe,
  Eye,
  CreditCard,
  Zap,
  TrendingUp,
  ArrowUpRight,
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
  
  const getDriverDisplayName = (driver: any, exclusive: boolean = false): string => {
    if (!driver) return "Chauffeur VTC";
    const fullName = driver.profiles?.full_name?.trim();
    if (!fullName) return "Chauffeur VTC";
    if (exclusive) return fullName;
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

  const shouldShowRating = favoriteDriver?.rating > 0;
  const shouldShowPhone = favoriteDriver?.show_phone !== false && favoriteDriver?.profiles?.phone;
  const totalActions = stats.upcomingCourses + stats.pendingDevis + stats.unpaidInvoices;

  return (
    <div className="space-y-5 max-w-lg mx-auto pb-24">
      {/* Main CTA — always visible: book a ride (works with or without preassigned driver) */}
      <button
        onClick={onNewReservation}
        className="w-full group relative overflow-hidden rounded-2xl p-5 text-primary-foreground shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.01] active:scale-[0.98] bg-gradient-to-br from-primary via-primary to-primary/80"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white/5 rounded-full blur-xl" />

        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 shadow-inner">
            <CalendarPlus className="w-7 h-7" />
          </div>
          <div className="flex-1 text-left">
            <h2 className="text-lg font-bold leading-tight">
              {isExclusive && favoriteDriver
                ? `Réserver avec ${getDriverDisplayName(favoriteDriver, true).split(' ')[0]}`
                : "Réserver une course"}
            </h2>
            <p className="text-white/70 text-xs mt-0.5">
              {isExclusive
                ? "Votre chauffeur privé"
                : hasDrivers
                  ? "Choisissez votre chauffeur"
                  : "Trouvez le meilleur chauffeur près de vous"}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5 opacity-80 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </div>
      </button>

      {/* Storefront access — secondary entry to browse all VTC drivers */}
      {!isExclusive && (
        <button
          onClick={() => navigate("/chauffeurs")}
          className="w-full group relative overflow-hidden rounded-xl p-4 bg-card border border-border/60 shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/30 active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
              <Search className="w-5 h-5 text-secondary" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-foreground">
                {hasDrivers ? "Trouver un autre chauffeur" : "Explorer le réseau VTC"}
              </p>
              <p className="text-xs text-muted-foreground">
                {hasDrivers ? "Élargissez votre carnet" : "Découvrez les chauffeurs disponibles"}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>
      )}

      {/* Stats Row */}
      {hasDrivers && (
        <div className="grid grid-cols-2 gap-2.5">
          <StatCard
            icon={Clock}
            value={stats.upcomingCourses}
            label="À venir"
            color="primary"
            onClick={() => onNavigate("courses", "confirmed")}
          />
          <StatCard
            icon={CreditCard}
            value={stats.unpaidInvoices}
            label="Factures"
            color="destructive"
            pulse={stats.unpaidInvoices > 0}
            onClick={() => onNavigate("factures")}
          />
        </div>
      )}

      {/* Favorite Driver Card */}
      {hasDrivers && favoriteDriver && (
        <Card className="overflow-hidden border-border/50 shadow-sm">
          <div className="px-4 py-3 bg-muted/30 border-b border-border/50 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {isExclusive ? "Chauffeur exclusif" : "Chauffeur favori"}
            </span>
            <Heart className="w-3.5 h-3.5 text-destructive fill-destructive" />
          </div>
          
          <div className="p-4">
            <div className="flex items-center gap-3.5">
              <button
                onClick={() => setShowDriverProfile(true)}
                className="relative flex-shrink-0 group/avatar"
              >
                <Avatar className="w-16 h-16 ring-2 ring-primary/20 ring-offset-2 ring-offset-card shadow-md transition-transform group-hover/avatar:scale-105">
                  <AvatarImage 
                    src={favoriteDriver.profiles?.profile_photo_url || undefined} 
                    alt={getDriverDisplayName(favoriteDriver)} 
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                    {getDriverDisplayName(favoriteDriver).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                  <Eye className="w-4 h-4 text-white" />
                </div>
              </button>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setShowDriverProfile(true)}
                    className="text-base font-bold text-foreground hover:text-primary transition-colors truncate"
                  >
                    {getDriverDisplayName(favoriteDriver, isExclusive)}
                  </button>
                  {shouldShowRating && (
                    <Badge variant="secondary" className="gap-0.5 px-1.5 py-0 text-[10px] bg-secondary/10 text-secondary border-0">
                      <Star className="w-2.5 h-2.5 fill-current" />
                      {favoriteDriver.rating.toFixed(1)}
                    </Badge>
                  )}
                </div>
                
                {getVehicleDescription(favoriteDriver) && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Car className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{getVehicleDescription(favoriteDriver)}</span>
                  </p>
                )}
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-2 mt-3">
              <Button 
                size="sm"
                onClick={onNewReservation}
                className="flex-1 h-9 text-xs gap-1.5"
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                Réserver
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onNavigate("messages")}
                className="h-9 text-xs gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Message
              </Button>
              {shouldShowPhone && (
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => window.location.href = `tel:${favoriteDriver.profiles.phone}`}
                  className="h-9 w-9 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 border-emerald-200 dark:border-emerald-800"
                >
                  <Phone className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Quick Access Grid */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
          Accès rapide
        </h3>
        <div className="grid grid-cols-2 gap-2.5">
          <QuickLink
            icon={Clock}
            label="Historique"
            description="Toutes vos courses"
            onClick={() => onNavigate("courses", "completed")}
          />
          <QuickLink
            icon={MessageSquare}
            label="Messages"
            description="Échangez avec vos chauffeurs"
            onClick={() => onNavigate("messages")}
          />
          {!isExclusive && (
            <QuickLink
              icon={Globe}
              label="Vitrine VTC"
              description="Découvrir des chauffeurs"
              onClick={() => navigate("/chauffeurs")}
            />
          )}
          <QuickLink
            icon={CreditCard}
            label="Paiement"
            description="Gérer vos cartes"
            onClick={() => onNavigate("paiement")}
          />
        </div>
      </div>

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

// Stat Card Component
interface StatCardProps {
  icon: React.ElementType;
  value: number;
  label: string;
  color: "primary" | "secondary" | "destructive";
  pulse?: boolean;
  onClick: () => void;
}

const colorMap = {
  primary: { bg: "bg-primary/10", text: "text-primary", ring: "ring-primary/20" },
  secondary: { bg: "bg-secondary/10", text: "text-secondary", ring: "ring-secondary/20" },
  destructive: { bg: "bg-destructive/10", text: "text-destructive", ring: "ring-destructive/20" },
};

function StatCard({ icon: Icon, value, label, color, pulse, onClick }: StatCardProps) {
  const c = colorMap[color];
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center p-3.5 rounded-xl bg-card border border-border/50 shadow-sm",
        "transition-all duration-200 hover:shadow-md hover:border-border active:scale-[0.97]"
      )}
    >
      {pulse && (
        <span className="absolute top-2 right-2 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive/75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
        </span>
      )}
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center mb-1.5", c.bg)}>
        <Icon className={cn("w-4.5 h-4.5", c.text)} />
      </div>
      <span className="text-xl font-bold text-foreground">{value}</span>
      <span className="text-[10px] text-muted-foreground font-medium mt-0.5">{label}</span>
    </button>
  );
}

// Quick Link Component
interface QuickLinkProps {
  icon: React.ElementType;
  label: string;
  description: string;
  onClick: () => void;
}

function QuickLink({ icon: Icon, label, description, onClick }: QuickLinkProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 shadow-sm transition-all duration-200 hover:shadow-md hover:border-border active:scale-[0.98] text-left"
    >
      <div className="w-9 h-9 rounded-lg bg-muted/80 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4.5 h-4.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{label}</p>
        <p className="text-[10px] text-muted-foreground truncate">{description}</p>
      </div>
    </button>
  );
}
