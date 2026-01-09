import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Building2, MapPin, Calendar, Users, Clock, 
  Send, Loader2, CheckCircle, Truck 
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CourseFormData } from "./CompanyCourseBookingWizard";

interface FleetConfirmationStepProps {
  companyId: string;
  formData: CourseFormData;
  fleetManagerId: string;
  onSuccess: () => void;
}

export function FleetConfirmationStep({ 
  companyId, 
  formData, 
  fleetManagerId,
  onSuccess 
}: FleetConfirmationStepProps) {
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Fetch fleet manager info
  const { data: fleetManager, isLoading } = useQuery({
    queryKey: ["fleet-manager-info", fleetManagerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fleet_managers")
        .select(`
          id,
          company_name,
          logo_url,
          address,
          description,
          user_id
        `)
        .eq("id", fleetManagerId)
        .single();

      if (error) throw error;

      // Get driver count
      const { count } = await supabase
        .from("fleet_manager_drivers")
        .select("*", { count: "exact", head: true })
        .eq("fleet_manager_id", fleetManagerId)
        .eq("status", "active");

      return { ...data, drivers_count: count || 0 };
    },
  });

  const sendToFleetMutation = useMutation({
    mutationFn: async () => {
      // 1. Create the company course request
      const { data: request, error: requestError } = await supabase
        .from("company_course_requests")
        .insert({
          company_id: companyId,
          employee_id: formData.isGuestEmployee ? null : formData.employeeId,
          is_guest_employee: formData.isGuestEmployee,
          guest_employee_name: formData.isGuestEmployee ? formData.guestEmployeeName : null,
          guest_employee_phone: formData.isGuestEmployee ? formData.guestEmployeePhone : null,
          guest_employee_email: formData.isGuestEmployee ? formData.guestEmployeeEmail : null,
          pickup_address: formData.pickupAddress,
          pickup_latitude: formData.pickupCoordinates?.latitude,
          pickup_longitude: formData.pickupCoordinates?.longitude,
          destination_address: formData.destinationAddress,
          destination_latitude: formData.destinationCoordinates?.latitude,
          destination_longitude: formData.destinationCoordinates?.longitude,
          scheduled_date: formData.scheduledDate,
          passengers_count: parseInt(formData.passengersCount) || 1,
          notes: formData.notes || null,
          payment_method_requested: formData.paymentMethod,
          status: "dispatched_to_fleet",
          target_fleet_manager_id: fleetManagerId,
          payment_flow: "via_fleet",
          dispatched_to_fleet_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (requestError) throw requestError;

      // 2. The notification will be created automatically by the trigger
      
      return request;
    },
    onSuccess: () => {
      setSent(true);
      toast.success("Demande envoyée au gestionnaire de flotte");
    },
    onError: (error) => {
      console.error("Error sending to fleet:", error);
      toast.error("Erreur lors de l'envoi de la demande");
    },
  });

  const handleSend = async () => {
    setIsSending(true);
    try {
      await sendToFleetMutation.mutateAsync();
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (sent) {
    return (
      <div className="text-center py-8 space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        
        <div>
          <h3 className="text-xl font-semibold text-green-600">Demande envoyée !</h3>
          <p className="text-muted-foreground mt-2">
            Votre demande de course a été envoyée à <strong>{fleetManager?.company_name}</strong>.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Vous recevrez une notification dès qu'un chauffeur sera assigné.
          </p>
        </div>

        <Button onClick={onSuccess} className="gap-2">
          <CheckCircle className="w-4 h-4" />
          Terminé
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Confirmer l'envoi</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Vérifiez les détails avant d'envoyer au gestionnaire de flotte
        </p>
      </div>

      {/* Fleet Manager Card */}
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={fleetManager?.logo_url || undefined} />
              <AvatarFallback className="bg-blue-100 text-blue-600">
                <Building2 className="w-6 h-6" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h4 className="font-semibold text-lg">{fleetManager?.company_name}</h4>
              {fleetManager?.address && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {fleetManager.address}
                </p>
              )}
              <Badge variant="secondary" className="mt-1">
                <Truck className="w-3 h-3 mr-1" />
                {fleetManager?.drivers_count} chauffeur{fleetManager?.drivers_count !== 1 ? "s" : ""}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Course Details Summary */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h4 className="font-medium">Détails de la course</h4>
          
          {/* Employee */}
          <div className="flex items-center gap-3 text-sm">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span>
              {formData.isGuestEmployee 
                ? `${formData.guestEmployeeName} (invité)` 
                : "Collaborateur sélectionné"
              }
            </span>
          </div>

          {/* Date */}
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>
              {formData.scheduledDate 
                ? format(new Date(formData.scheduledDate), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })
                : "Date non définie"
              }
            </span>
          </div>

          {/* Addresses */}
          <div className="space-y-2">
            <div className="flex items-start gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
              <span className="flex-1">{formData.pickupAddress}</span>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5" />
              <span className="flex-1">{formData.destinationAddress}</span>
            </div>
          </div>

          {/* Passengers */}
          <div className="flex items-center gap-3 text-sm">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span>{formData.passengersCount} passager{parseInt(formData.passengersCount) > 1 ? "s" : ""}</span>
          </div>

          {/* Notes */}
          {formData.notes && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="text-muted-foreground">{formData.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Box */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          <strong>Comment ça fonctionne ?</strong>
        </p>
        <ul className="text-sm text-blue-600 dark:text-blue-400 mt-2 space-y-1">
          <li>• Le gestionnaire reçoit votre demande instantanément</li>
          <li>• Il assigne un chauffeur disponible</li>
          <li>• Vous êtes notifié dès qu'un chauffeur est confirmé</li>
          <li>• Le paiement suit les conditions de votre partenariat</li>
        </ul>
      </div>

      {/* Send Button */}
      <Button 
        onClick={handleSend} 
        disabled={isSending}
        className="w-full gap-2"
        size="lg"
      >
        {isSending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Envoi en cours...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Envoyer au gestionnaire
          </>
        )}
      </Button>
    </div>
  );
}
