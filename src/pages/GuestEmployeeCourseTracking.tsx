import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  MapPin, Calendar, Clock, Users, Euro, Building2, Car,
  CheckCircle, XCircle, Loader2, AlertCircle, Phone, Mail,
  Star, Route, UserPlus, FileText, RefreshCw
} from "lucide-react";
import { CompanyPaymentDeclarationCard } from "@/components/company/CompanyPaymentDeclarationCard";

interface DriverInfo {
  id: string;
  user_id: string;
  company_name?: string;
  contact_phone?: string | null;
  contact_email?: string | null;
  show_phone?: boolean;
  show_email?: boolean;
  profile?: { full_name?: string; phone?: string; email?: string; profile_photo_url?: string };
  vehicles?: Array<{ brand?: string; model?: string; plate?: string; color?: string }>;
}

interface TrackingData {
  id: string;
  token: string;
  guest_name: string;
  guest_phone?: string;
  guest_email?: string;
  scheduled_date?: string;
  pickup_address?: string;
  destination_address?: string;
  is_used: boolean;
  course_id?: string;
  company?: { company_name?: string; logo_url?: string };
  request?: {
    id: string;
    scheduled_date: string;
    pickup_address: string;
    destination_address: string;
    passengers_count?: number;
    payment_method_requested?: string;
    status?: string;
    created_at: string;
    quotes_generated_at?: string;
    sent_to_drivers_at?: string;
    accepted_at?: string;
    quotes?: Array<{
      id: string;
      status: string;
      total_price: number;
      distance_km?: number;
      duration_minutes?: number;
      driver_response_at?: string;
      driver?: DriverInfo;
    }>;
  };
  course?: {
    id: string;
    status: string;
    updated_at?: string;
    company_payment_status?: string;
    employee_declared_paid_at?: string;
    driver_declared_payment_received?: boolean;
    client_payment_confirmation?: string;
    client_payment_confirmation_at?: string;
    driver?: DriverInfo;
    devis?: Array<{ amount: number; quote_number?: string }>;
  };
}

export default function GuestEmployeeCourseTracking() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch, isRefetching } = useQuery<TrackingData | null>({
    queryKey: ["guest-employee-course-tracking", token],
    queryFn: async () => {
      if (!token) throw new Error("Token manquant");

      // Get invitation data
      const { data: invitation, error: invError } = await supabase
        .from("company_employee_course_invitations")
        .select(`
          id, token, guest_name, guest_phone, guest_email, scheduled_date, pickup_address, destination_address, is_used, request_id, course_id,
          company:companies(company_name, logo_url)
        `)
        .eq("token", token)
        .maybeSingle();

      if (invError) throw invError;
      if (!invitation) throw new Error("Lien invalide ou expiré");

      const result = invitation as any;

      // Fetch course data separately to always get fresh status
      if (result.course_id) {
        console.log('[GuestTracking] Fetching course data for course_id:', result.course_id);
        const { data: courseData, error: courseError } = await supabase
          .from("courses")
          .select(`id, status, updated_at, driver_id, company_payment_status, employee_declared_paid_at, driver_declared_payment_received, client_payment_confirmation, client_payment_confirmation_at`)
          .eq("id", result.course_id)
          .maybeSingle();
        
        console.log('[GuestTracking] Course data received:', { courseData, courseError });
        
        if (courseData) {
          result.course = { ...courseData };
          const driverId = (courseData as any).driver_id;
          
          // Fetch full driver info if course has a driver
          if (driverId) {
            const { data: driverData } = await supabase
              .from("drivers")
              .select(`id, user_id, company_name, contact_phone, contact_email, show_phone, show_email`)
              .eq("id", driverId)
              .maybeSingle();
            
            if (driverData) {
              result.course.driver = { ...driverData };
              
              // Fetch driver profile via RPC function (bypasses RLS for guest access)
              if (driverData.user_id) {
                const { data: profileData } = await supabase
                  .rpc('get_company_course_driver_profile', { driver_user_id: driverData.user_id });
                
                if (profileData && profileData.length > 0) {
                  result.course.driver.profile = {
                    full_name: profileData[0].full_name,
                    profile_photo_url: profileData[0].profile_photo_url,
                    phone: profileData[0].phone,
                    email: profileData[0].email
                  };
                }
              }
              
              // Fetch driver vehicles
              const { data: vehicles } = await supabase
                .from("driver_vehicles")
                .select("brand, model, plate, color")
                .eq("driver_id", driverData.id)
                .eq("is_active", true)
                .limit(1);
              result.course.driver.vehicles = vehicles || [];
            }
          }
          
          // Fetch devis
          const { data: devisData } = await supabase
            .from("devis")
            .select("amount, quote_number")
            .eq("course_id", result.course_id);
          result.course.devis = devisData || [];
        }
      }

      // Fetch request data separately
      if (result.request_id) {
        const { data: requestData } = await supabase
          .from("company_course_requests")
          .select(`
            id, scheduled_date, pickup_address, destination_address, passengers_count, 
            payment_method_requested, status, created_at, quotes_generated_at, sent_to_drivers_at, accepted_at
          `)
          .eq("id", result.request_id)
          .maybeSingle();
        
        if (requestData) {
          result.request = requestData;

          // Fetch quotes for this request with driver info
          const { data: quotesData } = await supabase
            .from("company_course_quotes")
            .select(`
              id, status, total_price, distance_km, duration_minutes, driver_response_at, driver_id
            `)
            .eq("request_id", result.request_id);
          
          // Enrich quotes with driver data
          if (quotesData) {
            const enrichedQuotes = await Promise.all(quotesData.map(async (quote: any) => {
              if (quote.driver_id) {
                const { data: driverData } = await supabase
                  .from("drivers")
                  .select(`id, user_id, company_name, contact_phone, contact_email, show_phone, show_email`)
                  .eq("id", quote.driver_id)
                  .maybeSingle();
                
                if (driverData) {
                  quote.driver = driverData;
                  
                  // Fetch profile via RPC function (bypasses RLS for guest access)
                  if (driverData.user_id) {
                    const { data: profileData } = await supabase
                      .rpc('get_company_course_driver_profile', { driver_user_id: driverData.user_id });
                    
                    if (profileData && profileData.length > 0) {
                      quote.driver.profile = {
                        full_name: profileData[0].full_name,
                        profile_photo_url: profileData[0].profile_photo_url,
                        phone: profileData[0].phone,
                        email: profileData[0].email
                      };
                    }
                  }
                  
                  // Fetch vehicles
                  const { data: vehicles } = await supabase
                    .from("driver_vehicles")
                    .select("brand, model, plate, color")
                    .eq("driver_id", driverData.id)
                    .eq("is_active", true)
                    .limit(1);
                  quote.driver.vehicles = vehicles || [];
                }
              }
              return quote;
            }));
            result.request.quotes = enrichedQuotes;
          }
        }
      }

      console.log('[GuestTracking] Final result:', { 
        course_id: result.course_id, 
        course_status: result.course?.status,
        request_status: result.request?.status
      });
      
      return result as TrackingData;
    },
    enabled: !!token,
    refetchInterval: 10000, // Refresh every 10 seconds for live tracking
  });

  // Setup realtime subscription for course updates
  useEffect(() => {
    // Also subscribe if we have a request_id (course might be created later)
    const courseId = data?.course_id;
    const requestId = data?.request?.id;
    
    if (!courseId && !requestId) return;

    const channelName = courseId 
      ? `course-tracking-${courseId}` 
      : `request-tracking-${requestId}`;

    console.log('[GuestTracking] Setting up realtime subscription:', { courseId, requestId, channelName });

    const channel = supabase.channel(channelName);
    
    // Subscribe to course updates if we have a course_id
    if (courseId) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'courses',
          filter: `id=eq.${courseId}`
        },
        (payload) => {
          console.log('[GuestTracking] Course update received:', payload);
          setLastRefresh(new Date());
          queryClient.invalidateQueries({ queryKey: ["guest-employee-course-tracking", token] });
        }
      );
    }

    // Also subscribe to request updates (e.g., when course is first assigned)
    if (requestId) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'company_course_requests',
          filter: `id=eq.${requestId}`
        },
        (payload) => {
          console.log('[GuestTracking] Request update received:', payload);
          setLastRefresh(new Date());
          queryClient.invalidateQueries({ queryKey: ["guest-employee-course-tracking", token] });
        }
      );
    }

    channel.subscribe((status) => {
      console.log('[GuestTracking] Subscription status:', status);
    });

    return () => {
      console.log('[GuestTracking] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [data?.course_id, data?.request?.id, token, queryClient]);

  const handleRefresh = () => {
    setLastRefresh(new Date());
    refetch();
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Lien invalide</h2>
            <p className="text-muted-foreground">
              Le lien de suivi que vous utilisez est invalide ou incomplet.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Lien expiré ou invalide</h2>
            <p className="text-muted-foreground">
              Ce lien de suivi n'est plus valide. Contactez votre entreprise pour un nouveau lien.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const request = data.request;
  const course = data.course;
  const company = data.company;
  
  // Find accepted quote/driver - prioritize course driver (has real-time status)
  const acceptedQuote = request?.quotes?.find((q: any) => q.status === "accepted");
  // PRIORITY: course.driver over acceptedQuote.driver (course driver is more accurate for in_progress/completed)
  const acceptedDriver = course?.driver || acceptedQuote?.driver;
  const driverVehicle = acceptedDriver?.vehicles?.[0];

  // Determine current status - check course status first for accurate tracking
  const getStatus = () => {
    // Course statuses take priority - these are the real-time status from the driver
    if (course?.status === "completed") return "completed";
    if (course?.status === "cancelled") return "cancelled";
    if (course?.status === "in_progress") return "in_progress";
    if (course?.status === "accepted" || course?.status === "confirmed") return "confirmed";
    
    // Fall back to quote/request status
    if (acceptedQuote || request?.status === "accepted") return "confirmed";
    if (request?.status === "sent_to_drivers") return "waiting_driver";
    if (request?.status === "quotes_generated") return "quotes_ready";
    return "pending";
  };

  const status = getStatus();

  const getStatusBadge = () => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />Course terminée</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30"><Car className="w-3 h-3 mr-1" />En cours</Badge>;
      case "confirmed":
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />Chauffeur confirmé</Badge>;
      case "waiting_driver":
        return <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30"><Clock className="w-3 h-3 mr-1" />En attente du chauffeur</Badge>;
      case "quotes_ready":
        return <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30"><FileText className="w-3 h-3 mr-1" />Devis en cours</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />En préparation</Badge>;
    }
  };

  // Check if billing should be shown (based on payment method)
  const showBilling = request?.payment_method_requested === "employee_pays" || 
                      request?.payment_method_requested === "employee_expense";

  const quoteAmount = acceptedQuote?.total_price || course?.devis?.[0]?.amount;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {company?.logo_url ? (
              <img src={company.logo_url} alt="" className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-primary" />
              </div>
            )}
            <span className="font-semibold text-sm">{company?.company_name || "Votre entreprise"}</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefetching}
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Status Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-lg">Suivi de votre course</CardTitle>
              {getStatusBadge()}
            </div>
            <CardDescription>
              Bonjour {data.guest_name}, suivez votre réservation en temps réel
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Course Details */}
            <div className="space-y-4">
              {/* Date & Time */}
              <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
                <Calendar className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">
                    {format(new Date(data.scheduled_date || request?.scheduled_date), "EEEE d MMMM yyyy", { locale: fr })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(data.scheduled_date || request?.scheduled_date), "HH:mm", { locale: fr })}
                  </p>
                </div>
              </div>

              {/* Addresses */}
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Départ</p>
                    <p className="font-medium">{data.pickup_address || request?.pickup_address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Arrivée</p>
                    <p className="font-medium">{data.destination_address || request?.destination_address}</p>
                  </div>
                </div>
              </div>

              {/* Passengers */}
              {request?.passengers_count && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{request.passengers_count} passager{request.passengers_count > 1 ? "s" : ""}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Billing Info - Only if employee should see it */}
        {showBilling && quoteAmount && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Euro className="w-4 h-4" />
                Informations tarifaires
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Montant total</span>
                <span className="text-2xl font-bold text-primary">{quoteAmount.toFixed(2)} €</span>
              </div>
              {acceptedQuote && (
                <div className="mt-3 pt-3 border-t space-y-1 text-sm text-muted-foreground">
                  {acceptedQuote.distance_km && (
                    <div className="flex justify-between">
                      <span>Distance estimée</span>
                      <span>{acceptedQuote.distance_km.toFixed(1)} km</span>
                    </div>
                  )}
                  {acceptedQuote.duration_minutes && (
                    <div className="flex justify-between">
                      <span>Durée estimée</span>
                      <span>~{acceptedQuote.duration_minutes} min</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Driver Info - Only when driver is confirmed */}
        {acceptedDriver && (
          <Card className="border-primary/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Car className="w-4 h-4" />
                Votre chauffeur
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Driver Profile - Enhanced display */}
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 border-4 border-primary/30 shadow-lg">
                  <AvatarImage 
                    src={acceptedDriver.profile?.profile_photo_url || undefined} 
                    alt={acceptedDriver.profile?.full_name || acceptedDriver.company_name || "Chauffeur"}
                  />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                    {acceptedDriver.profile?.full_name?.charAt(0) || acceptedDriver.company_name?.charAt(0) || "C"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  {/* Toujours afficher le nom complet du chauffeur en priorité */}
                  <h3 className="font-bold text-xl truncate">
                    {acceptedDriver.profile?.full_name || acceptedDriver.company_name || "Votre chauffeur"}
                  </h3>
                  {/* Afficher le nom de l'entreprise en dessous si différent */}
                  {acceptedDriver.company_name && acceptedDriver.profile?.full_name && 
                   acceptedDriver.company_name !== acceptedDriver.profile.full_name && (
                    <p className="text-sm text-muted-foreground truncate">
                      {acceptedDriver.company_name}
                    </p>
                  )}
                  {/* Afficher le prix si disponible */}
                  {quoteAmount && (
                    <p className="text-primary font-bold text-lg mt-1">{quoteAmount.toFixed(2)} €</p>
                  )}
                </div>
              </div>

              {/* Vehicle Info */}
              {driverVehicle && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Véhicule</p>
                  <p className="font-medium">{driverVehicle.brand} {driverVehicle.model}</p>
                  <p className="text-sm text-muted-foreground">
                    {driverVehicle.color && `${driverVehicle.color} • `}
                    {driverVehicle.plate}
                  </p>
                </div>
              )}

              {/* Contact Buttons - Respecter la visibilité définie par le chauffeur */}
              {(() => {
                // Priorité: contact_phone/email B2B si show_phone/email activé, sinon profil
                const phoneNumber = (acceptedDriver.show_phone && acceptedDriver.contact_phone) 
                  ? acceptedDriver.contact_phone 
                  : acceptedDriver.profile?.phone;
                const emailAddress = (acceptedDriver.show_email && acceptedDriver.contact_email) 
                  ? acceptedDriver.contact_email 
                  : acceptedDriver.profile?.email;
                
                // Afficher seulement si le chauffeur a activé la visibilité OU si c'est dans le profil
                const showPhone = acceptedDriver.show_phone || !!acceptedDriver.profile?.phone;
                const showEmail = acceptedDriver.show_email || !!acceptedDriver.profile?.email;
                
                if (!showPhone && !showEmail) return null;
                
                return (
                  <div className="flex gap-2 flex-wrap">
                    {showPhone && phoneNumber && (
                      <Button 
                        variant="outline" 
                        className="flex-1 min-w-[140px]"
                        asChild
                      >
                        <a href={`tel:${phoneNumber}`}>
                          <Phone className="w-4 h-4 mr-2" />
                          Appeler
                        </a>
                      </Button>
                    )}
                    {showEmail && emailAddress && (
                      <Button 
                        variant="outline" 
                        className="flex-1 min-w-[140px]"
                        asChild
                      >
                        <a href={`mailto:${emailAddress}`}>
                          <Mail className="w-4 h-4 mr-2" />
                          Email
                        </a>
                      </Button>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Status Timeline */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Progression</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <TimelineItem 
                label="Demande créée" 
                done={true}
                date={request?.created_at}
              />
              <TimelineItem 
                label="Devis générés" 
                done={["quotes_ready", "waiting_driver", "confirmed", "in_progress", "completed"].includes(status)}
                date={request?.quotes_generated_at}
              />
              <TimelineItem 
                label="Envoyé au(x) chauffeur(s)" 
                done={["waiting_driver", "confirmed", "in_progress", "completed"].includes(status)}
                date={request?.sent_to_drivers_at}
              />
              <TimelineItem 
                label="Chauffeur confirmé" 
                done={["confirmed", "in_progress", "completed"].includes(status)}
                date={acceptedQuote?.driver_response_at || request?.accepted_at}
              />
              <TimelineItem 
                label="Course en cours" 
                done={["in_progress", "completed"].includes(status)}
              />
              <TimelineItem 
                label="Course terminée" 
                done={status === "completed"}
              />
            </div>
          </CardContent>
        </Card>

        {/* Payment Declaration Card - Only for completed courses */}
        {course?.id && (
          <CompanyPaymentDeclarationCard
            courseId={course.id}
            requestId={request?.id}
            invitationToken={token || undefined}
            status={status}
            currentPaymentStatus={course.company_payment_status}
            employeeDeclaredPaidAt={course.employee_declared_paid_at}
            driverDeclaredPaymentReceived={course.driver_declared_payment_received}
            onPaymentDeclared={() => refetch()}
          />
        )}

        {/* Register CTA */}
        {!data.is_used && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-full bg-primary/10">
                  <UserPlus className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Créez votre espace collaborateur</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Inscrivez-vous pour gérer vos prochaines courses, consulter votre historique et recevoir des notifications.
                  </p>
                  <Button asChild>
                    <Link to={`/register-employee?token=${token}`}>
                      Créer mon compte
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer info */}
        <p className="text-xs text-center text-muted-foreground">
          Dernière mise à jour : {format(lastRefresh, "HH:mm:ss")}
        </p>
      </main>
    </div>
  );
}

function TimelineItem({ label, done, date }: { label: string; done: boolean; date?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${done ? "bg-primary" : "bg-muted-foreground/30"}`} />
      <div className="flex-1 flex items-center justify-between gap-2">
        <span className={done ? "font-medium" : "text-muted-foreground"}>{label}</span>
        {done && date && (
          <span className="text-xs text-muted-foreground">
            {format(new Date(date), "d/MM HH:mm")}
          </span>
        )}
      </div>
    </div>
  );
}
