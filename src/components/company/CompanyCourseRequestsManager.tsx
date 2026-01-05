import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Plus, MapPin, Calendar, Users, Clock, CheckCircle, 
  XCircle, Send, Loader2, Euro, Car 
} from "lucide-react";
import { CompanyCourseBookingWizard } from "./course-booking";

interface CompanyCourseRequestsManagerProps {
  companyId: string;
}

export function CompanyCourseRequestsManager({ companyId }: CompanyCourseRequestsManagerProps) {
  const [showWizard, setShowWizard] = useState(false);

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

      return data?.map((r: any) => ({
        ...r,
        employeeProfile: profiles?.find(p => p.id === r.employee?.user_id),
        driverProfile: profiles?.find(p => p.id === r.accepted_driver?.user_id),
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
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-600"><Clock className="w-3 h-3 mr-1" />Brouillon</Badge>;
      case "quotes_generated":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600"><Clock className="w-3 h-3 mr-1" />Devis générés</Badge>;
      case "sent_to_drivers":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600"><Send className="w-3 h-3 mr-1" />Envoyé aux chauffeurs</Badge>;
      case "accepted":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Accepté</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-red-500/10 text-red-600"><XCircle className="w-3 h-3 mr-1" />Annulé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingRequests = requests?.filter(r => ["draft", "quotes_generated", "sent_to_drivers"].includes(r.status)) || [];
  const completedRequests = requests?.filter(r => ["accepted", "cancelled"].includes(r.status)) || [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderRequestCard = (request: any) => (
    <Card key={request.id} className="mb-4">
      <CardContent className="pt-4">
        <div className="flex flex-col sm:flex-row gap-4">
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

            {/* Quotes info */}
            {request.quotesWithProfiles && request.quotesWithProfiles.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-sm font-medium mb-2">Chauffeurs ({request.quotesWithProfiles.length})</p>
                <div className="flex flex-wrap gap-2">
                  {request.quotesWithProfiles.map((quote: any) => (
                    <div 
                      key={quote.id}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ${
                        quote.status === "accepted" 
                          ? "bg-green-500/10 text-green-700 border border-green-500/30"
                          : quote.status === "refused"
                            ? "bg-red-500/10 text-red-700 border border-red-500/30"
                            : quote.status === "taken_by_other"
                              ? "bg-gray-500/10 text-gray-600 border border-gray-500/30"
                              : "bg-muted border border-border"
                      }`}
                    >
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={quote.profile?.profile_photo_url} />
                        <AvatarFallback className="text-[10px]">
                          {quote.profile?.full_name?.charAt(0) || "C"}
                        </AvatarFallback>
                      </Avatar>
                      <span>{quote.profile?.full_name || "Chauffeur"}</span>
                      <span className="font-medium">{quote.total_price?.toFixed(0)}€</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Accepted driver */}
            {request.status === "accepted" && request.driverProfile && (
              <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm">Accepté par <strong>{request.driverProfile.full_name}</strong></span>
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending" className="relative">
              En cours
              {pendingRequests.length > 0 && (
                <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {pendingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed">Terminées</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            {pendingRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Aucune demande en cours</p>
              </div>
            ) : (
              pendingRequests.map(renderRequestCard)
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-4">
            {completedRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Aucune demande terminée</p>
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
    </div>
  );
}
