import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Plus, Handshake, CreditCard, Clock, CheckCircle, XCircle, AlertCircle, Eye, EyeOff, Car, Star, Settings } from "lucide-react";

interface CompanyDriverAgreementsProps {
  companyId: string;
}

const PAYMENT_METHODS = [
  { value: "card", label: "Carte bancaire", icon: "💳" },
  { value: "payment_link", label: "Lien de paiement", icon: "🔗" },
  { value: "cash", label: "Espèces", icon: "💵" },
  { value: "bank_transfer", label: "Virement bancaire", icon: "🏦" },
];

const PAYMENT_FREQUENCIES = [
  { value: "per_course", label: "À la course", description: "Paiement après chaque course" },
  { value: "weekly", label: "Hebdomadaire", description: "Paiement chaque semaine" },
  { value: "monthly", label: "Mensuel", description: "Paiement chaque mois" },
  { value: "mixed", label: "Mixte", description: "Selon l'accord" },
];

export function CompanyDriverAgreements({ companyId }: CompanyDriverAgreementsProps) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>(["card"]);
  const [paymentFrequency, setPaymentFrequency] = useState("per_course");
  const [paymentDay, setPaymentDay] = useState<number | undefined>();
  const [creditLimit, setCreditLimit] = useState(0);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [notes, setNotes] = useState("");
  const [selectedProposal, setSelectedProposal] = useState<any>(null);
  const [showProposalDetails, setShowProposalDetails] = useState(false);

  // Fetch company settings
  const { data: company } = useQuery({
    queryKey: ["company-settings", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("visible_to_drivers, accepting_proposals")
        .eq("id", companyId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Update visibility settings
  const updateVisibility = useMutation({
    mutationFn: async (settings: { visible_to_drivers?: boolean; accepting_proposals?: boolean }) => {
      const { error } = await supabase
        .from("companies")
        .update(settings)
        .eq("id", companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Paramètres mis à jour");
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    },
  });

  // Fetch existing agreements
  const { data: agreements, isLoading: loadingAgreements } = useQuery({
    queryKey: ["company-agreements", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_driver_agreements")
        .select(`
          *,
          driver:drivers(
            id,
            company_name,
            vehicle_model,
            vehicle_brand,
            rating,
            user_id
          )
        `)
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch driver profiles
      const driverUserIds = data?.map((a: any) => a.driver?.user_id).filter(Boolean) || [];
      if (driverUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, profile_photo_url")
          .in("id", driverUserIds);

        return data?.map((agreement: any) => ({
          ...agreement,
          driverProfile: profiles?.find((p: any) => p.id === agreement.driver?.user_id),
        }));
      }

      return data;
    },
  });

  // Search drivers
  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ["search-drivers-for-agreement", searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];

      const { data, error } = await supabase
        .from("drivers")
        .select(`
          id,
          company_name,
          vehicle_model,
          vehicle_brand,
          rating,
          user_id
        `)
        .eq("status", "validated")
        .eq("public_profile_enabled", true)
        .limit(10);

      if (error) throw error;

      // Get profiles
      const userIds = data?.map((d: any) => d.user_id) || [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, profile_photo_url")
        .in("id", userIds);

      // Filter by search term
      return data
        ?.map((driver: any) => ({
          ...driver,
          profile: profiles?.find((p: any) => p.id === driver.user_id),
        }))
        .filter((d: any) => 
          d.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    },
    enabled: searchTerm.length >= 2,
  });

  // Create agreement mutation
  const createAgreement = useMutation({
    mutationFn: async () => {
      if (!selectedDriver) throw new Error("Veuillez sélectionner un chauffeur");
      if (selectedPaymentMethods.length === 0) throw new Error("Veuillez sélectionner au moins un mode de paiement");

      const { error } = await supabase.from("company_driver_agreements").insert({
        company_id: companyId,
        driver_id: selectedDriver.id,
        payment_methods: selectedPaymentMethods,
        payment_frequency: paymentFrequency,
        payment_day: paymentDay,
        credit_limit: creditLimit,
        discount_percentage: discountPercentage,
        notes: notes || null,
        status: "pending",
        proposed_by: "company",
        company_signed: true,
        company_signed_at: new Date().toISOString(),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Proposition envoyée au chauffeur");
      queryClient.invalidateQueries({ queryKey: ["company-agreements"] });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de l'envoi");
    },
  });

  // Accept driver proposal - MUST be before any return statement
  const acceptProposal = useMutation({
    mutationFn: async (agreementId: string) => {
      const { error } = await supabase
        .from("company_driver_agreements")
        .update({
          status: "accepted",
          company_signed: true,
          company_signed_at: new Date().toISOString(),
          accepted_at: new Date().toISOString(),
        })
        .eq("id", agreementId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Partenariat accepté !");
      queryClient.invalidateQueries({ queryKey: ["company-agreements"] });
      setShowProposalDetails(false);
      setSelectedProposal(null);
    },
    onError: () => {
      toast.error("Erreur lors de l'acceptation");
    },
  });

  // Reject driver proposal - MUST be before any return statement
  const rejectProposal = useMutation({
    mutationFn: async (agreementId: string) => {
      const { error } = await supabase
        .from("company_driver_agreements")
        .update({
          status: "rejected",
          rejected_at: new Date().toISOString(),
        })
        .eq("id", agreementId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Proposition refusée");
      queryClient.invalidateQueries({ queryKey: ["company-agreements"] });
      setShowProposalDetails(false);
      setSelectedProposal(null);
    },
    onError: () => {
      toast.error("Erreur lors du refus");
    },
  });

  const resetForm = () => {
    setSelectedDriver(null);
    setSelectedPaymentMethods(["card"]);
    setPaymentFrequency("per_course");
    setPaymentDay(undefined);
    setCreditLimit(0);
    setDiscountPercentage(0);
    setNotes("");
    setSearchTerm("");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
      case "accepted":
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="w-3 h-3 mr-1" />Accepté</Badge>;
      case "rejected":
        return <Badge variant="outline" className="text-red-600 border-red-600"><XCircle className="w-3 h-3 mr-1" />Refusé</Badge>;
      case "suspended":
        return <Badge variant="outline" className="text-orange-600 border-orange-600"><AlertCircle className="w-3 h-3 mr-1" />Suspendu</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const togglePaymentMethod = (method: string) => {
    setSelectedPaymentMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    );
  };

  if (loadingAgreements) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Separate proposals from drivers (pending, proposed_by = 'driver')
  const driverProposals = agreements?.filter((a: any) => a.status === "pending" && a.proposed_by === "driver") || [];
  const companyProposals = agreements?.filter((a: any) => a.status === "pending" && a.proposed_by === "company") || [];
  const activeAgreements = agreements?.filter((a: any) => a.status === "accepted") || [];
  const otherAgreements = agreements?.filter((a: any) => !["pending", "accepted"].includes(a.status)) || [];

  return (
    <div className="space-y-6">
      {/* Visibility Settings */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-medium">Paramètres de visibilité</h3>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="flex items-center gap-2">
                  {company?.visible_to_drivers ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  Visible par les chauffeurs
                </Label>
                <p className="text-sm text-muted-foreground">
                  Les chauffeurs peuvent voir votre entreprise et vous proposer leurs services
                </p>
              </div>
              <Switch
                checked={company?.visible_to_drivers || false}
                onCheckedChange={(checked) => updateVisibility.mutate({ visible_to_drivers: checked })}
              />
            </div>
            {company?.visible_to_drivers && (
              <div className="flex items-center justify-between">
                <div>
                  <Label>Accepter les propositions</Label>
                  <p className="text-sm text-muted-foreground">
                    Permettre aux chauffeurs de vous envoyer des propositions de partenariat
                  </p>
                </div>
                <Switch
                  checked={company?.accepting_proposals || false}
                  onCheckedChange={(checked) => updateVisibility.mutate({ accepting_proposals: checked })}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Partenariats Chauffeurs</h2>
          <p className="text-sm text-muted-foreground">
            Gérez vos accords de paiement avec les chauffeurs
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau partenariat
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Handshake className="w-5 h-5" />
                Proposer un partenariat
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Driver Search */}
              <div className="space-y-2">
                <Label>Rechercher un chauffeur</Label>
                <Input
                  placeholder="Nom ou entreprise..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searching && <p className="text-sm text-muted-foreground">Recherche...</p>}
                {searchResults && searchResults.length > 0 && !selectedDriver && (
                  <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                    {searchResults.map((driver: any) => (
                      <div
                        key={driver.id}
                        className="p-3 hover:bg-muted cursor-pointer flex justify-between items-center"
                        onClick={() => {
                          setSelectedDriver(driver);
                          setSearchTerm("");
                        }}
                      >
                        <div>
                          <p className="font-medium">{driver.profile?.full_name || "Chauffeur"}</p>
                          <p className="text-sm text-muted-foreground">
                            {driver.company_name} • {driver.vehicle_brand} {driver.vehicle_model}
                          </p>
                        </div>
                        <Badge variant="outline">⭐ {driver.rating?.toFixed(1) || "N/A"}</Badge>
                      </div>
                    ))}
                  </div>
                )}
                {selectedDriver && (
                  <Card className="bg-primary/5 border-primary">
                    <CardContent className="p-4 flex justify-between items-center">
                      <div>
                        <p className="font-medium">{selectedDriver.profile?.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedDriver.company_name} • {selectedDriver.vehicle_brand} {selectedDriver.vehicle_model}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedDriver(null)}>
                        Changer
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Payment Methods */}
              <div className="space-y-2">
                <Label>Modes de paiement acceptés</Label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map((method) => (
                    <div
                      key={method.value}
                      className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedPaymentMethods.includes(method.value)
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => togglePaymentMethod(method.value)}
                    >
                      <Checkbox checked={selectedPaymentMethods.includes(method.value)} />
                      <span>{method.icon}</span>
                      <span className="text-sm">{method.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Frequency */}
              <div className="space-y-2">
                <Label>Fréquence de paiement</Label>
                <Select value={paymentFrequency} onValueChange={setPaymentFrequency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_FREQUENCIES.map((freq) => (
                      <SelectItem key={freq.value} value={freq.value}>
                        <div>
                          <span className="font-medium">{freq.label}</span>
                          <span className="text-muted-foreground ml-2">- {freq.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Day for weekly/monthly */}
              {(paymentFrequency === "weekly" || paymentFrequency === "monthly") && (
                <div className="space-y-2">
                  <Label>
                    {paymentFrequency === "weekly" ? "Jour de la semaine" : "Jour du mois"}
                  </Label>
                  <Select
                    value={paymentDay?.toString()}
                    onValueChange={(v) => setPaymentDay(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentFrequency === "weekly" ? (
                        <>
                          <SelectItem value="1">Lundi</SelectItem>
                          <SelectItem value="2">Mardi</SelectItem>
                          <SelectItem value="3">Mercredi</SelectItem>
                          <SelectItem value="4">Jeudi</SelectItem>
                          <SelectItem value="5">Vendredi</SelectItem>
                          <SelectItem value="6">Samedi</SelectItem>
                          <SelectItem value="7">Dimanche</SelectItem>
                        </>
                      ) : (
                        Array.from({ length: 28 }, (_, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>
                            {i + 1}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Credit Limit */}
              <div className="space-y-2">
                <Label>Limite de crédit (€)</Label>
                <Input
                  type="number"
                  min={0}
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(parseFloat(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Montant maximum que l'entreprise peut accumuler avant paiement
                </p>
              </div>

              {/* Discount */}
              <div className="space-y-2">
                <Label>Remise accordée (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={50}
                  value={discountPercentage}
                  onChange={(e) => setDiscountPercentage(parseFloat(e.target.value) || 0)}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes et conditions particulières</Label>
                <Textarea
                  placeholder="Ex: Priorité pour les courses aéroport, disponibilité 24h/24..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <Button
                className="w-full"
                onClick={() => createAgreement.mutate()}
                disabled={!selectedDriver || createAgreement.isPending}
              >
                {createAgreement.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Handshake className="w-4 h-4 mr-2" />
                )}
                Envoyer la proposition
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Driver Proposals - Highlighted */}
      {driverProposals.length > 0 && (
        <Card className="border-primary border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-primary">
              <AlertCircle className="w-5 h-5" />
              Propositions de chauffeurs ({driverProposals.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {driverProposals.map((proposal: any) => (
              <div
                key={proposal.id}
                className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                onClick={() => {
                  setSelectedProposal(proposal);
                  setShowProposalDetails(true);
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      {proposal.driverProfile?.profile_photo_url ? (
                        <img
                          src={proposal.driverProfile.profile_photo_url}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <Car className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium">{proposal.driverProfile?.full_name || "Chauffeur"}</h4>
                      <p className="text-sm text-muted-foreground">
                        {proposal.driver?.company_name} • {proposal.driver?.vehicle_brand} {proposal.driver?.vehicle_model}
                      </p>
                      {proposal.driver?.rating && (
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-3 h-3 text-yellow-500" />
                          <span className="text-xs">{proposal.driver.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge className="bg-yellow-500">Nouvelle</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Agreements List */}
      {agreements?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Handshake className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Aucun partenariat</h3>
            <p className="text-muted-foreground mb-4">
              Créez des partenariats avec des chauffeurs pour définir vos accords de paiement
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {/* Active agreements */}
          {activeAgreements.map((agreement: any) => (
            <Card key={agreement.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      {agreement.driverProfile?.profile_photo_url ? (
                        <img
                          src={agreement.driverProfile.profile_photo_url}
                          alt=""
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-lg">🚗</span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold">
                        {agreement.driverProfile?.full_name || "Chauffeur"}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {agreement.driver?.company_name}
                      </p>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {agreement.payment_methods?.map((method: string) => (
                          <Badge key={method} variant="secondary" className="text-xs">
                            {PAYMENT_METHODS.find((m) => m.value === method)?.icon}{" "}
                            {PAYMENT_METHODS.find((m) => m.value === method)?.label}
                          </Badge>
                        ))}
                        <Badge variant="outline" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {PAYMENT_FREQUENCIES.find((f) => f.value === agreement.payment_frequency)?.label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(agreement.status)}
                    {agreement.discount_percentage > 0 && (
                      <p className="text-sm text-green-600 mt-1">
                        -{agreement.discount_percentage}% de remise
                      </p>
                    )}
                  </div>
                </div>
                {agreement.outstanding_balance > 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Solde en cours: {agreement.outstanding_balance.toFixed(2)}€
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Company pending proposals */}
          {companyProposals.map((agreement: any) => (
            <Card key={agreement.id} className="opacity-75">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-lg">🚗</span>
                    </div>
                    <div>
                      <h4 className="font-semibold">
                        {agreement.driverProfile?.full_name || "Chauffeur"}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {agreement.driver?.company_name}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(agreement.status)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Proposal Details Dialog */}
      <Dialog open={showProposalDetails} onOpenChange={setShowProposalDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="w-5 h-5" />
              Proposition de partenariat
            </DialogTitle>
            <DialogDescription>
              {selectedProposal?.driverProfile?.full_name} vous propose ses services
            </DialogDescription>
          </DialogHeader>

          {selectedProposal && (
            <div className="space-y-6 py-4">
              {/* Driver Info */}
              <div className="flex gap-4 p-4 bg-muted rounded-lg">
                <div className="w-16 h-16 rounded-full bg-background flex items-center justify-center overflow-hidden">
                  {selectedProposal.driverProfile?.profile_photo_url ? (
                    <img
                      src={selectedProposal.driverProfile.profile_photo_url}
                      alt=""
                      className="w-16 h-16 object-cover"
                    />
                  ) : (
                    <Car className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{selectedProposal.driverProfile?.full_name}</h3>
                  <p className="text-muted-foreground">{selectedProposal.driver?.company_name}</p>
                  {selectedProposal.driver?.rating && (
                    <div className="flex items-center gap-2 mt-1">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span>{selectedProposal.driver.rating.toFixed(1)}/5</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Vehicle Info */}
              {selectedProposal.driver_vehicle_info && (
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    Véhicule
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Modèle:</span>{" "}
                      {selectedProposal.driver_vehicle_info.brand} {selectedProposal.driver_vehicle_info.model}
                    </div>
                    {selectedProposal.driver_vehicle_info.year && (
                      <div>
                        <span className="text-muted-foreground">Année:</span>{" "}
                        {selectedProposal.driver_vehicle_info.year}
                      </div>
                    )}
                    {selectedProposal.driver_vehicle_info.color && (
                      <div>
                        <span className="text-muted-foreground">Couleur:</span>{" "}
                        {selectedProposal.driver_vehicle_info.color}
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Passagers max:</span>{" "}
                      {selectedProposal.driver_vehicle_info.max_passengers}
                    </div>
                  </div>
                  {selectedProposal.driver_vehicle_info.equipment?.length > 0 && (
                    <div className="mt-3">
                      <span className="text-sm text-muted-foreground">Équipements:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedProposal.driver_vehicle_info.equipment.map((eq: string) => (
                          <Badge key={eq} variant="outline" className="text-xs">
                            {eq}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Driver Presentation */}
              {selectedProposal.driver_presentation && (
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Présentation</h4>
                  <p className="text-sm whitespace-pre-wrap">{selectedProposal.driver_presentation}</p>
                </div>
              )}

              {/* Payment Conditions */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h5 className="font-medium mb-2 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Modes de paiement acceptés
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedProposal.payment_methods?.map((method: string) => (
                      <Badge key={method} variant="secondary">
                        {PAYMENT_METHODS.find((m) => m.value === method)?.icon}{" "}
                        {PAYMENT_METHODS.find((m) => m.value === method)?.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h5 className="font-medium mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Fréquence de paiement
                  </h5>
                  <p className="font-semibold">
                    {PAYMENT_FREQUENCIES.find((f) => f.value === selectedProposal.payment_frequency)?.label}
                  </p>
                </div>
              </div>

              {/* Notes */}
              {selectedProposal.notes && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Conditions supplémentaires</h4>
                  <p className="text-sm">{selectedProposal.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => rejectProposal.mutate(selectedProposal.id)}
                  disabled={rejectProposal.isPending}
                >
                  {rejectProposal.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-2" />
                  )}
                  Refuser
                </Button>
                <Button
                  onClick={() => acceptProposal.mutate(selectedProposal.id)}
                  disabled={acceptProposal.isPending}
                >
                  {acceptProposal.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Accepter le partenariat
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
