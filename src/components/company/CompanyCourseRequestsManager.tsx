import { useState, useEffect } from "react";
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
  Copy, ExternalLink, Play, Phone, Mail, ChevronDown, ChevronUp
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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

  // Realtime subscription pour synchronisation instantanée
  // Note: on désactive les invalidations quand le wizard est ouvert pour éviter les rechargements intempestifs
  useEffect(() => {
    const channel = supabase
      .channel('company-course-requests-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'company_course_requests',
          filter: `company_id=eq.${companyId}`
        },
        () => {
          // Ne pas invalider si le wizard est ouvert (évite le reset du wizard)
          if (!showWizard && !requestToResend && !requestToResume) {
            queryClient.invalidateQueries({ queryKey: ["company-course-requests", companyId] });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'company_course_quotes'
        },
        () => {
          // Ne pas invalider si le wizard est ouvert
          if (!showWizard && !requestToResend && !requestToResume) {
            queryClient.invalidateQueries({ queryKey: ["company-course-requests", companyId] });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'courses'
        },
        () => {
          // Ne pas invalider si le wizard est ouvert
          if (!showWizard && !requestToResend && !requestToResume) {
            queryClient.invalidateQueries({ queryKey: ["company-course-requests", companyId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, queryClient, showWizard, requestToResend, requestToResume]);

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
            user_id,
            contact_phone,
            contact_email,
            show_phone,
            show_email
          ),
          quotes:company_course_quotes(
            id,
            driver_id,
            total_price,
            status,
            driver_response_at,
            driver:drivers(user_id, company_name, contact_phone, contact_email, show_phone, show_email)
          ),
          final_course:courses(
            id,
            status,
            driver_id,
            updated_at
          )
        `)
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles - include final_course driver
      const userIds = new Set<string>();
      const courseDriverIds = new Set<string>();
      
      data?.forEach((r: any) => {
        if (r.employee?.user_id) userIds.add(r.employee.user_id);
        if (r.accepted_driver?.user_id) userIds.add(r.accepted_driver.user_id);
        r.quotes?.forEach((q: any) => {
          if (q.driver?.user_id) userIds.add(q.driver.user_id);
        });
        // Collect course driver IDs
        if (r.final_course?.driver_id) {
          courseDriverIds.add(r.final_course.driver_id);
        }
      });

      // Fetch course drivers separately
      let courseDrivers: any[] = [];
      if (courseDriverIds.size > 0) {
        const { data: driversData } = await supabase
          .from("drivers")
          .select("id, user_id, company_name, contact_phone, contact_email, show_phone, show_email")
          .in("id", Array.from(courseDriverIds));
        courseDrivers = driversData || [];
        
        // Add their user_ids to fetch profiles
        courseDrivers.forEach(d => {
          if (d.user_id) userIds.add(d.user_id);
        });
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, profile_photo_url, phone, email")
        .in("id", Array.from(userIds));

      // Fetch tracking invitations for guest employees
      const requestIds = data?.map((r: any) => r.id) || [];
      const { data: invitations } = await supabase
        .from("company_employee_course_invitations")
        .select("request_id, token")
        .in("request_id", requestIds);

      return data?.map((r: any) => {
        // Get course driver info
        const courseDriver = courseDrivers.find(d => d.id === r.final_course?.driver_id);
        const courseDriverProfile = courseDriver ? profiles?.find(p => p.id === courseDriver.user_id) : null;
        
        return {
          ...r,
          employeeProfile: profiles?.find(p => p.id === r.employee?.user_id),
          driverProfile: profiles?.find(p => p.id === r.accepted_driver?.user_id),
          // Add course driver info for real-time status tracking
          courseDriver: courseDriver ? {
            ...courseDriver,
            profile: courseDriverProfile
          } : null,
          trackingToken: invitations?.find(i => i.request_id === r.id)?.token,
          quotesWithProfiles: r.quotes?.map((q: any) => ({
            ...q,
            profile: profiles?.find(p => p.id === q.driver?.user_id),
          })),
        };
      }) || [];
    },
  });

  const getStatusBadge = (status: string, courseStatus?: string) => {
    // Vérifier d'abord le statut de la course finale
    if (courseStatus === "in_progress") {
      return <Badge className="bg-blue-600 text-white"><Play className="w-3 h-3 mr-1" />En cours</Badge>;
    }
    if (courseStatus === "completed") {
      return <Badge className="bg-green-600 text-white"><CheckCircle className="w-3 h-3 mr-1" />Terminée</Badge>;
    }
    
    switch (status) {
      case "draft":
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/30"><Clock className="w-3 h-3 mr-1" />Brouillon</Badge>;
      case "quotes_generated":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30"><Clock className="w-3 h-3 mr-1" />Devis générés</Badge>;
      case "sent_to_drivers":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30"><Send className="w-3 h-3 mr-1" />Envoyé aux chauffeurs</Badge>;
      case "accepted":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />Chauffeur confirmé</Badge>;
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
  // Prendre en compte le statut de la course finale (completed = historique)
  const pendingRequests = requests?.filter(r => ["draft", "quotes_generated", "sent_to_drivers"].includes(r.status)) || [];
  const allRefusedRequests = requests?.filter(r => r.status === "all_refused") || [];
  // Courses acceptées mais pas encore terminées (course en cours ou confirmée)
  const acceptedRequests = requests?.filter(r => 
    r.status === "accepted" && 
    r.final_course?.status !== "completed" && 
    r.final_course?.status !== "cancelled"
  ) || [];
  // Historique: annulées OU terminées (course.status === completed)
  const completedRequests = requests?.filter(r => 
    r.status === "cancelled" || 
    (r.status === "accepted" && (r.final_course?.status === "completed" || r.final_course?.status === "cancelled"))
  ) || [];

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
              <span className="font-medium">{quote.total_price?.toFixed(2)}€</span>
              {getQuoteStatusBadge(quote.status)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Composant de carte repliable pour les demandes
  const CollapsibleRequestCard = ({ request }: { request: any }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const courseStatus = request.final_course?.status;
    const isCompleted = courseStatus === "completed" || courseStatus === "cancelled";
    const isInProgress = courseStatus === "in_progress";
    
    // Informations essentielles pour l'affichage compact
    const employeeName = request.is_guest_employee 
      ? request.guest_employee_name 
      : request.employeeProfile?.full_name || "Collaborateur";
    const acceptedPrice = request.quotesWithProfiles?.find((q: any) => q.status === "accepted")?.total_price;
    
    return (
      <Card className={`mb-3 ${
        isCompleted ? 'bg-green-500/5 border-green-500/20' : 
        isInProgress ? 'bg-blue-500/5 border-blue-500/20' : ''
      }`}>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          {/* En-tête compact cliquable */}
          <CollapsibleTrigger asChild>
            <CardContent className="pt-3 pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                {/* Status badge */}
                <div className="flex-shrink-0">
                  {getStatusBadge(request.status, courseStatus)}
                </div>
                
                {/* Infos principales */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">{employeeName}</span>
                    {request.is_guest_employee && (
                      <span className="text-xs text-muted-foreground">(non-inscrit)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <Calendar className="w-3 h-3 flex-shrink-0" />
                    <span>{format(new Date(request.scheduled_date), "d MMM 'à' HH:mm", { locale: fr })}</span>
                    {acceptedPrice && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span className="font-medium text-primary">{acceptedPrice.toFixed(2)} €</span>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Chevron */}
                <div className="flex-shrink-0">
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardContent>
          </CollapsibleTrigger>
          
          {/* Contenu déplié */}
          <CollapsibleContent>
            <CardContent className="pt-0 pb-4 border-t">
              <div className="space-y-3 pt-3">
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
                      onClick={(e) => {
                        e.stopPropagation();
                        copyTrackingLink(request.trackingToken);
                      }}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copier
                    </Button>
                  </div>
                )}

                {/* Timeline de progression */}
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Progression</p>
                  <div className="space-y-2">
                    {/* Demande créée */}
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0" />
                      <span className="text-xs font-medium flex-1">Demande créée</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(request.created_at), "d/MM HH:mm")}
                      </span>
                    </div>
                    {/* Devis générés */}
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        ["quotes_generated", "sent_to_drivers", "accepted"].includes(request.status) || courseStatus
                          ? "bg-primary" : "bg-muted-foreground/30"
                      }`} />
                      <span className={`text-xs flex-1 ${
                        ["quotes_generated", "sent_to_drivers", "accepted"].includes(request.status) || courseStatus
                          ? "font-medium" : "text-muted-foreground"
                      }`}>Devis générés</span>
                      {request.quotes_generated_at && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(request.quotes_generated_at), "d/MM HH:mm")}
                        </span>
                      )}
                    </div>
                    {/* Envoyé aux chauffeurs */}
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        ["sent_to_drivers", "accepted"].includes(request.status) || courseStatus
                          ? "bg-primary" : "bg-muted-foreground/30"
                      }`} />
                      <span className={`text-xs flex-1 ${
                        ["sent_to_drivers", "accepted"].includes(request.status) || courseStatus
                          ? "font-medium" : "text-muted-foreground"
                      }`}>Envoyé au(x) chauffeur(s)</span>
                      {request.sent_to_drivers_at && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(request.sent_to_drivers_at), "d/MM HH:mm")}
                        </span>
                      )}
                    </div>
                    {/* Chauffeur confirmé */}
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        request.status === "accepted" || courseStatus
                          ? "bg-primary" : "bg-muted-foreground/30"
                      }`} />
                      <span className={`text-xs flex-1 ${
                        request.status === "accepted" || courseStatus
                          ? "font-medium" : "text-muted-foreground"
                      }`}>Chauffeur confirmé</span>
                      {request.accepted_at && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(request.accepted_at), "d/MM HH:mm")}
                        </span>
                      )}
                    </div>
                    {/* Course en cours */}
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        courseStatus === "in_progress" || courseStatus === "completed"
                          ? "bg-blue-500" : "bg-muted-foreground/30"
                      }`} />
                      <span className={`text-xs flex-1 ${
                        courseStatus === "in_progress" || courseStatus === "completed"
                          ? "font-medium text-blue-600" : "text-muted-foreground"
                      }`}>Course en cours</span>
                      {request.final_course?.started_at && (courseStatus === "in_progress" || courseStatus === "completed") && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(request.final_course.started_at), "d/MM HH:mm")}
                        </span>
                      )}
                    </div>
                    {/* Course terminée */}
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        courseStatus === "completed"
                          ? "bg-green-500" : "bg-muted-foreground/30"
                      }`} />
                      <span className={`text-xs flex-1 ${
                        courseStatus === "completed"
                          ? "font-medium text-green-600" : "text-muted-foreground"
                      }`}>Course terminée</span>
                      {request.final_course?.updated_at && courseStatus === "completed" && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(request.final_course.updated_at), "d/MM HH:mm")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quotes info */}
                {renderQuotesList(request.quotesWithProfiles)}

                {/* Driver info - use courseDriver for in_progress/completed, otherwise accepted_driver */}
                {(request.status === "accepted" || isInProgress || isCompleted) && (() => {
                  const driver = request.courseDriver || request.accepted_driver;
                  const profile = request.courseDriver?.profile || request.driverProfile;
                  
                  if (!driver && !profile) return null;
                  
                  const bgColor = isInProgress ? 'bg-blue-500/10' : 'bg-green-500/10';
                  const borderColor = isInProgress ? 'border-blue-500/20' : 'border-green-500/20';
                  const fallbackBgColor = isInProgress ? 'bg-blue-600/20 text-blue-600' : 'bg-green-600/20 text-green-600';
                  
                  const phoneNumber = (driver?.show_phone && driver?.contact_phone) 
                    ? driver.contact_phone 
                    : profile?.phone;
                  const emailAddress = (driver?.show_email && driver?.contact_email) 
                    ? driver.contact_email 
                    : profile?.email;
                  
                  const showPhone = driver?.show_phone || !!profile?.phone;
                  const showEmail = driver?.show_email || !!profile?.email;
                  
                  return (
                    <div className={`p-3 ${bgColor} rounded-lg space-y-2`}>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={profile?.profile_photo_url} />
                          <AvatarFallback className={`${fallbackBgColor} text-sm`}>
                            {profile?.full_name?.charAt(0) || driver?.company_name?.charAt(0) || "C"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <span className="text-sm font-medium">{profile?.full_name || driver?.company_name || "Chauffeur"}</span>
                          {driver?.company_name && profile?.full_name && (
                            <p className="text-xs text-muted-foreground">{driver.company_name}</p>
                          )}
                          {isInProgress && (
                            <p className="text-xs text-blue-600 font-medium">🚗 En route</p>
                          )}
                        </div>
                        {acceptedPrice && (
                          <span className="text-sm font-bold text-primary">
                            {acceptedPrice.toFixed(2)} €
                          </span>
                        )}
                      </div>
                      {/* Contact buttons */}
                      {(showPhone || showEmail) && (phoneNumber || emailAddress) && (
                        <div className={`flex gap-2 flex-wrap pt-2 border-t ${borderColor}`}>
                          {showPhone && phoneNumber && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="flex-1 min-w-[100px] h-8 text-xs"
                              asChild
                            >
                              <a href={`tel:${phoneNumber}`} onClick={(e) => e.stopPropagation()}>
                                <Phone className="w-3 h-3 mr-1" />
                                Appeler
                              </a>
                            </Button>
                          )}
                          {showEmail && emailAddress && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="flex-1 min-w-[100px] h-8 text-xs"
                              asChild
                            >
                              <a href={`mailto:${emailAddress}`} onClick={(e) => e.stopPropagation()}>
                                <Mail className="w-3 h-3 mr-1" />
                                Email
                              </a>
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* All refused - action to resend */}
                {request.status === "all_refused" && (
                  <div className="flex flex-col gap-2 p-3 bg-red-500/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span className="text-sm text-red-700">Tous les chauffeurs ont refusé</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRequestToResend(request);
                        }}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Renvoyer
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRequestToCancel(request);
                        }}
                      >
                        <XCircle className="w-3 h-3 mr-1" />
                        Annuler
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
                      onClick={(e) => {
                        e.stopPropagation();
                        setRequestToResume({ request, step: getResumeStep(request.status) });
                      }}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Reprendre
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRequestToCancel(request);
                      }}
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      Annuler
                    </Button>
                  </div>
                )}

                {/* Actions for sent_to_drivers - only cancel */}
                {request.status === "sent_to_drivers" && (
                  <div className="flex justify-end gap-2 pt-2 flex-wrap">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRequestToCancel(request);
                      }}
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      Annuler
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  };

  const renderRequestCard = (request: any) => (
    <CollapsibleRequestCard key={request.id} request={request} />
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
            <Button className="gap-2 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 text-sm font-medium">
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
                {acceptedRequests.map(renderRequestCard)}
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
            <p className="text-muted-foreground">
              Utilisez le bouton "Nouvelle" ci-dessus pour créer une course
            </p>
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
