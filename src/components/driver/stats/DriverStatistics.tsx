import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Users, Car, MapPin, Clock, CheckCircle2, XCircle, Euro, Filter, Calendar } from "lucide-react";
import { startOfMonth, endOfMonth, startOfYear, endOfYear, startOfWeek, endOfWeek, format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  
  // États pour les filtres avancés
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  useEffect(() => {
    if (driverProfile?.driver?.id) {
      fetchStats();
    }
  }, [driverProfile?.driver?.id, periodFilter, customStartDate, customEndDate]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const driverId = driverProfile?.driver?.id;
      if (!driverId) return;

      const today = new Date();
      let filterStart: string | null = null;
      let filterEnd: string | null = null;

      // Déterminer la période de filtrage
      switch (periodFilter) {
        case "today":
          filterStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
          filterEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();
          break;
        case "week":
          filterStart = startOfWeek(today).toISOString();
          filterEnd = endOfWeek(today).toISOString();
          break;
        case "month":
          filterStart = startOfMonth(today).toISOString();
          filterEnd = endOfMonth(today).toISOString();
          break;
        case "year":
          filterStart = startOfYear(today).toISOString();
          filterEnd = endOfYear(today).toISOString();
          break;
        case "custom":
          if (customStartDate && customEndDate) {
            filterStart = new Date(customStartDate).toISOString();
            filterEnd = new Date(customEndDate).toISOString();
          }
          break;
      }

      const monthStart = startOfMonth(today).toISOString();
      const monthEnd = endOfMonth(today).toISOString();
      const yearStart = startOfYear(today).toISOString();
      const yearEnd = endOfYear(today).toISOString();

      // Clients stats - avec filtre de période si applicable
      let clientsQuery = supabase
        .from('clients')
        .select('is_exclusive, created_at')
        .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`);

      if (filterStart && filterEnd) {
        clientsQuery = clientsQuery.gte('created_at', filterStart).lte('created_at', filterEnd);
      }

      const { data: allClients } = await clientsQuery;
      const exclusiveCount = allClients?.filter(c => c.is_exclusive).length || 0;
      const freeCount = allClients?.filter(c => !c.is_exclusive).length || 0;

      // Courses stats - avec filtre de période si applicable
      let coursesQuery = supabase
        .from('courses')
        .select('status, distance_km, duration_minutes, created_at')
        .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`);

      if (filterStart && filterEnd) {
        coursesQuery = coursesQuery.gte('created_at', filterStart).lte('created_at', filterEnd);
      }

      const { data: allCourses } = await coursesQuery;
      const completedCount = allCourses?.filter(c => c.status === 'completed').length || 0;
      const cancelledCount = allCourses?.filter(c => c.status === 'cancelled').length || 0;
      const pendingCount = allCourses?.filter(c => c.status === 'pending').length || 0;

      const completedCourses = allCourses?.filter(c => c.status === 'completed') || [];
      const totalDistance = completedCourses.reduce((sum, c) => sum + (Number(c.distance_km) || 0), 0);
      const totalDuration = completedCourses.reduce((sum, c) => sum + (Number(c.duration_minutes) || 0), 0);

      // Revenue stats - avec filtre de période si applicable
      let facturesQuery = supabase
        .from('factures')
        .select('amount, paid_at')
        .eq('driver_id', driverId)
        .eq('payment_status', 'paid');

      if (filterStart && filterEnd) {
        facturesQuery = facturesQuery.gte('paid_at', filterStart).lte('paid_at', filterEnd);
      }

      const { data: allFactures } = await facturesQuery;

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

  const handleApplyFilters = () => {
    if (periodFilter === 'custom' && (!customStartDate || !customEndDate)) {
      return;
    }
    fetchStats();
  };

  const handleResetFilters = () => {
    setPeriodFilter('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setShowAdvancedFilters(false);
  };

  if (loading) {
    return <div className="p-6 text-center">Chargement des statistiques...</div>;
  }

  return (
    <div className="space-y-6 p-4">
      {/* Filtres avancés */}
      <Card className="p-6 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold">Filtres de période</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          >
            {showAdvancedFilters ? 'Masquer' : 'Afficher'}
          </Button>
        </div>

        {showAdvancedFilters && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Période</Label>
                <Select value={periodFilter} onValueChange={setPeriodFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tout</SelectItem>
                    <SelectItem value="today">Aujourd'hui</SelectItem>
                    <SelectItem value="week">Cette semaine</SelectItem>
                    <SelectItem value="month">Ce mois</SelectItem>
                    <SelectItem value="year">Cette année</SelectItem>
                    <SelectItem value="custom">Personnalisée</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {periodFilter === 'custom' && (
                <>
                  <div className="space-y-2">
                    <Label>Date de début</Label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date de fin</Label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleApplyFilters} size="sm" className="gap-2">
                <Filter className="w-4 h-4" />
                Appliquer
              </Button>
              <Button onClick={handleResetFilters} variant="outline" size="sm">
                Réinitialiser
              </Button>
            </div>

            {periodFilter !== 'all' && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                <p className="text-sm text-primary">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  {periodFilter === 'custom' && customStartDate && customEndDate
                    ? `Du ${format(new Date(customStartDate), 'dd MMM yyyy', { locale: fr })} au ${format(new Date(customEndDate), 'dd MMM yyyy', { locale: fr })}`
                    : periodFilter === 'today' ? "Aujourd'hui"
                    : periodFilter === 'week' ? 'Cette semaine'
                    : periodFilter === 'month' ? 'Ce mois'
                    : 'Cette année'}
                </p>
              </div>
            )}
          </div>
        )}
      </Card>
      {/* Clients */}
      <div>
        <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">📊 Clients</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Card className="p-4 sm:p-6 bg-gradient-trust border-0">
            <div className="flex items-center sm:items-start gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-trust-foreground/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-trust-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-trust-foreground/80">Total Clients</p>
                <h3 className="text-2xl sm:text-3xl font-bold text-trust-foreground">{stats.totalClients}</h3>
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6 bg-gradient-magenta border-0">
            <div className="flex items-center sm:items-start gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-magenta-foreground/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-magenta-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-magenta-foreground/80">Exclusifs</p>
                <h3 className="text-2xl sm:text-3xl font-bold text-magenta-foreground">{stats.exclusiveClients}</h3>
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6 bg-gradient-success border-0">
            <div className="flex items-center sm:items-start gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-success-foreground/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-success-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-success-foreground/80">Libres</p>
                <h3 className="text-2xl sm:text-3xl font-bold text-success-foreground">{stats.freeClients}</h3>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Courses */}
      <div>
        <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">🚗 Courses</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <Card className="p-3 sm:p-6 bg-gradient-trust border-0">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4 text-center sm:text-left">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-trust-foreground/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Car className="w-4 h-4 sm:w-6 sm:h-6 text-trust-foreground" />
              </div>
              <div>
                <p className="text-[10px] sm:text-sm text-trust-foreground/80">Total</p>
                <h3 className="text-xl sm:text-3xl font-bold text-trust-foreground">{stats.totalCourses}</h3>
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-6 bg-gradient-success border-0">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4 text-center sm:text-left">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-success-foreground/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-4 h-4 sm:w-6 sm:h-6 text-success-foreground" />
              </div>
              <div>
                <p className="text-[10px] sm:text-sm text-success-foreground/80">Terminées</p>
                <h3 className="text-xl sm:text-3xl font-bold text-success-foreground">{stats.completedCourses}</h3>
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-6 bg-gradient-warning border-0">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4 text-center sm:text-left">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-warning-foreground/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-warning-foreground" />
              </div>
              <div>
                <p className="text-[10px] sm:text-sm text-warning-foreground/80">En attente</p>
                <h3 className="text-xl sm:text-3xl font-bold text-warning-foreground">{stats.pendingCourses}</h3>
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-6 bg-gradient-brown border-0">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4 text-center sm:text-left">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-brown-foreground/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <XCircle className="w-4 h-4 sm:w-6 sm:h-6 text-brown-foreground" />
              </div>
              <div>
                <p className="text-[10px] sm:text-sm text-brown-foreground/80">Annulées</p>
                <h3 className="text-xl sm:text-3xl font-bold text-brown-foreground">{stats.cancelledCourses}</h3>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Distance & Durée */}
      <div>
        <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">📍 Distance & Temps</h2>
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <Card className="p-3 sm:p-6 bg-gradient-magenta border-0">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4 text-center sm:text-left">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-magenta-foreground/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 sm:w-6 sm:h-6 text-magenta-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-sm text-magenta-foreground/80">Distance</p>
                <h3 className="text-lg sm:text-3xl font-bold text-magenta-foreground">{stats.totalDistance.toFixed(0)} <span className="text-sm">km</span></h3>
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-6 bg-gradient-brown border-0">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4 text-center sm:text-left">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-brown-foreground/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-brown-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-sm text-brown-foreground/80">Durée</p>
                <h3 className="text-lg sm:text-3xl font-bold text-brown-foreground">{(stats.totalDuration / 60).toFixed(0)} <span className="text-sm">h</span></h3>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Revenus */}
      <div>
        <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">💰 Chiffre d'Affaires</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
          <Card className="p-3 sm:p-6 bg-gradient-success border-0">
            <div className="flex items-center sm:items-start gap-3 sm:gap-4">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-success-foreground/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Euro className="w-4 h-4 sm:w-6 sm:h-6 text-success-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-sm text-success-foreground/80">Ce mois</p>
                <h3 className="text-lg sm:text-3xl font-bold text-success-foreground truncate">{stats.monthRevenue.toFixed(0)}€</h3>
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-6 bg-gradient-warning border-0">
            <div className="flex items-center sm:items-start gap-3 sm:gap-4">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-warning-foreground/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Euro className="w-4 h-4 sm:w-6 sm:h-6 text-warning-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-sm text-warning-foreground/80">Cette année</p>
                <h3 className="text-lg sm:text-3xl font-bold text-warning-foreground truncate">{stats.yearRevenue.toFixed(0)}€</h3>
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-6 bg-gradient-trust border-0">
            <div className="flex items-center sm:items-start gap-3 sm:gap-4">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-trust-foreground/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-trust-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-sm text-trust-foreground/80">Total</p>
                <h3 className="text-lg sm:text-3xl font-bold text-trust-foreground truncate">{stats.totalRevenue.toFixed(0)}€</h3>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Devis */}
      <div>
        <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">📋 Devis</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <Card className="p-3 sm:p-6 bg-gradient-trust border-0">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4 text-center sm:text-left">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-trust-foreground/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Car className="w-4 h-4 sm:w-6 sm:h-6 text-trust-foreground" />
              </div>
              <div>
                <p className="text-[10px] sm:text-sm text-trust-foreground/80">Total</p>
                <h3 className="text-xl sm:text-3xl font-bold text-trust-foreground">{stats.totalDevis}</h3>
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-6 bg-gradient-success border-0">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4 text-center sm:text-left">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-success-foreground/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-4 h-4 sm:w-6 sm:h-6 text-success-foreground" />
              </div>
              <div>
                <p className="text-[10px] sm:text-sm text-success-foreground/80">Acceptés</p>
                <h3 className="text-xl sm:text-3xl font-bold text-success-foreground">{stats.acceptedDevis}</h3>
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-6 bg-gradient-warning border-0">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4 text-center sm:text-left">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-warning-foreground/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-warning-foreground" />
              </div>
              <div>
                <p className="text-[10px] sm:text-sm text-warning-foreground/80">En attente</p>
                <h3 className="text-xl sm:text-3xl font-bold text-warning-foreground">{stats.pendingDevis}</h3>
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-6 bg-gradient-brown border-0">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4 text-center sm:text-left">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-brown-foreground/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <XCircle className="w-4 h-4 sm:w-6 sm:h-6 text-brown-foreground" />
              </div>
              <div>
                <p className="text-[10px] sm:text-sm text-brown-foreground/80">Refusés</p>
                <h3 className="text-xl sm:text-3xl font-bold text-brown-foreground">{stats.rejectedDevis}</h3>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};