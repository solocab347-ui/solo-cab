import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MapPin, Navigation, Search, Loader2, AlertCircle, CalendarClock, 
  Zap, ChevronDown, Send, Users, ArrowLeft, Car
} from 'lucide-react';
import { useNearbyDrivers, NearbyDriver } from '@/hooks/useNearbyDrivers';
import { useMapboxToken } from '@/hooks/useMapboxToken';
import { DriverResultCard } from './DriverResultCard';
import { DriverMap } from './DriverMap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo-solocab.png';

type BookingMode = 'reservation' | 'immediate';

export function UnifiedBookingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { token: mapboxToken, isLoading: isTokenLoading } = useMapboxToken();
  const [mode, setMode] = useState<BookingMode>('reservation');
  
  // Addresses
  const [pickupAddress, setPickupAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);
  
  // Schedule
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  
  // Search state
  const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(null);
  const [routeDurationMin, setRouteDurationMin] = useState<number | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Driver selection
  const [selectedDriverIds, setSelectedDriverIds] = useState<Set<string>>(new Set());
  const [profileDriverId, setProfileDriverId] = useState<string | null>(null);
  
  // Guest info
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Autocomplete
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<any[]>([]);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const pickupDebounce = useRef<NodeJS.Timeout>();
  const destDebounce = useRef<NodeJS.Timeout>();

  const {
    drivers,
    isLoading,
    error,
    searchRadius,
    noDriversFound,
    searchNearbyDrivers,
  } = useNearbyDrivers();

  // Debounced autocomplete
  const fetchSuggestions = useCallback(async (query: string, setter: (s: any[]) => void, showSetter: (b: boolean) => void) => {
    if (query.length < 3 || !mapboxToken) { setter([]); showSetter(false); return; }
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&country=fr&types=address,place,locality,poi&language=fr&limit=5`
      );
      const data = await res.json();
      setter(data.features || []);
      showSetter(true);
    } catch { setter([]); }
  }, [mapboxToken]);

  const handlePickupChange = (val: string) => {
    setPickupAddress(val);
    setPickupCoords(null);
    if (pickupDebounce.current) clearTimeout(pickupDebounce.current);
    pickupDebounce.current = setTimeout(() => fetchSuggestions(val, setPickupSuggestions, setShowPickupSuggestions), 300);
  };

  const handleDestChange = (val: string) => {
    setDestinationAddress(val);
    setDestCoords(null);
    if (destDebounce.current) clearTimeout(destDebounce.current);
    destDebounce.current = setTimeout(() => fetchSuggestions(val, setDestSuggestions, setShowDestSuggestions), 300);
  };

  const selectPickupSuggestion = (feature: any) => {
    setPickupAddress(feature.place_name);
    setPickupCoords({ lat: feature.center[1], lng: feature.center[0] });
    setShowPickupSuggestions(false);
    setPickupSuggestions([]);
  };

  const selectDestSuggestion = (feature: any) => {
    setDestinationAddress(feature.place_name);
    setDestCoords({ lat: feature.center[1], lng: feature.center[0] });
    setShowDestSuggestions(false);
    setDestSuggestions([]);
  };

  // Geolocation
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setPickupCoords({ lat: latitude, lng: longitude });
        try {
          const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${mapboxToken}&language=fr`);
          const data = await res.json();
          if (data.features?.[0]) setPickupAddress(data.features[0].place_name);
        } catch {}
        setIsGettingLocation(false);
      },
      () => setIsGettingLocation(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Search
  const handleSearch = useCallback(async () => {
    if (!pickupAddress.trim() || !destinationAddress.trim()) {
      toast.error('Veuillez renseigner les adresses de départ et d\'arrivée');
      return;
    }
    setIsGeocoding(true);
    setSelectedDriverIds(new Set());
    setHasSearched(true);

    try {
      const geocode = async (addr: string) => {
        const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(addr)}.json?access_token=${mapboxToken}&country=fr&language=fr`);
        const data = await res.json();
        if (data.features?.[0]) return { lat: data.features[0].center[1], lng: data.features[0].center[0] };
        return null;
      };

      const [pickup, dest] = await Promise.all([
        pickupCoords || geocode(pickupAddress),
        destCoords || geocode(destinationAddress),
      ]);

      if (!pickup) { toast.error('Adresse de départ introuvable'); return; }
      if (!dest) { toast.error('Adresse de destination introuvable'); return; }

      setPickupCoords(pickup);
      setDestCoords(dest);

      // Calculate route
      const dirRes = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${pickup.lng},${pickup.lat};${dest.lng},${dest.lat}?access_token=${mapboxToken}`);
      const dirData = await dirRes.json();
      const distance = dirData.routes?.[0]?.distance ? dirData.routes[0].distance / 1000 : null;
      const duration = dirData.routes?.[0]?.duration ? dirData.routes[0].duration / 60 : null;
      setRouteDistanceKm(distance);
      setRouteDurationMin(duration);

      // Build scheduled date for pricing
      let schedDate: Date | undefined;
      if (mode === 'reservation' && scheduledDate && scheduledTime) {
        schedDate = new Date(`${scheduledDate}T${scheduledTime}`);
      }

      await searchNearbyDrivers(
        pickup.lat, pickup.lng, 
        distance || undefined, 
        duration || undefined,
        schedDate,
        pickupAddress,
        destinationAddress
      );
    } catch (err) {
      console.error('Search error:', err);
      toast.error('Erreur lors de la recherche');
    } finally {
      setIsGeocoding(false);
    }
  }, [pickupAddress, destinationAddress, pickupCoords, destCoords, mode, scheduledDate, scheduledTime, searchNearbyDrivers]);

  const toggleDriverSelection = (driverId: string) => {
    setSelectedDriverIds(prev => {
      const next = new Set(prev);
      if (next.has(driverId)) next.delete(driverId);
      else next.add(driverId);
      return next;
    });
  };

  // Submit ride request
  const handleSubmitRequest = async () => {
    if (selectedDriverIds.size === 0) { toast.error('Sélectionnez au moins un chauffeur'); return; }
    if (!user && (!guestName.trim() || !guestPhone.trim())) { 
      setShowGuestForm(true);
      toast.error('Veuillez renseigner vos coordonnées');
      return; 
    }

    setIsSubmitting(true);
    try {
      const timeoutMs = 5 * 60 * 1000; // 5 minutes
      const selectedDrivers = drivers.filter(d => selectedDriverIds.has(d.driver_id));
      
      // Get client ID if logged in
      let clientId: string | null = null;
      if (user) {
        const { data: clientData } = await supabase.from('clients').select('id').eq('user_id', user.id).single();
        clientId = clientData?.id || null;
      }

      // Create ride requests for all selected drivers (first-come-first-served)
      const { data, error: insertError } = await supabase
        .from('ride_requests')
        .insert(selectedDrivers.map(driver => ({
          client_id: clientId,
          guest_name: !user ? guestName : null,
          guest_phone: !user ? guestPhone : null,
          guest_email: !user ? guestEmail || null : null,
          pickup_address: pickupAddress,
          destination_address: destinationAddress,
          distance_km: routeDistanceKm || 0,
          ride_type: mode,
          status: 'pending',
          selected_driver_id: driver.driver_id,
          estimated_price: driver.estimated_price,
          timeout_at: new Date(Date.now() + timeoutMs).toISOString(),
          scheduled_date: mode === 'reservation' && scheduledDate && scheduledTime 
            ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString() 
            : null,
        })))
        .select('id');

      if (insertError) throw insertError;

      toast.success(
        `Demande envoyée à ${selectedDrivers.length} chauffeur${selectedDrivers.length > 1 ? 's' : ''} ! Le premier à répondre prendra la course.`
      );

      // Navigate based on auth state
      if (user) {
        navigate('/client-dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error('Submit error:', err);
      toast.error('Erreur lors de l\'envoi de la demande');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCount = selectedDriverIds.size;
  const lowestPrice = drivers
    .filter(d => selectedDriverIds.has(d.driver_id))
    .reduce((min, d) => Math.min(min, d.estimated_price || Infinity), Infinity);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border pt-[env(safe-area-inset-top)]">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <img src={logo} alt="SoloCab" className="w-9 h-9 object-contain" />
            </Link>
            <h1 className="text-lg font-bold text-foreground hidden sm:block">Trouver un chauffeur</h1>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <Link to="/client-dashboard">
                <Button variant="outline" size="sm" className="text-xs gap-1">
                  <ArrowLeft className="h-3 w-3" />
                  Mon espace
                </Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button variant="outline" size="sm" className="text-xs">Connexion</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 max-w-4xl space-y-4 pb-32">
        {/* Mode Toggle */}
        <div className="flex gap-2 p-1 bg-muted/50 rounded-xl border border-border/50">
          <button
            onClick={() => setMode('reservation')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all",
              mode === 'reservation'
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CalendarClock className="h-4 w-4" />
            Réservation
          </button>
          <button
            onClick={() => setMode('immediate')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all",
              mode === 'immediate'
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Zap className="h-4 w-4" />
            Course immédiate
          </button>
        </div>

        {/* Search Form */}
        <Card className="border-border/50">
          <CardContent className="p-4 space-y-3">
            {/* Pickup */}
            <div className="relative">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary shrink-0" />
                <div className="flex-1 relative">
                  <Input
                    value={pickupAddress}
                    onChange={(e) => handlePickupChange(e.target.value)}
                    onFocus={() => pickupSuggestions.length > 0 && setShowPickupSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowPickupSuggestions(false), 200)}
                    placeholder="Adresse de départ"
                    className="border-0 shadow-none bg-muted/30 h-11 pl-3"
                  />
                  {showPickupSuggestions && pickupSuggestions.length > 0 && (
                    <div className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-xl max-h-48 overflow-y-auto">
                      {pickupSuggestions.map((f, i) => (
                        <button key={i} className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted/50 flex items-start gap-2 border-b border-border/30 last:border-0" onMouseDown={() => selectPickupSuggestion(f)}>
                          <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                          <span className="text-foreground">{f.place_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={getCurrentLocation} disabled={isGettingLocation}>
                  {isGettingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Divider line */}
            <div className="ml-1.5 w-0.5 h-4 bg-border" />

            {/* Destination */}
            <div className="relative">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-destructive shrink-0" style={{ transform: 'rotate(45deg)' }} />
                <div className="flex-1 relative">
                  <Input
                    value={destinationAddress}
                    onChange={(e) => handleDestChange(e.target.value)}
                    onFocus={() => destSuggestions.length > 0 && setShowDestSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowDestSuggestions(false), 200)}
                    placeholder="Adresse de destination"
                    className="border-0 shadow-none bg-muted/30 h-11 pl-3"
                  />
                  {showDestSuggestions && destSuggestions.length > 0 && (
                    <div className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-xl max-h-48 overflow-y-auto">
                      {destSuggestions.map((f, i) => (
                        <button key={i} className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted/50 flex items-start gap-2 border-b border-border/30 last:border-0" onMouseDown={() => selectDestSuggestion(f)}>
                          <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                          <span className="text-foreground">{f.place_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Date/Time for reservations */}
            {mode === 'reservation' && (
              <div className="flex gap-2 pt-1">
                <div className="flex-1">
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="bg-muted/30 border-0 shadow-none h-10 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="bg-muted/30 border-0 shadow-none h-10 text-sm"
                  />
                </div>
              </div>
            )}

            {/* Search button */}
            <Button
              className="w-full h-12 text-base font-semibold"
              onClick={handleSearch}
              disabled={!pickupAddress.trim() || !destinationAddress.trim() || isGeocoding || isLoading}
            >
              {isGeocoding || isLoading ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Recherche en cours...</>
              ) : (
                <><Search className="mr-2 h-5 w-5" />Rechercher des chauffeurs</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Route info */}
        {routeDistanceKm !== null && (
          <div className="flex items-center gap-3 px-1">
            <Badge variant="secondary" className="gap-1">
              <Car className="h-3 w-3" />
              {routeDistanceKm.toFixed(1)} km
            </Badge>
            {routeDurationMin !== null && (
              <Badge variant="outline" className="gap-1">
                ~{Math.round(routeDurationMin)} min
              </Badge>
            )}
            {searchRadius && (
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                Rayon: {searchRadius} km
              </Badge>
            )}
          </div>
        )}

        {/* Map */}
        {hasSearched && (
          <DriverMap
            clientPosition={pickupCoords}
            destinationPosition={destCoords}
            drivers={drivers}
            selectedDriverIds={selectedDriverIds}
            onDriverClick={toggleDriverSelection}
            searchRadius={searchRadius}
            mapboxToken={mapboxToken}
          />
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* No drivers */}
        {noDriversFound && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Aucun chauffeur disponible dans un rayon de 20 km. Essayez une autre adresse de départ.
            </AlertDescription>
          </Alert>
        )}

        {/* Drivers list */}
        {drivers.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-semibold text-foreground text-sm">
                {drivers.length} chauffeur{drivers.length > 1 ? 's' : ''} disponible{drivers.length > 1 ? 's' : ''}
              </h3>
              {selectedCount > 0 && (
                <Badge className="bg-primary text-primary-foreground gap-1">
                  <Users className="h-3 w-3" />
                  {selectedCount} sélectionné{selectedCount > 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              {drivers.map((driver, index) => (
                <DriverResultCard
                  key={driver.driver_id}
                  driver={driver}
                  routeDistanceKm={routeDistanceKm || undefined}
                  isSelected={selectedDriverIds.has(driver.driver_id)}
                  onToggleSelect={toggleDriverSelection}
                  onViewProfile={(d) => navigate(`/chauffeur/${d.driver_id}`)}
                  rank={index + 1}
                />
              ))}
            </div>
          </div>
        )}

        {/* Guest info form */}
        {!user && showGuestForm && selectedCount > 0 && (
          <Card className="border-primary/30">
            <CardContent className="p-4 space-y-3">
              <h4 className="font-semibold text-foreground text-sm">Vos coordonnées</h4>
              <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Votre nom *" className="h-10" />
              <Input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="Téléphone *" type="tel" className="h-10" />
              <Input value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="Email (optionnel)" type="email" className="h-10" />
            </CardContent>
          </Card>
        )}
      </main>

      {/* Fixed bottom CTA */}
      {selectedCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-50">
          <div className="container mx-auto max-w-4xl">
            <Button
              className="w-full h-14 text-base font-bold gap-2"
              onClick={() => {
                if (!user && !showGuestForm) {
                  setShowGuestForm(true);
                  return;
                }
                handleSubmitRequest();
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
              {!user && !showGuestForm
                ? `Continuer (${selectedCount} chauffeur${selectedCount > 1 ? 's' : ''})`
                : `Envoyer la demande à ${selectedCount} chauffeur${selectedCount > 1 ? 's' : ''}`
              }
              {lowestPrice !== Infinity && (
                <span className="ml-1">• à partir de {lowestPrice.toFixed(0)}€</span>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-2">
              Premier chauffeur qui accepte = votre chauffeur • Timeout 5 min
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
