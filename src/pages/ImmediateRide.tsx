import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImmediateRideSearch } from '@/components/client/immediate-ride/ImmediateRideSearch';
import { RideWaitingScreen } from '@/components/client/immediate-ride/RideWaitingScreen';
import { NearbyDriver } from '@/hooks/useNearbyDrivers';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const ImmediateRide = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<'search' | 'confirm' | 'pending'>('search');
  const [selectedDriver, setSelectedDriver] = useState<NearbyDriver | null>(null);
  const [rideDetails, setRideDetails] = useState({
    pickupAddress: '',
    destinationAddress: '',
    distanceKm: 0,
  });
  const [guestInfo, setGuestInfo] = useState({
    name: '',
    phone: '',
    email: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [requestGroupId, setRequestGroupId] = useState<string | null>(null);
  const [timeoutAt, setTimeoutAt] = useState<string>('');

  const handleDriverSelected = (
    driver: NearbyDriver,
    pickupAddress: string,
    destinationAddress: string,
    distanceKm: number
  ) => {
    setSelectedDriver(driver);
    setRideDetails({ pickupAddress, destinationAddress, distanceKm });
    setStep('confirm');
  };

  const handleSubmitRequest = async () => {
    if (!selectedDriver) return;

    if (!user && (!guestInfo.name.trim() || !guestInfo.phone.trim())) {
      toast.error('Veuillez renseigner votre nom et téléphone');
      return;
    }

    setIsSubmitting(true);

    try {
      const groupId = crypto.randomUUID();
      const timeout = new Date(Date.now() + 90 * 1000).toISOString();

      const { data, error } = await supabase
        .from('ride_requests')
        .insert({
          client_id: user ? (await supabase.from('clients').select('id').eq('user_id', user.id).single()).data?.id : null,
          guest_name: !user ? guestInfo.name : null,
          guest_phone: !user ? guestInfo.phone : null,
          guest_email: !user ? guestInfo.email : null,
          pickup_address: rideDetails.pickupAddress,
          destination_address: rideDetails.destinationAddress,
          distance_km: rideDetails.distanceKm,
          ride_type: 'immediate',
          status: 'pending',
          selected_driver_id: selectedDriver.driver_id,
          estimated_price: selectedDriver.estimated_price,
          timeout_at: timeout,
          request_type: 'exclusive',
          driver_count: 1,
          request_group_id: groupId,
        })
        .select('id')
        .single();

      if (error) throw error;

      setRequestId(data.id);
      setRequestGroupId(groupId);
      setTimeoutAt(timeout);
      setStep('pending');

      toast.success('Demande envoyée au chauffeur !');
    } catch (err) {
      console.error('Error submitting request:', err);
      toast.error("Erreur lors de l'envoi de la demande");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep('search');
    setSelectedDriver(null);
    setRequestId(null);
    setRequestGroupId(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container flex items-center gap-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (step === 'confirm') setStep('search');
              else if (step === 'pending') return; // Don't allow back during pending
              else navigate(-1);
            }}
            disabled={step === 'pending'}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">
            {step === 'search' && 'Course immédiate'}
            {step === 'confirm' && 'Confirmer la demande'}
            {step === 'pending' && 'En attente…'}
          </h1>
        </div>
      </header>

      <main className="container py-6 max-w-lg mx-auto">
        {step === 'search' && (
          <ImmediateRideSearch onDriverSelected={handleDriverSelected} />
        )}

        {step === 'confirm' && selectedDriver && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Récapitulatif</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-muted-foreground">Départ</Label>
                  <p className="font-medium">{rideDetails.pickupAddress}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Arrivée</Label>
                  <p className="font-medium">{rideDetails.destinationAddress}</p>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span>Distance</span>
                  <span className="font-medium">{rideDetails.distanceKm.toFixed(1)} km</span>
                </div>
                <div className="flex justify-between">
                  <span>Chauffeur</span>
                  <span className="font-medium">{selectedDriver.display_name || selectedDriver.company_name}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Prix estimé</span>
                  <span className="text-primary">{selectedDriver.estimated_price?.toFixed(2)}€</span>
                </div>
              </CardContent>
            </Card>

            {!user && (
              <Card>
                <CardHeader>
                  <CardTitle>Vos coordonnées</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="guest-name">Nom *</Label>
                    <Input
                      id="guest-name"
                      value={guestInfo.name}
                      onChange={(e) => setGuestInfo((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Votre nom"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guest-phone">Téléphone *</Label>
                    <Input
                      id="guest-phone"
                      type="tel"
                      value={guestInfo.phone}
                      onChange={(e) => setGuestInfo((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="06 12 34 56 78"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guest-email">Email (optionnel)</Label>
                    <Input
                      id="guest-email"
                      type="email"
                      value={guestInfo.email}
                      onChange={(e) => setGuestInfo((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="votre@email.com"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={handleSubmitRequest}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Envoi en cours...' : 'Envoyer la demande'}
            </Button>
          </div>
        )}

        {step === 'pending' && requestId && (
          <RideWaitingScreen
            requestId={requestId}
            requestGroupId={requestGroupId || undefined}
            requestType="exclusive"
            driverCount={1}
            pickupAddress={rideDetails.pickupAddress}
            destinationAddress={rideDetails.destinationAddress}
            estimatedPrice={selectedDriver?.estimated_price || 0}
            driverName={selectedDriver?.display_name || selectedDriver?.company_name}
            timeoutAt={timeoutAt}
            onCancel={handleReset}
            onAccepted={(name) => toast.success(`${name} a accepté votre course !`)}
            onExpired={() => toast.error('Délai expiré, aucun chauffeur disponible')}
          />
        )}
      </main>
    </div>
  );
};

export default ImmediateRide;
