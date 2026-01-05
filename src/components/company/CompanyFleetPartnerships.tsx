import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { 
  Loader2, Search, Users, CheckCircle, XCircle, 
  Clock, Send, Inbox, Ban, Info, Unlock, Lock, MapPin, Handshake
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CompanyFleetSearch } from "./CompanyFleetSearch";

interface CompanyFleetPartnershipsProps {
  companyId: string;
  companyProfile: {
    company_name: string;
    contact_name?: string;
    employee_count?: number;
    preferred_vehicle_types?: string[];
  };
}

export function CompanyFleetPartnerships({ companyId, companyProfile }: CompanyFleetPartnershipsProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("search");

  // Fetch existing fleet agreements
  const { data: agreements, isLoading: loadingAgreements } = useQuery({
    queryKey: ["company-fleet-agreements-full", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_fleet_agreements")
        .select(`
          *,
          fleet_manager:fleet_managers(
            id,
            company_name,
            logo_url,
            address,
            user_id,
            services_offered,
            description
          )
        `)
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Unblock fleet mutation
  const unblockFleet = useMutation({
    mutationFn: async (agreementId: string) => {
      const { error } = await supabase
        .from("company_fleet_agreements")
        .update({
          status: "rejected",
        })
        .eq("id", agreementId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Gestionnaire de flotte débloqué");
      queryClient.invalidateQueries({ queryKey: ["company-fleet-agreements-full"] });
    },
    onError: () => {
      toast.error("Erreur lors du déblocage");
    },
  });

  // Accept fleet proposal
  const acceptProposal = useMutation({
    mutationFn: async (agreementId: string) => {
      const { error } = await supabase
        .from("company_fleet_agreements")
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
      queryClient.invalidateQueries({ queryKey: ["company-fleet-agreements-full"] });
    },
    onError: () => {
      toast.error("Erreur lors de l'acceptation");
    },
  });

  // Reject fleet proposal
  const rejectProposal = useMutation({
    mutationFn: async (agreementId: string) => {
      const { error } = await supabase
        .from("company_fleet_agreements")
        .update({
          status: "rejected",
          rejected_at: new Date().toISOString(),
        })
        .eq("id", agreementId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Proposition refusée");
      queryClient.invalidateQueries({ queryKey: ["company-fleet-agreements-full"] });
    },
    onError: () => {
      toast.error("Erreur lors du refus");
    },
  });

  // Filter agreements by status
  const receivedPending = agreements?.filter(
    (a) => a.status === "pending" && a.proposed_by === "fleet_manager"
  ) || [];
  
  const sentPending = agreements?.filter(
    (a) => a.status === "pending" && a.proposed_by === "company"
  ) || [];
  
  const activeAgreements = agreements?.filter(
    (a) => a.status === "accepted"
  ) || [];
  
  const blockedAgreements = agreements?.filter(
    (a) => a.status === "blocked"
  ) || [];
  
  const rejectedAgreements = agreements?.filter(
    (a) => a.status === "rejected"
  ) || [];
  
  const terminatedAgreements = agreements?.filter(
    (a) => a.status === "terminated" || a.status === "suspended"
  ) || [];

  const getStatusBadge = (status: string, proposedBy: string) => {
    switch (status) {
      case "pending":
        return proposedBy === "fleet_manager" ? (
          <Badge className="bg-blue-500"><Inbox className="w-3 h-3 mr-1" />Reçue</Badge>
        ) : (
          <Badge className="bg-yellow-500"><Send className="w-3 h-3 mr-1" />Envoyée</Badge>
        );
      case "accepted":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Actif</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Refusé</Badge>;
      case "blocked":
        return <Badge variant="destructive"><Ban className="w-3 h-3 mr-1" />Bloqué</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loadingAgreements) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users className="w-5 h-5" />
          Partenariats Gestionnaires de Flotte
        </h2>
        <p className="text-sm text-muted-foreground">
          Gérez vos partenariats avec les gestionnaires de flotte VTC
        </p>
      </div>

      {/* Navigation Grid 3x2 */}
      <div className="grid grid-cols-3 gap-2">
        {/* Row 1 */}
        <button
          onClick={() => setActiveTab("search")}
          className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
            activeTab === "search"
              ? "bg-primary/10 border-primary text-primary shadow-md"
              : "bg-muted/50 border-transparent hover:bg-muted hover:border-muted-foreground/20"
          }`}
        >
          <div className={`p-2 rounded-lg ${activeTab === "search" ? "bg-primary/20" : "bg-background"}`}>
            <Search className="w-5 h-5" />
          </div>
          <span className="text-xs font-medium">Rechercher</span>
        </button>

        <button
          onClick={() => setActiveTab("received")}
          className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 transition-all relative ${
            activeTab === "received"
              ? "bg-blue-500/10 border-blue-500 text-blue-600 shadow-md"
              : "bg-muted/50 border-transparent hover:bg-muted hover:border-muted-foreground/20"
          }`}
        >
          <div className={`p-2 rounded-lg relative ${activeTab === "received" ? "bg-blue-500/20" : "bg-background"}`}>
            <Inbox className="w-5 h-5" />
            {receivedPending.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {receivedPending.length}
              </span>
            )}
          </div>
          <span className="text-xs font-medium">Reçues</span>
        </button>

        <button
          onClick={() => setActiveTab("sent")}
          className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 transition-all relative ${
            activeTab === "sent"
              ? "bg-yellow-500/10 border-yellow-500 text-yellow-600 shadow-md"
              : "bg-muted/50 border-transparent hover:bg-muted hover:border-muted-foreground/20"
          }`}
        >
          <div className={`p-2 rounded-lg relative ${activeTab === "sent" ? "bg-yellow-500/20" : "bg-background"}`}>
            <Send className="w-5 h-5" />
            {sentPending.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {sentPending.length}
              </span>
            )}
          </div>
          <span className="text-xs font-medium">Envoyées</span>
        </button>

        {/* Row 2 */}
        <button
          onClick={() => setActiveTab("active")}
          className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 transition-all relative ${
            activeTab === "active"
              ? "bg-green-500/10 border-green-500 text-green-600 shadow-md"
              : "bg-muted/50 border-transparent hover:bg-muted hover:border-muted-foreground/20"
          }`}
        >
          <div className={`p-2 rounded-lg relative ${activeTab === "active" ? "bg-green-500/20" : "bg-background"}`}>
            <Handshake className="w-5 h-5" />
            {activeAgreements.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {activeAgreements.length}
              </span>
            )}
          </div>
          <span className="text-xs font-medium">Actifs</span>
        </button>

        <button
          onClick={() => setActiveTab("blocked")}
          className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 transition-all relative ${
            activeTab === "blocked"
              ? "bg-destructive/10 border-destructive text-destructive shadow-md"
              : "bg-muted/50 border-transparent hover:bg-muted hover:border-muted-foreground/20"
          }`}
        >
          <div className={`p-2 rounded-lg relative ${activeTab === "blocked" ? "bg-destructive/20" : "bg-background"}`}>
            <Ban className="w-5 h-5" />
            {blockedAgreements.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {blockedAgreements.length}
              </span>
            )}
          </div>
          <span className="text-xs font-medium">Bloqués</span>
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
            activeTab === "history"
              ? "bg-muted border-muted-foreground/50 shadow-md"
              : "bg-muted/50 border-transparent hover:bg-muted hover:border-muted-foreground/20"
          }`}
        >
          <div className={`p-2 rounded-lg ${activeTab === "history" ? "bg-muted-foreground/20" : "bg-background"}`}>
            <Clock className="w-5 h-5" />
          </div>
          <span className="text-xs font-medium">Historique</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "search" && (
        <CompanyFleetSearch companyId={companyId} companyProfile={companyProfile} />
      )}

      {activeTab === "received" && (
        <div className="space-y-4">
          {receivedPending.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Inbox className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Aucune proposition reçue</h3>
                <p className="text-muted-foreground">
                  Les gestionnaires de flotte peuvent vous envoyer des propositions de partenariat
                </p>
              </CardContent>
            </Card>
          ) : (
            receivedPending.map((agreement) => (
              <Card key={agreement.id} className="border-blue-500 border-2">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={agreement.fleet_manager?.logo_url} />
                        <AvatarFallback>
                          <Users className="w-6 h-6" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-semibold">{agreement.fleet_manager?.company_name}</h4>
                        {agreement.fleet_manager?.address && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {agreement.fleet_manager.address}
                          </p>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(agreement.status, agreement.proposed_by)}
                  </div>
                  
                  {agreement.proposal_message && (
                    <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                      {agreement.proposal_message}
                    </p>
                  )}
                  
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => rejectProposal.mutate(agreement.id)}
                      disabled={rejectProposal.isPending}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Refuser
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => acceptProposal.mutate(agreement.id)}
                      disabled={acceptProposal.isPending}
                    >
                      {acceptProposal.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Accepter
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === "sent" && (
        <div className="space-y-4">
          {sentPending.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Send className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Aucune proposition envoyée</h3>
                <p className="text-muted-foreground">
                  Vos propositions de partenariat en attente apparaîtront ici
                </p>
              </CardContent>
            </Card>
          ) : (
            sentPending.map((agreement) => (
              <Card key={agreement.id} className="border-yellow-500 border-2">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={agreement.fleet_manager?.logo_url} />
                        <AvatarFallback>
                          <Users className="w-6 h-6" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-semibold">{agreement.fleet_manager?.company_name}</h4>
                        {agreement.fleet_manager?.address && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {agreement.fleet_manager.address}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Envoyée le {format(new Date(agreement.created_at), "d MMM yyyy", { locale: fr })}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(agreement.status, agreement.proposed_by)}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === "active" && (
        <div className="space-y-4">
          {activeAgreements.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Handshake className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Aucun partenariat actif</h3>
                <p className="text-muted-foreground">
                  Vos partenariats avec les gestionnaires de flotte apparaîtront ici
                </p>
              </CardContent>
            </Card>
          ) : (
            activeAgreements.map((agreement) => (
              <Card key={agreement.id} className="border-green-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <Avatar className="w-14 h-14">
                        <AvatarImage src={agreement.fleet_manager?.logo_url} />
                        <AvatarFallback>
                          <Users className="w-7 h-7" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-semibold text-lg">{agreement.fleet_manager?.company_name}</h4>
                        {agreement.fleet_manager?.address && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {agreement.fleet_manager.address}
                          </p>
                        )}
                        {agreement.fleet_manager?.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {agreement.fleet_manager.description}
                          </p>
                        )}
                        <p className="text-xs text-green-600 mt-2">
                          Partenariat depuis le {format(new Date(agreement.accepted_at || agreement.created_at), "d MMM yyyy", { locale: fr })}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(agreement.status, agreement.proposed_by)}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === "blocked" && (
        <div className="space-y-4">
          {blockedAgreements.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Ban className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Aucun gestionnaire bloqué</h3>
                <p className="text-muted-foreground">
                  Les gestionnaires que vous bloquez apparaîtront ici
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <Alert className="bg-muted/50">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Les gestionnaires bloqués ne peuvent plus vous voir dans les recherches et vice-versa.
                </AlertDescription>
              </Alert>
              
              {blockedAgreements.map((agreement) => (
                <Card key={agreement.id} className="border-destructive/40">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3">
                        <Avatar className="w-14 h-14 border-2 border-destructive/20">
                          <AvatarImage src={agreement.fleet_manager?.logo_url} />
                          <AvatarFallback className="bg-destructive/10">
                            <Users className="w-7 h-7 text-destructive" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold">{agreement.fleet_manager?.company_name}</h4>
                          {agreement.fleet_manager?.address && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {agreement.fleet_manager.address}
                            </p>
                          )}
                          <Badge variant="destructive" className="mt-2">
                            <Lock className="w-3 h-3 mr-1" />
                            Bloqué
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => unblockFleet.mutate(agreement.id)}
                        disabled={unblockFleet.isPending}
                      >
                        {unblockFleet.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Unlock className="w-4 h-4 mr-1" />
                            Débloquer
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-4">
          {rejectedAgreements.length === 0 && terminatedAgreements.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Aucun historique</h3>
                <p className="text-muted-foreground">
                  Les partenariats refusés ou terminés apparaîtront ici
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {rejectedAgreements.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium text-muted-foreground">Refusés</h3>
                  {rejectedAgreements.map((agreement) => (
                    <Card key={agreement.id} className="border-destructive/30">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex gap-3">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={agreement.fleet_manager?.logo_url} />
                              <AvatarFallback>
                                <Users className="w-6 h-6" />
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-semibold">{agreement.fleet_manager?.company_name}</h4>
                              {agreement.fleet_manager?.address && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {agreement.fleet_manager.address}
                                </p>
                              )}
                              <p className="text-xs text-destructive mt-1">
                                Refusé le {format(new Date(agreement.rejected_at || agreement.updated_at), "d MMM yyyy", { locale: fr })}
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(agreement.status, agreement.proposed_by)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              
              {terminatedAgreements.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium text-muted-foreground">Terminés</h3>
                  {terminatedAgreements.map((agreement) => (
                    <Card key={agreement.id} className="opacity-70">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div className="flex gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={agreement.fleet_manager?.logo_url} />
                              <AvatarFallback>
                                <Users className="w-5 h-5" />
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-medium">{agreement.fleet_manager?.company_name}</h4>
                              <p className="text-xs text-muted-foreground">
                                {agreement.termination_reason || "Partenariat terminé"}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">{agreement.status}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
