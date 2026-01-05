import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Building2, MapPin, Calendar, Users, Euro, Clock, 
  CheckCircle, XCircle, Loader2, AlertCircle, Car
} from "lucide-react";

interface DriverCompanyCourseRequestsProps {
  driverId: string;
}

export function DriverCompanyCourseRequests({ driverId }: DriverCompanyCourseRequestsProps) {
  const queryClient = useQueryClient();
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [actionType, setActionType] = useState<"accept" | "refuse" | null>(null);

  const { data: quotes, isLoading, refetch } = useQuery({
    queryKey: ["driver-company-quotes", driverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_course_quotes")
        .select(`
          *,
          request:company_course_requests(
            *,
            company:companies(company_name, contact_name, logo_url)
          )
        `)
        .eq("driver_id", driverId)
        .in("status", ["sent", "accepted", "refused", "taken_by_other"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const respondMutation = useMutation({
    mutationFn: async ({ quoteId, action }: { quoteId: string; action: "accept" | "refuse" }) => {
      const { data, error } = await supabase.functions.invoke("accept-company-course-quote", {
        body: { quote_id: quoteId, action }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data, variables) => {
      if (variables.action === "accept") {
        if (data?.already_taken) {
          toast.error("Cette course a déjà été prise par un autre chauffeur");
        } else {
          toast.success("Course acceptée ! Elle apparaît maintenant dans vos courses confirmées.");
        }
      } else {
        toast.success("Course refusée");
      }
      queryClient.invalidateQueries({ queryKey: ["driver-company-quotes"] });
      queryClient.invalidateQueries({ queryKey: ["driver-courses"] });
      setSelectedQuote(null);
      setActionType(null);
    },
    onError: (error: any) => {
      const message = error.message || "Erreur lors de la réponse";
      if (message.includes("taken") || message.includes("already")) {
        toast.error("Cette course a déjà été prise par un autre chauffeur");
      } else {
        toast.error(message);
      }
      refetch();
    },
  });

  const handleAction = (quote: any, action: "accept" | "refuse") => {
    setSelectedQuote(quote);
    setActionType(action);
  };

  const confirmAction = () => {
    if (!selectedQuote || !actionType) return;
    respondMutation.mutate({ quoteId: selectedQuote.id, action: actionType });
  };

  const getQuoteStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
      case "accepted":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Accepté</Badge>;
      case "refused":
        return <Badge variant="outline" className="bg-red-500/10 text-red-600"><XCircle className="w-3 h-3 mr-1" />Refusé</Badge>;
      case "taken_by_other":
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-600"><AlertCircle className="w-3 h-3 mr-1" />Pris par un autre</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingQuotes = quotes?.filter(q => q.status === "sent") || [];
  const historyQuotes = quotes?.filter(q => q.status !== "sent") || [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderQuoteCard = (quote: any, showActions: boolean = false) => (
    <Card key={quote.id} className={showActions ? "border-primary/50" : ""}>
      <CardContent className="pt-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              {quote.request?.company?.logo_url ? (
                <img 
                  src={quote.request.company.logo_url} 
                  alt="" 
                  className="w-10 h-10 rounded-lg object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
              )}
              <div>
                <h4 className="font-semibold">{quote.request?.company?.company_name || "Entreprise"}</h4>
                <p className="text-sm text-muted-foreground">
                  {quote.request?.is_guest_employee 
                    ? quote.request?.guest_employee_name
                    : "Collaborateur"
                  }
                </p>
              </div>
            </div>
            {getQuoteStatusBadge(quote.status)}
          </div>

          {/* Date */}
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>
              {format(new Date(quote.request?.scheduled_date), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
            </span>
          </div>

          {/* Addresses */}
          <div className="space-y-1 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>{quote.request?.pickup_address}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <span>{quote.request?.destination_address}</span>
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {quote.request?.passengers_count || 1} passager{(quote.request?.passengers_count || 1) > 1 ? "s" : ""}
            </span>
            {quote.distance_km && (
              <span>{quote.distance_km.toFixed(1)} km</span>
            )}
            {quote.duration_minutes && (
              <span>~{quote.duration_minutes} min</span>
            )}
          </div>

          {/* Price */}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm font-medium">Montant</span>
            <span className="text-2xl font-bold text-primary flex items-center gap-1">
              {quote.total_price?.toFixed(2)}
              <Euro className="w-5 h-5" />
            </span>
          </div>

          {/* Actions */}
          {showActions && quote.status === "sent" && (
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => handleAction(quote, "refuse")}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Refuser
              </Button>
              <Button 
                className="flex-1"
                onClick={() => handleAction(quote, "accept")}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Accepter
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Demandes Entreprises
          </CardTitle>
          <CardDescription>
            Courses proposées par vos entreprises partenaires
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(!quotes || quotes.length === 0) ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Aucune demande entreprise pour le moment</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Pending quotes */}
              {pendingQuotes.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    En attente de réponse ({pendingQuotes.length})
                  </h3>
                  <div className="space-y-4">
                    {pendingQuotes.map(quote => renderQuoteCard(quote, true))}
                  </div>
                </div>
              )}

              {/* History */}
              {historyQuotes.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3 text-muted-foreground">Historique</h3>
                  <div className="space-y-3">
                    {historyQuotes.slice(0, 5).map(quote => renderQuoteCard(quote, false))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={!!selectedQuote && !!actionType} onOpenChange={() => { setSelectedQuote(null); setActionType(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "accept" ? "Accepter la course" : "Refuser la course"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "accept" 
                ? "Confirmez-vous l'acceptation de cette course entreprise ?"
                : "Confirmez-vous le refus de cette course entreprise ?"
              }
            </DialogDescription>
          </DialogHeader>

          {selectedQuote && (
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <p className="font-medium">{selectedQuote.request?.company?.company_name}</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(selectedQuote.request?.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
              </p>
              <p className="text-lg font-bold text-primary">{selectedQuote.total_price?.toFixed(2)} €</p>
            </div>
          )}

          {actionType === "accept" && (
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-amber-800">
                Si d'autres chauffeurs ont reçu cette demande, le premier à accepter remporte la course.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedQuote(null); setActionType(null); }}>
              Annuler
            </Button>
            <Button 
              variant={actionType === "accept" ? "default" : "destructive"}
              onClick={confirmAction}
              disabled={respondMutation.isPending}
            >
              {respondMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                actionType === "accept" ? "Confirmer l'acceptation" : "Confirmer le refus"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
