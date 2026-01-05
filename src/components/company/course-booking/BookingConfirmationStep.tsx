import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, Send, Loader2, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { GeneratedQuote } from "./CompanyCourseBookingWizard";

interface BookingConfirmationStepProps {
  requestId: string | null;
  generatedQuotes: GeneratedQuote[];
  onSuccess: () => void;
}

export function BookingConfirmationStep({ requestId, generatedQuotes, onSuccess }: BookingConfirmationStepProps) {
  const [sent, setSent] = useState(false);

  const selectedQuotes = generatedQuotes.filter(q => q.selected);

  const sendQuotesMutation = useMutation({
    mutationFn: async () => {
      if (!requestId) throw new Error("Request ID missing");

      const { data, error } = await supabase.functions.invoke("send-company-quotes-to-drivers", {
        body: {
          request_id: requestId,
          quote_ids: selectedQuotes.map(q => q.id),
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setSent(true);
      toast.success("Devis envoyés aux chauffeurs !");
    },
    onError: (error: any) => {
      console.error("Error sending quotes:", error);
      toast.error("Erreur lors de l'envoi des devis");
    },
  });

  if (sent) {
    return (
      <div className="text-center py-12 space-y-6">
        <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        
        <div>
          <h3 className="text-xl font-semibold text-green-600">Demande envoyée !</h3>
          <p className="text-muted-foreground mt-2">
            {selectedQuotes.length > 1 
              ? `Les ${selectedQuotes.length} chauffeurs ont été notifiés. Le premier à accepter remportera la course.`
              : "Le chauffeur a été notifié. Il peut maintenant accepter ou refuser la demande."
            }
          </p>
        </div>

        <div className="p-4 bg-muted/50 rounded-lg max-w-md mx-auto">
          <h4 className="font-medium mb-3 flex items-center gap-2 justify-center">
            <Clock className="w-4 h-4" />
            En attente d'acceptation
          </h4>
          <div className="space-y-2">
            {selectedQuotes.map(quote => (
              <div key={quote.id} className="flex items-center justify-between text-sm">
                <span>{quote.driverName}</span>
                <span className="text-primary font-medium">{quote.totalPrice.toFixed(2)} €</span>
              </div>
            ))}
          </div>
        </div>

        <Button onClick={onSuccess} className="mt-4">
          Voir mes réservations
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold flex items-center gap-2 justify-center">
          <Send className="w-5 h-5 text-primary" />
          Confirmer l'envoi
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Vérifiez les devis sélectionnés avant envoi aux chauffeurs
        </p>
      </div>

      <div className="p-4 bg-muted/50 rounded-lg space-y-4">
        <h4 className="font-medium">Récapitulatif</h4>
        
        <div className="space-y-3">
          {selectedQuotes.map(quote => (
            <div 
              key={quote.id} 
              className="flex items-center justify-between p-3 bg-background rounded-lg border"
            >
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium">{quote.driverName}</p>
                  {quote.vehicleInfo && (
                    <p className="text-sm text-muted-foreground">{quote.vehicleInfo}</p>
                  )}
                </div>
              </div>
              <p className="font-bold text-primary">{quote.totalPrice.toFixed(2)} €</p>
            </div>
          ))}
        </div>

        {selectedQuotes.length > 1 && (
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg text-sm">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-amber-800">
              <strong>Mode compétition :</strong> Les {selectedQuotes.length} chauffeurs recevront la demande. 
              Le premier à accepter remportera la course, les autres seront automatiquement informés.
            </p>
          </div>
        )}
      </div>

      <Button 
        onClick={() => sendQuotesMutation.mutate()}
        disabled={sendQuotesMutation.isPending || selectedQuotes.length === 0}
        className="w-full gap-2"
        size="lg"
      >
        {sendQuotesMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Envoi en cours...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Envoyer aux {selectedQuotes.length} chauffeur{selectedQuotes.length > 1 ? "s" : ""}
          </>
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Les chauffeurs seront notifiés immédiatement et pourront accepter ou refuser la demande.
      </p>
    </div>
  );
}
