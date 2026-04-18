import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Euro,
  UserPlus,
  MessageSquare,
  Link2
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { SendRegistrationLinkDialog } from "./SendRegistrationLinkDialog";

interface GuestBooking {
  id: string;
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  status: string;
  passengers_count: number;
  notes: string | null;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  guest_estimated_price: number | null;
  distance_km: number | null;
  duration_minutes: number | null;
  payment_method?: string | null;
  created_at: string;
}

interface GuestBookingsListProps {
  driverId: string;
}

export const GuestBookingsList = ({ driverId }: GuestBookingsListProps) => {
  const [bookings, setBookings] = useState<GuestBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<GuestBooking | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [bookingToRegister, setBookingToRegister] = useState<GuestBooking | null>(null);

  useEffect(() => {
    fetchBookings();
  }, [driverId]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('driver_id', driverId)
        .eq('is_guest_booking', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings((data || []) as GuestBooking[]);
    } catch (error) {
      console.error("Error fetching guest bookings:", error);
      toast.error("Erreur lors du chargement des réservations");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (booking: GuestBooking) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('courses')
        .update({ 
          status: 'driver_approaching' as any,
          guest_notified_at: new Date().toISOString()
        })
        .eq('id', booking.id);

      if (error) throw error;

      toast.success("Réservation acceptée ! Le client peut suivre l'état sur son lien de suivi.");
      fetchBookings();
    } catch (error) {
      console.error("Error accepting booking:", error);
      toast.error("Erreur lors de l'acceptation");
    } finally {
      setActionLoading(false);
      setSelectedBooking(null);
    }
  };

  const handleRefuse = async (booking: GuestBooking) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('courses')
        .update({ 
          status: 'cancelled' as any,
          guest_notified_at: new Date().toISOString()
        })
        .eq('id', booking.id);

      if (error) throw error;

      toast.success("Réservation refusée.");
      fetchBookings();
    } catch (error) {
      console.error("Error refusing booking:", error);
      toast.error("Erreur lors du refus");
    } finally {
      setActionLoading(false);
      setSelectedBooking(null);
    }
  };

  const handleComplete = async (booking: GuestBooking) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('courses')
        .update({ status: 'completed' })
        .eq('id', booking.id);

      if (error) throw error;

      const { error: factureError } = await supabase.functions.invoke('create-facture-auto', {
        body: {
          course_id: booking.id,
          payment_method: booking.payment_method || 'cash',
        }
      });

      if (factureError) {
        console.error('Error creating invoice for guest booking:', factureError);
      }

      toast.success("Course terminée !");
      fetchBookings();
    } catch (error) {
      console.error("Error completing booking:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setActionLoading(false);
    }
  };

  const handleInviteToRegister = (booking: GuestBooking) => {
    setSelectedBooking(booking);
    setInviteMessage(`Bonjour ${booking.guest_name},\n\nMerci d'avoir utilisé nos services ! Pour bénéficier de tous les avantages SoloCab (historique des courses, réservation simplifiée, devis automatiques), je vous invite à vous inscrire sur notre plateforme.\n\nÀ bientôt !`);
    setInviteDialogOpen(true);
  };

  const handleRegisterClient = (booking: GuestBooking) => {
    setBookingToRegister(booking);
    setRegisterDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Acceptée</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600"><XCircle className="w-3 h-3 mr-1" />Refusée</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600"><CheckCircle className="w-3 h-3 mr-1" />Terminée</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const acceptedBookings = bookings.filter(b => ['accepted', 'driver_approaching', 'driver_arrived'].includes(b.status));
  const otherBookings = bookings.filter(b => !['pending', 'accepted', 'driver_approaching', 'driver_arrived'].includes(b.status));

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const renderBookingCard = (booking: GuestBooking) => (
    <Card key={booking.id} className="mb-4">
      <CardContent className="pt-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-3 flex-1">
            {/* Status and Date */}
            <div className="flex items-center gap-3 flex-wrap">
              {getStatusBadge(booking.status)}
              <span className="text-sm text-muted-foreground">
                {format(new Date(booking.scheduled_date), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
              </span>
            </div>

            {/* Client Info */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <span className="font-medium">{booking.guest_name}</span>
                <Badge variant="secondary" className="text-xs">Non inscrit</Badge>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <a href={`tel:${booking.guest_phone}`} className="flex items-center gap-1 text-primary hover:underline">
                  <Phone className="w-3 h-3" />
                  {booking.guest_phone}
                </a>
                <a href={`mailto:${booking.guest_email}`} className="flex items-center gap-1 text-primary hover:underline">
                  <Mail className="w-3 h-3" />
                  {booking.guest_email}
                </a>
              </div>
            </div>

            {/* Addresses */}
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>{booking.pickup_address}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span>{booking.destination_address}</span>
              </div>
            </div>

            {/* Details */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {booking.distance_km && (
                <span>{booking.distance_km.toFixed(1)} km</span>
              )}
              {booking.duration_minutes && (
                <span>~{booking.duration_minutes} min</span>
              )}
              <span>{booking.passengers_count} passager{booking.passengers_count > 1 ? 's' : ''}</span>
              {booking.guest_estimated_price && (
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <Euro className="w-3 h-3" />
                  {booking.guest_estimated_price.toFixed(2)} €
                </span>
              )}
            </div>

            {booking.notes && (
              <p className="text-sm text-muted-foreground italic">
                Note: {booking.notes}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 sm:items-end">
            {booking.status === 'pending' && (
              <>
                <Button 
                  size="sm" 
                  onClick={() => handleAccept(booking)}
                  disabled={actionLoading}
                  className="w-full sm:w-auto"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Accepter
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleRefuse(booking)}
                  disabled={actionLoading}
                  className="w-full sm:w-auto"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Refuser
                </Button>
              </>
            )}
            {['accepted', 'driver_approaching', 'driver_arrived'].includes(booking.status) && (
              <>
                <Button 
                  size="sm" 
                  onClick={() => handleComplete(booking)}
                  disabled={actionLoading}
                  className="w-full sm:w-auto"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Terminer
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleInviteToRegister(booking)}
                  className="w-full sm:w-auto"
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  Inviter
                </Button>
                <Button 
                  size="sm" 
                  variant="default"
                  onClick={() => handleRegisterClient(booking)}
                  className="w-full sm:w-auto bg-primary"
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  Lien inscription
                </Button>
              </>
            )}
            {(booking.status === 'completed' || booking.status === 'cancelled') && (
              <div className="flex gap-2 flex-wrap">
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => handleInviteToRegister(booking)}
                  className="w-full sm:w-auto"
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  Inviter
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleRegisterClient(booking)}
                  className="w-full sm:w-auto"
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  Lien inscription
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Réservations Clients Non-Inscrits
          </CardTitle>
          <CardDescription>
            Gérez les demandes de réservation des clients qui n'ont pas encore créé de compte
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Aucune réservation de client non-inscrit pour le moment</p>
            </div>
          ) : (
            <Tabs defaultValue="pending" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pending" className="relative">
                  En attente
                  {pendingBookings.length > 0 && (
                    <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {pendingBookings.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="accepted">Acceptées</TabsTrigger>
                <TabsTrigger value="history">Historique</TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="mt-4">
                {pendingBookings.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">Aucune demande en attente</p>
                ) : (
                  pendingBookings.map(renderBookingCard)
                )}
              </TabsContent>

              <TabsContent value="accepted" className="mt-4">
                {acceptedBookings.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">Aucune réservation acceptée</p>
                ) : (
                  acceptedBookings.map(renderBookingCard)
                )}
              </TabsContent>

              <TabsContent value="history" className="mt-4">
                {otherBookings.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">Aucun historique</p>
                ) : (
                  otherBookings.map(renderBookingCard)
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inviter à s'inscrire</DialogTitle>
            <DialogDescription>
              Personnalisez votre message d'invitation pour {selectedBooking?.guest_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p><strong>Email:</strong> {selectedBooking?.guest_email}</p>
              <p><strong>Téléphone:</strong> {selectedBooking?.guest_phone}</p>
            </div>
            
            <Textarea
              value={inviteMessage}
              onChange={(e) => setInviteMessage(e.target.value)}
              rows={6}
            />
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (selectedBooking) {
                  window.location.href = `mailto:${selectedBooking.guest_email}?subject=Invitation SoloCab&body=${encodeURIComponent(inviteMessage)}`;
                }
              }}
            >
              <Mail className="w-4 h-4 mr-2" />
              Envoyer par email
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (selectedBooking) {
                  window.location.href = `sms:${selectedBooking.guest_phone}?body=${encodeURIComponent(inviteMessage)}`;
                }
              }}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Envoyer par SMS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog envoi lien inscription */}
      <SendRegistrationLinkDialog
        open={registerDialogOpen}
        onOpenChange={setRegisterDialogOpen}
        guestBooking={bookingToRegister}
        driverId={driverId}
        onSuccess={() => fetchBookings()}
      />
    </>
  );
};
