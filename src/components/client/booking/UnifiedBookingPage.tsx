import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNearbyDrivers, NearbyDriver } from '@/hooks/useNearbyDrivers';
import { useMapboxToken } from '@/hooks/useMapboxToken';
import { useClientAddresses } from '@/hooks/useClientAddresses';
import { RideWaitingScreen } from '@/components/client/immediate-ride/RideWaitingScreen';
import { BookingStepIndicator } from './BookingStepIndicator';
import { StepTrajet } from './steps/StepTrajet';
import { StepResultats } from './steps/StepResultats';
import { StepConfirm } from './steps/StepConfirm';
import { FrequentAddressBanner } from './FrequentAddressBanner';
import type { QuickAddress } from './AddressQuickPicks';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import logo from '@/assets/logo-solocab.png';
import { saveStorefrontState, loadStorefrontState } from '@/lib/storefrontState';
import { getCurrentLocation as getUnifiedLocation } from '@/lib/geoService';

type BookingMode = 'reservation' | 'immediate';
type ClientPaymentMethod = 'card' | 'cash' | null;

export function UnifiedBookingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { token: mapboxToken, isLoading: isTokenLoading, error: mapboxError } = useMapboxToken();

  const savedState = useRef(loadStorefrontState());
  const ss = savedState.current;
  // Expire saved state after 30 min
  const ssValid = ss && ss.savedAt && (Date.now() - ss.savedAt < 30 * 60 * 1000) ? ss : null;

  // ── Wizard step (restore from persisted state) ──
  const [currentStep, setCurrentStep] = useState(ssValid?.currentStep || 1);

  const [mode, setMode] = useState<BookingMode>(ssValid?.mode || 'reservation');
  
  // Addresses
  const [pickupAddress, setPickupAddress] = useState(ssValid?.pickupAddress || '');
  const [destinationAddress, setDestinationAddress] = useState(ssValid?.destinationAddress || '');
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(ssValid?.pickupCoords || null);
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(ssValid?.destCoords || null);
  
  // Schedule
  const [scheduledDate, setScheduledDate] = useState(ssValid?.scheduledDate || '');
  const [scheduledTime, setScheduledTime] = useState(ssValid?.scheduledTime || '');
  
  // Search state
  const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(ssValid?.routeDistanceKm ?? null);
  const [routeDurationMin, setRouteDurationMin] = useState<number | null>(ssValid?.routeDurationMin ?? null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [hasSearched, setHasSearched] = useState(ssValid?.hasSearched || false);
  const [maxSearchRadiusKm, setMaxSearchRadiusKm] = useState(ssValid?.maxSearchRadiusKm || 20);
  
  // Driver selection
  const [selectedDriverIds, setSelectedDriverIds] = useState<Set<string>>(new Set(ssValid?.selectedDriverIds || []));
  
  // Guest info
  const [guestName, setGuestName] = useState(ssValid?.guestName || '');
  const [guestPhone, setGuestPhone] = useState(ssValid?.guestPhone || '');
  const [guestEmail, setGuestEmail] = useState(ssValid?.guestEmail || '');
  const [clientPaymentMethod, setClientPaymentMethod] = useState<ClientPaymentMethod>(ssValid?.clientPaymentMethod || null);
  const [cardVerifiedForBooking, setCardVerifiedForBooking] = useState(false);
  const [savedCardInfo, setSavedCardInfo] = useState<{ customerId: string; paymentMethodId?: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Favorite driver
  const [favoriteDriverIds, setFavoriteDriverIds] = useState<string[]>([]);
  // Whether to prioritize favorite drivers in dispatch (default OFF — focus is on finding ANY ride)
  const [prioritizeFavorites, setPrioritizeFavorites] = useState<boolean>(false);
  // Exclusive client lock — restricts driver list to their assigned driver only
  const [exclusiveDriverId, setExclusiveDriverId] = useState<string | null>(null);
  const [isExclusiveClient, setIsExclusiveClient] = useState(false);

  // Saved + recent addresses (for logged-in clients)
  const { saved: savedAddresses, recent: recentAddresses } = useClientAddresses();
  const prefilledFromSaved = useRef(false);

  // Auto pre-fill pickup with the client's "home" saved address (only when nothing typed yet)
  useEffect(() => {
    if (prefilledFromSaved.current) return;
    if (!user) return;
    if (pickupAddress.trim() || pickupCoords) return;
    if (savedAddresses.length === 0) return;
    const home = savedAddresses.find((a) => a.address_type === 'home') || savedAddresses[0];
    if (!home) return;
    prefilledFromSaved.current = true;
    setPickupAddress(home.address);
    if (home.latitude != null && home.longitude != null) {
      setPickupCoords({ lat: home.latitude, lng: home.longitude });
    }
  }, [user, savedAddresses, pickupAddress, pickupCoords]);

  const handleQuickPickup = useCallback((a: QuickAddress) => {
    setPickupAddress(a.address);
    if (a.latitude != null && a.longitude != null) {
      setPickupCoords({ lat: a.latitude, lng: a.longitude });
    } else {
      setPickupCoords(null);
    }
    setShowPickupSuggestions(false);
  }, []);
  const handleQuickDest = useCallback((a: QuickAddress) => {
    setDestinationAddress(a.address);
    if (a.latitude != null && a.longitude != null) {
      setDestCoords({ lat: a.latitude, lng: a.longitude });
    } else {
      setDestCoords(null);
    }
    setShowDestSuggestions(false);
  }, []);

  // Registration
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [registrationDone, setRegistrationDone] = useState(false);

  // Price range
  const [priceRange, setPriceRange] = useState<{ min: number; max: number } | null>(null);
  const [isFetchingPrices, setIsFetchingPrices] = useState(false);
  const priceRangeFetched = useRef<string>('');

  // Waiting screen
  const [showWaitingScreen, setShowWaitingScreen] = useState(false);
  const [waitingRequestId, setWaitingRequestId] = useState('');
  const [waitingGroupId, setWaitingGroupId] = useState('');
  const [waitingDriversData, setWaitingDriversData] = useState<NearbyDriver[]>([]);
  const [waitingTimeoutAt, setWaitingTimeoutAt] = useState('');
  const [waitingEstimatedPrice, setWaitingEstimatedPrice] = useState(0);

  // ── Ride persistence: restore active ride on mount ──
  useEffect(() => {
    const saved = localStorage.getItem('solocab_active_ride');
    if (!saved) return;
    try {
      const data = JSON.parse(saved);
      // Check if the ride is still recent (less than 2 hours old)
      if (Date.now() - data.timestamp > 2 * 60 * 60 * 1000) {
        localStorage.removeItem('solocab_active_ride');
        return;
      }
      setWaitingRequestId(data.requestId || '');
      setWaitingGroupId(data.groupId || '');
      setWaitingTimeoutAt(data.timeoutAt || '');
      setWaitingEstimatedPrice(data.estimatedPrice || 0);
      setPickupAddress(data.pickupAddress || '');
      setDestinationAddress(data.destinationAddress || '');
      setShowWaitingScreen(true);
    } catch { localStorage.removeItem('solocab_active_ride'); }
  }, []);

  // Autocomplete
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<any[]>([]);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const pickupDebounce = useRef<NodeJS.Timeout>();
  const destDebounce = useRef<NodeJS.Timeout>();
  const pickupLock = useRef(false);
  const destLock = useRef(false);

  // ── Persist state (includes currentStep for recovery) ──
  useEffect(() => {
    saveStorefrontState({
      pickupAddress, destinationAddress, pickupCoords, destCoords,
      mode, scheduledDate, scheduledTime, maxSearchRadiusKm,
      clientPaymentMethod, routeDistanceKm, routeDurationMin, hasSearched,
      selectedDriverIds: Array.from(selectedDriverIds),
      currentStep,
      guestName, guestPhone, guestEmail,
      savedAt: Date.now(),
    });
  }, [pickupAddress, destinationAddress, pickupCoords, destCoords, mode,
      scheduledDate, scheduledTime, maxSearchRadiusKm, clientPaymentMethod,
      routeDistanceKm, routeDurationMin, hasSearched, selectedDriverIds,
      currentStep, guestName, guestPhone, guestEmail]);

  // ── Visibility recovery: save state when tab goes hidden (iOS/Android suspend) ──
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        saveStorefrontState({
          pickupAddress, destinationAddress, pickupCoords, destCoords,
          mode, scheduledDate, scheduledTime, maxSearchRadiusKm,
          clientPaymentMethod, routeDistanceKm, routeDurationMin, hasSearched,
          selectedDriverIds: Array.from(selectedDriverIds),
          currentStep,
          guestName, guestPhone, guestEmail,
          savedAt: Date.now(),
        });
      }
    };
    // Also save on pagehide (more reliable on iOS Safari)
    const handlePageHide = () => {
      saveStorefrontState({
        pickupAddress, destinationAddress, pickupCoords, destCoords,
        mode, scheduledDate, scheduledTime, maxSearchRadiusKm,
        clientPaymentMethod, routeDistanceKm, routeDurationMin, hasSearched,
        selectedDriverIds: Array.from(selectedDriverIds),
        currentStep,
        guestName, guestPhone, guestEmail,
        savedAt: Date.now(),
      });
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handlePageHide);
    };
  });

  useEffect(() => {
    const modeParam = searchParams.get('mode');
    if (modeParam === 'immediate') setMode('immediate');
  }, [searchParams]);

  // Fetch client favorite driver + exclusive status
  useEffect(() => {
    if (!user) return;
    const fetchFavorites = async () => {
      const { data: clientData } = await supabase
        .from('clients')
        .select('favorite_driver_id, driver_ids, is_exclusive, driver_id')
        .eq('user_id', user.id)
        .single();
      if (clientData?.favorite_driver_id) {
        setFavoriteDriverIds([clientData.favorite_driver_id]);
      }
      if (clientData?.is_exclusive && clientData?.driver_id) {
        setIsExclusiveClient(true);
        setExclusiveDriverId(clientData.driver_id);
        // Exclusive clients can ONLY do reservations (their driver receives them as scheduled, no need to be online)
        setMode('reservation');
      }
    };
    fetchFavorites();
  }, [user]);

  useEffect(() => {
    if (!user || clientPaymentMethod !== 'card') return;
    const checkSavedCard = async () => {
      const { data: clientData } = await supabase
        .from('clients')
        .select('stripe_customer_id, default_payment_method_id')
        .eq('user_id', user.id)
        .single();
      if (clientData?.stripe_customer_id && clientData?.default_payment_method_id) {
        setCardVerifiedForBooking(true);
        setSavedCardInfo({ customerId: clientData.stripe_customer_id, paymentMethodId: clientData.default_payment_method_id });
      }
    };
    checkSavedCard();
  }, [user, clientPaymentMethod]);

  const {
    drivers,
    isLoading,
    error,
    searchRadius,
    noDriversFound,
    fallbackToReservation,
    searchNearbyDrivers,
  } = useNearbyDrivers();

  // ── Auto-recover: if restored to step 2/3 but no drivers loaded, re-search ──
  const recoveryDone = useRef(false);
  useEffect(() => {
    if (recoveryDone.current) return;
    if (currentStep > 1 && drivers.length === 0 && pickupCoords && destCoords && !isLoading && !isGeocoding) {
      recoveryDone.current = true;
      const runRecovery = async () => {
        let schedDate: Date | undefined;
        if (mode === 'reservation' && scheduledDate && scheduledTime) schedDate = new Date(`${scheduledDate}T${scheduledTime}`);
        await searchNearbyDrivers(pickupCoords.lat, pickupCoords.lng, routeDistanceKm || undefined, routeDurationMin ? Math.round(routeDurationMin) : undefined, schedDate, pickupAddress, destinationAddress, maxSearchRadiusKm, mode, prioritizeFavorites ? favoriteDriverIds : [], exclusiveDriverId);
      };
      runRecovery();
    }
  }, [currentStep, drivers.length, pickupCoords, destCoords, isLoading, isGeocoding]);

  const notifySelectedDrivers = useCallback(async (selected: NearbyDriver[], requests?: Array<{ id: string; selected_driver_id: string | null }>) => {
    try {
      const driverIds = selected.map((driver) => driver.driver_id).filter(Boolean);
      if (driverIds.length === 0) return;

      const { data: driverUsers, error: driverUsersError } = await supabase
        .from('drivers')
        .select('id, user_id')
        .in('id', driverIds);

      if (driverUsersError || !driverUsers?.length) {
        console.error('Driver push lookup error:', driverUsersError);
        return;
      }

      const title = mode === 'immediate'
        ? '🚗 Nouvelle demande de course'
        : '📅 Nouvelle réservation à confirmer';
      const message = `${pickupAddress} → ${destinationAddress}`;

      await Promise.allSettled(
        driverUsers
          .filter((driver): driver is { id: string; user_id: string } => Boolean(driver.user_id))
          .map((driver) => {
            const request = requests?.find((r) => r.selected_driver_id === driver.id);
            return (
            supabase.functions.invoke('send-push-notification', {
              body: {
                user_id: driver.user_id,
                title,
                message,
                link: '/driver-dashboard?view=map',
                tag: 'course_request',
                type: 'incoming_ride',
                data: {
                  ride_id: request?.id || '',
                  pickup_address: pickupAddress,
                  destination_address: destinationAddress,
                  price: driver.estimated_price ? `${driver.estimated_price.toFixed(2)}€` : '',
                },
              },
            })
          ); })
      );
    } catch (notificationError) {
      console.error('Immediate driver push error:', notificationError);
    }
  }, [destinationAddress, mode, pickupAddress]);

  // Auto-select top 10 drivers (or only the exclusive driver for exclusive clients)
  useEffect(() => {
    if (drivers.length === 0) return;
    // Exclusive client: force selection to their assigned driver only
    if (isExclusiveClient && exclusiveDriverId) {
      const exists = drivers.some(d => d.driver_id === exclusiveDriverId);
      if (exists) setSelectedDriverIds(new Set([exclusiveDriverId]));
      return;
    }
    const selectId = searchParams.get('select');
    if (selectId) {
      setSelectedDriverIds(prev => { const next = new Set(prev); next.add(selectId); return next; });
    } else if (selectedDriverIds.size === 0) {
      const top10 = drivers.slice(0, 10).map(d => d.driver_id);
      setSelectedDriverIds(new Set(top10));
    }
  }, [searchParams, drivers, isExclusiveClient, exclusiveDriverId]);

  // ── Strategic places ──
  const STRATEGIC_PLACES = useMemo(() => [
    { name: "Aéroport Paris-Charles de Gaulle (CDG)", place_name: "Aéroport Paris-Charles de Gaulle, 95700 Roissy-en-France, France", center: [2.5479, 49.0097], keywords: ["cdg", "roissy", "charles de gaulle"] },
    { name: "CDG Terminal 1", place_name: "Terminal 1, Aéroport CDG, 95700 Roissy-en-France, France", center: [2.5145, 49.0198], keywords: ["terminal 1", "t1", "cdg 1"] },
    { name: "CDG Terminal 2", place_name: "Terminal 2, Aéroport CDG, 95700 Roissy-en-France, France", center: [2.5479, 49.0037], keywords: ["terminal 2", "t2", "cdg 2"] },
    { name: "CDG Terminal 3", place_name: "Terminal 3, Aéroport CDG, 95700 Roissy-en-France, France", center: [2.5145, 49.0060], keywords: ["terminal 3", "t3", "cdg 3"] },
    { name: "Aéroport Paris-Orly", place_name: "Aéroport Paris-Orly, 94390 Orly, France", center: [2.3592, 48.7262], keywords: ["orly"] },
    { name: "Orly Terminal 1-2-3", place_name: "Terminal 1-2-3, Aéroport Orly, 94390 Orly, France", center: [2.3653, 48.7310], keywords: ["orly 1", "orly 2", "orly 3"] },
    { name: "Orly Terminal 4", place_name: "Terminal 4, Aéroport Orly, 94390 Orly, France", center: [2.3560, 48.7230], keywords: ["orly 4"] },
    { name: "Aéroport de Beauvais-Tillé", place_name: "Aéroport de Beauvais-Tillé, 60000 Tillé, France", center: [2.1106, 49.4544], keywords: ["beauvais", "tillé"] },
    { name: "Gare du Nord", place_name: "Gare du Nord, 75010 Paris, France", center: [2.3553, 48.8809], keywords: ["gare du nord", "nord"] },
    { name: "Gare de Lyon", place_name: "Gare de Lyon, 75012 Paris, France", center: [2.3731, 48.8443], keywords: ["gare de lyon", "lyon"] },
    { name: "Gare Montparnasse", place_name: "Gare Montparnasse, 75015 Paris, France", center: [2.3200, 48.8413], keywords: ["montparnasse"] },
    { name: "Gare de l'Est", place_name: "Gare de l'Est, 75010 Paris, France", center: [2.3591, 48.8763], keywords: ["gare de l'est", "est"] },
    { name: "Gare Saint-Lazare", place_name: "Gare Saint-Lazare, 75008 Paris, France", center: [2.3253, 48.8762], keywords: ["saint-lazare", "saint lazare"] },
    { name: "Gare d'Austerlitz", place_name: "Gare d'Austerlitz, 75013 Paris, France", center: [2.3656, 48.8424], keywords: ["austerlitz"] },
    { name: "Tour Eiffel", place_name: "Tour Eiffel, Champ de Mars, 75007 Paris, France", center: [2.2945, 48.8584], keywords: ["eiffel", "tour eiffel"] },
    { name: "Disneyland Paris", place_name: "Disneyland Paris, 77777 Marne-la-Vallée, France", center: [2.7836, 48.8722], keywords: ["disneyland", "disney"] },
    { name: "La Défense", place_name: "La Défense, 92800 Puteaux, France", center: [2.2378, 48.8918], keywords: ["la défense", "defense"] },
  ], []);

  const searchStrategicPlaces = useCallback((query: string) => {
    const q = query.toLowerCase().trim();
    if (q.length < 2) return [];
    return STRATEGIC_PLACES.filter(p =>
      p.name.toLowerCase().includes(q) || p.keywords.some(k => k.includes(q) || q.includes(k))
    ).map(p => ({ place_name: p.place_name, center: p.center, text: p.name, _isStrategic: true }));
  }, [STRATEGIC_PLACES]);

  const fetchSuggestions = useCallback(async (query: string, setter: (s: any[]) => void, showSetter: (b: boolean) => void) => {
    if (query.length < 2) { setter([]); showSetter(false); return; }
    const strategicResults = searchStrategicPlaces(query);
    if (query.length < 3 || !mapboxToken) {
      if (strategicResults.length > 0) { setter(strategicResults); showSetter(true); }
      else { setter([]); showSetter(false); }
      return;
    }
    try {
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&country=fr&types=address,place,locality,poi&language=fr&limit=5`);
      const data = await res.json();
      const mapboxResults = (data.features || []).filter((f: any) => !strategicResults.some(s => s.place_name === f.place_name));
      setter([...strategicResults, ...mapboxResults].slice(0, 8));
      showSetter(true);
    } catch {
      if (strategicResults.length > 0) { setter(strategicResults); showSetter(true); }
    }
  }, [mapboxToken, searchStrategicPlaces]);

  const handlePickupChange = (val: string) => {
    setPickupAddress(val); setPickupCoords(null); pickupLock.current = false;
    if (pickupDebounce.current) clearTimeout(pickupDebounce.current);
    pickupDebounce.current = setTimeout(() => fetchSuggestions(val, setPickupSuggestions, setShowPickupSuggestions), 300);
  };
  const handleDestChange = (val: string) => {
    setDestinationAddress(val); setDestCoords(null); destLock.current = false;
    if (destDebounce.current) clearTimeout(destDebounce.current);
    destDebounce.current = setTimeout(() => fetchSuggestions(val, setDestSuggestions, setShowDestSuggestions), 300);
  };
  const selectPickupSuggestion = (f: any) => {
    if (pickupDebounce.current) clearTimeout(pickupDebounce.current);
    pickupLock.current = true;
    setPickupAddress(f.place_name); setPickupCoords({ lat: f.center[1], lng: f.center[0] });
    setShowPickupSuggestions(false); setPickupSuggestions([]);
  };
  const selectDestSuggestion = (f: any) => {
    if (destDebounce.current) clearTimeout(destDebounce.current);
    destLock.current = true;
    setDestinationAddress(f.place_name); setDestCoords({ lat: f.center[1], lng: f.center[0] });
    setShowDestSuggestions(false); setDestSuggestions([]);
  };

  // Geolocation — passe par geoService unifié (déclenche le prompt OS sur natif,
  // gère permissions, fallback web propre).
  const getCurrentLocation = useCallback(async () => {
    setIsGettingLocation(true);
    pickupLock.current = true;
    if (pickupDebounce.current) clearTimeout(pickupDebounce.current);
    setShowPickupSuggestions(false); setPickupSuggestions([]);

    try {
      const fix = await getUnifiedLocation({ enableHighAccuracy: true, timeoutMs: 10_000, maximumAgeMs: 30_000 });
      if (!fix) {
        toast.error('Localisation indisponible. Vérifie l\'autorisation GPS dans les réglages.');
        return;
      }
      setPickupCoords({ lat: fix.latitude, lng: fix.longitude });
      try {
        if (!mapboxToken) return;
        const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${fix.longitude},${fix.latitude}.json?access_token=${mapboxToken}&language=fr&limit=1`);
        const data = await res.json();
        if (data.features?.[0]) setPickupAddress(data.features[0].place_name);
      } catch {
        setPickupAddress(`${fix.latitude.toFixed(5)}, ${fix.longitude.toFixed(5)}`);
      }
    } finally {
      setIsGettingLocation(false);
    }
  }, [mapboxToken]);

  // Search
  const handleSearch = useCallback(async () => {
    if (!pickupAddress.trim() || !destinationAddress.trim()) { toast.error('Renseignez les adresses'); return; }
    setIsGeocoding(true); setSelectedDriverIds(new Set()); setHasSearched(true);
    try {
      const geocode = async (addr: string) => {
        if (!mapboxToken) return null;
        const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(addr)}.json?access_token=${mapboxToken}&country=fr&language=fr`);
        const data = await res.json();
        return data.features?.[0] ? { lat: data.features[0].center[1], lng: data.features[0].center[0] } : null;
      };
      const [pickup, dest] = await Promise.all([
        pickupCoords || geocode(pickupAddress),
        destCoords || geocode(destinationAddress),
      ]);
      if (!pickup) { toast.error('Adresse de départ introuvable'); return; }
      if (!dest) { toast.error('Adresse de destination introuvable'); return; }
      setPickupCoords(pickup); setDestCoords(dest);

      let schedDate: Date | undefined;
      if (mode === 'reservation' && scheduledDate && scheduledTime) schedDate = new Date(`${scheduledDate}T${scheduledTime}`);

      // Get directions FIRST to have distance for accurate pricing
      let distance: number | null = null, duration: number | null = null;

      if (mapboxToken) {
        try {
          const dirRes = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${pickup.lng},${pickup.lat};${dest.lng},${dest.lat}?access_token=${mapboxToken}`);
          if (dirRes.ok) {
            const d = await dirRes.json();
            distance = d?.routes?.[0]?.distance ? d.routes[0].distance / 1000 : null;
            duration = d?.routes?.[0]?.duration ? d.routes[0].duration / 60 : null;
          }
        } catch {}
      }

      setRouteDistanceKm(distance); setRouteDurationMin(duration);

      // Now search drivers WITH the actual distance for accurate pricing
      await searchNearbyDrivers(pickup.lat, pickup.lng, distance || undefined, duration ? Math.round(duration) : undefined, schedDate, pickupAddress, destinationAddress, maxSearchRadiusKm, mode, prioritizeFavorites ? favoriteDriverIds : [], exclusiveDriverId);
      // Exclusive client: skip the driver-results step entirely, go straight to confirmation
      setCurrentStep(isExclusiveClient ? 3 : 2);
    } catch { toast.error('Erreur lors de la recherche'); } finally { setIsGeocoding(false); }
  }, [pickupAddress, destinationAddress, pickupCoords, destCoords, mode, scheduledDate, scheduledTime, searchNearbyDrivers, mapboxToken, maxSearchRadiusKm, favoriteDriverIds, exclusiveDriverId, isExclusiveClient]);

  // Price range from drivers
  useEffect(() => {
    if (drivers.length === 0) { setPriceRange(null); return; }
    const prices = drivers.filter(d => d.estimated_price && d.estimated_price > 0).map(d => d.estimated_price!);
    if (prices.length === 0) { setPriceRange(null); return; }
    setPriceRange({ min: Math.min(...prices), max: Math.max(...prices) });
  }, [drivers]);

  // Auto-fetch prices when both coords are set (step 1 preview)
  useEffect(() => {
    if (!pickupCoords || !destCoords || !mapboxToken) return;
    const key = `${pickupCoords.lat},${pickupCoords.lng}-${destCoords.lat},${destCoords.lng}-${mode}-${scheduledDate}-${scheduledTime}`;
    if (priceRangeFetched.current === key) return;
    priceRangeFetched.current = key;
    const fetchPrices = async () => {
      setIsFetchingPrices(true);
      try {
        const dirRes = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${pickupCoords.lng},${pickupCoords.lat};${destCoords.lng},${destCoords.lat}?access_token=${mapboxToken}`);
        let dist: number | null = null, dur: number | null = null;
        if (dirRes.ok) { const d = await dirRes.json(); dist = d.routes?.[0]?.distance ? d.routes[0].distance / 1000 : null; dur = d.routes?.[0]?.duration ? d.routes[0].duration / 60 : null; }
        if (dist) { setRouteDistanceKm(dist); setRouteDurationMin(dur); }
        let schedDate: Date | undefined;
        if (mode === 'reservation' && scheduledDate && scheduledTime) schedDate = new Date(`${scheduledDate}T${scheduledTime}`);
        await searchNearbyDrivers(pickupCoords.lat, pickupCoords.lng, dist || undefined, dur || undefined, schedDate, pickupAddress, destinationAddress, maxSearchRadiusKm, mode, favoriteDriverIds, exclusiveDriverId);
      } catch {} finally { setIsFetchingPrices(false); }
    };
    fetchPrices();
  }, [pickupCoords, destCoords, mapboxToken, mode, scheduledDate, scheduledTime, pickupAddress, destinationAddress, maxSearchRadiusKm, searchNearbyDrivers]);

  // Auto-select favorite drivers when they appear in results
  const autoSelectedFavorites = useRef(false);
  useEffect(() => {
    if (autoSelectedFavorites.current || drivers.length === 0 || favoriteDriverIds.length === 0) return;
    const favoritesInResults = drivers.filter(d => d.is_favorite);
    if (favoritesInResults.length > 0) {
      autoSelectedFavorites.current = true;
      setSelectedDriverIds(prev => {
        const next = new Set(prev);
        favoritesInResults.forEach(d => next.add(d.driver_id));
        return next;
      });
    }
  }, [drivers, favoriteDriverIds]);

  // Filter drivers
  const filteredDrivers = useMemo(() => {
    let base = drivers;
    // Exclusive client lock: only their assigned driver is shown / selectable
    if (isExclusiveClient && exclusiveDriverId) {
      base = drivers.filter(d => d.driver_id === exclusiveDriverId);
    }
    if (clientPaymentMethod === 'cash') return base.filter(d => d.accepted_payment_methods?.includes('cash'));
    if (clientPaymentMethod === 'card') return [...base].sort((a, b) => (b.stripe_connect_charges_enabled ? 1 : 0) - (a.stripe_connect_charges_enabled ? 1 : 0));
    return base;
  }, [drivers, clientPaymentMethod, isExclusiveClient, exclusiveDriverId]);

  // Submit
  const handleSubmitRequest = async () => {
    if (selectedDriverIds.size === 0) { toast.error('Aucun chauffeur sélectionné'); return; }
    if (!user && !guestName.trim()) { toast.error('Renseignez votre nom'); return; }
    if (!user && !guestEmail.trim()) { toast.error('Renseignez votre email pour le suivi de course'); return; }
    const selectedDrivers = drivers.filter(d => selectedDriverIds.has(d.driver_id));
    if (clientPaymentMethod === 'card' && selectedDrivers.some(d => d.stripe_connect_charges_enabled) && !cardVerifiedForBooking) {
      toast.error('Vérifiez votre carte bancaire'); return;
    }
    setIsSubmitting(true);
    try {
      const timeoutMs = 5 * 60 * 1000;
      let clientId: string | null = null;
      let useGuestMode = !user;
      let effectiveGuestName = guestName, effectiveGuestPhone = guestPhone, effectiveGuestEmail = guestEmail;
      if (user) {
        const { data: clientData } = await supabase.from('clients').select('id').eq('user_id', user.id).single();
        clientId = clientData?.id || null;
        if (!clientId) {
          useGuestMode = true;
          effectiveGuestName = user.user_metadata?.full_name || regName || guestName || 'Client';
          effectiveGuestPhone = user.user_metadata?.phone || regPhone || guestPhone || '';
          effectiveGuestEmail = user.email || regEmail || guestEmail || '';
        }
      }
      const requestGroupId = crypto.randomUUID();
      const { data: insertedRequests, error: insertError } = await supabase
        .from('ride_requests')
        .insert(selectedDrivers.map(driver => ({
          client_id: clientId, guest_name: useGuestMode ? effectiveGuestName : null,
          guest_phone: useGuestMode ? effectiveGuestPhone : null, guest_email: useGuestMode ? effectiveGuestEmail || null : null,
          pickup_address: pickupAddress, destination_address: destinationAddress,
          pickup_latitude: pickupCoords?.lat || null, pickup_longitude: pickupCoords?.lng || null,
          destination_latitude: destCoords?.lat || null, destination_longitude: destCoords?.lng || null,
          distance_km: routeDistanceKm || 0, ride_type: mode === 'reservation' ? 'scheduled' : 'immediate',
          status: 'pending', selected_driver_id: driver.driver_id, estimated_price: driver.estimated_price,
          approach_distance_km: driver.approach_distance_km ?? null,
          approach_per_km_rate: driver.approach_per_km_rate ?? null,
          approach_fee: driver.approach_fee ?? 0,
          timeout_at: new Date(Date.now() + timeoutMs).toISOString(), payment_method: clientPaymentMethod || 'card',
          request_group_id: requestGroupId,
          request_type: selectedDrivers.length > 1 ? 'multi' : 'exclusive',
          driver_count: selectedDrivers.length,
          scheduled_date: mode === 'reservation' && scheduledDate && scheduledTime ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString() : null,
          stripe_customer_id: savedCardInfo?.customerId || null,
          stripe_payment_method_id: savedCardInfo?.paymentMethodId || null,
        } as any)))
        .select('id, selected_driver_id');
      if (insertError) throw insertError;
      void notifySelectedDrivers(selectedDrivers, insertedRequests || []);

      const timeoutIso = new Date(Date.now() + timeoutMs).toISOString();
      const lowestPriceVal = selectedDrivers.reduce((min, d) => Math.min(min, d.estimated_price || 0), Infinity);
      setWaitingRequestId(requestGroupId); setWaitingGroupId(requestGroupId);
      setWaitingDriversData(selectedDrivers); setWaitingTimeoutAt(timeoutIso);
      setWaitingEstimatedPrice(lowestPriceVal !== Infinity ? lowestPriceVal : 0);
      setShowWaitingScreen(true);
      // Persist active ride for reload recovery
      localStorage.setItem('solocab_active_ride', JSON.stringify({
        requestId: requestGroupId, groupId: requestGroupId,
        timeoutAt: timeoutIso, estimatedPrice: lowestPriceVal !== Infinity ? lowestPriceVal : 0,
        pickupAddress, destinationAddress, timestamp: Date.now(),
      }));
      toast.success(selectedDrivers.length > 1 ? `Demande envoyée à ${selectedDrivers.length} chauffeurs !` : 'Demande envoyée !');
    } catch (err: any) {
      console.error('Booking submit error:', err);
      toast.error(err?.message || "Erreur lors de l'envoi");
    } finally { setIsSubmitting(false); }
  };

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
                  <ArrowLeft className="h-3 w-3" />Mon espace
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

      <main className="container mx-auto px-3 sm:px-4 py-4 max-w-4xl pb-8">
        {showWaitingScreen ? (
          <RideWaitingScreen
            requestId={waitingRequestId}
            requestGroupId={waitingGroupId}
            requestType={waitingDriversData.length === 1 ? 'exclusive' : 'multi'}
            driverCount={waitingDriversData.length}
            pickupAddress={pickupAddress}
            destinationAddress={destinationAddress}
            estimatedPrice={waitingEstimatedPrice}
            driverName={waitingDriversData.length === 1 ? (waitingDriversData[0]?.display_name || waitingDriversData[0]?.company_name || 'Chauffeur') : undefined}
            timeoutAt={waitingTimeoutAt}
            contactedDriversData={waitingDriversData}
            routeDistanceKm={routeDistanceKm || undefined}
            clientPaymentMethod={clientPaymentMethod}
            onCancel={() => { localStorage.removeItem('solocab_active_ride'); setShowWaitingScreen(false); toast.info('Demande annulée'); }}
            onAccepted={(driverName, courseId) => {
              localStorage.removeItem('solocab_active_ride');
              toast.success(`${driverName} a accepté votre course ! 🎉`);
              // Navigate immediately - the 3D carousel already provided 3s of animation
              const doNavigation = async () => {
                // For guests (not authenticated), use the guest tracking page
                if (!user && courseId) {
                  try {
                    const { data: tokenData } = await supabase.rpc('get_guest_tracking_token' as any, { _course_id: courseId });
                    if (tokenData) {
                      navigate(`/reservation-suivi/${tokenData}`);
                      return;
                    }
                  } catch (e) {
                    console.error('Error fetching tracking token:', e);
                  }
                }
                
                if (courseId) {
                  if (user) {
                    navigate(`/client-dashboard?tab=active-course`);
                  } else {
                    navigate(`/suivi-course/${courseId}`);
                  }
                } else {
                  // Fallback: poll ride_requests for course_id
                  const groupId = waitingGroupId || waitingRequestId;
                  for (let i = 0; i < 10; i++) {
                    const { data } = await supabase
                      .from('ride_requests')
                      .select('final_course_id')
                      .eq('request_group_id', groupId)
                      .eq('status', 'accepted')
                      .not('final_course_id', 'is', null)
                      .limit(1)
                      .single();
                    if (data?.final_course_id) {
                      if (!user) {
                        try {
                          const { data: tk } = await supabase.rpc('get_guest_tracking_token' as any, { _course_id: data.final_course_id });
                          if (tk) { navigate(`/reservation-suivi/${tk}`); return; }
                        } catch (e) { console.error(e); }
                      }
                      navigate(user ? `/client-dashboard?tab=active-course` : `/suivi-course/${data.final_course_id}`);
                      return;
                    }
                    await new Promise(r => setTimeout(r, 800));
                  }
                  if (user) navigate('/client-dashboard?tab=active-course');
                  else navigate('/');
                }
              };
              // Small delay for the toast to be visible
              setTimeout(doNavigation, 500);
            }}
            onExpired={() => { localStorage.removeItem('solocab_active_ride'); toast.error('Aucun chauffeur disponible.'); setShowWaitingScreen(false); }}
          />
        ) : (
          <div className="space-y-4">
            {/* Step indicator */}
            <BookingStepIndicator currentStep={currentStep} totalSteps={3} />

            {/* Suggest saving frequent address as favorite (only on step 1) */}
            {currentStep === 1 && <FrequentAddressBanner />}

            {/* Step 1: Trajet */}
            {currentStep === 1 && (
              <StepTrajet
                mode={mode} setMode={setMode}
                lockReservation={isExclusiveClient}
                pickupAddress={pickupAddress} destinationAddress={destinationAddress}
                onPickupChange={handlePickupChange} onDestChange={handleDestChange}
                pickupSuggestions={pickupSuggestions} destSuggestions={destSuggestions}
                showPickupSuggestions={showPickupSuggestions} showDestSuggestions={showDestSuggestions}
                onSelectPickup={selectPickupSuggestion} onSelectDest={selectDestSuggestion}
                onPickupFocus={() => { if (!pickupLock.current && pickupSuggestions.length > 0) setShowPickupSuggestions(true); }}
                onDestFocus={() => { if (!destLock.current && destSuggestions.length > 0) setShowDestSuggestions(true); }}
                onPickupBlur={() => { setTimeout(() => setShowPickupSuggestions(false), 300); }}
                onDestBlur={() => { setTimeout(() => setShowDestSuggestions(false), 300); }}
                scheduledDate={scheduledDate} scheduledTime={scheduledTime}
                setScheduledDate={setScheduledDate} setScheduledTime={setScheduledTime}
                maxSearchRadiusKm={maxSearchRadiusKm} setMaxSearchRadiusKm={setMaxSearchRadiusKm}
                isGettingLocation={isGettingLocation} getCurrentLocation={getCurrentLocation}
                pickupCoords={pickupCoords} destCoords={destCoords}
                isGeocoding={isGeocoding} isLoading={isLoading}
                priceRange={priceRange} isFetchingPrices={isFetchingPrices}
                routeDistanceKm={routeDistanceKm} routeDurationMin={routeDurationMin}
                driversCount={drivers.length}
                onNext={handleSearch}
                savedAddresses={savedAddresses}
                recentAddresses={recentAddresses}
                onPickQuickPickup={handleQuickPickup}
                onPickQuickDest={handleQuickDest}
                hasFavorites={!isExclusiveClient && favoriteDriverIds.length > 0}
                prioritizeFavorites={prioritizeFavorites}
                setPrioritizeFavorites={setPrioritizeFavorites}
              />
            )}

            {/* Step 2: Résultats */}
            {currentStep === 2 && (
              <StepResultats
                drivers={drivers} filteredDrivers={filteredDrivers}
                selectedDriverIds={selectedDriverIds}
                pickupCoords={pickupCoords} destCoords={destCoords}
                routeDistanceKm={routeDistanceKm} routeDurationMin={routeDurationMin}
                searchRadius={searchRadius} noDriversFound={noDriversFound}
                fallbackToReservation={fallbackToReservation} mode={mode}
                error={error} mapboxToken={mapboxToken} tokenLoading={isTokenLoading}
                mapboxError={mapboxError} maxSearchRadiusKm={maxSearchRadiusKm}
                setMaxSearchRadiusKm={(km) => { setMaxSearchRadiusKm(km); priceRangeFetched.current = ''; }}
                isLoading={isLoading}
                onRetrySearch={() => {
                  priceRangeFetched.current = '';
                  if (pickupCoords) {
                    let schedDate: Date | undefined;
                    if (mode === 'reservation' && scheduledDate && scheduledTime) schedDate = new Date(`${scheduledDate}T${scheduledTime}`);
                    searchNearbyDrivers(pickupCoords.lat, pickupCoords.lng, routeDistanceKm || undefined, routeDurationMin ? Math.round(routeDurationMin) : undefined, schedDate, pickupAddress, destinationAddress, maxSearchRadiusKm, mode, prioritizeFavorites ? favoriteDriverIds : [], exclusiveDriverId);
                  }
                }}
                clientPaymentMethod={clientPaymentMethod}
                onBack={() => setCurrentStep(1)}
                onNext={() => setCurrentStep(3)}
              />
            )}

            {/* Step 3: Confirm */}
            {currentStep === 3 && (
              <StepConfirm
                user={user}
                filteredDrivers={filteredDrivers}
                selectedDriverIds={selectedDriverIds}
                pickupAddress={pickupAddress} destinationAddress={destinationAddress}
                routeDistanceKm={routeDistanceKm} routeDurationMin={routeDurationMin}
                clientPaymentMethod={clientPaymentMethod}
                setClientPaymentMethod={setClientPaymentMethod}
                cardVerifiedForBooking={cardVerifiedForBooking}
                setCardVerifiedForBooking={setCardVerifiedForBooking}
                setSavedCardInfo={setSavedCardInfo}
                priceRange={priceRange}
                guestName={guestName} setGuestName={setGuestName}
                guestPhone={guestPhone} setGuestPhone={setGuestPhone}
                guestEmail={guestEmail} setGuestEmail={setGuestEmail}
                regName={regName} setRegName={setRegName}
                regPhone={regPhone} setRegPhone={setRegPhone}
                regEmail={regEmail} setRegEmail={setRegEmail}
                regPassword={regPassword} setRegPassword={setRegPassword}
                registrationDone={registrationDone} setRegistrationDone={setRegistrationDone}
                onBack={() => setCurrentStep(isExclusiveClient ? 1 : 2)}
                onSubmit={handleSubmitRequest}
                isSubmitting={isSubmitting}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
