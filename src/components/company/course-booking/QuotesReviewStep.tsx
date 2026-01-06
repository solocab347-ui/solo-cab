import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileText, Euro, Clock, MapPin, Loader2, RefreshCw, CheckCircle } from "lucide-react";
import { CourseFormData, SelectedDriver, GeneratedQuote } from "./CompanyCourseBookingWizard";

interface QuotesReviewStepProps {
  companyId: string;
  formData: CourseFormData;
  selectedDrivers: SelectedDriver[];
  requestId: string | null;
  setRequestId: React.Dispatch<React.SetStateAction<string | null>>;
  generatedQuotes: GeneratedQuote[];
  setGeneratedQuotes: React.Dispatch<React.SetStateAction<GeneratedQuote[]>>;
}

export function QuotesReviewStep({ 
  companyId, 
  formData, 
  selectedDrivers, 
  requestId,
  setRequestId,
  generatedQuotes, 
  setGeneratedQuotes 
}: QuotesReviewStepProps) {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch existing quotes from database when resuming
  const { data: existingQuotes, isLoading: isLoadingExisting, refetch: refetchExisting } = useQuery({
    queryKey: ["company-course-quotes", requestId],
    queryFn: async () => {
      if (!requestId) return [];
      
      const { data, error } = await supabase
        .from("company_course_quotes")
        .select(`
          id,
          driver_id,
          total_price,
          distance_km,
          duration_minutes,
          status,
          driver:drivers(
            user_id,
            company_name
          )
        `)
        .eq("request_id", requestId)
        .not("status", "eq", "cancelled");

      if (error) throw error;

      // Fetch driver profiles
      const userIds = data?.map(q => q.driver?.user_id).filter(Boolean) || [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, profile_photo_url")
        .in("id", userIds);

      return data?.map(q => ({
        id: q.id,
        driverId: q.driver_id,
        driverName: profiles?.find(p => p.id === q.driver?.user_id)?.full_name || q.driver?.company_name || "Chauffeur",
        driverPhoto: profiles?.find(p => p.id === q.driver?.user_id)?.profile_photo_url,
        vehicleInfo: "",
        totalPrice: q.total_price,
        distanceKm: q.distance_km || 0,
        durationMinutes: q.duration_minutes || 0,
        status: q.status,
        selected: true,
      })) || [];
    },
    enabled: !!requestId && generatedQuotes.length === 0,
  });

  // Update generatedQuotes when existingQuotes are fetched
  useEffect(() => {
    if (existingQuotes && existingQuotes.length > 0 && generatedQuotes.length === 0) {
      setGeneratedQuotes(existingQuotes);
    }
  }, [existingQuotes, generatedQuotes.length, setGeneratedQuotes]);

  // Create request and generate quotes
  const generateQuotesMutation = useMutation({
    mutationFn: async () => {
      // First, create the request
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");

      let currentRequestId = requestId;

      if (!currentRequestId) {
        const { data: request, error: requestError } = await supabase
          .from("company_course_requests")
          .insert({
            company_id: companyId,
            created_by_user_id: user.id,
            employee_id: formData.employeeId,
            is_guest_employee: formData.isGuestEmployee,
            guest_employee_name: formData.guestEmployeeName || null,
            guest_employee_phone: formData.guestEmployeePhone || null,
            guest_employee_email: formData.guestEmployeeEmail || null,
            pickup_address: formData.pickupAddress,
            pickup_latitude: formData.pickupCoordinates?.latitude,
            pickup_longitude: formData.pickupCoordinates?.longitude,
            destination_address: formData.destinationAddress,
            destination_latitude: formData.destinationCoordinates?.latitude,
            destination_longitude: formData.destinationCoordinates?.longitude,
            scheduled_date: formData.scheduledDate,
            passengers_count: parseInt(formData.passengersCount) || 1,
            notes: formData.notes || null,
            payment_method_requested: formData.paymentMethod !== "not_specified" ? formData.paymentMethod : null,
            status: "draft",
          })
          .select()
          .single();

        if (requestError) throw requestError;
        currentRequestId = request.id;
        setRequestId(request.id);
        
        // NOTE: N'invalidez PAS le cache ici - cela cause un rechargement de la liste parent
        // et peut réinitialiser le wizard. L'invalidation sera faite à la fin du processus (onSuccess).
      }

      // Generate quotes for all selected drivers
      const { data: result, error } = await supabase.functions.invoke("generate-company-quotes", {
        body: {
          request_id: currentRequestId,
          driver_ids: selectedDrivers.map(d => d.driverId),
        }
      });

      if (error) throw error;
      return { ...result, requestId: currentRequestId };
    },
    onSuccess: (data) => {
      const quotes: GeneratedQuote[] = (data.quotes || []).map((q: any) => {
        const driver = selectedDrivers.find(d => d.driverId === q.driver_id);
        return {
          id: q.id,
          driverId: q.driver_id,
          driverName: driver?.name || "Chauffeur",
          driverPhoto: driver?.photoUrl,
          vehicleInfo: driver?.vehicleInfo,
          totalPrice: q.total_price,
          distanceKm: q.distance_km || data.distance_km || 0,
          durationMinutes: q.duration_minutes || data.duration_minutes || 0,
          status: q.status,
          selected: true, // All selected by default
        };
      });
      setGeneratedQuotes(quotes);
      
      if (data.errors && data.errors.length > 0) {
        toast.warning(`${data.errors.length} devis n'ont pas pu être générés`);
      }
    },
    onError: (error: any) => {
      console.error("Error generating quotes:", error);
      toast.error("Erreur lors de la génération des devis");
    },
  });

  // Auto-generate on mount if no quotes yet AND we have selected drivers
  useEffect(() => {
    if (generatedQuotes.length === 0 && selectedDrivers.length > 0 && !isGenerating && !generateQuotesMutation.isPending) {
      setIsGenerating(true);
      generateQuotesMutation.mutate();
    }
  }, []);

  useEffect(() => {
    if (!generateQuotesMutation.isPending) {
      setIsGenerating(false);
    }
  }, [generateQuotesMutation.isPending]);

  const toggleQuoteSelection = (quoteId: string) => {
    setGeneratedQuotes(prev => prev.map(q => 
      q.id === quoteId ? { ...q, selected: !q.selected } : q
    ));
  };

  const toggleAll = () => {
    const allSelected = generatedQuotes.every(q => q.selected);
    setGeneratedQuotes(prev => prev.map(q => ({ ...q, selected: !allSelected })));
  };

  const selectedCount = generatedQuotes.filter(q => q.selected).length;
  const canRegenerate = selectedDrivers.length > 0;

  if (generateQuotesMutation.isPending || isGenerating || isLoadingExisting) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <div className="text-center">
          <p className="font-medium">
            {isLoadingExisting ? "Chargement des devis..." : "Génération des devis en cours..."}
          </p>
          <p className="text-sm text-muted-foreground">
            {isLoadingExisting 
              ? "Récupération des devis existants"
              : `Calcul des prix pour ${selectedDrivers.length} chauffeur${selectedDrivers.length > 1 ? "s" : ""}`
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - responsive layout */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
            Devis générés
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Sélectionnez les devis à envoyer aux chauffeurs
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {generatedQuotes.length > 1 && (
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs sm:text-sm text-primary hover:underline whitespace-nowrap"
            >
              {generatedQuotes.every(q => q.selected) ? "Tout désélectionner" : "Tout sélectionner"}
            </button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => canRegenerate ? generateQuotesMutation.mutate() : refetchExisting()}
            disabled={generateQuotesMutation.isPending || isLoadingExisting}
            className="text-xs sm:text-sm"
          >
            <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
            <span className="hidden xs:inline">Actualiser</span>
            <span className="xs:hidden">↻</span>
          </Button>
        </div>
      </div>

      {/* Course summary - responsive */}
      {generatedQuotes.length > 0 && (
        <div className="p-3 sm:p-4 bg-muted/50 rounded-lg space-y-2">
          <div className="flex items-start gap-2 text-xs sm:text-sm">
            <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-2">{formData.pickupAddress}</span>
          </div>
          <div className="flex items-start gap-2 text-xs sm:text-sm">
            <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-2">{formData.destinationAddress}</span>
          </div>
          {(generatedQuotes[0]?.distanceKm > 0 || generatedQuotes[0]?.durationMinutes > 0) ? (
            <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground pt-1">
              <span>{generatedQuotes[0]?.distanceKm.toFixed(1)} km</span>
              <span>~{generatedQuotes[0]?.durationMinutes} min</span>
            </div>
          ) : (
            <p className="text-xs text-amber-600 pt-1">
              Distance non calculée - le prix correspond au tarif minimum du chauffeur
            </p>
          )}
        </div>
      )}

      {generatedQuotes.length > 0 ? (
        <div className="grid gap-2 sm:gap-3">
          {generatedQuotes.map((quote) => (
            <Card 
              key={quote.id}
              className={`cursor-pointer transition-all ${
                quote.selected 
                  ? "border-primary bg-primary/5 ring-1 ring-primary" 
                  : "hover:border-primary/50"
              }`}
              onClick={() => toggleQuoteSelection(quote.id)}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-4">
                  <Checkbox 
                    checked={quote.selected}
                    onCheckedChange={() => toggleQuoteSelection(quote.id)}
                    className="flex-shrink-0 h-4 w-4 sm:h-5 sm:w-5"
                  />
                  
                  <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                    <AvatarImage src={quote.driverPhoto} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs sm:text-sm">
                      {quote.driverName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <h4 className="font-semibold text-sm sm:text-base truncate">{quote.driverName}</h4>
                      {quote.selected && (
                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                      )}
                    </div>
                    {quote.vehicleInfo && (
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{quote.vehicleInfo}</p>
                    )}
                  </div>
                  
                  <div className="text-right flex-shrink-0">
                    <p className="text-base sm:text-xl font-bold text-primary flex items-center gap-0.5 sm:gap-1">
                      {quote.totalPrice.toFixed(2)}
                      <Euro className="w-3 h-3 sm:w-4 sm:h-4" />
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            {selectedDrivers.length === 0 
              ? "Aucun chauffeur sélectionné. Retournez à l'étape précédente pour sélectionner des chauffeurs."
              : "Aucun devis généré"
            }
          </p>
          {canRegenerate && (
            <Button
              variant="outline"
              onClick={() => generateQuotesMutation.mutate()}
              className="mt-4"
            >
              Réessayer
            </Button>
          )}
        </div>
      )}

      {selectedCount > 0 && (
        <div className="p-3 sm:p-4 bg-primary/5 rounded-lg border border-primary/20">
          <p className="text-xs sm:text-sm font-medium text-primary">
            {selectedCount} devis sélectionné{selectedCount > 1 ? "s" : ""} pour envoi
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {selectedCount > 1 
              ? "Le premier chauffeur à accepter remportera la course."
              : "Le devis sera envoyé au chauffeur qui pourra l'accepter ou le refuser."
            }
          </p>
        </div>
      )}
    </div>
  );
}
