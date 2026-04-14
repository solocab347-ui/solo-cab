/**
 * DriverHome ULTRA-OPTIMISÉ avec React.memo
 * Évite re-renders inutiles
 */

import { memo, useEffect, useState } from "react";
import { DriverAvailabilityToggleBig } from "./planning/DriverAvailabilityToggleBig";
import { DriverFinanceWidget } from "./finance/DriverFinanceWidget";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, QrCode, Calculator, TrendingUp, Car, Users, CheckCircle2, Star, Calendar, Handshake, Target, Zap, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
// date-fns removed - using RPC now
import { DashboardObjectivesWidget } from "./objectives/DashboardObjectivesWidget";
import { QuickPlatformEntry } from "./objectives/QuickPlatformEntry";
import { ProactiveCoachPopup } from "./objectives/coaching/ProactiveCoachPopup";
import { useProactiveCoach } from "./objectives/hooks/useProactiveCoach";
import { useInstantTap } from "@/hooks/useInstantTap";
import { useDriverPremium } from "@/hooks/useDriverPremium";
import { PremiumUpgradeBanner } from "@/components/premium/PremiumUpgradeBanner";
import { Crown, Lock } from "lucide-react";

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
  availablePartnerCourses: number;
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
    availablePartnerCourses: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);
  const { getTapProps } = useInstantTap();
  const { isFree } = useDriverPremium();

  useEffect(() => {
    let mounted = true;
    
    const loadStats = async () => {
      if (!driverProfile?.driver?.id) return;
      
      try {
        const driverId = driverProfile.driver.id;

        // Single RPC call for all stats + partner pool count in parallel
        const [statsResult, partnerPoolData] = await Promise.all([
          supabase.rpc('get_driver_dashboard_stats', { p_driver_id: driverId }),
          supabase.from('partner_course_pool').select('id', { count: 'exact', head: true }).eq('status', 'available').gt('expires_at', new Date().toISOString())
        ]);

        if (!mounted) return;
        if (statsResult.error) throw statsResult.error;

        const d = statsResult.data as any;
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
            availablePartnerCourses: partnerPoolData.count || 0,
          });
        }
      } catch (error) {
        if (mounted) console.error('Erreur stats:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadStats();
    return () => { mounted = false; };
  }, [driverProfile?.driver?.id, statsRefreshKey]);

  // Extraire le prénom pour l'affichage
  const displayName = driverProfile?.full_name 
    ? driverProfile.full_name.split(' ')[0]
    : driverProfile?.driver?.display_name || '';

  // Les objectifs sont maintenant remplis à l'onboarding, donc hasObjectives = true par défaut
  const onboardingObjectivesCompleted = driverProfile?.driver?.onboarding_objectives_completed ?? false;

  // Proactive AI Coach - Les objectifs sont maintenant remplis à l'onboarding
  const hasObjectives = onboardingObjectivesCompleted || stats.monthCourses > 0 || stats.monthClients > 0;
  const { currentMessage, dismissMessage } = useProactiveCoach({
    driverId: driverProfile?.driver?.id || '',
    driverName: displayName,
    stats: {
      todayRevenue: stats.todayRevenue,
      todayCourses: stats.todayCourses,
      weekRevenue: stats.weekRevenue,
      monthRevenue: stats.monthRevenue,
      totalClients: stats.monthClients,
      streakDays: 0, // Would need separate tracking
      hasObjectives: true, // Toujours true car remplis à l'onboarding
      soloCabPercentage: 0, // Would need calculation
      partnershipsCount: 0 // Would need separate tracking
    },
    enabled: !!driverProfile?.driver?.id
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6 space-y-6 sm:space-y-8">
      {/* Proactive Coach Popup */}
      <ProactiveCoachPopup
        message={currentMessage}
        onDismiss={dismissMessage}
        onAction={() => onTabChange("objectives")}
        driverName={displayName}
      />
      {/* Welcome Header */}
      <div className="text-left animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent truncate">
              Bienvenue{displayName ? `, ${displayName}` : ''}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-lg">Tableau de bord professionnel</p>
          </div>
          {driverProfile?.driver?.rating && driverProfile.driver.rating > 0 && (
            <div className="flex items-center gap-2 sm:gap-3 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl px-3 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-border/50 shadow-lg flex-shrink-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Star className="w-4 h-4 sm:w-5 sm:h-5 fill-warning text-warning" />
                <span className="text-lg sm:text-2xl font-bold text-foreground">
                  {Number(driverProfile.driver.rating).toFixed(1)}
                </span>
              </div>
              <div className="hidden sm:block w-px h-8 bg-border"></div>
              <span className="hidden sm:inline text-sm text-muted-foreground">Note moyenne</span>
            </div>
          )}
        </div>

        {/* Availability Toggle - Prominent */}
        {driverProfile?.driver?.id && (
          <DriverAvailabilityToggleBig
            driverId={driverProfile.driver.id}
            onSwitchToMap={onSwitchToMap}
          />
        )}
      </div>

      {/* AI Objectives Widget - Always visible at top */}
      {driverProfile?.driver?.id && (
        <DashboardObjectivesWidget
          driverId={driverProfile.driver.id}
          driverName={displayName}
          onNavigateToObjectives={() => onTabChange("objectives")}
          refreshKey={statsRefreshKey}
        />
      )}

      {/* Quick Platform Entry - Enter external app revenues */}
      {driverProfile?.driver?.id && (
        <QuickPlatformEntry
          driverId={driverProfile.driver.id}
          onEntrySaved={() => setStatsRefreshKey(k => k + 1)}
        />
      )}

      {/* Accès Rapide */}
      <div className="animate-fade-in">
        <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-foreground flex items-center gap-2">
          <div className="w-1 h-5 sm:h-6 bg-gradient-to-b from-primary to-accent rounded-full"></div>
          Accès Rapide
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
          <Card
            className="relative overflow-hidden p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl hover:scale-[1.02] transition-all cursor-pointer border border-border/50 shadow-success group touch-manipulation active:scale-[0.98]"
            {...getTapProps<HTMLDivElement>(() => navigate("/driver/create-course"))}
          >
            <div className="absolute inset-0 bg-gradient-success opacity-10 group-hover:opacity-20 transition-opacity"></div>
            <div className="relative z-10 flex flex-col items-center text-center space-y-2 sm:space-y-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-gradient-success rounded-xl sm:rounded-2xl flex items-center justify-center shadow-success group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-white" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base lg:text-xl font-bold text-foreground mb-0.5 sm:mb-1">Nouvelle Course</h3>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Créer pour un client</p>
              </div>
            </div>
          </Card>

          <Card
            className="relative overflow-hidden p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl hover:scale-[1.02] transition-all cursor-pointer border border-border/50 shadow-premium group touch-manipulation active:scale-[0.98]"
            {...getTapProps<HTMLDivElement>(() => onTabChange("qrcode"))}
          >
            <div className="absolute inset-0 bg-gradient-premium opacity-10 group-hover:opacity-20 transition-opacity"></div>
            <div className="relative z-10 flex flex-col items-center text-center space-y-2 sm:space-y-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-gradient-premium rounded-xl sm:rounded-2xl flex items-center justify-center shadow-premium group-hover:scale-110 transition-transform">
                <QrCode className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-white" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base lg:text-xl font-bold text-foreground">QR Code</h3>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Partager</p>
              </div>
            </div>
          </Card>

          <Card
            className="relative overflow-hidden p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl hover:scale-[1.02] transition-all cursor-pointer border border-border/50 shadow-trust group touch-manipulation active:scale-[0.98]"
            {...getTapProps<HTMLDivElement>(() => onTabChange("calculator"))}
          >
            <div className="absolute inset-0 bg-gradient-trust opacity-10 group-hover:opacity-20 transition-opacity"></div>
            <div className="relative z-10 flex flex-col items-center text-center space-y-2 sm:space-y-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-gradient-trust rounded-xl sm:rounded-2xl flex items-center justify-center shadow-trust group-hover:scale-110 transition-transform">
                <Calculator className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-white" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base lg:text-xl font-bold text-foreground">Calculatrice</h3>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Estimer un prix</p>
              </div>
            </div>
          </Card>

          <Card
            className="relative overflow-hidden p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl hover:scale-[1.02] transition-all cursor-pointer border border-border/50 shadow-warning group touch-manipulation active:scale-[0.98]"
            {...getTapProps<HTMLDivElement>(() => onTabChange("planning"))}
          >
            <div className="absolute inset-0 bg-gradient-warning opacity-10 group-hover:opacity-20 transition-opacity"></div>
            <div className="relative z-10 flex flex-col items-center text-center space-y-2 sm:space-y-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-gradient-warning rounded-xl sm:rounded-2xl flex items-center justify-center shadow-warning group-hover:scale-110 transition-transform">
                <Calendar className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-white" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base lg:text-xl font-bold text-foreground">Planning</h3>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Voir mes courses</p>
              </div>
            </div>
          </Card>

          {/* Objectives Shortcut - Premium */}
          <Card
            className={`relative overflow-hidden p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl hover:scale-[1.02] transition-all cursor-pointer border ${isFree ? 'border-amber-500/30' : 'border-border/50'} shadow-lg group touch-manipulation active:scale-[0.98]`}
            {...getTapProps<HTMLDivElement>(() => {
              if (isFree) {
                onTabChange("subscription");
              } else {
                onTabChange("objectives");
              }
            })}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-primary/10 opacity-50 group-hover:opacity-70 transition-opacity"></div>
            {isFree && (
              <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20">
                <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 py-0.5 border-amber-500/40 text-amber-600 bg-amber-500/10">
                  <Crown className="w-3 h-3 mr-0.5" />
                  Premium
                </Badge>
              </div>
            )}
            <div className="relative z-10 flex flex-col items-center text-center space-y-2 sm:space-y-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-accent to-primary rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                {isFree ? (
                  <Lock className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-white" />
                ) : (
                  <Target className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-white" />
                )}
              </div>
              <div>
                <h3 className="text-sm sm:text-base lg:text-xl font-bold text-foreground">Objectifs</h3>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                  {isFree ? "Premium" : "Suivi & coaching"}
                </p>
              </div>
            </div>
          </Card>

          {/* Premium CTA - Partenariats */}
          <Card
            className="relative overflow-hidden p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-amber-500/10 via-card/60 to-orange-500/10 backdrop-blur-xl hover:scale-[1.02] transition-all cursor-pointer border border-amber-500/30 shadow-lg group touch-manipulation active:scale-[0.98]"
            {...getTapProps<HTMLDivElement>(() => {
              if (isFree) {
                onTabChange("subscription");
              } else {
                onTabChange("sharing");
              }
            })}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/10 opacity-50 group-hover:opacity-70 transition-opacity"></div>
            {isFree && (
              <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20">
                <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 py-0.5 border-amber-500/40 text-amber-600 bg-amber-500/10">
                  <Crown className="w-3 h-3 mr-0.5" />
                  Premium
                </Badge>
              </div>
            )}
            <div className="relative z-10 flex flex-col items-center text-center space-y-2 sm:space-y-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                {isFree ? (
                  <Lock className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-white" />
                ) : (
                  <Handshake className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-white" />
                )}
              </div>
              <div>
                <h3 className="text-sm sm:text-base lg:text-xl font-bold text-foreground">Partenaires</h3>
                <p className="text-xs sm:text-sm text-muted-foreground/70 hidden sm:block">
                  {isFree ? "19,99€/mois" : "Réseau de partage"}
                </p>
              </div>
            </div>
          </Card>

          {/* Mon Portefeuille */}
          <Card
            className="relative overflow-hidden p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl hover:scale-[1.02] transition-all cursor-pointer border border-border/50 shadow-lg group touch-manipulation active:scale-[0.98]"
            {...getTapProps<HTMLDivElement>(() => onTabChange("finances"))}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/15 to-accent/10 opacity-50 group-hover:opacity-70 transition-opacity"></div>
            <div className="relative z-10 flex flex-col items-center text-center space-y-2 sm:space-y-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-primary to-accent rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Wallet className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-white" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base lg:text-xl font-bold text-foreground">Mon Portefeuille</h3>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Revenus & transactions</p>
              </div>
            </div>
          </Card>

          {/* Encaissement spontané */}
          <Card
            className={`relative overflow-hidden p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl transition-all border border-border/50 shadow-lg group touch-manipulation ${
              driverProfile?.driver?.stripe_connect_charges_enabled
                ? 'hover:scale-[1.02] cursor-pointer active:scale-[0.98]'
                : 'opacity-60 cursor-not-allowed'
            }`}
            {...(driverProfile?.driver?.stripe_connect_charges_enabled
              ? getTapProps<HTMLDivElement>(() => onTabChange("encaisser"))
              : {}
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/15 to-emerald-500/10 opacity-50 group-hover:opacity-70 transition-opacity"></div>
            <div className="relative z-10 flex flex-col items-center text-center space-y-2 sm:space-y-4">
              <div className={`w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform ${
                driverProfile?.driver?.stripe_connect_charges_enabled
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                  : 'bg-muted'
              }`}>
                <Zap className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-white" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base lg:text-xl font-bold text-foreground">Encaisser</h3>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                  {driverProfile?.driver?.stripe_connect_charges_enabled
                    ? 'Paiement spontané'
                    : 'Connectez Stripe'}
                </p>
              </div>
              {!driverProfile?.driver?.stripe_connect_charges_enabled && (
                <p className="text-[10px] text-primary font-medium">Connecter votre compte Stripe</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Finance Widget */}
      {driverProfile?.driver?.id && (
        <div className="animate-fade-in mb-6">
          <DriverFinanceWidget
            driverId={driverProfile.driver.id}
            onViewDetails={() => onTabChange("finances")}
          />
        </div>
      )}

      {/* Aujourd'hui */}
      <div className="animate-fade-in">
        <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-foreground flex items-center gap-2">
          <div className="w-1 h-5 sm:h-6 bg-gradient-to-b from-primary to-accent rounded-full"></div>
          Aujourd'hui
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
          <Card className="relative overflow-hidden p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl border border-border/50 shadow-trust transition-all hover:shadow-trust/80">
            <div className="absolute inset-0 bg-gradient-trust opacity-10"></div>
            <div className="relative z-10 flex items-start gap-3 sm:gap-6">
              <div className="w-10 h-10 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-gradient-trust rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 shadow-trust">
                <Car className="w-5 h-5 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2 uppercase tracking-wider">Courses</p>
                <h3 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-0.5 sm:mb-1">
                  {loading ? "..." : stats.todayCourses}
                </h3>
                <div className="hidden sm:flex items-center gap-2 mt-1 sm:mt-2">
                  <div className="w-2 h-2 bg-trust rounded-full animate-pulse"></div>
                  <span className="text-xs text-muted-foreground">En temps réel</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl border border-border/50 shadow-premium transition-all hover:shadow-premium/80">
            <div className="absolute inset-0 bg-gradient-premium opacity-10"></div>
            <div className="relative z-10 flex items-start gap-3 sm:gap-6">
              <div className="w-10 h-10 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-gradient-premium rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 shadow-premium">
                <TrendingUp className="w-5 h-5 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2 uppercase tracking-wider">Revenus</p>
                <h3 className="text-xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-0.5 sm:mb-1 truncate">
                  {loading ? "..." : `${stats.todayRevenue.toFixed(0)}€`}
                </h3>
                <div className="hidden sm:flex items-center gap-2 mt-1 sm:mt-2">
                  <div className="w-2 h-2 bg-premium rounded-full animate-pulse"></div>
                  <span className="text-xs text-muted-foreground">Aujourd'hui</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Ce mois - Statistiques */}
      <div className="animate-fade-in">
        <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-foreground flex items-center gap-2">
          <div className="w-1 h-5 sm:h-6 bg-gradient-to-b from-primary to-accent rounded-full"></div>
          Ce mois
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="relative overflow-hidden p-4 sm:p-6 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl border border-border/50 shadow-success hover:scale-[1.02] transition-all touch-manipulation active:scale-[0.98]">
            <div className="absolute inset-0 bg-gradient-success opacity-5"></div>
            <div className="relative z-10 flex flex-col items-center text-center space-y-2 sm:space-y-3">
              <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-success rounded-lg sm:rounded-xl flex items-center justify-center shadow-success">
                <Users className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              </div>
              <div>
                <h3 className="text-2xl sm:text-4xl font-bold text-foreground mb-0.5 sm:mb-1">{loading ? "..." : stats.monthClients}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wider">Clients</p>
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden p-4 sm:p-6 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl border border-border/50 shadow-trust hover:scale-[1.02] transition-all touch-manipulation active:scale-[0.98]">
            <div className="absolute inset-0 bg-gradient-trust opacity-5"></div>
            <div className="relative z-10 flex flex-col items-center text-center space-y-2 sm:space-y-3">
              <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-trust rounded-lg sm:rounded-xl flex items-center justify-center shadow-trust">
                <Car className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              </div>
              <div>
                <h3 className="text-2xl sm:text-4xl font-bold text-foreground mb-0.5 sm:mb-1">{loading ? "..." : stats.monthCourses}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wider">Courses</p>
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden p-4 sm:p-6 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl border border-border/50 shadow-premium hover:scale-[1.02] transition-all touch-manipulation active:scale-[0.98]">
            <div className="absolute inset-0 bg-gradient-premium opacity-5"></div>
            <div className="relative z-10 flex flex-col items-center text-center space-y-2 sm:space-y-3">
              <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-premium rounded-lg sm:rounded-xl flex items-center justify-center shadow-premium">
                <CheckCircle2 className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              </div>
              <div>
                <h3 className="text-2xl sm:text-4xl font-bold text-foreground mb-0.5 sm:mb-1">{loading ? "..." : stats.monthCompleted}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wider">Terminées</p>
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden p-4 sm:p-6 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl border border-border/50 shadow-warning hover:scale-[1.02] transition-all touch-manipulation active:scale-[0.98]">
            <div className="absolute inset-0 bg-gradient-warning opacity-5"></div>
            <div className="relative z-10 flex flex-col items-center text-center space-y-2 sm:space-y-3">
              <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-warning rounded-lg sm:rounded-xl flex items-center justify-center shadow-warning">
                <TrendingUp className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl sm:text-3xl font-bold text-foreground mb-0.5 sm:mb-1 truncate max-w-full">{loading ? "..." : `${stats.monthRevenue.toFixed(0)}€`}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wider">CA Total</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Premium CTA Banner - only for free users */}
      {isFree && (
        <div className="animate-fade-in">
          <PremiumUpgradeBanner message="Boostez votre activité avec Premium" />
        </div>
      )}
    </div>
  );
};

// Export mémoïsé
export const DriverHome = memo(DriverHomeComponent, (prevProps, nextProps) => {
  return (
    prevProps.driverProfile?.driver?.id === nextProps.driverProfile?.driver?.id &&
    prevProps.driverProfile?.full_name === nextProps.driverProfile?.full_name
  );
});

export default DriverHome;
