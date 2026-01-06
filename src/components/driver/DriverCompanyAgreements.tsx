import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Loader2, Handshake, CreditCard, Clock, CheckCircle, XCircle, AlertCircle, Building2, Euro, Search, ChevronDown, ChevronUp, Info, Ban, Unlock, Lock, EyeOff, User, FileText, Edit, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { DriverCompanySearch } from "./DriverCompanySearch";
import { PartnershipPaymentManager } from "@/components/shared/PartnershipPaymentManager";
import { PartnershipTerminationManager } from "@/components/shared/PartnershipTerminationManager";
import { PartnershipRejectDialog } from "@/components/shared/PartnershipRejectDialog";
import { CompanyDriverSignatureConfirmation } from "@/components/company/CompanyDriverSignatureConfirmation";
import { ModifyCompanyDriverAgreementDialog } from "@/components/company/ModifyCompanyDriverAgreementDialog";
import { UniversalPartnershipContract } from "@/components/shared/UniversalPartnershipContract";

interface DriverCompanyAgreementsProps {
  driverId: string;
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

// Active Driver Agreement Card Component
function ActiveDriverAgreementCard({ agreement, driverId, driverInfo, onRefresh }: { agreement: any; driverId: string; driverInfo: any; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [showModifyDialog, setShowModifyDialog] = useState(false);
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [signing, setSigning] = useState(false);

  const needsDriverSignature = !agreement.driver_signed;
  const needsCompanySignature = !agreement.company_signed;
  const hasPendingModification = agreement.pending_modification;
  const bothSigned = agreement.company_signed && agreement.driver_signed;

  const fetchPayments = async () => {
    if (payments.length > 0) return;
    setLoadingPayments(true);
    try {
      const { data } = await supabase.from("company_payments").select("*").eq("agreement_id", agreement.id).order("created_at", { ascending: false });
      setPayments(data || []);
    } catch (error) { console.error(error); }
    finally { setLoadingPayments(false); }
  };

  const handleSignContract = async () => {
    setSigning(true);
    try {
      const { error } = await supabase
        .from("company_driver_agreements")
        .update({
          driver_signed: true,
          driver_signed_at: new Date().toISOString(),
          contract_generated_at: new Date().toISOString(),
        })
        .eq("id", agreement.id);

      if (error) throw error;

      // Notify company
      if (agreement.company?.user_id) {
        await supabase.from("notifications").insert({
          user_id: agreement.company.user_id,
          title: "✅ Contrat signé",
          message: "Le chauffeur a signé le contrat de partenariat.",
          type: "success",
          link: "/company-dashboard?tab=partnerships",
          is_read: false,
        });
      }

      toast.success("Contrat signé avec succès !");
      setShowSignatureDialog(false);
      onRefresh();
    } catch (error) {
      console.error("Error signing contract:", error);
      toast.error("Erreur lors de la signature");
    } finally {
      setSigning(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Company Logo */}
          <Avatar className="w-14 h-14 rounded-lg border border-border/50 flex-shrink-0">
            {agreement.company?.logo_url ? (
              <AvatarImage src={agreement.company.logo_url} alt={agreement.company?.company_name} className="object-cover" />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary rounded-lg text-sm font-semibold">
              {agreement.company?.company_name?.slice(0, 2).toUpperCase() || 'EN'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold">{agreement.company?.company_name}</h4>
                <p className="text-sm text-muted-foreground">{agreement.company?.contact_name} • {agreement.company?.contact_phone}</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {agreement.payment_methods?.map((method: string) => (
                    <Badge key={method} variant="secondary" className="text-xs">
                      {PAYMENT_METHODS.find((m) => m.value === method)?.icon} {PAYMENT_METHODS.find((m) => m.value === method)?.label}
                    </Badge>
                  ))}
                  <Badge variant="outline" className="text-xs"><Clock className="w-3 h-3 mr-1" />{PAYMENT_FREQUENCIES.find((f) => f.value === agreement.payment_frequency)?.label}</Badge>
                </div>
              </div>
              <Badge className="bg-green-500 flex-shrink-0"><CheckCircle className="w-3 h-3 mr-1" />Actif</Badge>
            </div>
          </div>
        </div>

        {/* Contract Status Alerts */}
        {needsDriverSignature && (
          <Alert className="mt-3 border-amber-500/50 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-sm text-amber-700 dark:text-amber-300">
              Vous devez signer le contrat pour finaliser ce partenariat.
            </AlertDescription>
          </Alert>
        )}

        {!needsDriverSignature && needsCompanySignature && (
          <Alert className="mt-3 border-blue-500/50 bg-blue-500/10">
            <Clock className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
              En attente de la signature de l'entreprise.
            </AlertDescription>
          </Alert>
        )}

        {hasPendingModification && (
          <Alert className="mt-3 border-purple-500/50 bg-purple-500/10">
            <Edit className="h-4 w-4 text-purple-600" />
            <AlertDescription className="text-sm text-purple-700 dark:text-purple-300">
              Une modification du contrat est en attente.
            </AlertDescription>
          </Alert>
        )}

        {/* Signature Status */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <Badge variant={agreement.company_signed ? "default" : "outline"} className={agreement.company_signed ? "bg-green-500" : ""}>
            {agreement.company_signed ? <CheckCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
            Entreprise: {agreement.company_signed ? "Signé" : "En attente"}
          </Badge>
          <Badge variant={agreement.driver_signed ? "default" : "outline"} className={agreement.driver_signed ? "bg-green-500" : ""}>
            {agreement.driver_signed ? <CheckCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
            Vous: {agreement.driver_signed ? "Signé" : "En attente"}
          </Badge>
        </div>

        {/* Quick Actions */}
        <div className="mt-4 flex gap-2 flex-wrap">
          {needsDriverSignature && (
            <Button
              onClick={() => setShowSignatureDialog(true)}
              className="bg-green-600 hover:bg-green-700"
              size="sm"
            >
              <FileText className="w-4 h-4 mr-1" />
              Signer le contrat
            </Button>
          )}
          
          {bothSigned && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowContractDialog(true)}
              >
                <FileText className="w-4 h-4 mr-1" />
                Voir le contrat
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowModifyDialog(true)}
              >
                <Edit className="w-4 h-4 mr-1" />
                Modifier
              </Button>
            </>
          )}
        </div>

        <Collapsible open={expanded} onOpenChange={(o) => { setExpanded(o); if (o) fetchPayments(); }} className="mt-4">
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full">{expanded ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}Gérer le partenariat</Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-4">
            {loadingPayments ? <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin" /></div> : (
              <>
                <PartnershipPaymentManager payments={payments} partnershipId={agreement.id} partnershipType="company_driver" userRole="receiver" partnerName={agreement.company?.company_name || "Entreprise"} outstandingBalance={agreement.outstanding_balance || 0} onRefresh={() => { fetchPayments(); onRefresh(); }} />
                <PartnershipTerminationManager partnershipId={agreement.id} partnershipType="company_driver" userRole="receiver" partnerName={agreement.company?.company_name || "Entreprise"} outstandingBalance={agreement.outstanding_balance || 0} terminationPending={agreement.termination_pending_payment_validation || false} terminationRequestedBy={agreement.termination_requested_by} ownConfirmedFinalPayment={agreement.driver_confirmed_final_payment || false} partnerConfirmedFinalPayment={agreement.company_confirmed_final_payment || false} onRefresh={onRefresh} />
              </>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>

      {/* Signature Dialog */}
      <CompanyDriverSignatureConfirmation
        open={showSignatureDialog}
        onOpenChange={setShowSignatureDialog}
        partnerName={agreement.company?.company_name || "Entreprise"}
        partnerType="driver"
        paymentFrequency={agreement.payment_frequency}
        paymentMethods={agreement.payment_methods}
        onConfirmSign={handleSignContract}
        signing={signing}
      />

      {/* Modify Dialog */}
      <ModifyCompanyDriverAgreementDialog
        open={showModifyDialog}
        onOpenChange={setShowModifyDialog}
        agreement={{
          id: agreement.id,
          partner_id: agreement.company_id,
          partner_name: agreement.company?.company_name || "Entreprise",
          payment_frequency: agreement.payment_frequency,
          payment_methods: agreement.payment_methods || [],
          payment_day: agreement.payment_day,
          pending_modification: agreement.pending_modification,
          pending_new_payment_frequency: agreement.pending_new_payment_frequency,
          pending_new_payment_methods: agreement.pending_new_payment_methods,
          pending_new_payment_day: agreement.pending_new_payment_day,
          pending_modification_by: agreement.pending_modification_by,
          pending_modification_message: agreement.pending_modification_message,
        }}
        currentPartyType="driver"
        currentPartyId={driverId}
        onSuccess={onRefresh}
      />

      {/* Contract View Dialog */}
      <UniversalPartnershipContract
        open={showContractDialog}
        onOpenChange={setShowContractDialog}
        partnershipId={agreement.id}
        partnershipType="company_driver"
        status={agreement.status}
        createdAt={agreement.created_at}
        acceptedAt={agreement.accepted_at}
        terminatedAt={agreement.terminated_at}
        party1={{
          name: driverInfo?.full_name || "Vous",
          company: driverInfo?.company_name,
          siret: driverInfo?.siret,
          tvaNumber: driverInfo?.tva_number,
          address: driverInfo?.address,
          phone: driverInfo?.phone,
          email: driverInfo?.email,
        }}
        party2={{
          name: agreement.company?.company_name || "Entreprise",
          company: agreement.company?.company_name,
          siret: agreement.company?.siret,
          tvaNumber: agreement.company?.tva_number,
          address: agreement.company?.billing_address || agreement.company?.address,
          phone: agreement.company?.contact_phone,
          email: agreement.company?.contact_email,
        }}
        terms={{
          paymentFrequency: agreement.payment_frequency,
          paymentDay: agreement.payment_day,
        }}
        signatures={{
          party1Signed: agreement.driver_signed || false,
          party1SignedAt: agreement.driver_signed_at,
          party2Signed: agreement.company_signed || false,
          party2SignedAt: agreement.company_signed_at,
        }}
      />
    </Card>
  );
}

export function DriverCompanyAgreements({ driverId }: DriverCompanyAgreementsProps) {
  const queryClient = useQueryClient();
  const [selectedAgreement, setSelectedAgreement] = useState<any>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [activeTab, setActiveTab] = useState("agreements");

  // Fetch driver info for contract
  const { data: driverInfo } = useQuery({
    queryKey: ["driver-info-for-contract", driverId],
    queryFn: async () => {
      const { data: driver, error } = await supabase
        .from("drivers")
        .select("id, user_id, company_name, siret, siren, tva_number, company_address")
        .eq("id", driverId)
        .single();

      if (error) throw error;

      // Fetch profile for full name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone, email")
        .eq("id", driver.user_id)
        .single();

      return {
        ...driver,
        address: driver.company_address,
        full_name: profile?.full_name,
        phone: profile?.phone,
        email: profile?.email,
      };
    },
  });

  // Fetch agreements
  const { data: agreements, isLoading } = useQuery({
    queryKey: ["driver-company-agreements", driverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_driver_agreements")
        .select(`
          *,
          company:companies(
            id,
            user_id,
            company_name,
            contact_name,
            contact_email,
            contact_phone,
            address,
            siret,
            siren,
            tva_number,
            billing_address
          )
        `)
        .eq("driver_id", driverId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Accept agreement
  const acceptAgreement = useMutation({
    mutationFn: async (agreementId: string) => {
      const { error } = await supabase
        .from("company_driver_agreements")
        .update({
          status: "accepted",
          driver_signed: true,
          driver_signed_at: new Date().toISOString(),
          accepted_at: new Date().toISOString(),
        })
        .eq("id", agreementId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Partenariat accepté !");
      queryClient.invalidateQueries({ queryKey: ["driver-company-agreements"] });
    },
    onError: () => {
      toast.error("Erreur lors de l'acceptation");
    },
  });

  // Reject agreement with optional blocking
  const handleRejectAgreement = async (reason: string, blockCompany: boolean) => {
    if (!selectedAgreement) return;
    
    setIsRejecting(true);
    try {
      const updateData: any = {
        status: "rejected",
        rejected_at: new Date().toISOString(),
        rejection_reason: reason,
      };
      
      // Si le chauffeur veut bloquer l'entreprise
      if (blockCompany) {
        updateData.driver_blocked_company = true;
        updateData.driver_blocked_company_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("company_driver_agreements")
        .update(updateData)
        .eq("id", selectedAgreement.id);

      if (error) throw error;

      toast.success(blockCompany ? "Partenariat refusé et entreprise bloquée" : "Partenariat refusé");
      queryClient.invalidateQueries({ queryKey: ["driver-company-agreements"] });
      queryClient.invalidateQueries({ queryKey: ["visible-companies"] });
      setShowRejectDialog(false);
      setSelectedAgreement(null);
    } catch (error: any) {
      toast.error("Erreur lors du refus: " + error.message);
    } finally {
      setIsRejecting(false);
    }
  };

  // Block company mutation - MUST be before conditional returns
  const blockCompany = useMutation({
    mutationFn: async (agreementId: string) => {
      const { error } = await supabase
        .from("company_driver_agreements")
        .update({
          driver_blocked_company: true,
          driver_blocked_company_at: new Date().toISOString(),
        })
        .eq("id", agreementId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entreprise bloquée. Elle ne vous verra plus dans les recherches.");
      queryClient.invalidateQueries({ queryKey: ["driver-company-agreements"] });
      queryClient.invalidateQueries({ queryKey: ["blocked-companies"] });
    },
    onError: () => {
      toast.error("Erreur lors du blocage");
    },
  });

  // Unblock company mutation - MUST be before conditional returns
  const unblockCompany = useMutation({
    mutationFn: async (agreementId: string) => {
      const { error } = await supabase
        .from("company_driver_agreements")
        .update({
          driver_blocked_company: false,
          driver_blocked_company_at: null,
        })
        .eq("id", agreementId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entreprise débloquée. Vous pouvez à nouveau vous voir mutuellement.");
      queryClient.invalidateQueries({ queryKey: ["driver-company-agreements"] });
      queryClient.invalidateQueries({ queryKey: ["blocked-companies"] });
    },
    onError: () => {
      toast.error("Erreur lors du déblocage");
    },
  });

  const getStatusBadge = (status: string, proposedBy?: string) => {
    switch (status) {
      case "pending":
        if (proposedBy === "driver") {
          return <Badge className="bg-blue-500"><Clock className="w-3 h-3 mr-1" />En attente de réponse</Badge>;
        }
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />En attente de votre réponse</Badge>;
      case "accepted":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Actif</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Refusé</Badge>;
      case "suspended":
        return <Badge className="bg-orange-500"><AlertCircle className="w-3 h-3 mr-1" />Suspendu</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getDayLabel = (day: number, frequency: string) => {
    if (frequency === "weekly") {
      const days = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
      return days[day];
    }
    return `le ${day} du mois`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Demandes reçues de l'entreprise (le chauffeur peut accepter/refuser)
  const receivedRequests = agreements?.filter((a) => a.status === "pending" && a.proposed_by === "company") || [];
  // Demandes envoyées par le chauffeur (en attente de réponse de l'entreprise)
  const sentRequests = agreements?.filter((a) => a.status === "pending" && a.proposed_by === "driver") || [];
  const activeAgreements = agreements?.filter((a) => a.status === "accepted") || [];
  // Refusés mais non bloqués
  const rejectedAgreements = agreements?.filter((a) => 
    a.status === "rejected" && !a.driver_blocked_company && !a.company_blocked_driver
  ) || [];
  // Bloqués (par l'un ou l'autre)
  const blockedAgreements = agreements?.filter((a) => 
    a.driver_blocked_company || a.company_blocked_driver
  ) || [];
  const otherAgreements = agreements?.filter((a) => !["pending", "accepted", "rejected"].includes(a.status) && !a.driver_blocked_company && !a.company_blocked_driver) || [];
  
  const totalPending = receivedRequests.length + sentRequests.length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Partenariats Entreprises
        </h2>
        <p className="text-sm text-muted-foreground">
          Gérez vos accords avec les entreprises clientes
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="agreements" className="flex items-center gap-2">
            <Handshake className="w-4 h-4" />
            <span className="hidden sm:inline">Partenariats</span>
            <span className="sm:hidden">Partenariats</span>
            {totalPending > 0 && (
              <Badge className="bg-yellow-500 ml-1">{totalPending}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="blocked" className="flex items-center gap-2">
            <Ban className="w-4 h-4" />
            <span className="hidden sm:inline">Bloquées</span>
            <span className="sm:hidden">Bloquées</span>
            {blockedAgreements.length > 0 && (
              <Badge variant="destructive" className="ml-1">{blockedAgreements.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Rechercher
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="mt-6">
          <DriverCompanySearch driverId={driverId} />
        </TabsContent>

        {/* Blocked Companies Tab */}
        <TabsContent value="blocked" className="mt-6 space-y-4">
          {blockedAgreements.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Ban className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Aucune entreprise bloquée</h3>
                <p className="text-muted-foreground">
                  Les entreprises que vous bloquez ou qui vous bloquent apparaîtront ici
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <Alert className="bg-muted/50">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Les entreprises bloquées ne peuvent plus vous voir dans les recherches et vice-versa. 
                  Vous pouvez débloquer celles que vous avez bloquées.
                </AlertDescription>
              </Alert>
              
              {blockedAgreements.map((agreement: any) => {
                const blockedByDriver = agreement.driver_blocked_company;
                const blockedByCompany = agreement.company_blocked_driver;
                
                return (
                  <Card key={agreement.id} className="border-destructive/40">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                        <div className="flex gap-3">
                          <div className="w-14 h-14 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0 border-2 border-destructive/20">
                            <Building2 className="w-7 h-7 text-destructive" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-base">
                              {agreement.company?.company_name || "Entreprise inconnue"}
                            </h4>
                            {agreement.company?.contact_name && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {agreement.company.contact_name}
                              </p>
                            )}
                            {/* Adresse */}
                            {agreement.company?.address && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                📍 {agreement.company.address}
                              </p>
                            )}
                            {/* Contact */}
                            {agreement.company?.contact_phone && (
                              <p className="text-xs text-muted-foreground">
                                📞 {agreement.company.contact_phone}
                              </p>
                            )}
                            
                            {/* Badges de blocage */}
                            <div className="flex flex-wrap gap-2 mt-2">
                              {blockedByDriver && (
                                <Badge variant="destructive" className="text-xs">
                                  <Lock className="w-3 h-3 mr-1" />
                                  Bloquée par vous
                                  {agreement.driver_blocked_company_at && (
                                    <span className="ml-1 opacity-70">
                                      le {format(new Date(agreement.driver_blocked_company_at), "d MMM yyyy", { locale: fr })}
                                    </span>
                                  )}
                                </Badge>
                              )}
                              {blockedByCompany && (
                                <Badge variant="outline" className="text-xs border-destructive text-destructive">
                                  <EyeOff className="w-3 h-3 mr-1" />
                                  Vous a bloqué
                                  {agreement.company_blocked_driver_at && (
                                    <span className="ml-1 opacity-70">
                                      le {format(new Date(agreement.company_blocked_driver_at), "d MMM yyyy", { locale: fr })}
                                    </span>
                                  )}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2 w-full sm:w-auto">
                          {/* Débloquer seulement si bloqué par le chauffeur */}
                          {blockedByDriver && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => unblockCompany.mutate(agreement.id)}
                              disabled={unblockCompany.isPending}
                              className="w-full sm:w-auto"
                            >
                              {unblockCompany.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Unlock className="w-4 h-4 mr-1" />
                                  Débloquer
                                </>
                              )}
                            </Button>
                          )}
                          {/* Si bloqué par l'entreprise, on ne peut rien faire */}
                          {blockedByCompany && !blockedByDriver && (
                            <p className="text-xs text-muted-foreground text-center sm:text-right">
                              Seule l'entreprise peut vous débloquer
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Motif du refus si existant */}
                      {agreement.rejection_reason && (
                        <Alert className="mt-3 bg-muted/50">
                          <Info className="h-4 w-4" />
                          <AlertDescription className="text-sm">
                            <span className="font-medium">Motif initial:</span> {agreement.rejection_reason}
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="agreements" className="mt-6 space-y-6">
          {/* Demandes reçues de l'entreprise - Le chauffeur peut accepter/refuser */}
          {receivedRequests.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium text-yellow-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Propositions reçues ({receivedRequests.length})
              </h3>
              {receivedRequests.map((agreement: any) => (
                <Card key={agreement.id} className="border-yellow-500 border-2">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-4">
                      <div>
                        <h4 className="text-lg font-semibold">{agreement.company?.company_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Contact: {agreement.company?.contact_name}
                        </p>
                      </div>
                      {getStatusBadge(agreement.status, agreement.proposed_by)}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div className="p-3 sm:p-4 bg-muted rounded-lg">
                        <h5 className="font-medium mb-2 flex items-center gap-2 text-sm sm:text-base">
                          <CreditCard className="w-4 h-4" />
                          Modes de paiement proposés
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {agreement.payment_methods?.map((method: string) => (
                            <Badge key={method} variant="secondary" className="text-xs sm:text-sm">
                              {PAYMENT_METHODS.find((m) => m.value === method)?.icon}{" "}
                              {PAYMENT_METHODS.find((m) => m.value === method)?.label}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 sm:p-4 bg-muted rounded-lg">
                        <h5 className="font-medium mb-2 flex items-center gap-2 text-sm sm:text-base">
                          <Clock className="w-4 h-4" />
                          Fréquence de paiement
                        </h5>
                        <p className="font-semibold">
                          {PAYMENT_FREQUENCIES.find((f) => f.value === agreement.payment_frequency)?.label}
                        </p>
                        {agreement.payment_day && (
                          <p className="text-sm text-muted-foreground">
                            Paiement {getDayLabel(agreement.payment_day, agreement.payment_frequency)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      {agreement.credit_limit > 0 && (
                        <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                          <h5 className="font-medium mb-1 flex items-center gap-2 text-sm sm:text-base">
                            <Euro className="w-4 h-4" />
                            Limite de crédit
                          </h5>
                          <p className="text-lg font-bold">{agreement.credit_limit.toFixed(2)}€</p>
                        </div>
                      )}
                      {agreement.discount_percentage > 0 && (
                        <div className="p-3 sm:p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                          <h5 className="font-medium mb-1 text-sm sm:text-base">Remise accordée</h5>
                          <p className="text-lg font-bold text-green-600">
                            -{agreement.discount_percentage}%
                          </p>
                        </div>
                      )}
                    </div>

                    {agreement.notes && (
                      <div className="p-3 sm:p-4 bg-muted rounded-lg mb-4">
                        <h5 className="font-medium mb-1 text-sm sm:text-base">Notes et conditions</h5>
                        <p className="text-sm">{agreement.notes}</p>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                      <Button
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() => {
                          setSelectedAgreement(agreement);
                          setShowRejectDialog(true);
                        }}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Refuser
                      </Button>
                      <Button
                        className="w-full sm:w-auto"
                        onClick={() => acceptAgreement.mutate(agreement.id)}
                        disabled={acceptAgreement.isPending}
                      >
                        {acceptAgreement.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        Accepter le partenariat
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Demandes envoyées par le chauffeur - En attente de réponse de l'entreprise */}
          {sentRequests.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium text-blue-600 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Demandes envoyées ({sentRequests.length})
              </h3>
              {sentRequests.map((agreement: any) => (
                <Card key={agreement.id} className="border-blue-500 border-2">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-4">
                      <div>
                        <h4 className="text-lg font-semibold">{agreement.company?.company_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Contact: {agreement.company?.contact_name}
                        </p>
                      </div>
                      {getStatusBadge(agreement.status, agreement.proposed_by)}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div className="p-3 sm:p-4 bg-muted rounded-lg">
                        <h5 className="font-medium mb-2 flex items-center gap-2 text-sm sm:text-base">
                          <CreditCard className="w-4 h-4" />
                          Modes de paiement proposés
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {agreement.payment_methods?.map((method: string) => (
                            <Badge key={method} variant="secondary" className="text-xs sm:text-sm">
                              {PAYMENT_METHODS.find((m) => m.value === method)?.icon}{" "}
                              {PAYMENT_METHODS.find((m) => m.value === method)?.label}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 sm:p-4 bg-muted rounded-lg">
                        <h5 className="font-medium mb-2 flex items-center gap-2 text-sm sm:text-base">
                          <Clock className="w-4 h-4" />
                          Fréquence de paiement
                        </h5>
                        <p className="font-semibold">
                          {PAYMENT_FREQUENCIES.find((f) => f.value === agreement.payment_frequency)?.label}
                        </p>
                      </div>
                    </div>

                    {agreement.driver_presentation && (
                      <div className="p-3 sm:p-4 bg-muted rounded-lg mb-4">
                        <h5 className="font-medium mb-1 text-sm sm:text-base">Votre présentation</h5>
                        <p className="text-sm">{agreement.driver_presentation}</p>
                      </div>
                    )}

                    <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <p className="text-sm text-center text-blue-700 dark:text-blue-300">
                        <Clock className="w-4 h-4 inline mr-2" />
                        Votre demande est en cours d'examen par l'entreprise
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Active Agreements */}
          {activeAgreements.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium text-green-600 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Partenariats actifs ({activeAgreements.length})
              </h3>
              {activeAgreements.map((agreement: any) => (
                <ActiveDriverAgreementCard 
                  key={agreement.id}
                  agreement={agreement}
                  driverId={driverId}
                  driverInfo={driverInfo}
                  onRefresh={() => queryClient.invalidateQueries({ queryKey: ["driver-company-agreements"] })}
                />
              ))}
            </div>
          )}

          {/* Rejected Agreements - Avec affichage détaillé du motif et du blocage */}
          {rejectedAgreements.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium text-red-600 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Demandes refusées ({rejectedAgreements.length})
              </h3>
              {rejectedAgreements.map((agreement: any) => {
                const isMyRequestRejected = agreement.proposed_by === "driver";
                const rejectedDate = agreement.rejected_at 
                  ? new Date(agreement.rejected_at) 
                  : new Date(agreement.updated_at);
                
                return (
                  <Card key={agreement.id} className="border-destructive/40 bg-destructive/5">
                    <CardContent className="p-4">
                      {/* En-tête avec entreprise et statut */}
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                            <Building2 className="w-5 h-5 text-destructive" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{agreement.company?.company_name}</h4>
                            <p className="text-xs text-muted-foreground">
                              Contact: {agreement.company?.contact_name}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 items-start sm:items-end">
                          {getStatusBadge(agreement.status)}
                          {agreement.driver_blocked_company && (
                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs">
                              Entreprise bloquée
                            </Badge>
                          )}
                          {agreement.company_blocked_driver && (
                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs">
                              Vous êtes bloqué
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Informations sur le refus */}
                      <div className="p-3 rounded-lg bg-background/80 border border-destructive/20 mb-4">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">Statut:</span>
                            <span className="font-medium text-destructive">
                              {isMyRequestRejected ? "Refusée par l'entreprise" : "Refusée par vous"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">Le</span>
                            <span className="font-medium">
                              {rejectedDate.toLocaleDateString('fr-FR', { 
                                day: 'numeric', 
                                month: 'long', 
                                year: 'numeric' 
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">Origine:</span>
                            <Badge variant="outline" className="text-xs">
                              {isMyRequestRejected ? "Votre demande" : "Proposition reçue"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Motif de refus affiché clairement */}
                      {agreement.rejection_reason ? (
                        <Alert className="mb-4 bg-destructive/5 border-destructive/20">
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            <span className="font-medium">Motif du refus:</span>{" "}
                            <span className="text-foreground">{agreement.rejection_reason}</span>
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Alert className="mb-4 bg-muted/50 border-muted">
                          <Info className="h-4 w-4 text-muted-foreground" />
                          <AlertDescription className="text-muted-foreground">
                            Aucun motif de refus communiqué
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Boutons d'action */}
                      <div className="flex flex-wrap gap-2">
                        {/* Bouton pour refaire une demande */}
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full sm:w-auto"
                          onClick={() => setActiveTab("search")}
                        >
                          <Search className="w-4 h-4 mr-2" />
                          Relancer
                        </Button>
                        
                        {/* Bouton pour bloquer l'entreprise */}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => blockCompany.mutate(agreement.id)}
                          disabled={blockCompany.isPending}
                          className="w-full sm:w-auto"
                        >
                          {blockCompany.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Ban className="w-4 h-4 mr-1" />
                              Bloquer
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Other Agreements (suspended, terminated, etc.) */}
          {otherAgreements.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium text-muted-foreground">Historique</h3>
              {otherAgreements.map((agreement: any) => (
                <Card key={agreement.id} className="opacity-70">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      <div>
                        <h4 className="font-medium">{agreement.company?.company_name}</h4>
                        {agreement.termination_reason && (
                          <p className="text-sm text-muted-foreground">
                            Raison: {agreement.termination_reason}
                          </p>
                        )}
                      </div>
                      {getStatusBadge(agreement.status)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {agreements?.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Aucun partenariat entreprise</h3>
                <p className="text-muted-foreground mb-4">
                  Les entreprises peuvent vous proposer des partenariats, ou vous pouvez les rechercher
                </p>
                <Button variant="outline" onClick={() => setActiveTab("search")}>
                  <Search className="w-4 h-4 mr-2" />
                  Rechercher des entreprises
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Reject Dialog using new component */}
      <PartnershipRejectDialog
        open={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        partnerName={selectedAgreement?.company?.company_name || "cette entreprise"}
        partnerType="company"
        onReject={handleRejectAgreement}
        isLoading={isRejecting}
      />
    </div>
  );
}
