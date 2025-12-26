import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { 
  Loader2, Search, Car, MapPin, Star, Send, 
  CreditCard, Clock, User, Languages, 
  Eye, Phone
} from "lucide-react";

interface CompanyDriverSearchProps {
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

export function CompanyDriverSearch({ companyId }: CompanyDriverSearchProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [showProposalDialog, setShowProposalDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  
  // Proposal form state
  const [proposalMessage, setProposalMessage] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<string[]>(["card"]);
  const [paymentFrequency, setPaymentFrequency] = useState("per_course");
  const [paymentDay, setPaymentDay] = useState<number | null>(null);
  const [creditLimit, setCreditLimit] = useState(0);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [notes, setNotes] = useState("");

  // Fetch company info for message
  const { data: company } = useQuery({
    queryKey: ["company-info", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch drivers with public profiles
  const { data: drivers, isLoading } = useQuery({
    queryKey: ["public-drivers", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("drivers")
        .select(`
          id,
          user_id,
          company_name,
          vehicle_brand,
          vehicle_model,
          vehicle_color,
          vehicle_year,
          vehicle_equipment,
          vehicle_category,
          max_passengers,
          rating,
          total_rides,
          bio,
          service_description,
          languages,
          services_offered,
          primary_sectors
        `)
        .eq("status", "validated")
        .eq("public_profile_enabled", true);

      const { data, error } = await query.limit(50);
      if (error) throw error;

      // Fetch profiles
      const userIds = data?.map((d: any) => d.user_id) || [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, profile_photo_url, phone")
        .in("id", userIds);

      // Filter by search term
      const enrichedDrivers = data?.map((driver: any) => ({
        ...driver,
        profile: profiles?.find((p: any) => p.id === driver.user_id),
      }));

      if (searchTerm) {
        return enrichedDrivers?.filter((d: any) =>
          d.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.primary_sectors?.some((s: string) => s.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }

      return enrichedDrivers;
    },
  });

  // Check existing proposals
  const { data: existingProposals } = useQuery({
    queryKey: ["company-driver-proposals", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_driver_agreements")
        .select("driver_id, status")
        .eq("company_id", companyId);

      if (error) throw error;
      return data;
    },
  });

  // Send proposal mutation
  const sendProposal = useMutation({
    mutationFn: async (driverId: string) => {
      const { error } = await supabase
        .from("company_driver_agreements")
        .insert({
          company_id: companyId,
          driver_id: driverId,
          proposed_by: "company",
          status: "pending",
          company_signed: true,
          company_signed_at: new Date().toISOString(),
          payment_methods: paymentMethods,
          payment_frequency: paymentFrequency,
          payment_day: paymentDay,
          credit_limit: creditLimit,
          discount_percentage: discountPercentage,
          notes: `${proposalMessage}${notes ? `\n\nConditions: ${notes}` : ""}`,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Proposition de partenariat envoyée !");
      queryClient.invalidateQueries({ queryKey: ["company-driver-proposals"] });
      queryClient.invalidateQueries({ queryKey: ["company-agreements"] });
      resetForm();
      setShowProposalDialog(false);
      setSelectedDriver(null);
    },
    onError: (error: any) => {
      toast.error("Erreur: " + error.message);
    },
  });

  const resetForm = () => {
    setProposalMessage("");
    setPaymentMethods(["card"]);
    setPaymentFrequency("per_course");
    setPaymentDay(null);
    setCreditLimit(0);
    setDiscountPercentage(0);
    setNotes("");
  };

  const getProposalStatus = (driverId: string) => {
    return existingProposals?.find((p) => p.driver_id === driverId)?.status;
  };

  const handleOpenProposal = (driver: any) => {
    setSelectedDriver(driver);
    
    // Generate pre-filled message based on context
    const defaultMessage = `Bonjour ${driver.profile?.full_name || ""},

Je suis ${company?.contact_name || ""}, représentant de ${company?.company_name || "notre entreprise"}.

Nous avons remarqué votre profil et serions intéressés par vos services de transport VTC pour nos besoins professionnels.

${company?.employee_count ? `Notre entreprise compte ${company.employee_count} collaborateurs` : ""}${company?.monthly_budget ? ` et un budget transport mensuel d'environ ${company.monthly_budget}€` : ""}.

${company?.preferred_vehicle_types?.length ? `Nous recherchons particulièrement des véhicules de type: ${company.preferred_vehicle_types.join(", ")}.` : ""}

Nous souhaitons établir un partenariat durable et de confiance avec un chauffeur professionnel comme vous.

N'hésitez pas à nous contacter pour discuter des conditions.

Cordialement,
${company?.contact_name || ""}
${company?.company_name || ""}`;

    setProposalMessage(defaultMessage);
    setShowProposalDialog(true);
  };

  const handleViewProfile = (driver: any) => {
    setSelectedDriver(driver);
    setShowProfileDialog(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Search className="w-5 h-5" />
          Rechercher des chauffeurs
        </h2>
        <p className="text-sm text-muted-foreground">
          Trouvez des chauffeurs VTC et proposez-leur un partenariat
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Rechercher par nom, entreprise, secteur..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : drivers && drivers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {drivers.map((driver: any) => {
            const proposalStatus = getProposalStatus(driver.id);
            const hasProposal = !!proposalStatus;

            return (
              <Card key={driver.id} className={hasProposal ? "opacity-75" : ""}>
                <CardContent className="p-4">
                  <div className="flex gap-3 mb-4">
                    <Avatar className="w-14 h-14">
                      <AvatarImage src={driver.profile?.profile_photo_url} />
                      <AvatarFallback>
                        <User className="w-6 h-6" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">
                        {driver.profile?.full_name || "Chauffeur VTC"}
                      </h4>
                      <p className="text-sm text-muted-foreground truncate">
                        {driver.company_name}
                      </p>
                      {driver.rating && (
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          <span className="text-xs font-medium">{driver.rating.toFixed(1)}</span>
                          {driver.total_rides && (
                            <span className="text-xs text-muted-foreground">
                              ({driver.total_rides} courses)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {hasProposal && (
                      <Badge 
                        className={
                          proposalStatus === "accepted" 
                            ? "bg-green-500" 
                            : proposalStatus === "rejected" 
                            ? "bg-red-500" 
                            : "bg-yellow-500"
                        }
                      >
                        {proposalStatus === "accepted" 
                          ? "Partenaire" 
                          : proposalStatus === "rejected" 
                          ? "Refusé" 
                          : "En attente"}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Car className="w-4 h-4" />
                      <span className="truncate">
                        {driver.vehicle_brand} {driver.vehicle_model}
                        {driver.max_passengers && ` • ${driver.max_passengers} places`}
                      </span>
                    </div>
                    {driver.primary_sectors?.length > 0 && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span className="truncate">
                          {driver.primary_sectors.slice(0, 2).join(", ")}
                          {driver.primary_sectors.length > 2 && " ..."}
                        </span>
                      </div>
                    )}
                    {driver.languages?.length > 0 && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Languages className="w-4 h-4" />
                        <span className="truncate">
                          {driver.languages.join(", ")}
                        </span>
                      </div>
                    )}
                  </div>

                  {driver.vehicle_equipment?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {driver.vehicle_equipment.slice(0, 3).map((eq: string) => (
                        <Badge key={eq} variant="secondary" className="text-xs">
                          {eq}
                        </Badge>
                      ))}
                      {driver.vehicle_equipment.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{driver.vehicle_equipment.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleViewProfile(driver)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Voir profil
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => handleOpenProposal(driver)}
                      disabled={hasProposal}
                    >
                      {hasProposal ? (
                        "Proposition envoyée"
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-1" />
                          Proposer
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Car className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">
              {searchTerm ? "Aucun chauffeur trouvé" : "Aucun chauffeur disponible"}
            </h3>
            <p className="text-muted-foreground">
              {searchTerm 
                ? "Essayez avec d'autres termes de recherche"
                : "Aucun chauffeur n'a activé son profil public pour l'instant"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profil du chauffeur
            </DialogTitle>
          </DialogHeader>

          {selectedDriver && (
            <div className="space-y-6 py-4">
              {/* Header */}
              <div className="flex gap-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={selectedDriver.profile?.profile_photo_url} />
                  <AvatarFallback>
                    <User className="w-10 h-10" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">
                    {selectedDriver.profile?.full_name || "Chauffeur VTC"}
                  </h3>
                  <p className="text-muted-foreground">{selectedDriver.company_name}</p>
                  {selectedDriver.rating && (
                    <div className="flex items-center gap-2 mt-2">
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                      <span className="font-medium">{selectedDriver.rating.toFixed(1)}/5</span>
                      {selectedDriver.total_rides && (
                        <span className="text-muted-foreground">
                          ({selectedDriver.total_rides} courses)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Bio */}
              {selectedDriver.bio && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">À propos</h4>
                  <p className="text-sm whitespace-pre-wrap">{selectedDriver.bio}</p>
                </div>
              )}

              {/* Vehicle */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  Véhicule
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Modèle:</span>{" "}
                    {selectedDriver.vehicle_brand} {selectedDriver.vehicle_model}
                  </div>
                  {selectedDriver.vehicle_year && (
                    <div>
                      <span className="text-muted-foreground">Année:</span>{" "}
                      {selectedDriver.vehicle_year}
                    </div>
                  )}
                  {selectedDriver.vehicle_color && (
                    <div>
                      <span className="text-muted-foreground">Couleur:</span>{" "}
                      {selectedDriver.vehicle_color}
                    </div>
                  )}
                  {selectedDriver.max_passengers && (
                    <div>
                      <span className="text-muted-foreground">Passagers max:</span>{" "}
                      {selectedDriver.max_passengers}
                    </div>
                  )}
                  {selectedDriver.vehicle_category && (
                    <div>
                      <span className="text-muted-foreground">Catégorie:</span>{" "}
                      {selectedDriver.vehicle_category}
                    </div>
                  )}
                </div>
                {selectedDriver.vehicle_equipment?.length > 0 && (
                  <div className="mt-3">
                    <span className="text-sm text-muted-foreground">Équipements:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedDriver.vehicle_equipment.map((eq: string) => (
                        <Badge key={eq} variant="secondary" className="text-xs">
                          {eq}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Services */}
              {selectedDriver.services_offered?.length > 0 && (
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Services proposés</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedDriver.services_offered.map((service: string) => (
                      <Badge key={service} variant="outline">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Sectors */}
              {selectedDriver.primary_sectors?.length > 0 && (
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Secteurs d'intervention
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedDriver.primary_sectors.map((sector: string) => (
                      <Badge key={sector} variant="secondary">
                        {sector}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Languages */}
              {selectedDriver.languages?.length > 0 && (
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Languages className="w-4 h-4" />
                    Langues parlées
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedDriver.languages.map((lang: string) => (
                      <Badge key={lang} variant="outline">
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" className="flex-1" onClick={() => setShowProfileDialog(false)}>
                  Fermer
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={() => {
                    setShowProfileDialog(false);
                    handleOpenProposal(selectedDriver);
                  }}
                  disabled={!!getProposalStatus(selectedDriver.id)}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Proposer un partenariat
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Proposal Dialog */}
      <Dialog open={showProposalDialog} onOpenChange={setShowProposalDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Proposer un partenariat
            </DialogTitle>
            <DialogDescription>
              Envoyez une proposition à {selectedDriver?.profile?.full_name || "ce chauffeur"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Driver Summary */}
            {selectedDriver && (
              <div className="flex gap-3 p-4 bg-muted rounded-lg">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={selectedDriver.profile?.profile_photo_url} />
                  <AvatarFallback>
                    <User className="w-6 h-6" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-medium">{selectedDriver.profile?.full_name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedDriver.company_name} • {selectedDriver.vehicle_brand} {selectedDriver.vehicle_model}
                  </p>
                </div>
              </div>
            )}

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Votre message de présentation</Label>
              <Textarea
                id="message"
                placeholder="Présentez votre entreprise et vos besoins..."
                value={proposalMessage}
                onChange={(e) => setProposalMessage(e.target.value)}
                rows={10}
              />
              <p className="text-xs text-muted-foreground">
                Ce message personnalisé sera envoyé au chauffeur avec votre proposition
              </p>
            </div>

            {/* Payment Methods */}
            <div className="space-y-3">
              <Label>Modes de paiement proposés</Label>
              <div className="grid grid-cols-2 gap-3">
                {PAYMENT_METHODS.map((method) => (
                  <div key={method.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`payment-${method.value}`}
                      checked={paymentMethods.includes(method.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setPaymentMethods([...paymentMethods, method.value]);
                        } else {
                          setPaymentMethods(paymentMethods.filter((m) => m !== method.value));
                        }
                      }}
                    />
                    <Label htmlFor={`payment-${method.value}`} className="flex items-center gap-2 cursor-pointer">
                      <span>{method.icon}</span>
                      {method.label}
                    </Label>
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
                  {paymentFrequency === "weekly" ? "Jour de paiement" : "Jour du mois"}
                </Label>
                <Select 
                  value={paymentDay?.toString() || ""} 
                  onValueChange={(v) => setPaymentDay(v ? parseInt(v) : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentFrequency === "weekly" ? (
                      <>
                        <SelectItem value="1">Lundi</SelectItem>
                        <SelectItem value="2">Mardi</SelectItem>
                        <SelectItem value="3">Mercredi</SelectItem>
                        <SelectItem value="4">Jeudi</SelectItem>
                        <SelectItem value="5">Vendredi</SelectItem>
                      </>
                    ) : (
                      Array.from({ length: 28 }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          Le {i + 1}
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
                Montant maximum accumulable avant paiement obligatoire
              </p>
            </div>

            {/* Discount */}
            <div className="space-y-2">
              <Label>Remise demandée (%)</Label>
              <Input
                type="number"
                min={0}
                max={50}
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(parseFloat(e.target.value) || 0)}
              />
            </div>

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label>Conditions particulières</Label>
              <Textarea
                placeholder="Ex: Facturation mensuelle, devis obligatoire au-dessus de 200€..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Button
              className="w-full"
              onClick={() => selectedDriver && sendProposal.mutate(selectedDriver.id)}
              disabled={sendProposal.isPending || !proposalMessage.trim()}
            >
              {sendProposal.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Envoyer la proposition
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
