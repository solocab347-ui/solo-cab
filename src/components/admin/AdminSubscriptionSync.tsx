import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Loader2,
  Link2,
  Link2Off,
  ShieldCheck,
  ShieldAlert,
  ExternalLink
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface DriverSyncStatus {
  id: string;
  email: string;
  full_name: string;
  status: string | null;
  validation_date: string | null;
  stripe_customer_id: string | null;
  subscription_stripe_id: string | null;
  subscription_status: string | null;
  subscription_paid: boolean | null;
  is_legacy_stripe: boolean | null;
  migration_required: boolean | null;
  migrated_at: string | null;
  syncStatus: 'synced' | 'desync' | 'no_stripe' | 'incomplete' | 'legacy_pending';
  syncDetails: string;
}

interface SyncStats {
  total: number;
  synced: number;
  desync: number;
  noStripe: number;
  incomplete: number;
  legacyPending: number;
}

const AdminSubscriptionSync = () => {
  const [drivers, setDrivers] = useState<DriverSyncStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    fetchSyncStatus();
  }, []);

  const fetchSyncStatus = async () => {
    setLoading(true);
    try {
      // Récupérer tous les chauffeurs avec abonnement potentiel
      const { data, error } = await supabase
        .from("drivers")
        .select(`
          id,
          status,
          validation_date,
          stripe_customer_id,
          subscription_stripe_id,
          subscription_status,
          subscription_paid,
          is_legacy_stripe,
          migration_required,
          migrated_at,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq("is_demo_account", false)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const driverStatuses: DriverSyncStatus[] = (data || [])
        .filter(d => d.profiles)
        .map(d => {
          const profile = d.profiles as { full_name: string; email: string };
          let syncStatus: 'synced' | 'desync' | 'no_stripe' | 'incomplete' | 'legacy_pending';
          let syncDetails = "";

          // Vérifier d'abord si c'est un chauffeur legacy en attente de migration
          if (d.is_legacy_stripe && d.migration_required && !d.migrated_at) {
            syncStatus = 'legacy_pending';
            syncDetails = "⚠️ Migration requise - Ancien compte Stripe";
          } else if (!d.stripe_customer_id && !d.subscription_stripe_id) {
            // Pas de lien Stripe du tout
            if (d.status === 'pending' || d.status === 'on_hold') {
              syncStatus = 'incomplete';
              syncDetails = "Inscription en cours, pas encore de paiement Stripe";
            } else if (d.validation_date && !d.subscription_paid) {
              syncStatus = 'no_stripe';
              syncDetails = "Compte validé mais aucun abonnement Stripe";
            } else {
              syncStatus = 'no_stripe';
              syncDetails = "Aucune donnée Stripe";
            }
          } else if (d.stripe_customer_id && !d.subscription_stripe_id) {
            // Customer Stripe mais pas de subscription_stripe_id
            syncStatus = 'desync';
            syncDetails = "Client Stripe créé mais abonnement non lié";
          } else if (d.subscription_stripe_id) {
            // Subscription ID présent
            if (d.subscription_status === 'trialing' || d.subscription_status === 'active') {
              if (d.subscription_paid) {
                syncStatus = 'synced';
                syncDetails = `Synchronisé - ${d.subscription_status === 'trialing' ? 'Essai' : 'Actif'}`;
              } else {
                syncStatus = 'desync';
                syncDetails = "Abonnement actif mais subscription_paid=false";
              }
            } else if (d.subscription_status === 'past_due') {
              syncStatus = 'synced';
              syncDetails = "Synchronisé - Paiement en retard";
            } else if (d.subscription_status === 'canceled') {
              syncStatus = 'synced';
              syncDetails = "Synchronisé - Résilié";
            } else {
              syncStatus = 'desync';
              syncDetails = `Statut inattendu: ${d.subscription_status || 'null'}`;
            }
          } else {
            syncStatus = 'incomplete';
            syncDetails = "État indéterminé";
          }

          return {
            id: d.id,
            email: profile.email,
            full_name: profile.full_name,
            status: d.status,
            validation_date: d.validation_date,
            stripe_customer_id: d.stripe_customer_id,
            subscription_stripe_id: d.subscription_stripe_id,
            subscription_status: d.subscription_status,
            subscription_paid: d.subscription_paid,
            is_legacy_stripe: d.is_legacy_stripe,
            migration_required: d.migration_required,
            migrated_at: d.migrated_at,
            syncStatus,
            syncDetails,
          };
        });

      setDrivers(driverStatuses);

      // Calculer les stats
      const newStats: SyncStats = {
        total: driverStatuses.length,
        synced: driverStatuses.filter(d => d.syncStatus === 'synced').length,
        desync: driverStatuses.filter(d => d.syncStatus === 'desync').length,
        noStripe: driverStatuses.filter(d => d.syncStatus === 'no_stripe').length,
        incomplete: driverStatuses.filter(d => d.syncStatus === 'incomplete').length,
        legacyPending: driverStatuses.filter(d => d.syncStatus === 'legacy_pending').length,
      };
      setStats(newStats);

    } catch (error: any) {
      console.error("Error fetching sync status:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const filteredDrivers = drivers.filter(d => {
    if (filterStatus === 'all') return true;
    return d.syncStatus === filterStatus;
  });

  const getSyncBadge = (status: 'synced' | 'desync' | 'no_stripe' | 'incomplete' | 'legacy_pending') => {
    switch (status) {
      case 'synced':
        return (
          <Badge className="bg-emerald-500 text-xs">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Synchronisé
          </Badge>
        );
      case 'desync':
        return (
          <Badge className="bg-amber-500 text-xs">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Désynchronisé
          </Badge>
        );
      case 'legacy_pending':
        return (
          <Badge className="bg-orange-500 text-xs">
            <RefreshCw className="w-3 h-3 mr-1" />
            Migration requise
          </Badge>
        );
      case 'no_stripe':
        return (
          <Badge variant="secondary" className="text-xs">
            <Link2Off className="w-3 h-3 mr-1" />
            Pas de Stripe
          </Badge>
        );
      case 'incomplete':
        return (
          <Badge variant="outline" className="text-xs">
            <XCircle className="w-3 h-3 mr-1" />
            Incomplet
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">État de Synchronisation Stripe</h2>
              <p className="text-sm text-muted-foreground">
                Vérification de la cohérence BDD ↔ Stripe
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchSyncStatus}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Alerte si chauffeurs legacy en attente de migration */}
        {stats && stats.legacyPending > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
            <div className="flex items-start gap-2">
              <RefreshCw className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-orange-700 dark:text-orange-400">
                  {stats.legacyPending} chauffeur(s) en attente de migration Stripe
                </p>
                <p className="text-sm text-orange-600 dark:text-orange-300">
                  Ces chauffeurs étaient enregistrés sur l'ancien compte Stripe. 
                  À la fin de leur période d'essai, ils devront re-souscrire avec leurs informations bancaires.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Alerte si désynchronisations */}
        {stats && stats.desync > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-700 dark:text-amber-400">
                  {stats.desync} compte(s) désynchronisé(s) détecté(s)
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-300">
                  Ces comptes ont un abonnement Stripe mais la base de données n'est pas à jour. 
                  Les paiements post-essai pourraient ne pas être correctement enregistrés.
                </p>
              </div>
            </div>
          </div>
        )}

        {stats && stats.desync === 0 && stats.synced > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <p className="font-medium text-emerald-700 dark:text-emerald-400">
                Tous les abonnements sont correctement synchronisés
              </p>
            </div>
          </div>
        )}

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
          <Card 
            className={`p-3 cursor-pointer transition-all ${filterStatus === 'synced' ? 'ring-2 ring-emerald-500' : ''}`}
            onClick={() => setFilterStatus(filterStatus === 'synced' ? 'all' : 'synced')}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <div>
                <p className="text-lg font-bold">{stats?.synced}</p>
                <p className="text-xs text-muted-foreground">Synchronisés</p>
              </div>
            </div>
          </Card>
          <Card 
            className={`p-3 cursor-pointer transition-all ${filterStatus === 'desync' ? 'ring-2 ring-amber-500' : ''}`}
            onClick={() => setFilterStatus(filterStatus === 'desync' ? 'all' : 'desync')}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <div>
                <p className="text-lg font-bold">{stats?.desync}</p>
                <p className="text-xs text-muted-foreground">Désynchronisés</p>
              </div>
            </div>
          </Card>
          <Card 
            className={`p-3 cursor-pointer transition-all ${filterStatus === 'no_stripe' ? 'ring-2 ring-muted-foreground' : ''}`}
            onClick={() => setFilterStatus(filterStatus === 'no_stripe' ? 'all' : 'no_stripe')}
          >
            <div className="flex items-center gap-2">
              <Link2Off className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-lg font-bold">{stats?.noStripe}</p>
                <p className="text-xs text-muted-foreground">Sans Stripe</p>
              </div>
            </div>
          </Card>
          <Card 
            className={`p-3 cursor-pointer transition-all ${filterStatus === 'incomplete' ? 'ring-2 ring-gray-400' : ''}`}
            onClick={() => setFilterStatus(filterStatus === 'incomplete' ? 'all' : 'incomplete')}
          >
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-lg font-bold">{stats?.incomplete}</p>
                <p className="text-xs text-muted-foreground">Incomplets</p>
              </div>
            </div>
          </Card>
          <Card 
            className={`p-3 cursor-pointer transition-all ${filterStatus === 'legacy_pending' ? 'ring-2 ring-orange-500' : ''}`}
            onClick={() => setFilterStatus(filterStatus === 'legacy_pending' ? 'all' : 'legacy_pending')}
          >
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-orange-500" />
              <div>
                <p className="text-lg font-bold">{stats?.legacyPending}</p>
                <p className="text-xs text-muted-foreground">Migration</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Liste des chauffeurs */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {filteredDrivers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun chauffeur dans cette catégorie
            </div>
          ) : (
            filteredDrivers.map((driver) => (
              <Card key={driver.id} className="p-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{driver.full_name}</p>
                      {getSyncBadge(driver.syncStatus)}
                      {driver.validation_date && (
                        <Badge variant="outline" className="text-xs">
                          <ShieldCheck className="w-3 h-3 mr-1" />
                          Validé
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{driver.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">{driver.syncDetails}</p>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1 text-xs">
                    {driver.stripe_customer_id && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <span className="font-mono">{driver.stripe_customer_id.substring(0, 15)}...</span>
                      </div>
                    )}
                    {driver.subscription_stripe_id && (
                      <div className="flex items-center gap-1 text-emerald-600">
                        <Link2 className="w-3 h-3" />
                        <span className="font-mono">{driver.subscription_stripe_id.substring(0, 15)}...</span>
                      </div>
                    )}
                    {driver.subscription_status && (
                      <span className={`font-medium ${
                        driver.subscription_status === 'active' ? 'text-emerald-600' :
                        driver.subscription_status === 'trialing' ? 'text-sky-600' :
                        driver.subscription_status === 'past_due' ? 'text-amber-600' :
                        'text-muted-foreground'
                      }`}>
                        {driver.subscription_status}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </Card>

      {/* Section recommandations */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">⚠️ Risques post-période d'essai</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>Si désynchronisé:</strong> Le webhook Stripe ne pourra pas mettre à jour la base de données 
            car il utilise les métadonnées de l'abonnement pour trouver le chauffeur.
          </p>
          <p>
            <strong>Conséquence:</strong> Même si Stripe prélève correctement, <code>subscription_paid</code> 
            restera <code>false</code> et le chauffeur sera bloqué.
          </p>
          <p>
            <strong>Solution:</strong> Pour les comptes désynchronisés, vérifier dans le dashboard Stripe 
            que les métadonnées de l'abonnement contiennent bien <code>driver_id</code>.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default AdminSubscriptionSync;
