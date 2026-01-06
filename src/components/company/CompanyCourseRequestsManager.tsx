import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Plus, MapPin, Calendar, Users, Clock, CheckCircle, 
  XCircle, Send, Loader2, Euro, Car, RefreshCw, AlertTriangle,
  Copy, ExternalLink, Play
} from "lucide-react";
import { CompanyCourseBookingWizard, WizardStep } from "./course-booking";

interface CompanyCourseRequestsManagerProps {
  companyId: string;
}

export function CompanyCourseRequestsManager({ companyId }: CompanyCourseRequestsManagerProps) {
  const queryClient = useQueryClient();
  const [showWizard, setShowWizard] = useState(false);
  const [requestToResend, setRequestToResend] = useState<any>(null);
  const [requestToCancel, setRequestToCancel] = useState<any>(null);
  const [requestToResume, setRequestToResume] = useState<{ request: any; step: WizardStep } | null>(null);

  // Déterminer le step de reprise selon le statut
  const getResumeStep = (status: string): WizardStep => {
    switch (status) {
      case "draft":
        return "details"; // Brouillon, reprendre aux détails du trajet
      case "quotes_generated":
        return "quotes"; // Devis générés, aller à la sélection/envoi
      case "sent_to_drivers":
        return "confirmation"; // Envoyés, aller à la confirmation/attente
      default:
        return "drivers";
    }
  };

  // Mutation pour annuler une demande
  const cancelRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      // Annuler tous les devis associés
      await supabase
        .from("company_course_quotes")
        .update({ status: "cancelled" })
        .eq("request_id", requestId);

      // Mettre à jour le statut de la demande
      const { error } = await supabase
        .from("company_course_requests")
        .update({ status: "cancelled" })
        .eq("id", requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Demande annulée avec succès");
      queryClient.invalidateQueries({ queryKey: ["company-course-requests", companyId] });
      setRequestToCancel(null);
    },
    onError: () => {
      toast.error("Erreur lors de l'annulation");
    },
  });

  const { data: requests, isLoading, refetch } = useQuery({
    queryKey: ["company-course-requests", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_course_requests")
        .select(`
          *,
          employee:company_employees(
            user_id,
            department
          ),
          accepted_driver:drivers(
            id,
            company_name,
            user_id
          ),
          quotes:company_course_quotes(
            id,
            driver_id,
            total_price,
            status,
            driver_response_at,
            driver:drivers(user_id, company_name)
          )
        `)
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles
      const userIds = new Set<string>();
      data?.forEach((r: any) => {
        if (r.employee?.user_id) userIds.add(r.employee.user_id);
        if (r.accepted_driver?.user_id) userIds.add(r.accepted_driver.user_id);
        r.quotes?.forEach((q: any) => {
          if (q.driver?.user_id) userIds.add(q.driver.user_id);
        });
      });

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, profile_photo_url")
        .in("id", Array.from(userIds));

      // Fetch tracking invitations for guest employees
      const requestIds = data?.map((r: any) => r.id) || [];
      const { data: invitations } = await supabase
        .from("company_employee_course_invitations")
        .select("request_id, token")
        .in("request_id", requestIds);

      return data?.map((r: any) => ({
        ...r,
        employeeProfile: profiles?.find(p => p.id === r.employee?.user_id),
        driverProfile: profiles?.find(p => p.id === r.accepted_driver?.user_id),
        trackingToken: invitations?.find(i => i.request_id === r.id)?.token,
        quotesWithProfiles: r.quotes?.map((q: any) => ({
          ...q,
          profile: profiles?.find(p => p.id === q.driver?.user_id),
        })),
      })) || [];
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/30"><Clock className="w-3 h-3 mr-1" />Brouillon</Badge>;
      case "quotes_generated":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30"><Clock className="w-3 h-3 mr-1" />Devis générés</Badge>;
      case "sent_to_drivers":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30"><Send className="w-3 h-3 mr-1" />Envoyé aux chauffeurs</Badge>;
      case "accepted":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />Accepté</Badge>;
      case "all_refused":
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Tous refusés</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Annulé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getQuoteStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">En attente</Badge>;
      case "accepted":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30 text-[10px]">Accepté</Badge>;
      case "refused":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/30 text-[10px]">Refusé</Badge>;
      case "taken_by_other":
        return <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/30 text-[10px]">Non retenu</Badge>;
      default:
        return null;
    }
  };

  const copyTrackingLink = (token: string) => {
    const link = `${window.location.origin}/suivi-course-entreprise?token=${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Lien de suivi copié !");
  };

  // Séparer: en attente de réponse, confirmées/en cours, et terminées
  const pendingRequests = requests?.filter(r => ["draft", "quotes_generated", "sent_to_drivers"].includes(r.status)) || [];
  const allRefusedRequests = requests?.filter(r => r.status === "all_refused") || [];
  const acceptedRequests = requests?.filter(r => r.status === "accepted") || [];
  const completedRequests = requests?.filter(r => r.status === "cancelled") || [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderQuotesList = (quotesWithProfiles: any[]) => {
    if (!quotesWithProfiles || quotesWithProfiles.length === 0) return null;

    return (
      <div className="pt-2 border-t mt-3">
        <p className="text-sm font-medium mb-2">Chauffeurs ({quotesWithProfiles.length})</p>
        <div className="flex flex-wrap gap-2">
          {quotesWithProfiles.map((quote: any) => (
            <div 
              key={quote.id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border ${
                quote.status === "accepted" 
                  ? "bg-green-500/10 text-green-700 border-green-500/30"
                  : quote.status === "refused"
                    ? "bg-red-500/10 text-red-700 border-red-500/30"
                    : quote.status === "taken_by_other"
                      ? "bg-gray-500/10 text-gray-600 border-gray-500/30"
                      : "bg-muted border-border"
              }`}
            >
              <Avatar className="w-5 h-5">
                <AvatarImage src={quote.profile?.profile_photo_url} />
                <AvatarFallback className="text-[10px]">
                  {quote.profile?.full_name?.charAt(0) || "C"}
                </AvatarFallback>
              </Avatar>
              <span>{quote.profile?.full_name || quote.driver?.company_name || "Chauffeur"}</span>
              <span className="font-medium">{quote.total_price?.toFixed(0)}€</span>
              {getQuoteStatusBadge(quote.status)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderRequestCard = (request: any) => (
    <Card key={request.id} className="mb-4">
      <CardContent className="pt-4">
        <div className="flex flex-col gap-4">
          <div className="flex-1 space-y-3">
            {/* Status and Date */}
            <div className="flex items-center gap-3 flex-wrap">
              {getStatusBadge(request.status)}
              <span className="text-sm text-muted-foreground">
                {format(new Date(request.scheduled_date), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
              </span>
            </div>

            {/* Employee */}
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="font-medium">
                {request.is_guest_employee 
                  ? `${request.guest_employee_name} (non-inscrit)`
                  : request.employeeProfile?.full_name || "Collaborateur"
                }
              </span>
            </div>

            {/* Addresses */}
            <div className="space-y-1 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="truncate">{request.pickup_address}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <span className="truncate">{request.destination_address}</span>
              </div>
            </div>

            {/* Tracking link for guest employees */}
            {request.is_guest_employee && request.trackingToken && (
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Lien de suivi</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="ml-auto h-7"
                  onClick={() => copyTrackingLink(request.trackingToken)}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copier
                </Button>
              </div>
            )}

            {/* Quotes info */}
            {renderQuotesList(request.quotesWithProfiles)}

            {/* Accepted driver */}
            {request.status === "accepted" && request.driverProfile && (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm">Accepté par <strong>{request.driverProfile.full_name}</strong></span>
              </div>
            )}

            {/* All refused - action to resend */}
            {request.status === "all_refused" && (
              <div className="flex flex-col gap-2 p-3 bg-red-500/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-red-700">Tous les chauffeurs ont refusé cette demande</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setRequestToResend(request)}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Renvoyer à d'autres chauffeurs
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setRequestToCancel(request)}
                  >
                    <XCircle className="w-3 h-3 mr-1" />
                    Annuler la demande
                  </Button>
                </div>
              </div>
            )}

            {/* Actions for draft/quotes_generated - allow resume */}
            {["draft", "quotes_generated"].includes(request.status) && (
              <div className="flex justify-end gap-2 pt-2 flex-wrap">
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => setRequestToResume({ 
                    request, 
                    step: getResumeStep(request.status) 
                  })}
                >
                  <Play className="w-3 h-3 mr-1" />
                  Reprendre
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setRequestToCancel(request)}
                >
                  <XCircle className="w-3 h-3 mr-1" />
                  Annuler
                </Button>
              </div>
            )}

            {/* Actions for sent_to_drivers - only cancel, no resume */}
            {request.status === "sent_to_drivers" && (
              <div className="flex justify-end gap-2 pt-2 flex-wrap">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setRequestToCancel(request)}
                >
                  <XCircle className="w-3 h-3 mr-1" />
                  Annuler
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Car className="w-5 h-5 text-primary" />
            Demandes de courses
          </h2>
          <p className="text-sm text-muted-foreground">
            Gérez les réservations pour vos collaborateurs
          </p>
        </div>
        
        <Dialog open={showWizard} onOpenChange={setShowWizard}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nouvelle course
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Réserver une course</DialogTitle>
            </DialogHeader>
            <CompanyCourseBookingWizard 
              companyId={companyId}
              onClose={() => setShowWizard(false)}
              onSuccess={() => {
                setShowWizard(false);
                refetch();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {requests && requests.length > 0 ? (
        <Tabs defaultValue="pending">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending" className="relative text-xs sm:text-sm">
              En attente
              {(pendingRequests.length + allRefusedRequests.length) > 0 && (
                <Badge className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5 p-0 flex items-center justify-center text-[10px] sm:text-xs">
                  {pendingRequests.length + allRefusedRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="accepted" className="relative text-xs sm:text-sm">
              Confirmées
              {acceptedRequests.length > 0 && (
                <Badge className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5 p-0 flex items-center justify-center text-[10px] sm:text-xs bg-green-600">
                  {acceptedRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-xs sm:text-sm">Historique</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4 space-y-4">
            {/* All refused requests - prioritize display */}
            {allRefusedRequests.length > 0 && (
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2 text-red-600 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  Demandes refusées ({allRefusedRequests.length})
                </h3>
                {allRefusedRequests.map(renderRequestCard)}
              </div>
            )}

            {/* Pending requests */}
            {pendingRequests.length > 0 && (
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-amber-500" />
                  En attente de réponse ({pendingRequests.length})
                </h3>
                {pendingRequests.map(renderRequestCard)}
              </div>
            )}

            {pendingRequests.length === 0 && allRefusedRequests.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Aucune demande en attente</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="accepted" className="mt-4 space-y-4">
            {acceptedRequests.length > 0 ? (
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  Courses confirmées ({acceptedRequests.length})
                </h3>
                {acceptedRequests.map((request) => (
                  <Card key={request.id} className="mb-4 border-green-500/30 bg-green-500/5">
                    <CardContent className="pt-4 space-y-4">
                      {/* Header with status */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <Badge className="bg-green-600 text-white">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Confirmée
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(request.scheduled_date), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
                        </span>
                      </div>

                      {/* Driver info */}
                      {request.driverProfile && (
                        <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={request.driverProfile.profile_photo_url} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {request.driverProfile.full_name?.charAt(0) || "C"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-semibold">{request.driverProfile.full_name}</p>
                            <p className="text-sm text-muted-foreground">Chauffeur assigné</p>
                          </div>
                          {request.quotesWithProfiles?.find((q: any) => q.status === "accepted")?.total_price && (
                            <div className="text-right">
                              <p className="text-lg font-bold text-primary">
                                {request.quotesWithProfiles.find((q: any) => q.status === "accepted")?.total_price?.toFixed(2)} €
                              </p>
                              <p className="text-xs text-muted-foreground">Prix confirmé</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Employee */}
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-primary" />
                        <span>
                          <strong>Collaborateur :</strong> {request.is_guest_employee 
                            ? `${request.guest_employee_name} (non-inscrit)`
                            : request.employeeProfile?.full_name || "Collaborateur"
                          }
                        </span>
                      </div>

                      {/* Addresses */}
                      <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Départ</p>
                            <p className="font-medium">{request.pickup_address}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Arrivée</p>
                            <p className="font-medium">{request.destination_address}</p>
                          </div>
                        </div>
                      </div>

                      {/* Tracking link for guest employees */}
                      {request.is_guest_employee && request.trackingToken && (
                        <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                          <ExternalLink className="w-4 h-4 text-primary" />
                          <span className="text-sm flex-1">Lien de suivi collaborateur</span>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-8"
                            onClick={() => copyTrackingLink(request.trackingToken)}
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Copier
                          </Button>
                        </div>
                      )}

                      {/* Timeline */}
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground mb-2">Historique</p>
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground"></div>
                            <span>Demande créée le {format(new Date(request.created_at), "d MMM à HH:mm", { locale: fr })}</span>
                          </div>
                          {request.quotes_generated_at && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                              <span>Devis générés le {format(new Date(request.quotes_generated_at), "d MMM à HH:mm", { locale: fr })}</span>
                            </div>
                          )}
                          {request.sent_to_drivers_at && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                              <span>Envoyé aux chauffeurs le {format(new Date(request.sent_to_drivers_at), "d MMM à HH:mm", { locale: fr })}</span>
                            </div>
                          )}
                          {request.accepted_at && (
                            <div className="flex items-center gap-2 text-green-600 font-medium">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                              <span>Accepté le {format(new Date(request.accepted_at), "d MMM à HH:mm", { locale: fr })}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Aucune course confirmée</p>
                <p className="text-sm mt-1">Les courses acceptées par un chauffeur apparaîtront ici</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-4">
            {completedRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Aucune demande dans l'historique</p>
              </div>
            ) : (
              completedRequests.map(renderRequestCard)
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Car className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Aucune demande de course</h3>
            <p className="text-muted-foreground mb-4">
              Créez votre première demande de course pour vos collaborateurs
            </p>
            <Button onClick={() => setShowWizard(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Nouvelle course
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog to resend to other drivers */}
      <Dialog open={!!requestToResend} onOpenChange={() => setRequestToResend(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Renvoyer la demande</DialogTitle>
            <DialogDescription>
              Sélectionnez d'autres chauffeurs partenaires pour cette course
            </DialogDescription>
          </DialogHeader>
          {requestToResend && (
            <CompanyCourseBookingWizard 
              companyId={companyId}
              existingRequest={requestToResend}
              onClose={() => setRequestToResend(null)}
              onSuccess={() => {
                setRequestToResend(null);
                refetch();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog to confirm cancellation */}
      <Dialog open={!!requestToCancel} onOpenChange={() => setRequestToCancel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Annuler cette demande ?</DialogTitle>
            <DialogDescription>
              Cette action annulera la demande de course et tous les devis associés. Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          {requestToCancel && (
            <div className="space-y-3 py-2">
              <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                <p><strong>Collaborateur :</strong> {requestToCancel.is_guest_employee ? requestToCancel.guest_employee_name : requestToCancel.employeeProfile?.full_name}</p>
                <p><strong>Date :</strong> {format(new Date(requestToCancel.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}</p>
                <p><strong>Trajet :</strong> {requestToCancel.pickup_address} → {requestToCancel.destination_address}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestToCancel(null)}>
              Retour
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => requestToCancel && cancelRequestMutation.mutate(requestToCancel.id)}
              disabled={cancelRequestMutation.isPending}
            >
              {cancelRequestMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Annuler la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog to resume a request */}
      <Dialog open={!!requestToResume} onOpenChange={() => setRequestToResume(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reprendre la demande</DialogTitle>
            <DialogDescription>
              Continuez le processus de réservation là où vous l'aviez laissé
            </DialogDescription>
          </DialogHeader>
          {requestToResume && (
            <CompanyCourseBookingWizard 
              companyId={companyId}
              existingRequest={requestToResume.request}
              resumeStep={requestToResume.step}
              onClose={() => setRequestToResume(null)}
              onSuccess={() => {
                setRequestToResume(null);
                refetch();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
