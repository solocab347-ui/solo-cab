import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Wallet,
  Users,
  Calendar,
  AlertTriangle,
  Check,
  Clock,
  Euro,
  Loader2,
  TrendingUp,
  Car,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  XCircle,
  FileText
} from "lucide-react";
import { PartnershipContractDocument } from "./PartnershipContractDocument";

interface FleetPartnerCommissionsProps {
  fleetManagerId: string;
}

interface PartnerCommission {
  partnership_id: string;
  driver_id: string;
  driver_name: string;
  driver_photo: string | null;
  commission_percentage: number;
  payment_schedule: string;
  total_owed: number;
  total_paid: number;
  next_payment_date: string | null;
  partnership_suspended: boolean;
  fleet_manager_signed_at: string | null;
  driver_signed_at: string | null;
  created_at: string;
  // For contracts
  fleet_manager_name?: string;
  fleet_manager_company?: string;
}

export const FleetPartnerCommissions = ({ fleetManagerId }: FleetPartnerCommissionsProps) => {
  const [loading, setLoading] = useState(true);
  const [commissions, setCommissions] = useState<PartnerCommission[]>([]);
  const [fleetManagerInfo, setFleetManagerInfo] = useState<{ 
    name: string; 
    company: string;
    siret?: string;
    tvaNumber?: string;
    address?: string;
    phone?: string | null;
    email?: string | null;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"a_recevoir" | "a_payer">("a_recevoir");

  useEffect(() => {
    if (fleetManagerId) {
      fetchCommissions();
    }
  }, [fleetManagerId]);

  const fetchCommissions = async () => {
    setLoading(true);
    try {
      // Get fleet manager info
      const { data: fmData } = await supabase
        .from("fleet_managers")
        .select("company_name, contact_name, user_id, siret, tva_number, address, contact_phone, contact_email")
        .eq("id", fleetManagerId)
        .single();

      if (fmData) {
        // Get profile for name
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", fmData.user_id)
          .single();

        setFleetManagerInfo({
          name: profile?.full_name || fmData.contact_name,
          company: fmData.company_name,
          siret: fmData.siret || undefined,
          tvaNumber: fmData.tva_number || undefined,
          address: fmData.address || undefined,
          phone: fmData.contact_phone || undefined,
          email: fmData.contact_email || undefined
        });
      }

      // Get active partnerships with drivers
      const { data: partnerships, error } = await supabase
        .from("fleet_driver_partnerships")
        .select(`
          id,
          driver_id,
          commission_percentage,
          payment_schedule,
          total_owed,
          total_paid,
          next_payment_date,
          partnership_suspended,
          fleet_manager_signed_at,
          driver_signed_at,
          created_at
        `)
        .eq("fleet_manager_id", fleetManagerId)
        .eq("status", "accepted")
        .eq("contract_signed", true);

      if (error) throw error;

      if (partnerships && partnerships.length > 0) {
        // Get driver info
        const driverIds = partnerships.map(p => p.driver_id);
        const { data: drivers } = await supabase
          .from("drivers")
          .select("id, user_id")
          .in("id", driverIds);

        if (drivers) {
          const userIds = drivers.map(d => d.user_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, profile_photo_url")
            .in("id", userIds);

          const commissionsData: PartnerCommission[] = partnerships.map(p => {
            const driver = drivers.find(d => d.id === p.driver_id);
            const profile = profiles?.find(pr => pr.id === driver?.user_id);
            return {
              partnership_id: p.id,
              driver_id: p.driver_id,
              driver_name: profile?.full_name || "Chauffeur",
              driver_photo: profile?.profile_photo_url || null,
              commission_percentage: p.commission_percentage,
              payment_schedule: p.payment_schedule || "per_course",
              total_owed: p.total_owed || 0,
              total_paid: p.total_paid || 0,
              next_payment_date: p.next_payment_date,
              partnership_suspended: p.partnership_suspended || false,
              fleet_manager_signed_at: p.fleet_manager_signed_at,
              driver_signed_at: p.driver_signed_at,
              created_at: p.created_at
            };
          });
          setCommissions(commissionsData);
        }
      } else {
        setCommissions([]);
      }
    } catch (error) {
      console.error("Error fetching partner commissions:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (partnershipId: string, amount: number) => {
    try {
      // Update total_paid and reset total_owed
      const partnership = commissions.find(c => c.partnership_id === partnershipId);
      if (!partnership) return;

      const { error } = await supabase
        .from("fleet_driver_partnerships")
        .update({
          total_paid: (partnership.total_paid || 0) + amount,
          total_owed: 0,
          last_payment_date: new Date().toISOString()
        })
        .eq("id", partnershipId);

      if (error) throw error;

      toast.success("Paiement enregistré");
      fetchCommissions();
    } catch (error) {
      console.error("Error marking paid:", error);
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const getPaymentScheduleLabel = (schedule: string) => {
    switch (schedule) {
      case "per_course": return "Par course";
      case "weekly": return "Hebdomadaire";
      case "monthly": return "Mensuel";
      default: return schedule;
    }
  };

  const totalToReceive = commissions.reduce((sum, c) => sum + (c.total_owed || 0), 0);
  const totalReceived = commissions.reduce((sum, c) => sum + (c.total_paid || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Explications */}
      <Alert className="border-info/50 bg-info/10">
        <Info className="h-4 w-4" />
        <AlertTitle>Comment fonctionnent les commissions ?</AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <p>
            <strong>Chauffeurs indépendants :</strong> Ils encaissent directement 
            leurs clients et vous doivent un pourcentage (commission) sur chaque course.
          </p>
          <p>
            <strong>Partenaires avec matériel du gestionnaire :</strong> Si vous avez défini une commission, 
            elle sera également suivie ici.
          </p>
          <p>
            <strong>Suivi :</strong> Cette page vous permet de voir ce que chaque collaborateur vous doit, 
            d'enregistrer les paiements reçus, et d'accéder aux contrats de partenariat.
          </p>
        </AlertDescription>
      </Alert>

      {/* Résumé global */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-warning/20">
                <ArrowDownRight className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Commissions à recevoir</p>
                <p className="text-2xl font-bold">{totalToReceive.toFixed(2)} €</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-success/20">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total reçu</p>
                <p className="text-2xl font-bold">{totalReceived.toFixed(2)} €</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-info/10 to-info/5 border-info/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-info/20">
                <Users className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Partenaires actifs</p>
                <p className="text-2xl font-bold">{commissions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste par chauffeur partenaire */}
      <Card className="bg-card/50 backdrop-blur border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Euro className="w-5 h-5 text-primary" />
            Suivi des Commissions par Collaborateur
          </CardTitle>
          <CardDescription>
            Tous les partenaires (indépendants et avec matériel) avec commission définie
          </CardDescription>
        </CardHeader>
        <CardContent>
          {commissions.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">Aucun partenariat actif avec commission</p>
              <p className="text-sm text-muted-foreground mt-1">
                Proposez des partenariats aux chauffeurs indépendants dans l'onglet "Partenariats"
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {commissions.map((commission) => (
                <Card 
                  key={commission.partnership_id} 
                  className={`border-border/50 ${
                    commission.partnership_suspended ? "opacity-60 border-destructive/30" : ""
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-14 h-14 border-2 border-border">
                        <AvatarImage src={commission.driver_photo || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20">
                          {commission.driver_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">{commission.driver_name}</h3>
                          {commission.partnership_suspended && (
                            <Badge variant="destructive" className="text-xs">Suspendu</Badge>
                          )}
                        </div>
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
                            <p className="text-xs text-muted-foreground">À recevoir</p>
                            <p className="font-semibold text-warning">
                              {commission.total_owed.toFixed(2)} €
                            </p>
                          </div>
                          <div className="p-2 rounded bg-success/10 border border-success/20">
                            <p className="text-xs text-muted-foreground">Déjà reçu</p>
                            <p className="font-semibold text-success">
                              {commission.total_paid.toFixed(2)} €
                            </p>
                          </div>
                        </div>

                        {commission.next_payment_date && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            Prochain paiement: {format(new Date(commission.next_payment_date), "dd MMM yyyy", { locale: fr })}
                          </div>
                        )}

                        <Separator className="my-3" />

                        {/* Actions */}
                        <div className="flex items-center justify-between">
                          {/* Document de partenariat */}
                          {fleetManagerInfo && (
                            <PartnershipContractDocument
                              partnershipId={commission.partnership_id}
                              fleetManagerName={fleetManagerInfo.name}
                              fleetManagerCompany={fleetManagerInfo.company}
                              fleetManagerInfo={{
                                name: fleetManagerInfo.name,
                                company: fleetManagerInfo.company,
                                siret: fleetManagerInfo.siret,
                                tvaNumber: fleetManagerInfo.tvaNumber,
                                address: fleetManagerInfo.address,
                                phone: fleetManagerInfo.phone,
                                email: fleetManagerInfo.email
                              }}
                              driverName={commission.driver_name}
                              commissionPercentage={commission.commission_percentage}
                              paymentSchedule={commission.payment_schedule}
                              signedAt={commission.created_at}
                              fleetManagerSignedAt={commission.fleet_manager_signed_at || undefined}
                              driverSignedAt={commission.driver_signed_at || undefined}
                              contractType="partner"
                            />
                          )}

                          {/* Marquer comme payé */}
                          {commission.total_owed > 0 && (
                            <Button
                              size="sm"
                              onClick={() => handleMarkPaid(commission.partnership_id, commission.total_owed)}
                              className="gap-1"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              Marquer payé ({commission.total_owed.toFixed(2)}€)
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Note explicative */}
      <Alert className="border-muted">
        <FileText className="h-4 w-4" />
        <AlertDescription>
          <strong>Document de partenariat :</strong> Chaque partenariat génère un contrat que vous 
          et le chauffeur pouvez consulter et télécharger. Ce document fait foi des engagements 
          de chaque partie concernant les commissions et les délais de paiement.
        </AlertDescription>
      </Alert>
    </div>
  );
};
