import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { NavigationHeader } from "@/components/NavigationHeader";
import { Car, MapPin, Calendar, Users, Building2 } from "lucide-react";
import { geocodeAddress } from "@/lib/geocoding";
import { validateCoordinates } from "@/lib/courseValidation";
import { sanitizeAddress, sanitizeString, sanitizeInteger } from "@/lib/inputSanitizer";
import { CoursePaymentMethodSelector } from "@/components/shared/CoursePaymentMethodSelector";
import { useSubmitProtection, generateSubmitKey } from "@/hooks/useSubmitProtection";
import { withRetry } from "@/lib/asyncUtils";
import { handleError } from "@/lib/errorHandler";

export default function CreateCompanyCourse() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const driverId = searchParams.get("driver_id");
  const { isSubmitting, protectedSubmit } = useSubmitProtection();
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupCoordinates, setPickupCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [destinationAddress, setDestinationAddress] = useState("");
  const [destinationCoordinates, setDestinationCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [passengersCount, setPassengersCount] = useState("1");
  const [maxPassengers, setMaxPassengers] = useState(4);
  const [notes, setNotes] = useState("");
  const [company, setCompany] = useState<any>(null);
  const [paymentMethodPreference, setPaymentMethodPreference] = useState("not_specified");

  useEffect(() => {
    const fetchCompany = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("companies")
        .select("*")
        .eq("user_id", user.id)
        .single();
      setCompany(data);
    };
    fetchCompany();
  }, [user]);

  useEffect(() => {
    const fetchDriverMaxPassengers = async () => {
      if (!driverId) return;
      const { data } = await supabase
        .from("drivers")
        .select("max_passengers")
        .eq("id", driverId)
        .maybeSingle();
      if (data?.max_passengers) setMaxPassengers(data.max_passengers);
    };
    fetchDriverMaxPassengers();
  }, [driverId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !driverId || !company) {
      toast.error("Informations manquantes");
      return;
    }

    if (!validateCoordinates(pickupCoordinates) || !validateCoordinates(destinationCoordinates)) {
      toast.error("Veuillez sélectionner des adresses valides");
      return;
    }

    if (!scheduledDate) {
      toast.error("Veuillez sélectionner une date");
      return;
    }

    // Générer une clé unique pour cette soumission
    const submitKey = generateSubmitKey({
      pickupAddress,
      destinationAddress,
      scheduledDate,
      driverId,
      companyId: company.id,
    });

    await protectedSubmit(async () => {
      // Créer la course
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .insert({
          driver_id: driverId,
          pickup_address: sanitizeAddress(pickupAddress),
          pickup_latitude: pickupCoordinates!.latitude,
          pickup_longitude: pickupCoordinates!.longitude,
          destination_address: sanitizeAddress(destinationAddress),
          destination_latitude: destinationCoordinates!.latitude,
          destination_longitude: destinationCoordinates!.longitude,
          scheduled_date: scheduledDate,
          passengers_count: sanitizeInteger(passengersCount, 1, maxPassengers),
          notes: sanitizeString(notes),
          status: "pending",
          created_by_user_id: user.id,
          payment_method_requested: paymentMethodPreference !== "not_specified" ? paymentMethodPreference : null,
        })
        .select()
        .single();

      if (courseError) throw courseError;

      // Lier la course à l'entreprise
      const { error: linkError } = await supabase
        .from("company_courses")
        .insert({
          company_id: company.id,
          course_id: course.id,
          invoice_to_company: true,
        });

      if (linkError) throw linkError;

      // Créer le devis automatiquement avec retry
      await withRetry(
        async () => {
          const result = await supabase.functions.invoke("create-devis-auto", {
            body: { course_id: course.id, driver_id: driverId }
          });
          if (result.error) throw result.error;
          return result;
        },
        { maxRetries: 3, context: "Création devis auto" }
      ).catch(e => console.warn("Devis auto failed:", e));

      // Notifier le chauffeur (non bloquant)
      const { data: driverData } = await supabase
        .from("drivers")
        .select("user_id")
        .eq("id", driverId)
        .single();

      if (driverData?.user_id) {
        // Fire-and-forget notification
        (async () => {
          try {
            await supabase.from("notifications").insert({
              user_id: driverData.user_id,
              title: "Nouvelle demande entreprise",
              message: `${company.company_name} demande une course`,
              type: "course_request",
              link: "/driver-dashboard?tab=courses",
            });
          } catch {}
        })();
      }

      toast.success("Demande envoyée au chauffeur");
      navigate("/company-dashboard?tab=reservations");
      return course;
    }).catch((error) => {
      handleError(error, "Création course entreprise");
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <NavigationHeader showBack showHome homeRoute="/company-dashboard" />

        <Card className="p-8 mt-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Nouvelle réservation</h1>
              <p className="text-muted-foreground">Réservez une course pour votre entreprise</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Point de départ *
                </Label>
                <AddressAutocomplete
                  value={pickupAddress}
                  onChange={(address, coords) => {
                    setPickupAddress(address);
                    if (coords) setPickupCoordinates(coords);
                  }}
                  placeholder="Adresse de départ"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-destructive" />
                  Point d'arrivée *
                </Label>
                <AddressAutocomplete
                  value={destinationAddress}
                  onChange={(address, coords) => {
                    setDestinationAddress(address);
                    if (coords) setDestinationCoordinates(coords);
                  }}
                  placeholder="Adresse d'arrivée"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date et heure *
                </Label>
                <Input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Passagers *
                </Label>
                <Input
                  type="number"
                  min="1"
                  max={maxPassengers}
                  value={passengersCount}
                  onChange={(e) => setPassengersCount(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Moyen de paiement */}
            <div className="bg-card/50 p-4 rounded-lg border border-border">
              <CoursePaymentMethodSelector
                value={paymentMethodPreference}
                onChange={setPaymentMethodPreference}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes (optionnel)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Instructions particulières..."
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Envoi en cours..." : "Envoyer la demande"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
