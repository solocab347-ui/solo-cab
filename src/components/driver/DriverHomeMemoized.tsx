/**
 * DriverHome ULTRA-OPTIMISÉ avec React.memo
 * Évite re-renders inutiles
 */

import { memo, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, QrCode, Calculator, TrendingUp, Car, Users, CheckCircle2, Star, Calendar, Handshake } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, startOfMonth, endOfDay, endOfMonth } from "date-fns";

interface DriverHomeProps {
  driverProfile: any;
  onTabChange: (tab: string) => void;
}

interface Stats {
  todayCourses: number;
  todayRevenue: number;
  monthClients: number;
  monthCourses: number;
  monthCompleted: number;
  monthRevenue: number;
  availablePartnerCourses: number;
}

const DriverHomeComponent = ({ driverProfile, onTabChange }: DriverHomeProps) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    todayCourses: 0,
    todayRevenue: 0,
    monthClients: 0,
    monthCourses: 0,
    monthCompleted: 0,
    monthRevenue: 0,
    availablePartnerCourses: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const loadStats = async () => {
      if (!driverProfile?.driver?.id) return;
      
      try {
        const today = new Date();
        const todayStart = startOfDay(today).toISOString();
        const todayEnd = endOfDay(today).toISOString();
        const monthStart = startOfMonth(today).toISOString();
        const monthEnd = endOfMonth(today).toISOString();
        const driverId = driverProfile.driver.id;

        // Optimisation: toutes les requêtes en parallèle
        const [todayFactures, monthClientsData, monthCoursesData, monthCompletedData, monthFactures, partnerPoolData] = await Promise.all([
          supabase.from('factures').select('amount, course_id').eq('driver_id', driverId).eq('payment_status', 'paid').gte('paid_at', todayStart).lte('paid_at', todayEnd),
          supabase.from('clients').select('id').or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`).gte('created_at', monthStart).lte('created_at', monthEnd),
          supabase.from('courses').select('id').or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`).gte('created_at', monthStart).lte('created_at', monthEnd),
          supabase.from('courses').select('id').or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`).eq('status', 'completed').gte('updated_at', monthStart).lte('updated_at', monthEnd),
          supabase.from('factures').select('amount').eq('driver_id', driverId).eq('payment_status', 'paid').gte('paid_at', monthStart).lte('paid_at', monthEnd),
          // Count available partner courses in pool that haven't been claimed
          supabase.from('partner_course_pool').select('id').eq('status', 'available').gt('expires_at', new Date().toISOString())
        ]);

        if (!mounted) return;

        const todayCourseIds = new Set(todayFactures.data?.map(f => f.course_id) || []);
        const todayRevenue = todayFactures.data?.reduce((sum, f) => sum + Number(f.amount), 0) || 0;
        const monthRevenue = monthFactures.data?.reduce((sum, f) => sum + Number(f.amount), 0) || 0;

        setStats({
          todayCourses: todayCourseIds.size,
          todayRevenue,
          monthClients: monthClientsData.data?.length || 0,
          monthCourses: monthCoursesData.data?.length || 0,
          monthCompleted: monthCompletedData.data?.length || 0,
          monthRevenue,
          availablePartnerCourses: partnerPoolData.data?.length || 0,
        });
      } catch (error) {
        if (mounted) console.error('Erreur stats:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadStats();
    return () => { mounted = false; };
  }, [driverProfile?.driver?.id]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Welcome Header */}
      <div className="text-left animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              Bienvenue, {driverProfile?.full_name || 'Chauffeur'}
            </h1>
            <p className="text-muted-foreground text-lg">Tableau de bord professionnel</p>
          </div>
          {driverProfile?.driver?.rating && driverProfile.driver.rating > 0 && (
            <div className="flex items-center gap-3 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/10 shadow-premium">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 fill-warning text-warning" />
                <span className="text-2xl font-bold text-foreground">
                  {Number(driverProfile.driver.rating).toFixed(1)}
                </span>
              </div>
              <div className="w-px h-8 bg-border"></div>
              <span className="text-sm text-muted-foreground">Note moyenne</span>
            </div>
          )}
        </div>
      </div>

      {/* Accès Rapide */}
      <div className="animate-fade-in">
        <h2 className="text-xl font-bold mb-6 text-foreground flex items-center gap-2">
          <div className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full"></div>
          Accès Rapide
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card className="relative overflow-hidden p-8 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl hover:scale-[1.02] transition-all cursor-pointer border border-white/10 shadow-success group" onClick={() => navigate("/driver/create-course")}>
            <div className="absolute inset-0 bg-gradient-success opacity-10 group-hover:opacity-20 transition-opacity"></div>
            <div className="relative z-10 flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 bg-gradient-success rounded-2xl flex items-center justify-center shadow-success group-hover:scale-110 transition-transform">
                <Plus className="w-10 h-10 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground mb-1">Nouvelle Course</h3>
                <p className="text-sm text-muted-foreground">Créer pour un client</p>
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden p-8 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl hover:scale-[1.02] transition-all cursor-pointer border border-white/10 shadow-premium group" onClick={() => onTabChange("qrcode")}>
            <div className="absolute inset-0 bg-gradient-premium opacity-10 group-hover:opacity-20 transition-opacity"></div>
            <div className="relative z-10 flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 bg-gradient-premium rounded-2xl flex items-center justify-center shadow-premium group-hover:scale-110 transition-transform">
                <QrCode className="w-10 h-10 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Mon QR Code</h3>
                <p className="text-sm text-muted-foreground">Partager avec clients</p>
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden p-8 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl hover:scale-[1.02] transition-all cursor-pointer border border-white/10 shadow-trust group" onClick={() => onTabChange("calculator")}>
            <div className="absolute inset-0 bg-gradient-trust opacity-10 group-hover:opacity-20 transition-opacity"></div>
            <div className="relative z-10 flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 bg-gradient-trust rounded-2xl flex items-center justify-center shadow-trust group-hover:scale-110 transition-transform">
                <Calculator className="w-10 h-10 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Calculatrice</h3>
                <p className="text-sm text-muted-foreground">Estimer un prix</p>
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden p-8 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl hover:scale-[1.02] transition-all cursor-pointer border border-white/10 shadow-warning group" onClick={() => onTabChange("planning")}>
            <div className="absolute inset-0 bg-gradient-warning opacity-10 group-hover:opacity-20 transition-opacity"></div>
            <div className="relative z-10 flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 bg-gradient-warning rounded-2xl flex items-center justify-center shadow-warning group-hover:scale-110 transition-transform">
                <Calendar className="w-10 h-10 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Planning</h3>
                <p className="text-sm text-muted-foreground">Voir mes courses</p>
              </div>
            </div>
          </Card>

          {/* Partner Courses Shortcut with notification badge - goes to received courses */}
          <Card className="relative overflow-hidden p-8 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl hover:scale-[1.02] transition-all cursor-pointer border border-white/10 shadow-lg group" onClick={() => onTabChange("partnerships-received")}>
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-purple-500/10 opacity-50 group-hover:opacity-70 transition-opacity"></div>
            {/* Notification badge */}
            {stats.availablePartnerCourses > 0 && (
              <div className="absolute top-3 right-3 z-20">
                <Badge className="bg-red-500 text-white border-0 text-xs font-bold px-2 py-0.5 animate-pulse">
                  {stats.availablePartnerCourses}
                </Badge>
              </div>
            )}
            <div className="relative z-10 flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Handshake className="w-10 h-10 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Courses Reçues</h3>
                <p className="text-sm text-muted-foreground">
                  {stats.availablePartnerCourses > 0 
                    ? `${stats.availablePartnerCourses} en attente`
                    : 'Des partenaires'
                  }
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Aujourd'hui */}
      <div className="animate-fade-in">
        <h2 className="text-xl font-bold mb-6 text-foreground flex items-center gap-2">
          <div className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full"></div>
          Aujourd'hui
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <Card className="relative overflow-hidden p-8 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl border border-white/10 shadow-trust transition-all hover:shadow-trust/80">
            <div className="absolute inset-0 bg-gradient-trust opacity-10"></div>
            <div className="relative z-10 flex items-start gap-6">
              <div className="w-16 h-16 bg-gradient-trust rounded-2xl flex items-center justify-center flex-shrink-0 shadow-trust">
                <Car className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground mb-2 uppercase tracking-wider">Courses</p>
                <h3 className="text-5xl font-bold text-foreground mb-1">
                  {loading ? "..." : stats.todayCourses}
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-2 h-2 bg-trust rounded-full animate-pulse"></div>
                  <span className="text-xs text-muted-foreground">En temps réel</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden p-8 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl border border-white/10 shadow-premium transition-all hover:shadow-premium/80">
            <div className="absolute inset-0 bg-gradient-premium opacity-10"></div>
            <div className="relative z-10 flex items-start gap-6">
              <div className="w-16 h-16 bg-gradient-premium rounded-2xl flex items-center justify-center flex-shrink-0 shadow-premium">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground mb-2 uppercase tracking-wider">Revenus</p>
                <h3 className="text-5xl font-bold text-foreground mb-1">
                  {loading ? "..." : `${stats.todayRevenue.toFixed(0)}€`}
                </h3>
                <div className="flex items-center gap-2 mt-2">
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
        <h2 className="text-xl font-bold mb-6 text-foreground flex items-center gap-2">
          <div className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full"></div>
          Ce mois
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="relative overflow-hidden p-6 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl border border-white/10 shadow-success hover:scale-[1.02] transition-all">
            <div className="absolute inset-0 bg-gradient-success opacity-5"></div>
            <div className="relative z-10 flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 bg-gradient-success rounded-xl flex items-center justify-center shadow-success">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-4xl font-bold text-foreground mb-1">{loading ? "..." : stats.monthClients}</h3>
                <p className="text-sm text-muted-foreground uppercase tracking-wider">Clients</p>
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden p-6 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl border border-white/10 shadow-trust hover:scale-[1.02] transition-all">
            <div className="absolute inset-0 bg-gradient-trust opacity-5"></div>
            <div className="relative z-10 flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 bg-gradient-trust rounded-xl flex items-center justify-center shadow-trust">
                <Car className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-4xl font-bold text-foreground mb-1">{loading ? "..." : stats.monthCourses}</h3>
                <p className="text-sm text-muted-foreground uppercase tracking-wider">Courses</p>
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden p-6 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl border border-white/10 shadow-premium hover:scale-[1.02] transition-all">
            <div className="absolute inset-0 bg-gradient-premium opacity-5"></div>
            <div className="relative z-10 flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 bg-gradient-premium rounded-xl flex items-center justify-center shadow-premium">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-4xl font-bold text-foreground mb-1">{loading ? "..." : stats.monthCompleted}</h3>
                <p className="text-sm text-muted-foreground uppercase tracking-wider">Terminées</p>
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden p-6 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl border border-white/10 shadow-warning hover:scale-[1.02] transition-all">
            <div className="absolute inset-0 bg-gradient-warning opacity-5"></div>
            <div className="relative z-10 flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 bg-gradient-warning rounded-xl flex items-center justify-center shadow-warning">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-4xl font-bold text-foreground mb-1">{loading ? "..." : `${stats.monthRevenue.toFixed(0)}€`}</h3>
                <p className="text-sm text-muted-foreground uppercase tracking-wider">CA Total</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Export mémoïsé pour éviter re-renders
export const DriverHome = memo(DriverHomeComponent, (prevProps, nextProps) => {
  return prevProps.driverProfile?.driver?.id === nextProps.driverProfile?.driver?.id;
});
