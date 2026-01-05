import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Search, Building2, MapPin, Phone, Mail, Send, CreditCard, Clock, Car, Users, Star, Briefcase, Eye, Euro, Wallet, Package } from "lucide-react";

interface DriverCompanySearchProps {
  driverId: string;
  initialCompanyId?: string; // Pour pré-sélectionner une entreprise après un refus
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

export function DriverCompanySearch({ driverId }: DriverCompanySearchProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [showProposalDialog, setShowProposalDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [viewingCompany, setViewingCompany] = useState<any>(null);
  
  // Proposal form state
  const [presentation, setPresentation] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<string[]>(["card"]);
  const [paymentFrequency, setPaymentFrequency] = useState("per_course");
  const [paymentDay, setPaymentDay] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  // Fetch driver profile for auto-fill
  const { data: driverProfile } = useQuery({
    queryKey: ["driver-profile", driverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select(`
          *,
          profile:profiles!drivers_user_id_fkey(
            full_name,
            phone,
            email,
            profile_photo_url
          )
        `)
        .eq("id", driverId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch blocked companies (mutual blocking)
  const { data: blockedCompanyIds = [] } = useQuery({
    queryKey: ["blocked-companies-search", driverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_driver_agreements")
        .select("company_id")
        .eq("driver_id", driverId)
        .or("driver_blocked_company.eq.true,company_blocked_driver.eq.true");
      
      if (error) throw error;
      return data?.map(d => d.company_id) || [];
    },
    enabled: !!driverId,
  });

  // Fetch visible companies
  const { data: allCompanies, isLoading } = useQuery({
    queryKey: ["visible-companies", searchTerm],
    queryFn: async () => {
      // Recherche les entreprises visibles aux chauffeurs (validated OU active)
      let query = supabase
        .from("companies")
        .select("*, logo_url")
        .eq("visible_to_drivers", true)
        .eq("accepting_proposals", true)
        .or("status.eq.validated,status.eq.active");

      if (searchTerm) {
        query = query.or(`company_name.ilike.%${searchTerm}%,contact_name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.order("company_name").limit(20);
      if (error) throw error;
      return data;
    },
    enabled: true,
  });

  // Filter out blocked companies
  const companies = (allCompanies || []).filter((c: any) => !blockedCompanyIds.includes(c.id));

  // Check existing proposals
  const { data: existingProposals } = useQuery({
    queryKey: ["driver-company-proposals", driverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_driver_agreements")
        .select("company_id, status")
        .eq("driver_id", driverId);

      if (error) throw error;
      return data;
    },
  });

  // Send proposal mutation
  const sendProposal = useMutation({
    mutationFn: async (companyId: string) => {
      const vehicleInfo = {
        model: driverProfile?.vehicle_model,
        brand: driverProfile?.vehicle_brand,
        color: driverProfile?.vehicle_color,
        year: driverProfile?.vehicle_year,
        equipment: driverProfile?.vehicle_equipment,
        max_passengers: driverProfile?.max_passengers,
      };

      const { error } = await supabase
        .from("company_driver_agreements")
        .insert({
          company_id: companyId,
          driver_id: driverId,
          proposed_by: "driver",
          status: "pending",
          payment_methods: paymentMethods,
          payment_frequency: paymentFrequency,
          payment_day: paymentDay,
          notes: notes,
          driver_presentation: presentation,
          driver_services_offered: driverProfile?.services_offered || [],
          driver_vehicle_info: vehicleInfo,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Proposition de partenariat envoyée !");
      queryClient.invalidateQueries({ queryKey: ["driver-company-proposals"] });
      queryClient.invalidateQueries({ queryKey: ["driver-company-agreements"] });
      resetForm();
      setShowProposalDialog(false);
      setSelectedCompany(null);
    },
    onError: (error: any) => {
      toast.error("Erreur lors de l'envoi: " + error.message);
    },
  });

  const resetForm = () => {
    setPresentation("");
    setPaymentMethods(["card"]);
    setPaymentFrequency("per_course");
    setPaymentDay(null);
    setNotes("");
  };

  const getProposalStatus = (companyId: string) => {
    const existing = existingProposals?.find((p) => p.company_id === companyId);
    return existing?.status;
  };

  // Vérifie si on peut refaire une demande (après un refus)
  const canRetryProposal = (companyId: string) => {
    const status = getProposalStatus(companyId);
    return !status || status === "rejected"; // Peut proposer si pas de demande ou si refusée
  };

  const handleOpenProposal = (company: any) => {
    setSelectedCompany(company);
    // Pre-fill presentation with driver info
    if (driverProfile) {
      const defaultPresentation = `Bonjour,

Je suis ${driverProfile.profile?.full_name || "chauffeur VTC"} et je vous propose mes services de transport.

${driverProfile.bio ? `À propos de moi: ${driverProfile.bio}` : ""}
${driverProfile.service_description ? `Mes services: ${driverProfile.service_description}` : ""}

Je suis disponible pour discuter de vos besoins de transport et établir un partenariat de confiance.

Cordialement.`;
      setPresentation(defaultPresentation);
    }
    setShowProposalDialog(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Search className="w-5 h-5" />
          Rechercher des entreprises
        </h2>
        <p className="text-sm text-muted-foreground">
          Trouvez des entreprises et proposez vos services de transport
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Rechercher par nom, contact ou adresse..."
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
      ) : companies && companies.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {companies.map((company: any) => {
            const proposalStatus = getProposalStatus(company.id);
            const hasProposal = !!proposalStatus;

            return (
              <Card key={company.id} className={hasProposal ? "opacity-75" : ""}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      {/* Logo entreprise */}
                      {company.logo_url ? (
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          <img 
                            src={company.logo_url} 
                            alt={company.company_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-6 h-6 text-primary" />
                        </div>
                      )}
                      <div>
                        <h4 className="font-semibold flex items-center gap-2">
                          {company.company_name}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Contact: {company.contact_name}
                        </p>
                      </div>
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

                  <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    {company.address && (
                      <p className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {company.address}
                      </p>
                    )}
                    {company.contact_email && (
                      <p className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {company.contact_email}
                      </p>
                    )}
                  </div>

                  {/* Types de véhicules recherchés */}
                  {company.preferred_vehicle_types && company.preferred_vehicle_types.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-muted-foreground mb-1">Véhicules recherchés:</p>
                      <div className="flex flex-wrap gap-1">
                        {company.preferred_vehicle_types.slice(0, 3).map((type: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            <Car className="w-3 h-3 mr-1" />
                            {type}
                          </Badge>
                        ))}
                        {company.preferred_vehicle_types.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{company.preferred_vehicle_types.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 mb-4">
                    {company.employee_count && (
                      <Badge variant="secondary" className="text-xs">
                        <Users className="w-3 h-3 mr-1" />
                        {company.employee_count} employés
                      </Badge>
                    )}
                    {company.monthly_budget && (
                      <Badge variant="secondary" className="text-xs">
                        <Euro className="w-3 h-3 mr-1" />
                        ~{company.monthly_budget}€/mois
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setViewingCompany(company);
                        setShowProfileDialog(true);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Voir profil
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => handleOpenProposal(company)}
                      disabled={proposalStatus === "pending" || proposalStatus === "accepted"}
                    >
                      {proposalStatus === "accepted" ? (
                        "Partenaire"
                      ) : proposalStatus === "pending" ? (
                        "En attente"
                      ) : proposalStatus === "rejected" ? (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Relancer
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
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
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">
              {searchTerm ? "Aucune entreprise trouvée" : "Aucune entreprise visible"}
            </h3>
            <p className="text-muted-foreground">
              {searchTerm 
                ? "Essayez avec d'autres termes de recherche"
                : "Les entreprises peuvent choisir d'être visibles ou non pour les chauffeurs"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Proposal Dialog */}
      <Dialog open={showProposalDialog} onOpenChange={setShowProposalDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Proposer un partenariat
            </DialogTitle>
            <DialogDescription>
              Envoyez une proposition à {selectedCompany?.company_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Auto-filled vehicle info */}
            {driverProfile && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  Informations véhicule (auto-renseignées)
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Véhicule:</span>{" "}
                    {driverProfile.vehicle_brand} {driverProfile.vehicle_model}
                  </div>
                  {driverProfile.vehicle_year && (
                    <div>
                      <span className="text-muted-foreground">Année:</span>{" "}
                      {driverProfile.vehicle_year}
                    </div>
                  )}
                  {driverProfile.vehicle_color && (
                    <div>
                      <span className="text-muted-foreground">Couleur:</span>{" "}
                      {driverProfile.vehicle_color}
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Passagers max:</span>{" "}
                    {driverProfile.max_passengers}
                  </div>
                </div>
                {driverProfile.vehicle_equipment && driverProfile.vehicle_equipment.length > 0 && (
                  <div className="mt-3">
                    <span className="text-sm text-muted-foreground">Équipements:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {driverProfile.vehicle_equipment.map((eq: string) => (
                        <Badge key={eq} variant="outline" className="text-xs">
                          {eq}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {driverProfile.rating && (
                  <div className="mt-3 flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="font-medium">{driverProfile.rating.toFixed(1)}/5</span>
                    <span className="text-muted-foreground">({driverProfile.total_rides} courses)</span>
                  </div>
                )}
              </div>
            )}

            {/* Presentation */}
            <div className="space-y-2">
              <Label htmlFor="presentation">Votre présentation</Label>
              <Textarea
                id="presentation"
                placeholder="Présentez-vous et décrivez vos services..."
                value={presentation}
                onChange={(e) => setPresentation(e.target.value)}
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Personnalisez ce message pour vous présenter à l'entreprise
              </p>
            </div>

            {/* Payment Methods */}
            <div className="space-y-3">
              <Label>Modes de paiement acceptés</Label>
              <div className="grid grid-cols-2 gap-3">
                {PAYMENT_METHODS.map((method) => (
                  <div key={method.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`method-${method.value}`}
                      checked={paymentMethods.includes(method.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setPaymentMethods([...paymentMethods, method.value]);
                        } else {
                          setPaymentMethods(paymentMethods.filter((m) => m !== method.value));
                        }
                      }}
                    />
                    <Label htmlFor={`method-${method.value}`} className="flex items-center gap-2 cursor-pointer">
                      <span>{method.icon}</span>
                      {method.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Frequency */}
            <div className="space-y-2">
              <Label htmlFor="frequency">Fréquence de paiement souhaitée</Label>
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

            {/* Payment Day */}
            {(paymentFrequency === "weekly" || paymentFrequency === "monthly") && (
              <div className="space-y-2">
                <Label htmlFor="paymentDay">
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
                      ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"].map((day, idx) => (
                        <SelectItem key={idx + 1} value={(idx + 1).toString()}>
                          {day}
                        </SelectItem>
                      ))
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

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Conditions supplémentaires (optionnel)</Label>
              <Textarea
                id="notes"
                placeholder="Ex: Disponibilité, zones desservies, tarifs spéciaux..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setShowProposalDialog(false)}>
                Annuler
              </Button>
              <Button
                onClick={() => selectedCompany && sendProposal.mutate(selectedCompany.id)}
                disabled={sendProposal.isPending || !presentation.trim() || paymentMethods.length === 0}
              >
                {sendProposal.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Envoyer la proposition
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Company Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-lg sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Building2 className="w-5 h-5 text-primary" />
              Profil de l'entreprise
            </DialogTitle>
          </DialogHeader>

          {viewingCompany && (
            <div className="space-y-4 py-2">
              {/* En-tête entreprise avec logo - responsive */}
              <div className="p-3 sm:p-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg border">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  {viewingCompany.logo_url ? (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-muted flex-shrink-0 mx-auto sm:mx-0">
                      <img 
                        src={viewingCompany.logo_url} 
                        alt={viewingCompany.company_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0 mx-auto sm:mx-0">
                      <Building2 className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="text-lg sm:text-xl font-bold text-foreground">
                      {viewingCompany.company_name}
                    </h3>
                    {viewingCompany.contact_name && (
                      <p className="text-muted-foreground text-sm">
                        Contact: {viewingCompany.contact_name}
                      </p>
                    )}
                    {viewingCompany.address && (
                      <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 mt-1 justify-center sm:justify-start">
                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="line-clamp-1">{viewingCompany.address}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Description publique */}
              {viewingCompany.notes && (
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
                    <Briefcase className="w-4 h-4" />
                    À propos de l'entreprise
                  </h4>
                  <div className="p-3 bg-muted rounded-lg text-sm leading-relaxed">
                    {viewingCompany.notes}
                  </div>
                </div>
              )}

              {/* Services recherchés */}
              {viewingCompany.preferred_vehicle_types && viewingCompany.preferred_vehicle_types.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
                    <Package className="w-4 h-4" />
                    Services recherchés
                  </h4>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {viewingCompany.preferred_vehicle_types.map((service: string, index: number) => (
                      <Badge key={index} variant="secondary" className="text-xs sm:text-sm py-0.5 sm:py-1">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Coordonnées */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
                  <Phone className="w-4 h-4" />
                  Coordonnées
                </h4>
                <div className="grid gap-2 text-sm">
                  {viewingCompany.address && (
                    <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-muted rounded-lg">
                      <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs sm:text-sm line-clamp-2">{viewingCompany.address}</span>
                    </div>
                  )}
                  {viewingCompany.contact_email && (
                    <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-muted rounded-lg">
                      <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <a href={`mailto:${viewingCompany.contact_email}`} className="text-primary hover:underline text-xs sm:text-sm truncate">
                        {viewingCompany.contact_email}
                      </a>
                    </div>
                  )}
                  {viewingCompany.contact_phone && (
                    <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-muted rounded-lg">
                      <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <a href={`tel:${viewingCompany.contact_phone}`} className="text-primary hover:underline font-medium text-xs sm:text-sm">
                        {viewingCompany.contact_phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Informations sur l'entreprise */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
                  <Users className="w-4 h-4" />
                  Informations
                </h4>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {viewingCompany.employee_count && (
                    <Badge variant="secondary" className="text-xs sm:text-sm py-0.5 sm:py-1">
                      <Users className="w-3 h-3 mr-1" />
                      {viewingCompany.employee_count} employés
                    </Badge>
                  )}
                  {viewingCompany.monthly_budget && (
                    <Badge variant="secondary" className="text-xs sm:text-sm py-0.5 sm:py-1">
                      <Euro className="w-3 h-3 mr-1" />
                      ~{viewingCompany.monthly_budget}€/mois
                    </Badge>
                  )}
                  {viewingCompany.accepting_proposals && (
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs sm:text-sm py-0.5 sm:py-1">
                      <Star className="w-3 h-3 mr-1" />
                      Accepte les propositions
                    </Badge>
                  )}
                </div>
              </div>

              {/* Actions - stacked on mobile */}
              <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowProfileDialog(false)} className="w-full sm:flex-1 order-last sm:order-first">
                  Fermer
                </Button>
                {viewingCompany.contact_phone && (
                  <Button variant="secondary" asChild className="w-full sm:flex-1">
                    <a href={`tel:${viewingCompany.contact_phone}`}>
                      <Phone className="w-4 h-4 mr-2" />
                      Appeler
                    </a>
                  </Button>
                )}
                {canRetryProposal(viewingCompany.id) && (
                  <Button 
                    className="w-full sm:flex-1"
                    onClick={() => {
                      setShowProfileDialog(false);
                      handleOpenProposal(viewingCompany);
                    }}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {getProposalStatus(viewingCompany.id) === "rejected" ? "Relancer" : "Proposer"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
