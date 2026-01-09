import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Check, Send, Loader2, CheckCircle, Clock, AlertCircle, Copy, Link2, ExternalLink } from "lucide-react";
import { GeneratedQuote, CourseFormData } from "./CompanyCourseBookingWizard";

interface BookingConfirmationStepProps {
  requestId: string | null;
  generatedQuotes: GeneratedQuote[];
  formData: CourseFormData;
  companyId: string;
  onSuccess: () => void;
}

export function BookingConfirmationStep({ 
  requestId, 
  generatedQuotes, 
  formData,
  companyId,
  onSuccess 
}: BookingConfirmationStepProps) {
  const [sent, setSent] = useState(false);
  const [trackingLink, setTrackingLink] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const selectedQuotes = generatedQuotes.filter(q => q.selected);

  const sendQuotesMutation = useMutation({
    mutationFn: async () => {
      if (!requestId) throw new Error("Request ID missing");

      // If guest employee, create an invitation with tracking link
      let invitationToken: string | null = null;
      
      if (formData.isGuestEmployee && formData.guestEmployeeName) {
        // Get request details for the invitation
        const { data: request } = await supabase
          .from("company_course_requests")
          .select("scheduled_date, pickup_address, destination_address")
          .eq("id", requestId)
          .single();
          
        // Create invitation for guest employee
        const { data: invitation, error: invError } = await supabase
          .from("company_employee_course_invitations")
          .insert({
            company_id: companyId,
            request_id: requestId,
            guest_name: formData.guestEmployeeName,
            guest_phone: formData.guestEmployeePhone || null,
            guest_email: formData.guestEmployeeEmail || null,
            scheduled_date: request?.scheduled_date,
            pickup_address: request?.pickup_address,
            destination_address: request?.destination_address,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          })
          .select("token")
          .single();

        if (invError) {
          console.error("Error creating invitation:", invError);
        } else if (invitation) {
          invitationToken = invitation.token;
        }
      }

      const { data, error } = await supabase.functions.invoke("send-company-quotes-to-drivers", {
        body: {
          request_id: requestId,
          quote_ids: selectedQuotes.map(q => q.id),
        }
      });

      if (error) throw error;
      return { ...data, invitationToken };
    },
    onSuccess: (data) => {
      setSent(true);
      toast.success("Devis envoyés aux chauffeurs !");
      
      // Invalider le cache pour que la liste des demandes se rafraîchisse avec le token
      queryClient.invalidateQueries({ queryKey: ["company-course-requests", companyId] });
      
      if (data.invitationToken) {
        const link = `${window.location.origin}/suivi-course-entreprise?token=${data.invitationToken}`;
        setTrackingLink(link);
      }
    },
    onError: (error: any) => {
      console.error("Error sending quotes:", error);
      toast.error("Erreur lors de l'envoi des devis");
    },
  });

  const copyTrackingLink = () => {
    if (trackingLink) {
      navigator.clipboard.writeText(trackingLink);
      toast.success("Lien copié !");
    }
  };

  if (sent) {
    return (
      <div className="text-center py-8 space-y-6">
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

        {/* Tracking link for guest employee */}
        {trackingLink && (
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 text-left max-w-md mx-auto">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-primary" />
              Lien de suivi pour {formData.guestEmployeeName}
            </h4>
            <p className="text-sm text-muted-foreground mb-3">
              Partagez ce lien avec le collaborateur pour qu'il puisse suivre sa course en temps réel.
            </p>
            <div className="flex gap-2">
              <Input 
                value={trackingLink} 
                readOnly 
                className="text-xs bg-background"
              />
              <Button variant="outline" size="icon" onClick={copyTrackingLink}>
                <Copy className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" asChild>
                <a href={trackingLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            </div>
          </div>
        )}

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
