import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Wallet,
  Building2,
  Calendar,
  AlertTriangle,
  Check,
  Clock,
  Euro,
  Loader2,
  CreditCard,
  History,
  TrendingUp,
  Bell
} from "lucide-react";

interface DriverFleetCommissionsProps {
  driverId: string;
}

interface FleetCommission {
  partnership_id: string;
  fleet_manager_id: string;
  fleet_manager_name: string;
  commission_percentage: number;
  payment_schedule: string;
  total_pending: number;
  total_paid: number;
  next_due_date: string | null;
  courses_count: number;
  logo_url?: string;
}

interface CommissionDetail {
  id: string;
  course_id: string;
  course_amount: number;
  commission_percentage: number;
  commission_amount: number;
  payment_status: string;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
}

export const DriverFleetCommissions = ({ driverId }: DriverFleetCommissionsProps) => {
  const [loading, setLoading] = useState(true);
  const [commissions, setCommissions] = useState<FleetCommission[]>([]);
  const [selectedFleet, setSelectedFleet] = useState<FleetCommission | null>(null);
  const [commissionDetails, setCommissionDetails] = useState<CommissionDetail[]>([]);
  const [selectedCommissions, setSelectedCommissions] = useState<string[]>([]);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [paying, setPaying] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (driverId) {
      fetchCommissions();
    }
  }, [driverId]);

  const fetchCommissions = async () => {
    setLoading(true);
    try {
      // Use the RPC function to get commission summaries
      const { data, error } = await supabase
        .rpc("calculate_driver_fleet_commissions", { _driver_id: driverId });

      if (error) throw error;

      // Fetch fleet manager logos
      if (data && data.length > 0) {
        const fleetIds = data.map((d: FleetCommission) => d.fleet_manager_id);
        const { data: fleets } = await supabase
          .from("fleet_managers")
          .select("id, logo_url")
          .in("id", fleetIds);

        const commissionsWithLogos = data.map((c: FleetCommission) => ({
          ...c,
          logo_url: fleets?.find(f => f.id === c.fleet_manager_id)?.logo_url
        }));
        setCommissions(commissionsWithLogos);
      } else {
        setCommissions([]);
      }
    } catch (error) {
      console.error("Error fetching commissions:", error);
      toast.error("Erreur lors du chargement des commissions");
    } finally {
      setLoading(false);
    }
  };

  const fetchCommissionDetails = async (partnershipId: string) => {
    setLoadingDetails(true);
    try {
      const { data, error } = await supabase
        .from("partnership_course_commissions")
        .select("*")
        .eq("partnership_id", partnershipId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCommissionDetails(data || []);
    } catch (error) {
      console.error("Error fetching commission details:", error);
      toast.error("Erreur lors du chargement des détails");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSelectFleet = (fleet: FleetCommission) => {
    setSelectedFleet(fleet);
    setSelectedCommissions([]);
    fetchCommissionDetails(fleet.partnership_id);
  };

  const toggleCommissionSelection = (id: string) => {
    setSelectedCommissions(prev => 
      prev.includes(id) 
        ? prev.filter(c => c !== id)
        : [...prev, id]
    );
  };

  const selectAllPending = () => {
    const pendingIds = commissionDetails
      .filter(c => c.payment_status === "pending")
      .map(c => c.id);
    setSelectedCommissions(pendingIds);
  };

  const handleMarkAsPaid = async () => {
    if (selectedCommissions.length === 0) return;
    setPaying(true);

    try {
      const { error } = await supabase
        .rpc("mark_commission_paid", { _commission_ids: selectedCommissions });

      if (error) throw error;

      toast.success("Commissions marquées comme payées");
      setShowPayDialog(false);
      setSelectedCommissions([]);
      fetchCommissions();
      if (selectedFleet) {
        fetchCommissionDetails(selectedFleet.partnership_id);
      }
    } catch (error) {
      console.error("Error marking as paid:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setPaying(false);
    }
  };

  const getPaymentScheduleLabel = (schedule: string) => {
    switch (schedule) {
      case "per_course": return "À chaque course";
      case "weekly": return "Hebdomadaire";
      case "monthly": return "Mensuel";
      default: return schedule;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-warning/20 text-warning border-warning/30">En attente</Badge>;
      case "paid":
        return <Badge variant="outline" className="bg-success/20 text-success border-success/30">Payé</Badge>;
      case "overdue":
        return <Badge variant="outline" className="bg-destructive/20 text-destructive border-destructive/30">En retard</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalOwed = commissions.reduce((sum, c) => sum + (c.total_pending || 0), 0);
  const selectedTotal = commissionDetails
    .filter(c => selectedCommissions.includes(c.id))
    .reduce((sum, c) => sum + c.commission_amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Avertissement */}
      <Alert className="bg-warning/10 border-warning/30">
        <AlertTriangle className="w-4 h-4 text-warning" />
        <AlertDescription className="text-sm">
          <strong>Important :</strong> Le non-respect des échéances de paiement peut entraîner 
          la suspension de votre compte et de vos partenariats. Assurez-vous de régler vos 
          commissions dans les délais convenus.
        </AlertDescription>
      </Alert>

      {/* Résumé global */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/20">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total à payer</p>
                <p className="text-2xl font-bold">{totalOwed.toFixed(2)} €</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-success/20">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total payé</p>
                <p className="text-2xl font-bold">
                  {commissions.reduce((sum, c) => sum + (c.total_paid || 0), 0).toFixed(2)} €
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-info/10 to-info/5 border-info/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-info/20">
                <Building2 className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Partenariats actifs</p>
                <p className="text-2xl font-bold">{commissions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste par gestionnaire */}
      <Card className="bg-card/50 backdrop-blur border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Euro className="w-5 h-5 text-primary" />
            Commissions par Gestionnaire
          </CardTitle>
          <CardDescription>
            Suivez et réglez vos commissions dues à chaque gestionnaire de flotte
          </CardDescription>
        </CardHeader>
        <CardContent>
          {commissions.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">Aucun partenariat avec commission active</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {commissions.map((commission) => (
                <Card 
                  key={commission.partnership_id} 
                  className={`border-border/50 cursor-pointer transition-all hover:border-primary/50 ${
                    selectedFleet?.partnership_id === commission.partnership_id 
                      ? "ring-2 ring-primary border-primary" 
                      : ""
                  }`}
                  onClick={() => handleSelectFleet(commission)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-14 h-14 border-2 border-border">
                        <AvatarImage src={commission.logo_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20">
                          {commission.fleet_manager_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{commission.fleet_manager_name}</h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {commission.commission_percentage}% commission
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {getPaymentScheduleLabel(commission.payment_schedule)}
                          </Badge>
                        </div>
                        
                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                          <div className="p-2 rounded bg-warning/10 border border-warning/20">
                            <p className="text-xs text-muted-foreground">À payer</p>
                            <p className="font-semibold text-warning">
                              {commission.total_pending.toFixed(2)} €
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {commission.courses_count} course(s)
                            </p>
                          </div>
                          <div className="p-2 rounded bg-success/10 border border-success/20">
                            <p className="text-xs text-muted-foreground">Déjà payé</p>
                            <p className="font-semibold text-success">
                              {commission.total_paid.toFixed(2)} €
                            </p>
                          </div>
                        </div>

                        {commission.next_due_date && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-warning">
                            <Bell className="w-3 h-3" />
                            Échéance: {format(new Date(commission.next_due_date), "dd MMM yyyy", { locale: fr })}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Détails des commissions sélectionnées */}
      {selectedFleet && (
        <Card className="bg-card/50 backdrop-blur border-white/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  Détails - {selectedFleet.fleet_manager_name}
                </CardTitle>
                <CardDescription>
                  Historique des commissions et paiements
                </CardDescription>
              </div>
              {selectedCommissions.length > 0 && (
                <Button onClick={() => setShowPayDialog(true)} className="gap-2">
                  <CreditCard className="w-4 h-4" />
                  Marquer comme payé ({selectedTotal.toFixed(2)} €)
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending" className="space-y-4">
              <TabsList>
                <TabsTrigger value="pending" className="gap-2">
                  <Clock className="w-4 h-4" />
                  En attente
                </TabsTrigger>
                <TabsTrigger value="paid" className="gap-2">
                  <Check className="w-4 h-4" />
                  Payées
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="space-y-3">
                {loadingDetails ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-muted-foreground">
                        {commissionDetails.filter(c => c.payment_status === "pending").length} commission(s) en attente
                      </p>
                      <Button variant="outline" size="sm" onClick={selectAllPending}>
                        Tout sélectionner
                      </Button>
                    </div>

                    {commissionDetails.filter(c => c.payment_status === "pending").map((detail) => (
                      <div
                        key={detail.id}
                        className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                          selectedCommissions.includes(detail.id)
                            ? "border-primary bg-primary/5"
                            : "border-border/50 hover:border-border"
                        }`}
                      >
                        <Checkbox
                          checked={selectedCommissions.includes(detail.id)}
                          onCheckedChange={() => toggleCommissionSelection(detail.id)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">
                                Course de {detail.course_amount.toFixed(2)} €
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(detail.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-warning">
                                {detail.commission_amount.toFixed(2)} €
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {detail.commission_percentage}%
                              </p>
                            </div>
                          </div>
                          {detail.due_date && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Échéance: {format(new Date(detail.due_date), "dd MMM yyyy", { locale: fr })}
                            </p>
                          )}
                        </div>
                        {getStatusBadge(detail.payment_status)}
                      </div>
                    ))}

                    {commissionDetails.filter(c => c.payment_status === "pending").length === 0 && (
                      <div className="text-center py-8">
                        <Check className="w-12 h-12 mx-auto mb-3 text-success/30" />
                        <p className="text-muted-foreground">Aucune commission en attente</p>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="paid" className="space-y-3">
                {commissionDetails.filter(c => c.payment_status === "paid").map((detail) => (
                  <div
                    key={detail.id}
                    className="flex items-center gap-4 p-3 rounded-lg border border-success/20 bg-success/5"
                  >
                    <Check className="w-5 h-5 text-success" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            Course de {detail.course_amount.toFixed(2)} €
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(detail.created_at), "dd MMM yyyy", { locale: fr })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-success">
                            {detail.commission_amount.toFixed(2)} €
                          </p>
                          {detail.paid_at && (
                            <p className="text-xs text-muted-foreground">
                              Payé le {format(new Date(detail.paid_at), "dd MMM", { locale: fr })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(detail.payment_status)}
                  </div>
                ))}

                {commissionDetails.filter(c => c.payment_status === "paid").length === 0 && (
                  <div className="text-center py-8">
                    <History className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-muted-foreground">Aucun paiement effectué</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Dialog de confirmation de paiement */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer le paiement</DialogTitle>
            <DialogDescription>
              Vous confirmez avoir effectué le paiement à {selectedFleet?.fleet_manager_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{selectedTotal.toFixed(2)} €</p>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedCommissions.length} commission(s) sélectionnée(s)
              </p>
            </div>
            
            <Alert className="mt-4 bg-info/10 border-info/30">
              <AlertDescription className="text-sm">
                En confirmant, vous attestez avoir effectué le paiement au gestionnaire de flotte.
                Cette action sera enregistrée et visible par les deux parties.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleMarkAsPaid} disabled={paying}>
              {paying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Confirmation...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Confirmer le paiement
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
