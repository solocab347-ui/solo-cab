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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Handshake, CreditCard, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

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

  return (
    <div className="space-y-6">
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
          {agreements?.map((agreement: any) => (
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
        </div>
      )}
    </div>
  );
}
