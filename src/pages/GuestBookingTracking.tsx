import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NavigationHeader } from "@/components/NavigationHeader";
import { Calendar, MapPin, Clock, Phone, User, CheckCircle, XCircle, Clock3, UserPlus, RefreshCw, Car } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import logo from "@/assets/logo-solocab.png";

interface BookingInfo {
  id: string;
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  status: string;
  guest_name: string;
  guest_estimated_price: number | null;
  driver_name: string | null;
  driver_company: string | null;
  driver_phone: string | null;
  created_at: string;
}

const GuestBookingTracking = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBooking = async () => {
    if (!token) return;
    
    try {
      const { data, error } = await supabase
        .rpc('get_guest_booking_by_token', { _token: token });

      if (error) throw error;

      if (data && data.length > 0) {
        setBooking(data[0] as BookingInfo);
      } else {
        setBooking(null);
      }
    } catch (error) {
      console.error("Error fetching booking:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBooking();
    
    // Set up polling for status updates
    const interval = setInterval(fetchBooking, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [token]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBooking();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
            <Clock3 className="w-3 h-3 mr-1" />
            En attente de confirmation
          </Badge>
        );
      case 'accepted':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Confirmée
          </Badge>
        );
      case 'refused':
      case 'cancelled':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            {status === 'refused' ? 'Refusée' : 'Annulée'}
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Terminée
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'pending':
        return "Votre demande de réservation a été envoyée. Le chauffeur va l'examiner et vous contacter pour confirmer.";
      case 'accepted':
        return "Votre réservation a été confirmée ! Le chauffeur sera au point de rendez-vous à l'heure convenue.";
      case 'refused':
        return "Nous sommes désolés, le chauffeur n'est pas disponible pour cette course. N'hésitez pas à contacter un autre chauffeur.";
      case 'cancelled':
        return "Cette réservation a été annulée.";
      case 'completed':
        return "Cette course est terminée. Merci d'avoir utilisé SoloCab !";
      default:
        return "";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <NavigationHeader />
        <div className="container max-w-md mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <XCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Réservation non trouvée</h2>
              <p className="text-muted-foreground mb-4">
                Ce lien de suivi n'est plus valide ou la réservation n'existe pas.
              </p>
              <Button onClick={() => navigate('/chauffeurs')}>
                Trouver un chauffeur
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const driverDisplayName = booking.driver_company || booking.driver_name || "Votre chauffeur";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <NavigationHeader />
      
      <div className="container max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-6">
          <img src={logo} alt="SoloCab" className="h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Suivi de votre réservation</h1>
          <p className="text-muted-foreground">Bonjour {booking.guest_name}</p>
        </div>

        {/* Status Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Statut de la réservation</CardTitle>
              <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              {getStatusBadge(booking.status)}
            </div>
            <p className="text-center text-muted-foreground">
              {getStatusMessage(booking.status)}
            </p>
          </CardContent>
        </Card>

        {/* Booking Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Détails de la course
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-muted-foreground">Départ</p>
                <p className="font-medium">{booking.pickup_address}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-muted-foreground">Arrivée</p>
                <p className="font-medium">{booking.destination_address}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-muted-foreground">Date et heure</p>
                <p className="font-medium">
                  {format(new Date(booking.scheduled_date), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
                </p>
              </div>
            </div>

            {booking.guest_estimated_price && (
              <div className="bg-muted/50 rounded-lg p-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Prix estimé</span>
                  <span className="text-xl font-bold text-primary">
                    {booking.guest_estimated_price.toFixed(2)} €
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Driver Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Car className="h-5 w-5" />
              Votre chauffeur
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                <User className="w-7 h-7 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold">{driverDisplayName}</p>
                {booking.driver_phone && booking.status === 'accepted' && (
                  <a 
                    href={`tel:${booking.driver_phone}`}
                    className="flex items-center gap-1 text-primary hover:underline text-sm mt-1"
                  >
                    <Phone className="w-3 h-3" />
                    {booking.driver_phone}
                  </a>
                )}
              </div>
            </div>
            
            {booking.status === 'pending' && (
              <p className="text-sm text-muted-foreground mt-3">
                Le chauffeur vous contactera par téléphone ou email pour confirmer votre réservation.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Registration CTA */}
        <Alert className="border-primary/50 bg-primary/5">
          <UserPlus className="h-4 w-4" />
          <AlertDescription className="space-y-3">
            <p>
              <strong>Inscrivez-vous gratuitement</strong> pour bénéficier de tous les avantages SoloCab :
            </p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Historique complet de vos courses</li>
              <li>Réservation simplifiée</li>
              <li>Devis et factures automatiques</li>
              <li>Communication directe avec votre chauffeur</li>
            </ul>
            <Button 
              onClick={() => navigate('/chauffeurs')}
              className="w-full mt-2"
            >
              S'inscrire maintenant
            </Button>
          </AlertDescription>
        </Alert>

        {/* Bookmark Reminder */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          💡 Conservez ce lien pour suivre l'évolution de votre réservation
        </p>
      </div>
    </div>
  );
};

export default GuestBookingTracking;
