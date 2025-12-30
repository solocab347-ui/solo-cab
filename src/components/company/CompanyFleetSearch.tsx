import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Loader2, Search, Users, MapPin, Send, 
  Eye, Phone, Mail, Building2, Filter, RotateCcw, Car, Briefcase
} from "lucide-react";

const SERVICES_OPTIONS = [
  { id: 'airport', label: 'Transferts aéroport' },
  { id: 'business', label: 'Affaires' },
  { id: 'events', label: 'Événements' },
  { id: 'wedding', label: 'Mariages' },
  { id: 'tourism', label: 'Tourisme' },
  { id: 'medical', label: 'Transport médical' },
  { id: 'long_distance', label: 'Longue distance' },
  { id: 'hourly', label: 'Mise à disposition' },
];

const getServiceLabel = (serviceId: string): string => {
  return SERVICES_OPTIONS.find(s => s.id === serviceId)?.label || serviceId;
};

interface CompanyFleetSearchProps {
  companyId: string;
  companyProfile: {
    company_name: string;
    contact_name?: string;
    employee_count?: number;
    preferred_vehicle_types?: string[];
  };
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

const FRENCH_DEPARTMENTS = [
  { code: '75', name: 'Paris' },
  { code: '77', name: 'Seine-et-Marne' },
  { code: '78', name: 'Yvelines' },
  { code: '91', name: 'Essonne' },
  { code: '92', name: 'Hauts-de-Seine' },
  { code: '93', name: 'Seine-Saint-Denis' },
  { code: '94', name: 'Val-de-Marne' },
  { code: '95', name: "Val-d'Oise" },
  { code: '13', name: 'Bouches-du-Rhône' },
  { code: '69', name: 'Rhône' },
  { code: '31', name: 'Haute-Garonne' },
  { code: '33', name: 'Gironde' },
  { code: '59', name: 'Nord' },
  { code: '06', name: 'Alpes-Maritimes' },
];

export function CompanyFleetSearch({ companyId, companyProfile }: CompanyFleetSearchProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFleet, setSelectedFleet] = useState<any>(null);
  const [showProposalDialog, setShowProposalDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  
  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  
  // Proposal form state
  const [proposalMessage, setProposalMessage] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<string[]>(["card"]);
  const [paymentFrequency, setPaymentFrequency] = useState("monthly");
  const [paymentDay, setPaymentDay] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  // Fetch fleet managers visible to companies
  const { data: fleetManagers, isLoading } = useQuery({
    queryKey: ["public-fleet-managers-for-companies", searchTerm, selectedDepartment],
    queryFn: async () => {
      const { data: fleetData, error } = await supabase
        .from("fleet_managers")
        .select(`
          id, 
          user_id, 
          company_name, 
          address, 
          contact_email, 
          contact_phone, 
          logo_url, 
          description, 
          visible_to_companies,
          show_drivers_in_public_storefront, 
          services_offered
        `)
        .eq("visible_to_companies", true)
        .in("status", ["validated", "active", "pending"])
        .order('company_name')
        .limit(50);

      if (error) throw error;

      let result = fleetData || [];

      // Filter by search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        result = result.filter((f) =>
          f.company_name?.toLowerCase().includes(searchLower) ||
          f.address?.toLowerCase().includes(searchLower)
        );
      }

      // Filter by department
      if (selectedDepartment) {
        result = result.filter((f) => 
          f.address?.toLowerCase().includes(selectedDepartment.toLowerCase())
        );
      }

      return result;
    },
  });

  // Check existing agreements
  const { data: existingAgreements } = useQuery({
    queryKey: ["company-fleet-agreements", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_fleet_agreements")
        .select("fleet_manager_id, status")
        .eq("company_id", companyId);

      if (error) throw error;
      return data;
    },
  });

  // Send proposal mutation
  const sendProposal = useMutation({
    mutationFn: async (fleetManagerId: string) => {
      const { error } = await supabase
        .from("company_fleet_agreements")
        .insert({
          company_id: companyId,
          fleet_manager_id: fleetManagerId,
          proposed_by: "company",
          status: "pending",
          company_signed: true,
          company_signed_at: new Date().toISOString(),
          payment_methods: paymentMethods,
          payment_frequency: paymentFrequency,
          payment_day: paymentDay,
          proposal_message: proposalMessage,
          notes: notes || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Proposition de partenariat envoyée !");
      queryClient.invalidateQueries({ queryKey: ["company-fleet-agreements"] });
      resetForm();
      setShowProposalDialog(false);
      setSelectedFleet(null);
    },
    onError: (error: any) => {
      toast.error("Erreur: " + error.message);
    },
  });

  const resetForm = () => {
    setProposalMessage("");
    setPaymentMethods(["card"]);
    setPaymentFrequency("monthly");
    setPaymentDay(null);
    setNotes("");
  };

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedDepartment("");
  };

  const getAgreementStatus = (fleetManagerId: string) => {
    return existingAgreements?.find((a) => a.fleet_manager_id === fleetManagerId)?.status;
  };

  const handleOpenProposal = (fleet: any) => {
    setSelectedFleet(fleet);
    
    const defaultMessage = `Bonjour ${fleet.profiles?.full_name || ""},

Je représente ${companyProfile.company_name}${companyProfile.employee_count ? `, entreprise de ${companyProfile.employee_count} collaborateurs` : ""}.

Nous recherchons un partenaire fiable pour nos besoins de transport VTC et avons remarqué votre flotte de véhicules.

${companyProfile.preferred_vehicle_types?.length ? `Nous avons besoin de véhicules de type: ${companyProfile.preferred_vehicle_types.join(", ")}.` : ""}

Nous souhaiterions établir un partenariat qui nous permettrait d'accéder à vos services de manière privilégiée.

Cordialement,
${companyProfile.contact_name || ""}
${companyProfile.company_name}`;

    setProposalMessage(defaultMessage);
    setShowProposalDialog(true);
  };

  const handleViewProfile = (fleet: any) => {
    setSelectedFleet(fleet);
    setShowProfileDialog(true);
  };

  const activeFiltersCount = [selectedDepartment].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Rechercher des flottes VTC
          </CardTitle>
          <CardDescription>
            Trouvez des gestionnaires de flotte et accédez à leurs chauffeurs pour vos besoins de transport
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Rechercher par nom de flotte, gestionnaire..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={showFilters ? "secondary" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtres
              {activeFiltersCount > 0 && (
                <Badge className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </div>

          {showFilters && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Département
                  </Label>
                  <Select value={selectedDepartment || "all"} onValueChange={(val) => setSelectedDepartment(val === "all" ? "" : val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les départements" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les départements</SelectItem>
                      {FRENCH_DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept.code} value={dept.name}>
                          {dept.code} - {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {activeFiltersCount > 0 && (
                <Button variant="ghost" onClick={resetFilters} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Réinitialiser les filtres
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : fleetManagers && fleetManagers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {fleetManagers.map((fleet: any) => {
            const agreementStatus = getAgreementStatus(fleet.id);
            const hasAgreement = !!agreementStatus;

            return (
              <Card key={fleet.id} className={hasAgreement ? "opacity-75" : ""}>
                <CardContent className="p-4">
                  <div className="flex gap-3 mb-4">
                    <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden">
                      {fleet.logo_url ? (
                        <img src={fleet.logo_url} alt={fleet.company_name} className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-7 h-7 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">{fleet.company_name}</h4>
                      <p className="text-sm text-muted-foreground truncate">
                        {fleet.profiles?.full_name}
                      </p>
                      {fleet.services_offered && fleet.services_offered.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {fleet.services_offered.slice(0, 2).map((service: string) => (
                            <Badge key={service} variant="secondary" className="text-xs">
                              {getServiceLabel(service)}
                            </Badge>
                          ))}
                          {fleet.services_offered.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{fleet.services_offered.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    {hasAgreement && (
                      <Badge 
                        className={
                          agreementStatus === "accepted" 
                            ? "bg-green-500" 
                            : agreementStatus === "rejected" 
                            ? "bg-red-500" 
                            : "bg-yellow-500"
                        }
                      >
                        {agreementStatus === "accepted" 
                          ? "Partenaire" 
                          : agreementStatus === "rejected" 
                          ? "Refusé" 
                          : "En attente"}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    {fleet.address && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{fleet.address}</span>
                      </div>
                    )}
                  </div>

                  {fleet.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {fleet.description}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleViewProfile(fleet)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Voir profil
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => handleOpenProposal(fleet)}
                      disabled={hasAgreement}
                    >
                      {hasAgreement ? (
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
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">
              {searchTerm ? "Aucune flotte trouvée" : "Aucune flotte disponible"}
            </h3>
            <p className="text-muted-foreground">
              {searchTerm 
                ? "Essayez avec d'autres termes de recherche"
                : "Aucun gestionnaire de flotte n'a activé son profil public"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Profil de la flotte
            </DialogTitle>
          </DialogHeader>

          {selectedFleet && (
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-6 py-4 pr-4">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center overflow-hidden">
                    {selectedFleet.logo_url ? (
                      <img src={selectedFleet.logo_url} alt={selectedFleet.company_name} className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-12 h-12 text-white" />
                    )}
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-semibold">{selectedFleet.company_name}</h3>
                    <p className="text-muted-foreground">{selectedFleet.profiles?.full_name}</p>
                  </div>
                </div>

                {selectedFleet.description && (
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-sm whitespace-pre-wrap">{selectedFleet.description}</p>
                  </div>
                )}

                {/* Contact */}
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-3">Contact</h4>
                  <div className="space-y-2 text-sm">
                    {selectedFleet.contact_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <a href={`mailto:${selectedFleet.contact_email}`} className="text-primary hover:underline">
                          {selectedFleet.contact_email}
                        </a>
                      </div>
                    )}
                    {selectedFleet.contact_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <a href={`tel:${selectedFleet.contact_phone}`} className="text-primary hover:underline">
                          {selectedFleet.contact_phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Location */}
                {selectedFleet.address && (
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Adresse
                    </h4>
                    <p className="text-sm">{selectedFleet.address}</p>
                  </div>
                )}

                {/* Services proposés */}
                {selectedFleet.services_offered && selectedFleet.services_offered.length > 0 && (
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      Services proposés
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedFleet.services_offered.map((service: string) => (
                        <Badge key={service} variant="secondary">
                          {getServiceLabel(service)}
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
                      handleOpenProposal(selectedFleet);
                    }}
                    disabled={!!getAgreementStatus(selectedFleet.id)}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Proposer un partenariat
                  </Button>
                </div>
              </div>
            </ScrollArea>
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
              Envoyez une proposition à {selectedFleet?.company_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Message */}
            <div className="space-y-2">
              <Label>Votre message</Label>
              <Textarea
                value={proposalMessage}
                onChange={(e) => setProposalMessage(e.target.value)}
                rows={8}
                placeholder="Présentez votre entreprise et vos besoins..."
              />
            </div>

            {/* Payment Methods */}
            <div className="space-y-3">
              <Label>Modes de paiement acceptés</Label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <div key={method.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`fleet-method-${method.value}`}
                      checked={paymentMethods.includes(method.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setPaymentMethods([...paymentMethods, method.value]);
                        } else {
                          setPaymentMethods(paymentMethods.filter((m) => m !== method.value));
                        }
                      }}
                    />
                    <label htmlFor={`fleet-method-${method.value}`} className="text-sm">
                      {method.icon} {method.label}
                    </label>
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
                        <span className="text-muted-foreground ml-2 text-xs">
                          - {freq.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes supplémentaires (optionnel)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Précisez vos besoins particuliers..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowProposalDialog(false)} className="flex-1">
                Annuler
              </Button>
              <Button 
                onClick={() => selectedFleet && sendProposal.mutate(selectedFleet.id)}
                disabled={sendProposal.isPending || !proposalMessage.trim()}
                className="flex-1"
              >
                {sendProposal.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Envoyer la proposition
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
