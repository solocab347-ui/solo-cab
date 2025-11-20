import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Users, Car, MapPin, Clock, CheckCircle2, XCircle, Euro } from "lucide-react";
import { startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

interface DriverStatisticsProps {
  driverProfile: any;
}

interface Stats {
  // Clients
  totalClients: number;
  exclusiveClients: number;
  freeClients: number;
  
  // Courses
  totalCourses: number;
  completedCourses: number;
  cancelledCourses: number;
  pendingCourses: number;
  
  // Distances & Durée
  totalDistance: number;
  totalDuration: number;
  
  // Revenus
  totalRevenue: number;
  monthRevenue: number;
  yearRevenue: number;
  
  // Devis
  totalDevis: number;
  acceptedDevis: number;
  rejectedDevis: number;
  pendingDevis: number;
}

export const DriverStatistics = ({ driverProfile }: DriverStatisticsProps) => {
  const [stats, setStats] = useState<Stats>({
    totalClients: 0,
    exclusiveClients: 0,
    freeClients: 0,
    totalCourses: 0,
    completedCourses: 0,
    cancelledCourses: 0,
    pendingCourses: 0,
    totalDistance: 0,
    totalDuration: 0,
    totalRevenue: 0,
    monthRevenue: 0,
    yearRevenue: 0,
    totalDevis: 0,
    acceptedDevis: 0,
    rejectedDevis: 0,
    pendingDevis: 0,
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
      const driverId = driverProfile?.driver?.id;
      if (!driverId) return;

      const today = new Date();
      const monthStart = startOfMonth(today).toISOString();
      const monthEnd = endOfMonth(today).toISOString();
      const yearStart = startOfYear(today).toISOString();
      const yearEnd = endOfYear(today).toISOString();

      // Clients stats
      const { data: allClients } = await supabase
        .from('clients')
        .select('is_exclusive')
        .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`);

      const exclusiveCount = allClients?.filter(c => c.is_exclusive).length || 0;
      const freeCount = allClients?.filter(c => !c.is_exclusive).length || 0;

      // Courses stats
      const { data: allCourses } = await supabase
        .from('courses')
        .select('status, distance_km, duration_minutes')
        .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`);

      const completedCount = allCourses?.filter(c => c.status === 'completed').length || 0;
      const cancelledCount = allCourses?.filter(c => c.status === 'cancelled').length || 0;
      const pendingCount = allCourses?.filter(c => c.status === 'pending').length || 0;

      const totalDistance = allCourses?.reduce((sum, c) => sum + (Number(c.distance_km) || 0), 0) || 0;
      const totalDuration = allCourses?.reduce((sum, c) => sum + (Number(c.duration_minutes) || 0), 0) || 0;

      // Revenue stats
      const { data: allFactures } = await supabase
        .from('factures')
        .select('amount, paid_at')
        .eq('driver_id', driverId)
        .eq('payment_status', 'paid');

      const totalRevenue = allFactures?.reduce((sum, f) => sum + Number(f.amount), 0) || 0;

      const monthFactures = allFactures?.filter(f => {
        const paidAt = new Date(f.paid_at!);
        return paidAt >= new Date(monthStart) && paidAt <= new Date(monthEnd);
      });
      const monthRevenue = monthFactures?.reduce((sum, f) => sum + Number(f.amount), 0) || 0;

      const yearFactures = allFactures?.filter(f => {
        const paidAt = new Date(f.paid_at!);
        return paidAt >= new Date(yearStart) && paidAt <= new Date(yearEnd);
      });
      const yearRevenue = yearFactures?.reduce((sum, f) => sum + Number(f.amount), 0) || 0;

      // Devis stats
      const { data: allDevis } = await supabase
        .from('devis')
        .select('status')
        .eq('driver_id', driverId);

      const acceptedDevis = allDevis?.filter(d => d.status === 'accepted').length || 0;
      const rejectedDevis = allDevis?.filter(d => d.status === 'rejected').length || 0;
      const pendingDevis = allDevis?.filter(d => d.status === 'pending').length || 0;

      setStats({
        totalClients: (allClients?.length || 0),
        exclusiveClients: exclusiveCount,
        freeClients: freeCount,
        totalCourses: (allCourses?.length || 0),
        completedCourses: completedCount,
        cancelledCourses: cancelledCount,
        pendingCourses: pendingCount,
        totalDistance: totalDistance,
        totalDuration: totalDuration,
        totalRevenue: totalRevenue,
        monthRevenue: monthRevenue,
        yearRevenue: yearRevenue,
        totalDevis: (allDevis?.length || 0),
        acceptedDevis: acceptedDevis,
        rejectedDevis: rejectedDevis,
        pendingDevis: pendingDevis,
      });
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Chargement des statistiques...</div>;
  }

  return (
    <div className="space-y-6 p-4">
      {/* Clients */}
      <div>
        <h2 className="text-xl font-bold mb-4">📊 Clients</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 bg-gradient-trust border-0">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-trust-foreground/10 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-trust-foreground" />
              </div>
              <div>
                <p className="text-sm text-trust-foreground/80">Total Clients</p>
                <h3 className="text-3xl font-bold text-trust-foreground">{stats.totalClients}</h3>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-magenta border-0">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-magenta-foreground/10 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-magenta-foreground" />
              </div>
              <div>
                <p className="text-sm text-magenta-foreground/80">Clients Exclusifs</p>
                <h3 className="text-3xl font-bold text-magenta-foreground">{stats.exclusiveClients}</h3>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-success border-0">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-success-foreground/10 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-success-foreground" />
              </div>
              <div>
                <p className="text-sm text-success-foreground/80">Clients Libres</p>
                <h3 className="text-3xl font-bold text-success-foreground">{stats.freeClients}</h3>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Courses */}
      <div>
        <h2 className="text-xl font-bold mb-4">🚗 Courses</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6 bg-gradient-trust border-0">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-trust-foreground/10 rounded-lg flex items-center justify-center">
                <Car className="w-6 h-6 text-trust-foreground" />
              </div>
              <div>
                <p className="text-sm text-trust-foreground/80">Total</p>
                <h3 className="text-3xl font-bold text-trust-foreground">{stats.totalCourses}</h3>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-success border-0">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-success-foreground/10 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-success-foreground" />
              </div>
              <div>
                <p className="text-sm text-success-foreground/80">Terminées</p>
                <h3 className="text-3xl font-bold text-success-foreground">{stats.completedCourses}</h3>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-warning border-0">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-warning-foreground/10 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-warning-foreground" />
              </div>
              <div>
                <p className="text-sm text-warning-foreground/80">En attente</p>
                <h3 className="text-3xl font-bold text-warning-foreground">{stats.pendingCourses}</h3>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-brown border-0">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-brown-foreground/10 rounded-lg flex items-center justify-center">
                <XCircle className="w-6 h-6 text-brown-foreground" />
              </div>
              <div>
                <p className="text-sm text-brown-foreground/80">Annulées</p>
                <h3 className="text-3xl font-bold text-brown-foreground">{stats.cancelledCourses}</h3>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Distance & Durée */}
      <div>
        <h2 className="text-xl font-bold mb-4">📍 Distance & Temps</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6 bg-gradient-magenta border-0">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-magenta-foreground/10 rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-magenta-foreground" />
              </div>
              <div>
                <p className="text-sm text-magenta-foreground/80">Distance totale</p>
                <h3 className="text-3xl font-bold text-magenta-foreground">{stats.totalDistance.toFixed(0)} km</h3>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-brown border-0">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-brown-foreground/10 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-brown-foreground" />
              </div>
              <div>
                <p className="text-sm text-brown-foreground/80">Durée totale</p>
                <h3 className="text-3xl font-bold text-brown-foreground">{(stats.totalDuration / 60).toFixed(0)} h</h3>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Revenus */}
      <div>
        <h2 className="text-xl font-bold mb-4">💰 Chiffre d'Affaires</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 bg-gradient-success border-0">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-success-foreground/10 rounded-lg flex items-center justify-center">
                <Euro className="w-6 h-6 text-success-foreground" />
              </div>
              <div>
                <p className="text-sm text-success-foreground/80">Ce mois</p>
                <h3 className="text-3xl font-bold text-success-foreground">{stats.monthRevenue.toFixed(2)}€</h3>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-warning border-0">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-warning-foreground/10 rounded-lg flex items-center justify-center">
                <Euro className="w-6 h-6 text-warning-foreground" />
              </div>
              <div>
                <p className="text-sm text-warning-foreground/80">Cette année</p>
                <h3 className="text-3xl font-bold text-warning-foreground">{stats.yearRevenue.toFixed(2)}€</h3>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-trust border-0">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-trust-foreground/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-trust-foreground" />
              </div>
              <div>
                <p className="text-sm text-trust-foreground/80">Total</p>
                <h3 className="text-3xl font-bold text-trust-foreground">{stats.totalRevenue.toFixed(2)}€</h3>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Devis */}
      <div>
        <h2 className="text-xl font-bold mb-4">📋 Devis</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6 bg-gradient-trust border-0">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-trust-foreground/10 rounded-lg flex items-center justify-center">
                <Car className="w-6 h-6 text-trust-foreground" />
              </div>
              <div>
                <p className="text-sm text-trust-foreground/80">Total</p>
                <h3 className="text-3xl font-bold text-trust-foreground">{stats.totalDevis}</h3>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-success border-0">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-success-foreground/10 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-success-foreground" />
              </div>
              <div>
                <p className="text-sm text-success-foreground/80">Acceptés</p>
                <h3 className="text-3xl font-bold text-success-foreground">{stats.acceptedDevis}</h3>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-warning border-0">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-warning-foreground/10 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-warning-foreground" />
              </div>
              <div>
                <p className="text-sm text-warning-foreground/80">En attente</p>
                <h3 className="text-3xl font-bold text-warning-foreground">{stats.pendingDevis}</h3>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-brown border-0">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-brown-foreground/10 rounded-lg flex items-center justify-center">
                <XCircle className="w-6 h-6 text-brown-foreground" />
              </div>
              <div>
                <p className="text-sm text-brown-foreground/80">Refusés</p>
                <h3 className="text-3xl font-bold text-brown-foreground">{stats.rejectedDevis}</h3>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};