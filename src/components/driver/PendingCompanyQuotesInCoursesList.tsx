import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, MapPin, Calendar, Euro, Check, X, Loader2, Moon, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PendingCompanyQuotesInCoursesListProps {
  driverId: string;
  onCountChange?: (count: number) => void;
}

export function PendingCompanyQuotesInCoursesList({ driverId, onCountChange }: PendingCompanyQuotesInCoursesListProps) {
  const queryClient = useQueryClient();
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [actionType, setActionType] = useState<'accept' | 'refuse' | null>(null);

  // Fetch pending company course quotes
  const { data: quotes = [], isLoading, refetch } = useQuery({
    queryKey: ['pending-company-quotes-courses', driverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_course_quotes")
        .select(`
          *,
          company_course_requests!inner(
            id,
            pickup_address,
            destination_address,
            scheduled_date,
            passengers_count,
            notes,
            guest_employee_name,
            company_id,
            companies!inner(
              id,
              company_name
            )
          )
        `)
        .eq("driver_id", driverId)
        .eq("status", "sent")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Notify parent of count change
      if (onCountChange) {
        onCountChange(data?.length || 0);
      }
      
      return data || [];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Mutation for accepting/refusing quotes
  const respondMutation = useMutation({
    mutationFn: async ({ quoteId, accept }: { quoteId: string; accept: boolean }) => {
      const { data, error } = await supabase.functions.invoke('accept-company-course-quote', {
        body: { quote_id: quoteId, accept }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data, variables) => {
      if (variables.accept) {
        if (data?.status === 'already_taken') {
          toast.info("Cette course a déjà été attribuée à un autre chauffeur");
        } else {
          toast.success("Course acceptée ! Elle a été ajoutée à vos courses confirmées");
        }
      } else {
        toast.success("Course refusée");
      }
      queryClient.invalidateQueries({ queryKey: ['driver-courses'] });
      queryClient.invalidateQueries({ queryKey: ['pending-company-quotes-courses'] });
      refetch();
      setSelectedQuote(null);
      setActionType(null);
    },
    onError: (error: any) => {
      console.error("Error responding to quote:", error);
      toast.error(error.message || "Erreur lors de la réponse");
    }
  });

  const handleAction = (quote: any, action: 'accept' | 'refuse') => {
    setSelectedQuote(quote);
    setActionType(action);
  };

  const confirmAction = () => {
    if (!selectedQuote) return;
    respondMutation.mutate({
      quoteId: selectedQuote.id,
      accept: actionType === 'accept'
    });
  };

  if (isLoading) {
    return null;
  }

  if (quotes.length === 0) {
    return null;
  }

  return (
    <>
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3 pt-4 border-t border-border/50">
        <Building2 className="w-5 h-5 text-purple-500" />
        <h3 className="font-semibold text-sm text-foreground">Demandes Entreprises</h3>
        <Badge className="bg-purple-500/20 text-purple-300 text-xs">{quotes.length}</Badge>
      </div>

      {/* Company quotes list */}
      <div className="space-y-3">
        {quotes.map((quote) => {
          const request = quote.company_course_requests;
          const company = request.companies;
          
          return (
            <Card key={quote.id} className="relative overflow-hidden p-3 sm:p-4 backdrop-blur-sm border bg-gradient-to-br from-purple-500/10 to-orange-500/10 border-purple-500/30 hover:shadow-lg transition-all">
              {/* Purple indicator bar */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500" />
              
              <div className="space-y-3 pl-2">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start justify-between gap-2">
                  <div className="space-y-1 w-full">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm sm:text-base text-foreground">
                        ENT-{quote.id.slice(0, 8).toUpperCase()}
                      </h3>
                      <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-xs">
                        <Building2 className="w-3 h-3 mr-1" />
                        Entreprise
                      </Badge>
                      <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/40 text-xs">
                        En attente
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{company.company_name}</p>
                    {request.guest_employee_name && (
                      <p className="text-xs text-muted-foreground">Passager: {request.guest_employee_name}</p>
                    )}
                  </div>
                </div>

                {/* Route info */}
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 shrink-0 mt-1" />
                    <div className="text-xs sm:text-sm min-w-0 flex-1">
                      <p className="font-medium text-foreground">Départ</p>
                      <p className="text-muted-foreground break-words">{request.pickup_address}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 shrink-0 mt-1" />
                    <div className="text-xs sm:text-sm min-w-0 flex-1">
                      <p className="font-medium text-foreground">Arrivée</p>
                      <p className="text-muted-foreground break-words">{request.destination_address}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground/70" />
                    {format(new Date(request.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                  </div>
                </div>

                {/* Pricing */}
                <div className="p-3 sm:p-4 bg-gradient-to-br from-orange-500/20 to-yellow-500/10 backdrop-blur-sm rounded-lg border border-orange-500/30">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Forfait de base</span>
                      <span>{(quote.base_price || 0).toFixed(2)} €</span>
                    </div>
                    {quote.distance_price > 0 && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Distance ({quote.distance_km?.toFixed(1) || 0} km)</span>
                        <span>{quote.distance_price.toFixed(2)} €</span>
                      </div>
                    )}
                    {quote.evening_surcharge > 0 && (
                      <div className="flex justify-between text-xs text-orange-400">
                        <span className="flex items-center gap-1">
                          <Moon className="w-3 h-3" /> Majoration Soir
                        </span>
                        <span>+{quote.evening_surcharge.toFixed(2)} €</span>
                      </div>
                    )}
                    {quote.weekend_surcharge > 0 && (
                      <div className="flex justify-between text-xs text-orange-400">
                        <span>Majoration Weekend</span>
                        <span>+{quote.weekend_surcharge.toFixed(2)} €</span>
                      </div>
                    )}
                    <div className="border-t border-white/10 pt-2 flex justify-between items-center">
                      <span className="text-sm font-medium flex items-center gap-1">
                        <Euro className="w-4 h-4" /> Total TTC
                      </span>
                      <span className="text-2xl font-bold text-primary">{quote.total_price.toFixed(2)} €</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => handleAction(quote, 'accept')}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Accepter
                  </Button>
                  <Button
                    onClick={() => handleAction(quote, 'refuse')}
                    variant="outline"
                    className="flex-1 border-destructive/30 hover:bg-destructive/10 text-destructive"
                    size="sm"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Refuser
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={!!selectedQuote && !!actionType} onOpenChange={() => { setSelectedQuote(null); setActionType(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'accept' ? (
                <>
                  <Check className="w-5 h-5 text-green-500" />
                  Accepter cette course ?
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  Refuser cette course ?
                </>
              )}
            </DialogTitle>
            <DialogDescription className="space-y-2">
              {selectedQuote && (
                <>
                  <p className="font-medium">
                    {selectedQuote.company_course_requests?.companies?.company_name}
                  </p>
                  <p className="text-sm">
                    {format(new Date(selectedQuote.company_course_requests?.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                  </p>
                  <p className="text-lg font-bold text-primary">
                    {selectedQuote.total_price?.toFixed(2)} €
                  </p>
                </>
              )}
              {actionType === 'accept' ? (
                <p className="text-sm text-muted-foreground pt-2">
                  La course sera ajoutée à vos courses confirmées.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground pt-2">
                  Cette demande sera retirée de votre liste.
                </p>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => { setSelectedQuote(null); setActionType(null); }}
              disabled={respondMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              onClick={confirmAction}
              disabled={respondMutation.isPending}
              variant={actionType === 'accept' ? 'default' : 'destructive'}
              className={actionType === 'accept' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {respondMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : actionType === 'accept' ? (
                <Check className="w-4 h-4 mr-2" />
              ) : (
                <X className="w-4 h-4 mr-2" />
              )}
              {actionType === 'accept' ? 'Confirmer' : 'Refuser'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
