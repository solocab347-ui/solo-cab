import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Car, MapPin, Calendar, Users, Plus, Search, Star, 
  ArrowRight, Building2, Loader2, CheckCircle, X 
} from "lucide-react";
import { validateCoordinates } from "@/lib/courseValidation";
import { sanitizeAddress, sanitizeString, sanitizeInteger } from "@/lib/inputSanitizer";

interface CompanyInlineCourseCreationProps {
  companyId: string;
  onClose?: () => void;
  onSuccess?: () => void;
  onSearchNewDriver?: () => void;
}

export function CompanyInlineCourseCreation({ 
  companyId, 
  onClose, 
  onSuccess,
  onSearchNewDriver 
}: CompanyInlineCourseCreationProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [step, setStep] = useState<"select-driver" | "create-course">("select-driver");
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Course form state
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupCoordinates, setPickupCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [destinationAddress, setDestinationAddress] = useState("");
  const [destinationCoordinates, setDestinationCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [passengersCount, setPassengersCount] = useState("1");
  const [notes, setNotes] = useState("");

  // Fetch partner drivers
  const { data: partnerDrivers, isLoading: loadingDrivers } = useQuery({
    queryKey: ["company-partner-drivers", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_driver_agreements")
        .select(`
          id,
          driver_id,
          payment_frequency,
          discount_percentage,
          driver:drivers(
            id,
            company_name,
            vehicle_brand,
            vehicle_model,
            vehicle_color,
            max_passengers,
            rating,
            user_id
          )
        `)
        .eq("company_id", companyId)
        .eq("status", "accepted");

      if (error) throw error;

      // Fetch profiles
      const userIds = data?.map((a: any) => a.driver?.user_id).filter(Boolean) || [];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, profile_photo_url, phone")
          .in("id", userIds);

        return data?.map((agreement: any) => ({
          ...agreement,
          profile: profiles?.find((p: any) => p.id === agreement.driver?.user_id),
        }));
      }

      return data || [];
    },
  });

  // Create course mutation using edge function
  const createCourseMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDriver?.driver_id) throw new Error("Aucun chauffeur sélectionné");
      if (!validateCoordinates(pickupCoordinates) || !validateCoordinates(destinationCoordinates)) {
        throw new Error("Veuillez sélectionner des adresses valides");
      }
      if (!scheduledDate) throw new Error("Veuillez sélectionner une date");

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non connecté");
      
      console.log("[CompanyInlineCourseCreation] Creating course via edge function:", {
        driver_id: selectedDriver.driver_id,
        company_id: companyId
      });

      // Use edge function to bypass RLS issues
      const { data, error } = await supabase.functions.invoke('create-company-course', {
        body: {
          company_id: companyId,
          driver_id: selectedDriver.driver_id,
          pickup_address: sanitizeAddress(pickupAddress),
          pickup_latitude: pickupCoordinates!.latitude,
          pickup_longitude: pickupCoordinates!.longitude,
          destination_address: sanitizeAddress(destinationAddress),
          destination_latitude: destinationCoordinates!.latitude,
          destination_longitude: destinationCoordinates!.longitude,
          scheduled_date: scheduledDate,
          passengers_count: sanitizeInteger(passengersCount, 1, selectedDriver.driver?.max_passengers || 4),
          notes: sanitizeString(notes),
        }
      });

      if (error) {
        console.error("[CompanyInlineCourseCreation] Edge function error:", error);
        throw new Error(error.message || "Erreur lors de la création");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      console.log("[CompanyInlineCourseCreation] Course created successfully:", data);

      // Créer le devis automatiquement (BLOQUANT - on attend le résultat)
      console.log("[CompanyInlineCourseCreation] Creating devis for course:", data.course.id);
      const { data: devisResult, error: devisError } = await supabase.functions.invoke("create-devis-auto", {
        body: { 
          course_id: data.course.id, 
          driver_id: selectedDriver.driver_id,
          company_id: companyId // Passer explicitement le company_id pour les courses entreprise
        }
      });

      if (devisError) {
        console.error("[CompanyInlineCourseCreation] Devis creation error:", devisError);
        // Course créée mais pas de devis - informer l'utilisateur
        return { course: data.course, devisCreated: false };
      }

      console.log("[CompanyInlineCourseCreation] Devis created:", devisResult);
      return { course: data.course, devisCreated: true, devis: devisResult?.devis };
    },
    onSuccess: (result) => {
      if (result.devisCreated) {
        toast.success("Devis généré ! Consultez l'onglet Courses pour l'accepter ou le refuser.");
      } else {
        toast.warning("Course créée mais le devis n'a pas pu être généré. Veuillez réessayer.");
      }
      queryClient.invalidateQueries({ queryKey: ["company-courses"] });
      queryClient.invalidateQueries({ queryKey: ["employee-courses"] });
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de la création");
    },
  });

  const handleSelectDriver = (driver: any) => {
    setSelectedDriver(driver);
    setStep("create-course");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCourseMutation.mutate();
  };

  const resetForm = () => {
    setStep("select-driver");
    setSelectedDriver(null);
    setPickupAddress("");
    setPickupCoordinates(null);
    setDestinationAddress("");
    setDestinationCoordinates(null);
    setScheduledDate("");
    setPassengersCount("1");
    setNotes("");
  };

  if (loadingDrivers) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center gap-2 px-2">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
          step === "select-driver" 
            ? "bg-primary text-primary-foreground" 
            : "bg-muted text-muted-foreground"
        }`}>
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">1</span>
          Chauffeur
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground" />
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
          step === "create-course" 
            ? "bg-primary text-primary-foreground" 
            : "bg-muted text-muted-foreground"
        }`}>
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">2</span>
          Détails
        </div>
      </div>

      {step === "select-driver" && (
        <div className="space-y-4">
          <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Car className="h-5 w-5 text-primary" />
                Sélectionner un chauffeur partenaire
              </CardTitle>
              <CardDescription>
                Choisissez parmi vos chauffeurs partenaires ou recherchez-en un nouveau
              </CardDescription>
            </CardHeader>
          </Card>

          {partnerDrivers && partnerDrivers.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {partnerDrivers.map((agreement: any) => (
                <Card 
                  key={agreement.id}
                  className="cursor-pointer hover:border-primary transition-colors hover:shadow-md"
                  onClick={() => handleSelectDriver(agreement)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={agreement.profile?.profile_photo_url} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {agreement.profile?.full_name?.charAt(0) || "C"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">
                          {agreement.profile?.full_name || "Chauffeur"}
                        </h4>
                        <p className="text-sm text-muted-foreground truncate">
                          {agreement.driver?.company_name || `${agreement.driver?.vehicle_brand} ${agreement.driver?.vehicle_model}`}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {agreement.driver?.rating && (
                            <Badge variant="outline" className="text-xs">
                              <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                              {agreement.driver.rating.toFixed(1)}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            <Users className="w-3 h-3 mr-1" />
                            {agreement.driver?.max_passengers || 4} places
                          </Badge>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Car className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-2">Aucun chauffeur partenaire</h3>
                <p className="text-muted-foreground mb-4">
                  Vous n'avez pas encore de partenariat avec des chauffeurs
                </p>
              </CardContent>
            </Card>
          )}

          {/* Search new driver button */}
          <Button 
            variant="outline" 
            className="w-full gap-2"
            onClick={onSearchNewDriver}
          >
            <Search className="w-4 h-4" />
            Rechercher un nouveau chauffeur
          </Button>
        </div>
      )}

      {step === "create-course" && selectedDriver && (
        <div className="space-y-4">
          {/* Selected driver card */}
          <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedDriver.profile?.profile_photo_url} />
                    <AvatarFallback className="bg-green-500/10 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {selectedDriver.profile?.full_name || "Chauffeur"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedDriver.driver?.vehicle_brand} {selectedDriver.driver?.vehicle_model}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setStep("select-driver")}>
                  Changer
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Course form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Détails de la course
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-green-600" />
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
                    <MapPin className="w-4 h-4 text-red-600" />
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

                <div className="grid grid-cols-2 gap-4">
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
                      max={selectedDriver.driver?.max_passengers || 4}
                      value={passengersCount}
                      onChange={(e) => setPassengersCount(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes (optionnel)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Instructions particulières..."
                    rows={2}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setStep("select-driver")}
                    className="flex-1"
                  >
                    Retour
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createCourseMutation.isPending}
                    className="flex-1"
                  >
                    {createCourseMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Envoi...
                      </>
                    ) : (
                      "Envoyer la demande"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}