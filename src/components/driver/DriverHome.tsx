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
    if (driverProfile?.id) {
      fetchStats();
    }
  }, [driverProfile?.id]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const today = new Date();
      const todayStart = startOfDay(today).toISOString();
      const todayEnd = endOfDay(today).toISOString();
      const monthStart = startOfMonth(today).toISOString();
      const monthEnd = endOfMonth(today).toISOString();

      // Courses d'aujourd'hui
      const { data: todayCoursesData } = await supabase
        .from('courses')
        .select('id')
        .eq('driver_id', driverProfile.id)
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd);

      // Revenue d'aujourd'hui (factures payées aujourd'hui)
      const { data: todayFactures } = await supabase
        .from('factures')
        .select('amount')
        .eq('driver_id', driverProfile.id)
        .eq('payment_status', 'paid')
        .gte('paid_at', todayStart)
        .lte('paid_at', todayEnd);

      // Clients du mois (nouveaux clients)
      const { data: monthClientsData } = await supabase
        .from('clients')
        .select('id')
        .or(`driver_id.eq.${driverProfile.id},driver_ids.cs.{${driverProfile.id}}`)
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd);

      // Courses du mois
      const { data: monthCoursesData } = await supabase
        .from('courses')
        .select('id')
        .eq('driver_id', driverProfile.id)
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd);

      // Courses terminées du mois
      const { data: monthCompletedData } = await supabase
        .from('courses')
        .select('id')
        .eq('driver_id', driverProfile.id)
        .eq('status', 'completed')
        .gte('updated_at', monthStart)
        .lte('updated_at', monthEnd);

      // CA total du mois (factures payées)
      const { data: monthFactures } = await supabase
        .from('factures')
        .select('amount')
        .eq('driver_id', driverProfile.id)
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
    <div className="space-y-8">
      {/* Accès Rapide */}
      <div>
        <h2 className="text-xl font-bold mb-4">Accès Rapide</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {/* Nouvelle Course */}
          <Card 
            className="p-8 bg-gradient-trust hover:shadow-elegant transition-all cursor-pointer border-0"
            onClick={() => navigate("/create-course")}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-trust-foreground/10 rounded-full flex items-center justify-center">
                <Plus className="w-8 h-8 text-trust-foreground" />
              </div>
              <h3 className="text-xl font-bold text-trust-foreground">Nouvelle Course</h3>
            </div>
          </Card>

          {/* Mon QR Code */}
          <Card 
            className="p-8 bg-gradient-magenta hover:shadow-elegant transition-all cursor-pointer border-0"
            onClick={() => onTabChange("qrcode")}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-magenta-foreground/10 rounded-full flex items-center justify-center">
                <QrCode className="w-8 h-8 text-magenta-foreground" />
              </div>
              <h3 className="text-xl font-bold text-magenta-foreground">Mon QR Code</h3>
            </div>
          </Card>

          {/* Calculatrice */}
          <Card 
            className="p-8 bg-gradient-brown hover:shadow-elegant transition-all cursor-pointer border-0"
            onClick={() => onTabChange("pricing")}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-brown-foreground/10 rounded-full flex items-center justify-center">
                <Calculator className="w-8 h-8 text-brown-foreground" />
              </div>
              <h3 className="text-xl font-bold text-brown-foreground">Calculatrice</h3>
            </div>
          </Card>
        </div>
      </div>

      {/* Aujourd'hui */}
      <div>
        <h2 className="text-xl font-bold mb-4">Aujourd'hui</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Courses */}
          <Card className="p-6 bg-gradient-trust hover:shadow-elegant transition-all border-0">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-trust-foreground/10 rounded-lg flex items-center justify-center">
                <Car className="w-6 h-6 text-trust-foreground" />
              </div>
              <div>
                <p className="text-sm text-trust-foreground/80 mb-1">Courses</p>
                <h3 className="text-4xl font-bold text-trust-foreground">
                  {loading ? "..." : stats.todayCourses}
                </h3>
              </div>
            </div>
          </Card>

          {/* Revenue */}
          <Card className="p-6 bg-gradient-warning hover:shadow-elegant transition-all border-0">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-warning-foreground/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-warning-foreground" />
              </div>
              <div>
                <p className="text-sm text-warning-foreground/80 mb-1">Revenue</p>
                <h3 className="text-4xl font-bold text-warning-foreground">
                  {loading ? "..." : `${stats.todayRevenue.toFixed(2)}€`}
                </h3>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Ce mois */}
      <div>
        <h2 className="text-xl font-bold mb-4">Ce mois</h2>
        <div className="grid md:grid-cols-4 gap-6">
          {/* Clients */}
          <Card className="p-6 bg-gradient-trust hover:shadow-elegant transition-all border-0">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-trust-foreground/10 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-trust-foreground" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-trust-foreground mb-1">
              {loading ? "..." : stats.monthClients}
            </h3>
            <p className="text-sm text-trust-foreground/80">Clients</p>
          </Card>

          {/* Courses */}
          <Card className="p-6 bg-gradient-success hover:shadow-elegant transition-all border-0">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-success-foreground/10 rounded-lg flex items-center justify-center">
                <Car className="w-5 h-5 text-success-foreground" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-success-foreground mb-1">
              {loading ? "..." : stats.monthCourses}
            </h3>
            <p className="text-sm text-success-foreground/80">Courses</p>
          </Card>

          {/* Terminées */}
          <Card className="p-6 bg-gradient-magenta hover:shadow-elegant transition-all border-0">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-magenta-foreground/10 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-magenta-foreground" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-magenta-foreground mb-1">
              {loading ? "..." : stats.monthCompleted}
            </h3>
            <p className="text-sm text-magenta-foreground/80">Terminées</p>
          </Card>

          {/* CA Total */}
          <Card className="p-6 bg-gradient-warning hover:shadow-elegant transition-all border-0">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-warning-foreground/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-warning-foreground" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-warning-foreground mb-1">
              {loading ? "..." : `${stats.monthRevenue.toFixed(2)}€`}
            </h3>
            <p className="text-sm text-warning-foreground/80">CA Total</p>
          </Card>
        </div>
      </div>
    </div>
  );
};
