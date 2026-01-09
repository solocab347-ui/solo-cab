import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  FileText,
  User,
  Euro,
  Loader2,
  CheckCircle,
  Clock,
  AlertTriangle,
  Plus,
  PenTool,
  Info,
  Wallet,
  Calendar,
  Percent,
  Building2,
  Send,
  Check
} from "lucide-react";

interface FleetIndirectPaymentContractsProps {
  fleetManagerId: string;
}

interface IndirectContract {
  id: string;
  partnership_id: string;
  fleet_manager_id: string;
  driver_id: string;
  contract_type: string;
  commission_percentage: number;
  payment_frequency: string;
  payment_day: number | null;
  clauses: Record<string, any> | null;
  notes: string | null;
  fleet_manager_signed: boolean;
  fleet_manager_signed_at: string | null;
  driver_signed: boolean;
  driver_signed_at: string | null;
  contract_signed: boolean;
  contract_signed_at: string | null;
  status: string;
  total_collected_by_fleet: number;
  total_paid_to_driver: number;
  current_balance_owed_to_driver: number;
  last_settlement_date: string | null;
  created_at: string;
  driver?: {
    id: string;
    profile?: {
      full_name: string;
      profile_photo_url: string | null;
    };
  };
}

interface EligiblePartnership {
  id: string;
  driver_id: string;
  commission_percentage: number;
  driver?: {
    id: string;
    profile?: {
      full_name: string;
      profile_photo_url: string | null;
    };
  };
}

export const FleetIndirectPaymentContracts = ({ fleetManagerId }: FleetIndirectPaymentContractsProps) => {
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<IndirectContract[]>([]);
  const [eligiblePartnerships, setEligiblePartnerships] = useState<EligiblePartnership[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedPartnership, setSelectedPartnership] = useState<string>("");
  const [commissionPercentage, setCommissionPercentage] = useState("15");
  const [paymentFrequency, setPaymentFrequency] = useState("monthly");
  const [paymentDay, setPaymentDay] = useState("1");
  const [creating, setCreating] = useState(false);
  const [signing, setSigning] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [fleetManagerId]);

  const fetchData = async () => {
    try {
      // Fetch existing contracts
      const { data: contractsData, error: contractsError } = await supabase
        .from("fleet_indirect_payment_contracts")
        .select("*")
        .eq("fleet_manager_id", fleetManagerId)
        .order("created_at", { ascending: false });

      if (contractsError) throw contractsError;

      // Fetch eligible partnerships (active, signed, without indirect contract)
      const existingDriverIds = contractsData?.map(c => c.driver_id) || [];
      
      const { data: partnershipsData, error: partnershipsError } = await supabase
        .from("fleet_driver_partnerships")
        .select("id, driver_id, commission_percentage")
        .eq("fleet_manager_id", fleetManagerId)
        .eq("status", "accepted")
        .eq("contract_signed", true);

      if (partnershipsError) throw partnershipsError;

      // Filter out partnerships that already have a contract
      const eligibleData = (partnershipsData || []).filter(
        p => !existingDriverIds.includes(p.driver_id)
      );

      // Fetch driver info for both contracts and eligible partnerships
      const allDriverIds = [
        ...new Set([
          ...(contractsData?.map(c => c.driver_id) || []),
          ...eligibleData.map(p => p.driver_id)
        ])
      ];

      if (allDriverIds.length > 0) {
        const { data: drivers } = await supabase
          .from("drivers")
          .select("id, user_id")
          .in("id", allDriverIds);

        if (drivers) {
          const userIds = drivers.map(d => d.user_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, profile_photo_url")
            .in("id", userIds);

          // Enrich contracts
          const enrichedContracts = (contractsData || []).map(c => {
            const driver = drivers.find(d => d.id === c.driver_id);
            return {
              ...c,
              driver: {
                id: c.driver_id,
                profile: profiles?.find(p => p.id === driver?.user_id)
              }
            };
          });

          // Enrich eligible partnerships
          const enrichedPartnerships = eligibleData.map(p => {
            const driver = drivers.find(d => d.id === p.driver_id);
            return {
              ...p,
              driver: {
                id: p.driver_id,
                profile: profiles?.find(pr => pr.id === driver?.user_id)
              }
            };
          });

          setContracts(enrichedContracts);
          setEligiblePartnerships(enrichedPartnerships);
        }
      } else {
        setContracts([]);
        setEligiblePartnerships([]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContract = async () => {
    if (!selectedPartnership) return;

    setCreating(true);
    try {
      const partnership = eligiblePartnerships.find(p => p.id === selectedPartnership);
      if (!partnership) throw new Error("Partenariat non trouvé");

      const defaultClauses = {
        description: "Contrat de paiement indirect pour les courses entreprises",
        terms: [
          "Le gestionnaire encaisse les paiements des entreprises pour le compte du chauffeur",
          "Le gestionnaire prélève sa commission avant reversement",
          "Le chauffeur reçoit le solde selon la fréquence de paiement définie"
        ]
      };

      const { data, error } = await supabase
        .from("fleet_indirect_payment_contracts")
        .insert({
          partnership_id: selectedPartnership,
          fleet_manager_id: fleetManagerId,
          driver_id: partnership.driver_id,
          contract_type: "indirect_payment",
          commission_percentage: parseFloat(commissionPercentage),
          payment_frequency: paymentFrequency,
          payment_day: paymentFrequency !== "per_course" ? parseInt(paymentDay) : null,
          clauses: defaultClauses,
          status: "pending"
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Contrat créé avec succès");
      setCreateDialogOpen(false);
      setSelectedPartnership("");
      fetchData();
    } catch (error) {
      console.error("Error creating contract:", error);
      toast.error("Erreur lors de la création");
    } finally {
      setCreating(false);
    }
  };

  const handleSignContract = async (contractId: string) => {
    setSigning(contractId);
    try {
      const { error } = await supabase
        .from("fleet_indirect_payment_contracts")
        .update({
          fleet_manager_signed: true,
          fleet_manager_signed_at: new Date().toISOString()
        })
        .eq("id", contractId);

      if (error) throw error;

      // Check if both parties have signed
      const contract = contracts.find(c => c.id === contractId);
      if (contract?.driver_signed) {
        await supabase
          .from("fleet_indirect_payment_contracts")
          .update({
            contract_signed: true,
            contract_signed_at: new Date().toISOString(),
            status: "active"
          })
          .eq("id", contractId);
      }

      toast.success("Contrat signé");
      fetchData();
    } catch (error) {
      console.error("Error signing:", error);
      toast.error("Erreur lors de la signature");
    } finally {
      setSigning(null);
    }
  };

  const getStatusBadge = (contract: IndirectContract) => {
    switch (contract.status) {
      case "active":
        return <Badge className="bg-success">Actif</Badge>;
      case "pending":
        if (!contract.fleet_manager_signed) {
          return <Badge variant="outline" className="border-warning text-warning">À signer</Badge>;
        }
        return <Badge variant="outline" className="border-info text-info">En attente signature chauffeur</Badge>;
      case "suspended":
        return <Badge variant="destructive">Suspendu</Badge>;
      case "terminated":
        return <Badge variant="secondary">Résilié</Badge>;
      default:
        return <Badge variant="outline">{contract.status}</Badge>;
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case "per_course": return "Par course";
      case "weekly": return "Hebdomadaire";
      case "monthly": return "Mensuel";
      default: return frequency;
    }
  };

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
        <AlertTitle>Contrats de paiement indirect</AlertTitle>
        <AlertDescription className="space-y-2 mt-2">
          <p>
            Ces contrats définissent les modalités lorsque <strong>vous encaissez les paiements</strong> des 
            entreprises pour le compte de vos chauffeurs partenaires.
          </p>
          <p>
            Chaque contrat précise le taux de commission et la fréquence de reversement au chauffeur.
          </p>
        </AlertDescription>
      </Alert>

      {/* Bouton créer */}
      <div className="flex justify-between items-center">
        <h3 className="font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Contrats actifs ({contracts.filter(c => c.status === "active").length})
        </h3>
        
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" disabled={eligiblePartnerships.length === 0}>
              <Plus className="w-4 h-4" />
              Nouveau contrat
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Créer un contrat de paiement indirect</DialogTitle>
              <DialogDescription>
                Ce contrat s'applique aux courses où vous encaissez directement les paiements des entreprises.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Chauffeur partenaire</Label>
                <Select value={selectedPartnership} onValueChange={setSelectedPartnership}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un partenaire" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligiblePartnerships.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.driver?.profile?.full_name || "Chauffeur"} ({p.commission_percentage}% commission)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Percent className="w-4 h-4" />
                  Taux de commission (%)
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="50"
                  value={commissionPercentage}
                  onChange={(e) => setCommissionPercentage(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Commission prélevée sur les encaissements avant reversement
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Fréquence de reversement
                </Label>
                <Select value={paymentFrequency} onValueChange={setPaymentFrequency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_course">Après chaque course</SelectItem>
                    <SelectItem value="weekly">Hebdomadaire</SelectItem>
                    <SelectItem value="monthly">Mensuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentFrequency !== "per_course" && (
                <div className="space-y-2">
                  <Label>Jour de paiement</Label>
                  <Select value={paymentDay} onValueChange={setPaymentDay}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentFrequency === "weekly" ? (
                        <>
                          <SelectItem value="1">Lundi</SelectItem>
                          <SelectItem value="5">Vendredi</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="1">Le 1er du mois</SelectItem>
                          <SelectItem value="5">Le 5 du mois</SelectItem>
                          <SelectItem value="10">Le 10 du mois</SelectItem>
                          <SelectItem value="15">Le 15 du mois</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Separator />

              <Alert>
                <AlertDescription className="text-sm">
                  <strong>Clauses par défaut du contrat :</strong>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>Le gestionnaire encaisse les paiements des entreprises</li>
                    <li>Commission de {commissionPercentage}% prélevée avant reversement</li>
                    <li>Paiement {getFrequencyLabel(paymentFrequency).toLowerCase()}</li>
                    <li>Les deux parties doivent signer le contrat</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreateContract} disabled={!selectedPartnership || creating}>
                {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Créer le contrat
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Liste des contrats */}
      {contracts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">Aucun contrat de paiement indirect</p>
            {eligiblePartnerships.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {eligiblePartnerships.length} partenaire(s) éligible(s) pour un contrat
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {contracts.map((contract) => (
            <Card key={contract.id} className="hover:border-primary/30 transition-all">
              <CardContent className="pt-4">
                <div className="flex items-start gap-4">
                  <Avatar className="h-14 w-14 border-2 border-border">
                    <AvatarImage src={contract.driver?.profile?.profile_photo_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20">
                      {(contract.driver?.profile?.full_name || "C").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{contract.driver?.profile?.full_name || "Chauffeur"}</h4>
                        <p className="text-sm text-muted-foreground">
                          Contrat créé le {format(new Date(contract.created_at), "dd MMM yyyy", { locale: fr })}
                        </p>
                      </div>
                      {getStatusBadge(contract)}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">
                        <Percent className="w-3 h-3 mr-1" />
                        {contract.commission_percentage}% commission
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {getFrequencyLabel(contract.payment_frequency)}
                      </Badge>
                    </div>

                    {/* Balances */}
                    <div className="grid grid-cols-3 gap-2 p-3 bg-muted/30 rounded-lg">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Total encaissé</p>
                        <p className="font-semibold">{contract.total_collected_by_fleet.toFixed(2)} €</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Total reversé</p>
                        <p className="font-semibold text-success">{contract.total_paid_to_driver.toFixed(2)} €</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Solde dû</p>
                        <p className="font-semibold text-warning">{contract.current_balance_owed_to_driver.toFixed(2)} €</p>
                      </div>
                    </div>

                    {/* Signatures */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        {contract.fleet_manager_signed ? (
                          <CheckCircle className="w-4 h-4 text-success" />
                        ) : (
                          <Clock className="w-4 h-4 text-warning" />
                        )}
                        <span className={contract.fleet_manager_signed ? "text-success" : "text-muted-foreground"}>
                          Votre signature
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {contract.driver_signed ? (
                          <CheckCircle className="w-4 h-4 text-success" />
                        ) : (
                          <Clock className="w-4 h-4 text-warning" />
                        )}
                        <span className={contract.driver_signed ? "text-success" : "text-muted-foreground"}>
                          Signature chauffeur
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      {!contract.fleet_manager_signed && (
                        <Button 
                          size="sm" 
                          onClick={() => handleSignContract(contract.id)}
                          disabled={signing === contract.id}
                          className="gap-1"
                        >
                          {signing === contract.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <PenTool className="w-3 h-3" />
                          )}
                          Signer le contrat
                        </Button>
                      )}

                      {contract.status === "active" && contract.current_balance_owed_to_driver > 0 && (
                        <Button size="sm" variant="outline" className="gap-1 border-success text-success">
                          <Send className="w-3 h-3" />
                          Effectuer un versement
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
    </div>
  );
};
