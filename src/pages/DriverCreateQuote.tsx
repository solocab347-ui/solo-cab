import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { FileText, MapPin, Calendar, Users, Euro, User, Phone, Mail, Share2, Copy, MessageCircle, Send, Download } from "lucide-react";
import { calculateRoute } from "@/lib/geocoding";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { sanitizeAddress, sanitizeString } from "@/lib/inputSanitizer";

const DriverCreateQuote = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);
  const [quoteResult, setQuoteResult] = useState<any>(null);

  // Client info
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");

  // Course info
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupCoordinates, setPickupCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [destinationAddress, setDestinationAddress] = useState("");
  const [destinationCoordinates, setDestinationCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [passengersCount, setPassengersCount] = useState("1");
  const [customPrice, setCustomPrice] = useState("");
  const [notes, setNotes] = useState("");

  // Route calculation
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    if (pickupCoordinates && destinationCoordinates) {
      calculateRouteData();
    }
  }, [pickupCoordinates, destinationCoordinates]);

  const calculateRouteData = async () => {
    if (!pickupCoordinates || !destinationCoordinates) return;
    setCalculating(true);
    try {
      const routeResult = await calculateRoute(pickupCoordinates, destinationCoordinates);
      if (routeResult.success && routeResult.distance_km && routeResult.duration_minutes) {
        setDistanceKm(routeResult.distance_km);
        setDurationMinutes(routeResult.duration_minutes);
      }
    } finally {
      setCalculating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Non autorisé");
      return;
    }

    if (!clientName.trim()) {
      toast.error("Le nom du client est requis");
      return;
    }
    if (!pickupAddress.trim() || !destinationAddress.trim()) {
      toast.error("Les adresses de départ et d'arrivée sont requises");
      return;
    }
    if (!scheduledDate) {
      toast.error("La date est requise");
      return;
    }
    if (!customPrice || parseFloat(customPrice) <= 0) {
      toast.error("Veuillez entrer un prix valide");
      return;
    }

    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await supabase.functions.invoke('create-driver-quote', {
        body: {
          guest_client_name: sanitizeString(clientName),
          guest_client_phone: clientPhone.trim() || null,
          guest_client_email: clientEmail.trim() || null,
          pickup_address: sanitizeAddress(pickupAddress),
          pickup_latitude: pickupCoordinates?.latitude || null,
          pickup_longitude: pickupCoordinates?.longitude || null,
          destination_address: sanitizeAddress(destinationAddress),
          destination_latitude: destinationCoordinates?.latitude || null,
          destination_longitude: destinationCoordinates?.longitude || null,
          scheduled_date: scheduledDate,
          passengers_count: parseInt(passengersCount) || 1,
          custom_price: parseFloat(customPrice),
          notes: sanitizeString(notes),
          distance_km: distanceKm,
          duration_minutes: durationMinutes,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Erreur lors de la création du devis");
      }

      const result = response.data;
      if (!result?.success) {
        throw new Error(result?.error || "Erreur inconnue");
      }

      setQuoteResult(result);
      setCreated(true);
      toast.success("Devis créé avec succès !");
    } catch (error: any) {
      console.error("❌ Erreur création devis:", error);
      toast.error(error.message || "Erreur lors de la création du devis");
    } finally {
      setLoading(false);
    }
  };

  const getQuoteUrl = () => {
    if (!quoteResult?.quote_token) return "";
    const baseUrl = window.location.origin;
    return `${baseUrl}/devis/${quoteResult.quote_token}`;
  };

  const handleCopyLink = async () => {
    const url = getQuoteUrl();
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien copié !");
    } catch {
      toast.error("Impossible de copier le lien");
    }
  };

  const formatDate = () => new Date(scheduledDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const handleShareWhatsApp = () => {
    const price = parseFloat(customPrice).toFixed(2);
    const message = `Bonjour ${clientName}, voici la confirmation de votre course SoloCab n°${quoteResult?.reservation_number} pour un montant de ${price}€.\n\nTrajet : ${pickupAddress} → ${destinationAddress}\nDate : ${formatDate()}\n\nMerci pour votre confiance !`;
    const phoneNumber = clientPhone?.replace(/\s/g, '').replace(/^0/, '33');
    const whatsappUrl = phoneNumber 
      ? `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleShareSMS = () => {
    const price = parseFloat(customPrice).toFixed(2);
    const message = `Confirmation course SoloCab ${quoteResult?.reservation_number}: ${price}€ - ${pickupAddress} → ${destinationAddress} le ${formatDate()}`;
    window.open(`sms:${clientPhone || ''}?body=${encodeURIComponent(message)}`, '_blank');
  };

  const handleShareEmail = () => {
    const price = parseFloat(customPrice).toFixed(2);
    const subject = `Confirmation course SoloCab ${quoteResult?.reservation_number} - ${price}€`;
    const body = `Bonjour ${clientName},\n\nVoici la confirmation de votre course :\n\nDépart : ${pickupAddress}\nArrivée : ${destinationAddress}\nDate : ${formatDate()}\nMontant : ${price}€\n\nN° de réservation : ${quoteResult?.reservation_number}\n\nMerci pour votre confiance !\nVotre chauffeur SoloCab`;
    window.open(`mailto:${clientEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  };

  // SUCCESS VIEW: Show sharing options
  if (created && quoteResult) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-lg">
          <NavigationHeader showBack showHome homeRoute="/driver-dashboard" />

          <Card className="p-8 bg-card border-primary/20 mt-6 text-center space-y-6">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
              <FileText className="w-10 h-10 text-white" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-foreground">Devis créé !</h1>
              <p className="text-muted-foreground mt-1">N° {quoteResult.reservation_number}</p>
            </div>

            <div className="bg-muted/30 rounded-xl p-4 text-left space-y-2">
              <p className="text-sm"><span className="font-medium">Client :</span> {clientName}</p>
              <p className="text-sm"><span className="font-medium">Trajet :</span> {pickupAddress} → {destinationAddress}</p>
              <p className="text-sm"><span className="font-medium">Date :</span> {new Date(scheduledDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              <p className="text-lg font-bold text-primary">{parseFloat(customPrice).toFixed(2)} €</p>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2 justify-center">
                <Share2 className="w-5 h-5" />
                Partager le devis
              </h3>

              <Button onClick={handleCopyLink} variant="outline" className="w-full gap-2">
                <Copy className="w-4 h-4" /> Copier le lien
              </Button>

              <Button onClick={handleShareWhatsApp} className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                <MessageCircle className="w-4 h-4" /> Envoyer par WhatsApp
              </Button>

              <Button onClick={handleShareSMS} variant="outline" className="w-full gap-2">
                <Send className="w-4 h-4" /> Envoyer par SMS
              </Button>

              {(clientEmail || true) && (
                <Button onClick={handleShareEmail} variant="outline" className="w-full gap-2">
                  <Mail className="w-4 h-4" /> Envoyer par Email
                </Button>
              )}
            </div>

            <div className="pt-4 border-t border-border space-y-2">
              <Button 
                onClick={() => {
                  setCreated(false);
                  setQuoteResult(null);
                  setClientName("");
                  setClientPhone("");
                  setClientEmail("");
                  setPickupAddress("");
                  setPickupCoordinates(null);
                  setDestinationAddress("");
                  setDestinationCoordinates(null);
                  setScheduledDate("");
                  setCustomPrice("");
                  setNotes("");
                  setDistanceKm(null);
                  setDurationMinutes(null);
                }}
                variant="outline"
                className="w-full"
              >
                Créer un autre devis
              </Button>
              <Button onClick={() => navigate("/driver-dashboard")} className="w-full">
                Retour au tableau de bord
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // FORM VIEW
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-lg">
          <NavigationHeader showBack showHome homeRoute="/driver-dashboard" />

          <Card className="p-6 sm:p-8 bg-card border-primary/10 mt-6">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center shadow-lg">
                <FileText className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Créer un Devis</h1>
                <p className="text-muted-foreground">Pour un client externe</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Client Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Informations client
                </h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="clientName">Nom du client *</Label>
                    <Input
                      id="clientName"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Jean Dupont"
                      required
                      maxLength={200}
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientPhone" className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> Téléphone
                    </Label>
                    <Input
                      id="clientPhone"
                      type="tel"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="06 12 34 56 78"
                      maxLength={20}
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientEmail" className="flex items-center gap-1">
                      <Mail className="w-3 h-3" /> Email
                    </Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="client@email.com"
                      maxLength={255}
                    />
                  </div>
                </div>
              </div>

              {/* Addresses */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Trajet
                </h3>
                <div className="space-y-3">
                  <div>
                    <Label>Adresse de départ *</Label>
                    <AddressAutocomplete
                      value={pickupAddress}
                      onChange={(address, coords) => {
                        setPickupAddress(address);
                        if (coords) setPickupCoordinates(coords);
                      }}
                      placeholder="Adresse de prise en charge"
                    />
                  </div>
                  <div>
                    <Label>Adresse d'arrivée *</Label>
                    <AddressAutocomplete
                      value={destinationAddress}
                      onChange={(address, coords) => {
                        setDestinationAddress(address);
                        if (coords) setDestinationCoordinates(coords);
                      }}
                      placeholder="Adresse de destination"
                    />
                  </div>
                  {calculating && (
                    <p className="text-sm text-muted-foreground animate-pulse">Calcul de l'itinéraire...</p>
                  )}
                  {distanceKm && durationMinutes && (
                    <div className="bg-muted/30 rounded-lg p-3 text-sm flex gap-4">
                      <span>📏 {distanceKm.toFixed(1)} km</span>
                      <span>⏱️ {Math.round(durationMinutes)} min</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Date & passengers */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Détails
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="scheduledDate">Date et heure *</Label>
                    <Input
                      id="scheduledDate"
                      type="datetime-local"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="passengers" className="flex items-center gap-1">
                      <Users className="w-3 h-3" /> Passagers
                    </Label>
                    <Input
                      id="passengers"
                      type="number"
                      min="1"
                      max="20"
                      value={passengersCount}
                      onChange={(e) => setPassengersCount(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Euro className="w-4 h-4 text-primary" />
                  Prix du devis
                </h3>
                <div>
                  <Label htmlFor="customPrice">Montant TTC *</Label>
                  <div className="relative">
                    <Input
                      id="customPrice"
                      type="number"
                      step="0.01"
                      min="1"
                      max="50000"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      placeholder="0.00"
                      required
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">€</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Notes (optionnel)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Informations complémentaires..."
                  maxLength={1000}
                  rows={3}
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-14 text-lg font-semibold"
              >
                {loading ? "Création en cours..." : "Créer le devis"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default DriverCreateQuote;
