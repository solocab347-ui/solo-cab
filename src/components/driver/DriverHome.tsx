import { Card } from "@/components/ui/card";
import { Plus, QrCode, Calculator, TrendingUp, Car, Users, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
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
}

export const DriverHome = ({ driverProfile, onTabChange }: DriverHomeProps) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    todayCourses: 0,
    todayRevenue: 0,
    monthClients: 0,
    monthCourses: 0,
    monthCompleted: 0,
    monthRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (driverProfile?.driver?.id) {
      fetchStats();
    }
  }, [driverProfile?.driver?.id]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const today = new Date();
      const todayStart = startOfDay(today).toISOString();
      const todayEnd = endOfDay(today).toISOString();
      const monthStart = startOfMonth(today).toISOString();
      const monthEnd = endOfMonth(today).toISOString();

      const driverId = driverProfile?.driver?.id;
      if (!driverId) return;

      // Courses d'aujourd'hui
      const { data: todayCoursesData } = await supabase
        .from('courses')
        .select('id')
        .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`)
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd);

      // Revenue d'aujourd'hui
      const { data: todayFactures } = await supabase
        .from('factures')
        .select('amount')
        .eq('driver_id', driverId)
        .eq('payment_status', 'paid')
        .gte('paid_at', todayStart)
        .lte('paid_at', todayEnd);

      // Clients du mois
      const { data: monthClientsData } = await supabase
        .from('clients')
        .select('id')
        .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`)
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd);

      // Courses du mois
      const { data: monthCoursesData } = await supabase
        .from('courses')
        .select('id')
        .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`)
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd);

      // Courses terminées du mois
      const { data: monthCompletedData } = await supabase
        .from('courses')
        .select('id')
        .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`)
        .eq('status', 'completed')
        .gte('updated_at', monthStart)
        .lte('updated_at', monthEnd);

      // CA total du mois
      const { data: monthFactures } = await supabase
        .from('factures')
        .select('amount')
        .eq('driver_id', driverId)
        .eq('payment_status', 'paid')
        .gte('paid_at', monthStart)
        .lte('paid_at', monthEnd);

      const todayRevenue = todayFactures?.reduce((sum, f) => sum + Number(f.amount), 0) || 0;
      const monthRevenue = monthFactures?.reduce((sum, f) => sum + Number(f.amount), 0) || 0;

      setStats({
        todayCourses: todayCoursesData?.length || 0,
        todayRevenue: todayRevenue,
        monthClients: monthClientsData?.length || 0,
        monthCourses: monthCoursesData?.length || 0,
        monthCompleted: monthCompletedData?.length || 0,
        monthRevenue: monthRevenue,
      });
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Welcome Header */}
      <div className="text-center sm:text-left animate-fade-in">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-white">
          Bonjour, {driverProfile?.full_name || 'Chauffeur'} ✨
        </h1>
        <p className="text-gray-300">Voici un aperçu de votre activité</p>
      </div>

      {/* Accès Rapide */}
      <div className="animate-fade-in">
        <h2 className="text-lg sm:text-xl font-bold mb-4 text-white">Accès Rapide</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Nouvelle Course */}
          <Card 
            className="p-6 sm:p-8 bg-gradient-success hover:shadow-success hover:scale-[1.02] transition-all cursor-pointer border-0 group"
            onClick={() => navigate("/driver/create-course")}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-1">Nouvelle Course</h3>
                <p className="text-sm text-white/80">Créer pour un client</p>
              </div>
            </div>
          </Card>

          {/* Mon QR Code */}
          <Card 
            className="p-6 sm:p-8 bg-gradient-independence hover:shadow-premium hover:scale-[1.02] transition-all cursor-pointer border-0 group"
            onClick={() => onTabChange("qrcode")}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <QrCode className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white">Mon QR Code</h3>
              </div>
            </div>
          </Card>

          {/* Calculatrice */}
          <Card 
            className="p-6 sm:p-8 bg-gradient-renewal hover:shadow-trust hover:scale-[1.02] transition-all cursor-pointer border-0 group"
            onClick={() => onTabChange("calculator")}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Calculator className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white">Calculatrice</h3>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Aujourd'hui */}
      <div className="animate-fade-in">
        <h2 className="text-lg sm:text-xl font-bold mb-4 text-white">Aujourd'hui</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {/* Courses */}
          <Card className="p-6 bg-gradient-trust hover:shadow-trust transition-all border-0">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Car className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/80 mb-1">Courses</p>
                <h3 className="text-3xl sm:text-4xl font-bold text-white truncate">
                  {loading ? "..." : stats.todayCourses}
                </h3>
              </div>
            </div>
          </Card>

          {/* Revenue */}
          <Card className="p-6 bg-gradient-premium hover:shadow-premium transition-all border-0">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/80 mb-1">Revenus</p>
                <h3 className="text-3xl sm:text-4xl font-bold text-white truncate">
                  {loading ? "..." : `${stats.todayRevenue.toFixed(0)}€`}
                </h3>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Ce mois */}
      <div className="animate-fade-in">
        <h2 className="text-lg sm:text-xl font-bold mb-4 text-white">Ce mois</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {/* Clients */}
          <Card className="p-4 sm:p-6 bg-gradient-freedom hover:shadow-success transition-all border-0">
            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white">
                  {loading ? "..." : stats.monthClients}
                </h3>
                <p className="text-xs sm:text-sm text-white/80 mt-1">Clients</p>
              </div>
            </div>
          </Card>

          {/* Courses */}
          <Card className="p-4 sm:p-6 bg-gradient-independence hover:shadow-trust transition-all border-0">
            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Car className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white">
                  {loading ? "..." : stats.monthCourses}
                </h3>
                <p className="text-xs sm:text-sm text-white/80 mt-1">Courses</p>
              </div>
            </div>
          </Card>

          {/* Terminées */}
          <Card className="p-4 sm:p-6 bg-gradient-renewal hover:shadow-premium transition-all border-0">
            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white">
                  {loading ? "..." : stats.monthCompleted}
                </h3>
                <p className="text-xs sm:text-sm text-white/80 mt-1">Terminées</p>
              </div>
            </div>
          </Card>

          {/* CA Total */}
          <Card className="p-4 sm:p-6 bg-gradient-success hover:shadow-success transition-all border-0">
            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white truncate w-full">
                  {loading ? "..." : `${stats.monthRevenue.toFixed(0)}€`}
                </h3>
                <p className="text-xs sm:text-sm text-white/80 mt-1">CA Total</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
