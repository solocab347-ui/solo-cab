/**
 * DriverHome — refonte intuitive
 * - 4 raccourcis essentiels uniquement
 * - Bouton de déconnexion visible
 * - Suppression Coach proactif / Quick Platform Entry / Premium banner verbeux
 */

import { memo, useEffect, useState } from "react";
import { DriverAvailabilityToggleBig } from "./planning/DriverAvailabilityToggleBig";
import { DriverFinanceWidget } from "./finance/DriverFinanceWidget";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  QrCode,
  TrendingUp,
  Car,
  Users,
  CheckCircle2,
  Star,
  Zap,
  Wallet,
  LogOut,
  MoreHorizontal,
  Settings,
  Target,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useInstantTap } from "@/hooks/useInstantTap";
import { useDriverPremium } from "@/hooks/useDriverPremium";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface DriverHomeProps {
  driverProfile: any;
  onTabChange: (tab: string) => void;
  onSwitchToMap?: () => void;
}

interface Stats {
  todayCourses: number;
  todayRevenue: number;
  weekRevenue: number;
  weekCourses: number;
  monthClients: number;
  monthCourses: number;
  monthCompleted: number;
  monthRevenue: number;
}

const DriverHomeComponent = ({ driverProfile, onTabChange, onSwitchToMap }: DriverHomeProps) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    todayCourses: 0,
    todayRevenue: 0,
    weekRevenue: 0,
    weekCourses: 0,
    monthClients: 0,
    monthCourses: 0,
    monthCompleted: 0,
    monthRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const { getTapProps } = useInstantTap();
  const { isFree } = useDriverPremium();

  useEffect(() => {
    let mounted = true;

    const loadStats = async () => {
      if (!driverProfile?.driver?.id) return;
      try {
        const { data, error } = await supabase.rpc("get_driver_dashboard_stats", {
          p_driver_id: driverProfile.driver.id,
        });
        if (!mounted) return;
        if (error) throw error;
        const d = data as any;
        if (d) {
          setStats({
            todayCourses: (d.today_courses || 0) + (d.today_ext_courses || 0),
            todayRevenue: Number(d.today_revenue || 0) + Number(d.today_ext_revenue || 0),
            weekRevenue: Number(d.week_revenue || 0) + Number(d.week_ext_revenue || 0),
            weekCourses: (d.week_courses || 0) + (d.week_ext_courses || 0),
            monthClients: (d.month_clients || 0) + Number(d.month_ext_clients || 0),
            monthCourses: (d.month_courses || 0) + (d.month_ext_courses || 0),
            monthCompleted: d.month_completed || 0,
            monthRevenue: Number(d.month_revenue || 0) + Number(d.month_ext_revenue || 0),
          });
        }
      } catch (e) {
        if (mounted) console.error("Erreur stats:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadStats();
    return () => {
      mounted = false;
    };
  }, [driverProfile?.driver?.id]);

  const displayName = driverProfile?.full_name
    ? driverProfile.full_name.split(" ")[0]
    : driverProfile?.driver?.display_name || "";

  const initials = (displayName || "C").slice(0, 1).toUpperCase();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Déconnecté");
      navigate("/auth", { replace: true });
    } catch {
      toast.error("Erreur de déconnexion");
    }
  };

  const handleEncaisser = () => {
    if (isFree) {
      onTabChange("subscription");
      return;
    }
    if (!driverProfile?.driver?.stripe_connect_charges_enabled) {
      toast.info("Connectez votre compte Stripe pour encaisser");
      onTabChange("finances");
      return;
    }
    onTabChange("encaisser");
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 space-y-6">
      {/* Header — Identité + Note + Menu (déconnexion) */}
      <div className="flex items-center justify-between gap-3 animate-fade-in">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-accent text-white font-bold flex items-center justify-center shadow-lg shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Bienvenue</p>
            <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">
              {displayName || "Chauffeur"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {driverProfile?.driver?.rating > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-card border border-border/60">
              <Star className="w-4 h-4 fill-warning text-warning" />
              <span className="text-sm font-semibold">
                {Number(driverProfile.driver.rating).toFixed(1)}
              </span>
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full"
                aria-label="Menu compte"
              >
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => onTabChange("profile")}>
                <Settings className="w-4 h-4 mr-2" /> Profil & Réglages
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="w-4 h-4 mr-2" /> Se déconnecter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Statut de disponibilité — bloc principal */}
      {driverProfile?.driver?.id && (
        <DriverAvailabilityToggleBig
          driverId={driverProfile.driver.id}
          onSwitchToMap={onSwitchToMap}
        />
      )}

      {/* 4 raccourcis essentiels */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-fade-in">
        <Card
          className="relative overflow-hidden p-4 sm:p-5 bg-card border border-border/50 shadow-success hover:scale-[1.02] transition-all cursor-pointer touch-manipulation active:scale-[0.98] group"
          {...getTapProps<HTMLDivElement>(() => navigate("/driver/create-course"))}
        >
          <div className="absolute inset-0 bg-gradient-success opacity-10 group-hover:opacity-20 transition-opacity" />
          <div className="relative z-10 flex flex-col items-center text-center gap-2.5">
            <div className="w-12 h-12 bg-gradient-success rounded-xl flex items-center justify-center shadow-success">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-foreground">Nouvelle course</h3>
          </div>
        </Card>

        <Card
          className="relative overflow-hidden p-4 sm:p-5 bg-card border border-border/50 shadow-lg hover:scale-[1.02] transition-all cursor-pointer touch-manipulation active:scale-[0.98] group"
          {...getTapProps<HTMLDivElement>(handleEncaisser)}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/15 to-emerald-500/10 group-hover:opacity-70 opacity-50 transition-opacity" />
          <div className="relative z-10 flex flex-col items-center text-center gap-2.5">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-foreground">Encaisser</h3>
          </div>
        </Card>

        <Card
          className="relative overflow-hidden p-4 sm:p-5 bg-card border border-border/50 shadow-lg hover:scale-[1.02] transition-all cursor-pointer touch-manipulation active:scale-[0.98] group"
          {...getTapProps<HTMLDivElement>(() => onTabChange("finances"))}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 to-accent/10 group-hover:opacity-70 opacity-50 transition-opacity" />
          <div className="relative z-10 flex flex-col items-center text-center gap-2.5">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-foreground">Mon portefeuille</h3>
          </div>
        </Card>

        <Card
          className="relative overflow-hidden p-4 sm:p-5 bg-card border border-border/50 shadow-premium hover:scale-[1.02] transition-all cursor-pointer touch-manipulation active:scale-[0.98] group"
          {...getTapProps<HTMLDivElement>(() => onTabChange("qrcode"))}
        >
          <div className="absolute inset-0 bg-gradient-premium opacity-10 group-hover:opacity-20 transition-opacity" />
          <div className="relative z-10 flex flex-col items-center text-center gap-2.5">
            <div className="w-12 h-12 bg-gradient-premium rounded-xl flex items-center justify-center shadow-premium">
              <QrCode className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-foreground">QR Code</h3>
          </div>
        </Card>
      </div>

      {/* Widget finance — vue rapide portefeuille */}
      {driverProfile?.driver?.id && (
        <div className="animate-fade-in">
          <DriverFinanceWidget
            driverId={driverProfile.driver.id}
            onViewDetails={() => onTabChange("finances")}
          />
        </div>
      )}

      {/* Aujourd'hui */}
      <div className="animate-fade-in">
        <h2 className="text-base sm:text-lg font-bold mb-3 text-foreground flex items-center gap-2">
          <div className="w-1 h-5 bg-gradient-to-b from-primary to-accent rounded-full" />
          Aujourd'hui
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Card className="relative overflow-hidden p-4 bg-card border border-border/50 shadow-trust">
            <div className="absolute inset-0 bg-gradient-trust opacity-10" />
            <div className="relative z-10 flex items-start gap-3">
              <div className="w-10 h-10 bg-gradient-trust rounded-xl flex items-center justify-center shadow-trust shrink-0">
                <Car className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Courses</p>
                <h3 className="text-2xl sm:text-3xl font-bold text-foreground">
                  {loading ? "..." : stats.todayCourses}
                </h3>
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden p-4 bg-card border border-border/50 shadow-premium">
            <div className="absolute inset-0 bg-gradient-premium opacity-10" />
            <div className="relative z-10 flex items-start gap-3">
              <div className="w-10 h-10 bg-gradient-premium rounded-xl flex items-center justify-center shadow-premium shrink-0">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Revenus</p>
                <h3 className="text-xl sm:text-3xl font-bold text-foreground truncate">
                  {loading ? "..." : `${stats.todayRevenue.toFixed(0)}€`}
                </h3>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Ce mois */}
      <div className="animate-fade-in">
        <h2 className="text-base sm:text-lg font-bold mb-3 text-foreground flex items-center gap-2">
          <div className="w-1 h-5 bg-gradient-to-b from-primary to-accent rounded-full" />
          Ce mois
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="relative overflow-hidden p-4 bg-card border border-border/50 shadow-success">
            <div className="absolute inset-0 bg-gradient-success opacity-5" />
            <div className="relative z-10 flex flex-col items-center text-center gap-1.5">
              <div className="w-10 h-10 bg-gradient-success rounded-lg flex items-center justify-center shadow-success">
                <Users className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                {loading ? "..." : stats.monthClients}
              </h3>
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Clients</p>
            </div>
          </Card>

          <Card className="relative overflow-hidden p-4 bg-card border border-border/50 shadow-trust">
            <div className="absolute inset-0 bg-gradient-trust opacity-5" />
            <div className="relative z-10 flex flex-col items-center text-center gap-1.5">
              <div className="w-10 h-10 bg-gradient-trust rounded-lg flex items-center justify-center shadow-trust">
                <Car className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                {loading ? "..." : stats.monthCourses}
              </h3>
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Courses</p>
            </div>
          </Card>

          <Card className="relative overflow-hidden p-4 bg-card border border-border/50 shadow-premium">
            <div className="absolute inset-0 bg-gradient-premium opacity-5" />
            <div className="relative z-10 flex flex-col items-center text-center gap-1.5">
              <div className="w-10 h-10 bg-gradient-premium rounded-lg flex items-center justify-center shadow-premium">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                {loading ? "..." : stats.monthCompleted}
              </h3>
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Terminées</p>
            </div>
          </Card>

          <Card className="relative overflow-hidden p-4 bg-card border border-border/50 shadow-warning">
            <div className="absolute inset-0 bg-gradient-warning opacity-5" />
            <div className="relative z-10 flex flex-col items-center text-center gap-1.5">
              <div className="w-10 h-10 bg-gradient-warning rounded-lg flex items-center justify-center shadow-warning">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg sm:text-2xl font-bold text-foreground truncate max-w-full">
                {loading ? "..." : `${stats.monthRevenue.toFixed(0)}€`}
              </h3>
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">CA Total</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export const DriverHome = memo(DriverHomeComponent, (prevProps, nextProps) => {
  return (
    prevProps.driverProfile?.driver?.id === nextProps.driverProfile?.driver?.id &&
    prevProps.driverProfile?.full_name === nextProps.driverProfile?.full_name
  );
});

export default DriverHome;
