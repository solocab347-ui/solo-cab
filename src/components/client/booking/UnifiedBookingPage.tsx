import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  MapPin, Navigation, Search, Loader2, AlertCircle, CalendarClock, 
  Zap, ChevronDown, Send, Users, ArrowLeft, Car, UserPlus, LogIn, UserX,
  CreditCard, Banknote, ShieldCheck, Info, AlertTriangle, Calendar, Clock
} from 'lucide-react';
import { useNearbyDrivers, NearbyDriver } from '@/hooks/useNearbyDrivers';
import { useMapboxToken } from '@/hooks/useMapboxToken';
import { DriverResultCard } from './DriverResultCard';
import { DriverMap } from './DriverMap';
import { BookingCardStep } from './BookingCardStep';
import { RideWaitingScreen } from '@/components/client/immediate-ride/RideWaitingScreen';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo-solocab.png';
import { saveStorefrontState, loadStorefrontState, type StorefrontState } from '@/lib/storefrontState';

type BookingMode = 'reservation' | 'immediate';
type ClientPaymentMethod = 'card' | 'cash' | null;

export function UnifiedBookingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { token: mapboxToken, isLoading: isTokenLoading, error: mapboxError } = useMapboxToken();
  // ── Restore state from sessionStorage ──
  const savedState = useRef(loadStorefrontState());
  const ss = savedState.current;

  const [mode, setMode] = useState<BookingMode>(ss?.mode || 'reservation');
  
  // Addresses
  const [pickupAddress, setPickupAddress] = useState(ss?.pickupAddress || '');
  const [destinationAddress, setDestinationAddress] = useState(ss?.destinationAddress || '');
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(ss?.pickupCoords || null);
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(ss?.destCoords || null);
  
  // Schedule
  const [scheduledDate, setScheduledDate] = useState(ss?.scheduledDate || '');
  const [scheduledTime, setScheduledTime] = useState(ss?.scheduledTime || '');
  
  // Search state
  const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(ss?.routeDistanceKm ?? null);
  const [routeDurationMin, setRouteDurationMin] = useState<number | null>(ss?.routeDurationMin ?? null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [hasSearched, setHasSearched] = useState(ss?.hasSearched || false);
  const [maxSearchRadiusKm, setMaxSearchRadiusKm] = useState(ss?.maxSearchRadiusKm || 20);
  
  // Driver selection
  const [selectedDriverIds, setSelectedDriverIds] = useState<Set<string>>(new Set(ss?.selectedDriverIds || []));
  const [profileDriverId, setProfileDriverId] = useState<string | null>(null);
  
  // Guest info
  const [guestName, setGuestName] = useState(ss?.guestName || '');
  const [guestPhone, setGuestPhone] = useState(ss?.guestPhone || '');
  const [guestEmail, setGuestEmail] = useState(ss?.guestEmail || '');
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [showAuthStep, setShowAuthStep] = useState(false);
  const [authChoice, setAuthChoice] = useState<'guest' | 'login' | 'register' | null>(null);
  const [confirmationStep, setConfirmationStep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchMode, setSearchMode] = useState<'auto' | null>(null);
  const [clientPaymentMethod, setClientPaymentMethod] = useState<ClientPaymentMethod>(ss?.clientPaymentMethod || null);
  const [cardVerifiedForBooking, setCardVerifiedForBooking] = useState(false);
  const [savedCardInfo, setSavedCardInfo] = useState<{ customerId: string } | null>(null);

  // Pre-search price range (fetched silently when addresses are ready)
  const [priceRange, setPriceRange] = useState<{ min: number; max: number } | null>(null);
  const [isFetchingPrices, setIsFetchingPrices] = useState(false);
  const priceRangeFetched = useRef<string>('');

  // Waiting screen state
  const [showWaitingScreen, setShowWaitingScreen] = useState(false);
  const [waitingRequestId, setWaitingRequestId] = useState<string>('');
  const [waitingGroupId, setWaitingGroupId] = useState<string>('');
  const [waitingDriversData, setWaitingDriversData] = useState<NearbyDriver[]>([]);
  const [waitingTimeoutAt, setWaitingTimeoutAt] = useState<string>('');
  const [waitingEstimatedPrice, setWaitingEstimatedPrice] = useState<number>(0);

  // Horizontal scroll ref for driver gallery
  const driverScrollRef = useRef<HTMLDivElement>(null);

  // Autocomplete
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<any[]>([]);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const pickupDebounce = useRef<NodeJS.Timeout>();
  const destDebounce = useRef<NodeJS.Timeout>();

  // ── Persist state to sessionStorage on every relevant change ──
  useEffect(() => {
    saveStorefrontState({
      pickupAddress, destinationAddress, pickupCoords, destCoords,
      mode, scheduledDate, scheduledTime, maxSearchRadiusKm,
      clientPaymentMethod, routeDistanceKm, routeDurationMin, hasSearched,
      selectedDriverIds: Array.from(selectedDriverIds),
      guestName, guestPhone, guestEmail,
    });
  }, [pickupAddress, destinationAddress, pickupCoords, destCoords, mode,
      scheduledDate, scheduledTime, maxSearchRadiusKm, clientPaymentMethod,
      routeDistanceKm, routeDurationMin, hasSearched, selectedDriverIds,
      guestName, guestPhone, guestEmail]);

  // ── Auto re-search when returning from a profile page with saved state ──
  const hasAutoSearched = useRef(false);
  useEffect(() => {
    if (ss?.hasSearched && !hasAutoSearched.current && pickupCoords && destCoords && clientPaymentMethod && mapboxToken) {
      hasAutoSearched.current = true;
      // Re-trigger search with saved params
      let schedDate: Date | undefined;
      if (mode === 'reservation' && scheduledDate && scheduledTime) {
        schedDate = new Date(`${scheduledDate}T${scheduledTime}`);
      }
      searchNearbyDrivers(
        pickupCoords.lat, pickupCoords.lng,
        routeDistanceKm || undefined,
        routeDurationMin || undefined,
        schedDate,
        pickupAddress, destinationAddress,
        maxSearchRadiusKm, mode
      );
    }
  }, [mapboxToken]); // Only run once when token becomes available

  // ── Handle ?mode=immediate from legacy routes ──
  useEffect(() => {
    const modeParam = searchParams.get('mode');
    if (modeParam === 'immediate') setMode('immediate');
  }, [searchParams]);

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
        setSavedCardInfo({ customerId: clientData.stripe_customer_id });
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

  // ── Auto-select top 10 drivers after search, or handle ?select=driverId ──
  useEffect(() => {
    if (drivers.length === 0) return;
    
    const selectId = searchParams.get('select');
    if (selectId) {
      setSelectedDriverIds(prev => {
        const next = new Set(prev);
        next.add(selectId);
        return next;
      });
    } else if (selectedDriverIds.size === 0 || searchMode === 'auto') {
      // Auto-select up to 10 closest drivers
      const top10 = drivers.slice(0, 10).map(d => d.driver_id);
      setSelectedDriverIds(new Set(top10));
    }
  }, [searchParams, drivers]);

  // ── Auto mode: when drivers are found, auto-select and go to confirmation ──
  const autoConfirmTriggered = useRef(false);
  useEffect(() => {
    if (searchMode === 'auto' && drivers.length > 0 && selectedDriverIds.size > 0 && !isLoading && hasSearched && !autoConfirmTriggered.current) {
      autoConfirmTriggered.current = true;
      // If user is logged in and paying cash (or card already verified), auto-dispatch immediately
      if (user && (clientPaymentMethod === 'cash' || cardVerifiedForBooking)) {
        handleSubmitRequest();
      } else {
        // Show confirmation step for auth/card verification
        setConfirmationStep(true);
      }
    }
  }, [searchMode, drivers, selectedDriverIds.size, isLoading, hasSearched]);

  // Strategic places for quick search (airports, stations, monuments)
  const STRATEGIC_PLACES = [
    // Aéroports Paris
    { name: "Aéroport Paris-Charles de Gaulle (CDG)", place_name: "Aéroport Paris-Charles de Gaulle, 95700 Roissy-en-France, France", center: [2.5479, 49.0097], keywords: ["cdg", "roissy", "charles de gaulle"] },
    { name: "CDG Terminal 1", place_name: "Terminal 1, Aéroport CDG, 95700 Roissy-en-France, France", center: [2.5145, 49.0198], keywords: ["terminal 1", "t1", "cdg 1"] },
    { name: "CDG Terminal 2", place_name: "Terminal 2, Aéroport CDG, 95700 Roissy-en-France, France", center: [2.5479, 49.0037], keywords: ["terminal 2", "t2", "cdg 2"] },
    { name: "CDG Terminal 3", place_name: "Terminal 3, Aéroport CDG, 95700 Roissy-en-France, France", center: [2.5145, 49.0060], keywords: ["terminal 3", "t3", "cdg 3"] },
    { name: "Aéroport Paris-Orly", place_name: "Aéroport Paris-Orly, 94390 Orly, France", center: [2.3592, 48.7262], keywords: ["orly"] },
    { name: "Orly Terminal 1-2-3", place_name: "Terminal 1-2-3, Aéroport Orly, 94390 Orly, France", center: [2.3653, 48.7310], keywords: ["orly 1", "orly 2", "orly 3", "terminal orly"] },
    { name: "Orly Terminal 4", place_name: "Terminal 4, Aéroport Orly, 94390 Orly, France", center: [2.3560, 48.7230], keywords: ["orly 4", "terminal 4 orly"] },
    { name: "Aéroport de Beauvais-Tillé", place_name: "Aéroport de Beauvais-Tillé, 60000 Tillé, France", center: [2.1106, 49.4544], keywords: ["beauvais", "tillé"] },
    { name: "Aéroport du Bourget", place_name: "Aéroport du Bourget, 93350 Le Bourget, France", center: [2.4414, 48.9694], keywords: ["bourget", "le bourget"] },
    // Gares Paris
    { name: "Gare du Nord", place_name: "Gare du Nord, 75010 Paris, France", center: [2.3553, 48.8809], keywords: ["gare du nord", "nord"] },
    { name: "Gare de Lyon", place_name: "Gare de Lyon, 75012 Paris, France", center: [2.3731, 48.8443], keywords: ["gare de lyon", "lyon"] },
    { name: "Gare Montparnasse", place_name: "Gare Montparnasse, 75015 Paris, France", center: [2.3200, 48.8413], keywords: ["montparnasse"] },
    { name: "Gare de l'Est", place_name: "Gare de l'Est, 75010 Paris, France", center: [2.3591, 48.8763], keywords: ["gare de l'est", "est"] },
    { name: "Gare Saint-Lazare", place_name: "Gare Saint-Lazare, 75008 Paris, France", center: [2.3253, 48.8762], keywords: ["saint-lazare", "saint lazare", "st lazare"] },
    { name: "Gare d'Austerlitz", place_name: "Gare d'Austerlitz, 75013 Paris, France", center: [2.3656, 48.8424], keywords: ["austerlitz"] },
    // Monuments Paris
    { name: "Tour Eiffel", place_name: "Tour Eiffel, Champ de Mars, 75007 Paris, France", center: [2.2945, 48.8584], keywords: ["eiffel", "tour eiffel"] },
    { name: "Arc de Triomphe", place_name: "Arc de Triomphe, Place Charles de Gaulle, 75008 Paris, France", center: [2.2950, 48.8738], keywords: ["arc de triomphe", "triomphe", "étoile"] },
    { name: "Champs-Élysées", place_name: "Avenue des Champs-Élysées, 75008 Paris, France", center: [2.3067, 48.8698], keywords: ["champs-élysées", "champs élysées", "champs elysees"] },
    { name: "Musée du Louvre", place_name: "Musée du Louvre, 75001 Paris, France", center: [2.3376, 48.8606], keywords: ["louvre", "musée du louvre"] },
    { name: "Notre-Dame de Paris", place_name: "Notre-Dame de Paris, Île de la Cité, 75004 Paris, France", center: [2.3499, 48.8530], keywords: ["notre-dame", "notre dame"] },
    { name: "Sacré-Cœur", place_name: "Basilique du Sacré-Cœur, 75018 Paris, France", center: [2.3431, 48.8867], keywords: ["sacré-coeur", "sacré coeur", "montmartre"] },
    { name: "Disneyland Paris", place_name: "Disneyland Paris, 77777 Marne-la-Vallée, France", center: [2.7836, 48.8722], keywords: ["disneyland", "disney", "eurodisney", "marne la vallée"] },
    { name: "La Défense", place_name: "La Défense, 92800 Puteaux, France", center: [2.2378, 48.8918], keywords: ["la défense", "defense", "grande arche"] },
    // Autres aéroports France
    { name: "Aéroport Lyon Saint-Exupéry", place_name: "Aéroport Lyon Saint-Exupéry, 69125 Colombier-Saugnieu, France", center: [5.0887, 45.7256], keywords: ["lyon saint exupéry", "saint exupery", "lyon aéroport"] },
    { name: "Aéroport Nice Côte d'Azur", place_name: "Aéroport Nice Côte d'Azur, 06206 Nice, France", center: [7.2159, 43.6584], keywords: ["nice aéroport", "nice côte d'azur"] },
    { name: "Aéroport Marseille Provence", place_name: "Aéroport Marseille Provence, 13700 Marignane, France", center: [5.2144, 43.4393], keywords: ["marseille aéroport", "marignane", "marseille provence"] },
    { name: "Aéroport Toulouse-Blagnac", place_name: "Aéroport Toulouse-Blagnac, 31700 Blagnac, France", center: [1.3642, 43.6293], keywords: ["toulouse aéroport", "blagnac"] },
    // Centres d'exposition
    { name: "Parc des Expositions de Villepinte", place_name: "Parc des Expositions, 93420 Villepinte, France", center: [2.5139, 48.9697], keywords: ["villepinte", "parc des expositions", "nord villepinte"] },
    { name: "Palais des Congrès", place_name: "Palais des Congrès, 75017 Paris, France", center: [2.2834, 48.8789], keywords: ["palais des congrès", "porte maillot"] },
    { name: "Paris Expo Porte de Versailles", place_name: "Paris Expo Porte de Versailles, 75015 Paris, France", center: [2.2875, 48.8323], keywords: ["porte de versailles", "expo versailles", "parc expo"] },
  ];

  // Search strategic places by query
  const searchStrategicPlaces = useCallback((query: string) => {
    const q = query.toLowerCase().trim();
    if (q.length < 2) return [];
    return STRATEGIC_PLACES.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.keywords.some(k => k.includes(q) || q.includes(k))
    ).map(p => ({
      place_name: p.place_name,
      center: p.center,
      text: p.name,
      _isStrategic: true,
    }));
  }, []);

  // Debounced autocomplete with strategic places priority
  const fetchSuggestions = useCallback(async (query: string, setter: (s: any[]) => void, showSetter: (b: boolean) => void) => {
    if (query.length < 2) { setter([]); showSetter(false); return; }
    
    // Search strategic places first
    const strategicResults = searchStrategicPlaces(query);
    
    if (query.length < 3 || !mapboxToken) {
      if (strategicResults.length > 0) { setter(strategicResults); showSetter(true); }
      else { setter([]); showSetter(false); }
      return;
    }
    
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&country=fr&types=address,place,locality,poi&language=fr&limit=5`
      );
      const data = await res.json();
      // Merge: strategic places first, then Mapbox results (deduped)
      const mapboxResults = (data.features || []).filter((f: any) => 
        !strategicResults.some(s => s.place_name === f.place_name)
      );
      setter([...strategicResults, ...mapboxResults].slice(0, 8));
      showSetter(true);
    } catch { 
      if (strategicResults.length > 0) { setter(strategicResults); showSetter(true); }
      else { setter([]); }
    }
  }, [mapboxToken, searchStrategicPlaces]);

  const handlePickupChange = (val: string) => {
    setPickupAddress(val);
    setPickupCoords(null);
    if (pickupDebounce.current) clearTimeout(pickupDebounce.current);
    pickupDebounce.current = setTimeout(() => fetchSuggestions(val, setPickupSuggestions, setShowPickupSuggestions), 150);
  };

  const handleDestChange = (val: string) => {
    setDestinationAddress(val);
    setDestCoords(null);
    if (destDebounce.current) clearTimeout(destDebounce.current);
    destDebounce.current = setTimeout(() => fetchSuggestions(val, setDestSuggestions, setShowDestSuggestions), 150);
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

  // Geolocation - robust with cached position fallback
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('La géolocalisation n\'est pas disponible sur cet appareil');
      return;
    }
    setIsGettingLocation(true);
    
    let resolved = false;
    const resolve = async (lat: number, lng: number, accuracy?: number) => {
      if (resolved) return;
      resolved = true;
      setPickupCoords({ lat, lng });
      try {
        if (!mapboxToken) { setIsGettingLocation(false); return; }
        const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&language=fr&limit=1`);
        if (!res.ok) throw new Error('Geocode failed');
        const data = await res.json();
        if (data.features?.[0]) setPickupAddress(data.features[0].place_name);
      } catch {
        setPickupAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
      setIsGettingLocation(false);
    };

    // 1) Try cached position first (instant)
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
      () => {},
      { enableHighAccuracy: false, timeout: 2000, maximumAge: 300000 }
    );

    // 2) Fresh position in parallel (high accuracy, 8s timeout)
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
      (err) => {
        if (!resolved) {
          console.warn('Geolocation error:', err.code, err.message);
          if (err.code === 1) {
            toast.error('Autorisez la localisation dans les paramètres de votre navigateur');
          } else {
            toast.error('Position GPS indisponible. Saisissez votre adresse manuellement.');
          }
          setIsGettingLocation(false);
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );

    // Safety timeout
    setTimeout(() => {
      if (!resolved) {
        setIsGettingLocation(false);
        toast.error('Détection GPS trop lente. Saisissez votre adresse.');
      }
    }, 10000);
  }, [mapboxToken]);

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
        try {
          if (!mapboxToken) throw new Error('No mapbox token');
          const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(addr)}.json?access_token=${mapboxToken}&country=fr&language=fr`);
          if (!res.ok) throw new Error(`Geocode HTTP ${res.status}`);
          const data = await res.json();
          if (data.features?.[0]) return { lat: data.features[0].center[1], lng: data.features[0].center[0] };
          return null;
        } catch (err) {
          console.error('Geocode error for:', addr, err);
          return null;
        }
      };

      const [pickup, dest] = await Promise.all([
        pickupCoords || geocode(pickupAddress),
        destCoords || geocode(destinationAddress),
      ]);

      if (!pickup) { toast.error('Adresse de départ introuvable'); return; }
      if (!dest) { toast.error('Adresse de destination introuvable'); return; }

      setPickupCoords(pickup);
      setDestCoords(dest);

      // Calculate route (non-blocking — search works even without distance)
      let distance: number | null = null;
      let duration: number | null = null;
      try {
        if (mapboxToken) {
          const dirRes = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${pickup.lng},${pickup.lat};${dest.lng},${dest.lat}?access_token=${mapboxToken}`);
          if (dirRes.ok) {
            const dirData = await dirRes.json();
            distance = dirData.routes?.[0]?.distance ? dirData.routes[0].distance / 1000 : null;
            duration = dirData.routes?.[0]?.duration ? dirData.routes[0].duration / 60 : null;
          }
        }
      } catch (dirErr) {
        console.warn('Directions API failed, continuing without distance:', dirErr);
      }
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
        destinationAddress,
        maxSearchRadiusKm,
        mode
      );
    } catch (err) {
      console.error('Search error:', err);
      toast.error('Erreur lors de la recherche');
    } finally {
      setIsGeocoding(false);
    }
  }, [pickupAddress, destinationAddress, pickupCoords, destCoords, mode, scheduledDate, scheduledTime, searchNearbyDrivers, mapboxToken, maxSearchRadiusKm]);

  // ── Auto-fetch price range when both addresses are set (silent pre-search) ──
  useEffect(() => {
    if (!pickupCoords || !destCoords || !mapboxToken) return;
    const key = `${pickupCoords.lat},${pickupCoords.lng}-${destCoords.lat},${destCoords.lng}-${mode}-${scheduledDate}-${scheduledTime}`;
    if (priceRangeFetched.current === key) return;
    priceRangeFetched.current = key;

    const fetchPriceRange = async () => {
      setIsFetchingPrices(true);
      try {
        // 1) Get route distance
        const dirRes = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${pickupCoords.lng},${pickupCoords.lat};${destCoords.lng},${destCoords.lat}?access_token=${mapboxToken}`);
        let dist: number | null = null;
        let dur: number | null = null;
        if (dirRes.ok) {
          const dirData = await dirRes.json();
          dist = dirData.routes?.[0]?.distance ? dirData.routes[0].distance / 1000 : null;
          dur = dirData.routes?.[0]?.duration ? dirData.routes[0].duration / 60 : null;
        }
        if (dist) { setRouteDistanceKm(dist); setRouteDurationMin(dur); }

        // 2) Find nearby drivers (silent)
        let schedDate: Date | undefined;
        if (mode === 'reservation' && scheduledDate && scheduledTime) {
          schedDate = new Date(`${scheduledDate}T${scheduledTime}`);
        }
        await searchNearbyDrivers(
          pickupCoords.lat, pickupCoords.lng,
          dist || undefined, dur || undefined,
          schedDate, pickupAddress, destinationAddress,
          maxSearchRadiusKm, mode
        );
      } catch (err) {
        console.warn('Pre-search price fetch failed:', err);
      } finally {
        setIsFetchingPrices(false);
      }
    };
    fetchPriceRange();
  }, [pickupCoords, destCoords, mapboxToken, mode, scheduledDate, scheduledTime, pickupAddress, destinationAddress, maxSearchRadiusKm, searchNearbyDrivers]);

  // ── Compute price range from fetched drivers ──
  useEffect(() => {
    if (drivers.length === 0) { setPriceRange(null); return; }
    const prices = drivers
      .filter(d => d.estimated_price && d.estimated_price > 0)
      .map(d => d.estimated_price!);
    if (prices.length === 0) { setPriceRange(null); return; }
    setPriceRange({ min: Math.min(...prices), max: Math.max(...prices) });
  }, [drivers]);


  // Submit ride request
  const handleSubmitRequest = async () => {
    if (selectedDriverIds.size === 0) { toast.error('Sélectionnez au moins un chauffeur'); return; }
    if (!user && (!guestName.trim() || !guestPhone.trim())) { 
      setShowGuestForm(true);
      toast.error('Veuillez renseigner vos coordonnées');
      return; 
    }

    // ── CARD VERIFICATION: Block if card payment required but not verified ──
    const selectedDrivers = drivers.filter(d => selectedDriverIds.has(d.driver_id));
    const hasStripeDriver = selectedDrivers.some(d => d.stripe_connect_charges_enabled);
    
    if (clientPaymentMethod === 'card' && hasStripeDriver && !cardVerifiedForBooking) {
      toast.error('Veuillez d\'abord vérifier votre carte bancaire.');
      return;
    }

    setIsSubmitting(true);
    try {
      const timeoutMs = 5 * 60 * 1000; // 5 minutes
      
      // Get client ID if logged in
      let clientId: string | null = null;
      if (user) {
        const { data: clientData } = await supabase.from('clients').select('id').eq('user_id', user.id).single();
        clientId = clientData?.id || null;
      }

      // Generate a unique group ID for all requests in this batch
      const requestGroupId = crypto.randomUUID();

      // Create ride requests for all selected drivers (first-come-first-served)
      // IMPORTANT: NO PaymentIntent is created here — payment is only triggered
      // when a driver accepts via the accept-ride-request edge function
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
          ride_type: mode === 'reservation' ? 'scheduled' : 'immediate',
          status: 'pending',
          selected_driver_id: driver.driver_id,
          estimated_price: driver.estimated_price,
          timeout_at: new Date(Date.now() + timeoutMs).toISOString(),
          payment_method: clientPaymentMethod || 'card',
          request_group_id: requestGroupId,
          scheduled_date: mode === 'reservation' && scheduledDate && scheduledTime 
            ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString() 
            : null,
        })))
        .select('id');

      if (insertError) throw insertError;

      const isMulti = selectedDrivers.length > 1;
      const timeoutIso = new Date(Date.now() + timeoutMs).toISOString();
      const lowestPriceVal = selectedDrivers.reduce((min, d) => Math.min(min, d.estimated_price || 0), Infinity);

      // Show waiting screen inline instead of navigating away
      setWaitingRequestId(data?.[0]?.id || '');
      setWaitingGroupId(requestGroupId);
      setWaitingDriversData(selectedDrivers);
      setWaitingTimeoutAt(timeoutIso);
      setWaitingEstimatedPrice(lowestPriceVal !== Infinity ? lowestPriceVal : 0);
      setShowWaitingScreen(true);

      toast.success(
        isMulti 
          ? `Demande envoyée à ${selectedDrivers.length} chauffeurs !`
          : 'Demande envoyée !'
      );
    } catch (err) {
      console.error('Submit error:', err);
      toast.error('Erreur lors de l\'envoi de la demande');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter drivers based on selected payment method
  // Card: show Stripe drivers first, then TPE drivers with warning badge
  // Cash: only drivers accepting cash
  const filteredDrivers = (() => {
    if (clientPaymentMethod === 'cash') {
      return drivers.filter(d => d.accepted_payment_methods?.includes('cash'));
    }
    if (clientPaymentMethod === 'card') {
      // Show all drivers but Stripe-enabled ones first
      return [...drivers].sort((a, b) => {
        const aStripe = a.stripe_connect_charges_enabled ? 1 : 0;
        const bStripe = b.stripe_connect_charges_enabled ? 1 : 0;
        return bStripe - aStripe;
      });
    }
    return drivers;
  })();

  // Auto-scroll carousel in auto mode
  useEffect(() => {
    if (searchMode !== 'auto' || confirmationStep || filteredDrivers.length <= 1) return;
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % filteredDrivers.length;
      driverScrollRef.current?.scrollTo({ left: idx * 180, behavior: 'smooth' });
    }, 1500);
    return () => clearInterval(interval);
  }, [searchMode, confirmationStep, filteredDrivers.length]);

  const selectedCount = selectedDriverIds.size;
  const lowestPrice = filteredDrivers
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

      {/* WAITING SCREEN - shown after submitting request */}
      {showWaitingScreen ? (
        <main className="container mx-auto px-3 sm:px-4 py-4 max-w-4xl space-y-4 pb-8">
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
            onCancel={() => {
              setShowWaitingScreen(false);
              setConfirmationStep(false);
              toast.info('Demande annulée');
            }}
            onAccepted={(driverName) => {
              toast.success(`${driverName} a accepté votre course ! 🎉`);
              setTimeout(() => {
                if (user) navigate('/client-dashboard');
                else navigate('/');
              }, 3000);
            }}
            onExpired={() => {
              toast.error('Aucun chauffeur disponible. Réessayez.');
              setShowWaitingScreen(false);
              setConfirmationStep(false);
            }}
          />
        </main>
      ) : (
      <main className="container mx-auto px-3 sm:px-4 py-4 max-w-4xl space-y-4 pb-32">
        {/* Mode Toggle */}
        <div className="flex gap-2 p-1 bg-muted/50 rounded-xl border border-border/50">
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
                    <div className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto">
                      {pickupSuggestions.map((f, i) => (
                        <button key={i} className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted/50 flex items-start gap-2 border-b border-border/30 last:border-0" onMouseDown={() => selectPickupSuggestion(f)}>
                          {f._isStrategic ? (
                            <Navigation className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                          ) : (
                            <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                          )}
                          <div>
                            {f._isStrategic && <span className="text-[10px] text-primary font-medium block">Lieu stratégique</span>}
                            <span className="text-foreground">{f.place_name}</span>
                          </div>
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
                    <div className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto">
                      {destSuggestions.map((f, i) => (
                        <button key={i} className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted/50 flex items-start gap-2 border-b border-border/30 last:border-0" onMouseDown={() => selectDestSuggestion(f)}>
                          {f._isStrategic ? (
                            <Navigation className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                          ) : (
                            <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                          )}
                          <div>
                            {f._isStrategic && <span className="text-[10px] text-primary font-medium block">Lieu stratégique</span>}
                            <span className="text-foreground">{f.place_name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Date/Time for reservations */}
            {mode === 'reservation' && (
              <div className="space-y-2 pt-2">
                <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Date et heure de prise en charge
                </Label>
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Date</span>
                    <Input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="bg-primary/10 border border-primary/30 h-12 text-sm font-medium text-foreground"
                      placeholder="Choisir une date"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Heure</span>
                    <Input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="bg-primary/10 border border-primary/30 h-12 text-sm font-medium text-foreground"
                      placeholder="Choisir une heure"
                    />
                  </div>
                </div>
                {(!scheduledDate || !scheduledTime) && (
                  <p className="text-[11px] text-amber-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Veuillez sélectionner la date et l'heure pour continuer
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-sm text-foreground">Zone de recherche</Label>
                <span className="text-sm font-medium text-primary">{maxSearchRadiusKm} km</span>
              </div>
              <Slider
                value={[maxSearchRadiusKm]}
                min={5}
                max={100}
                step={5}
                onValueChange={([value]) => setMaxSearchRadiusKm(value)}
              />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>5 km</span>
                <span>50 km</span>
                <span>100 km</span>
              </div>
            </div>

            {/* Payment method selection - before search */}
            <div className="space-y-2 pt-1">
              <Label className="text-sm text-foreground flex items-center gap-2">
                <CreditCard className="h-3.5 w-3.5 text-primary" />
                Mode de paiement
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setClientPaymentMethod('card')}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium",
                    clientPaymentMethod === 'card'
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border/50 text-muted-foreground hover:border-border"
                  )}
                >
                  <CreditCard className="h-4 w-4 shrink-0" />
                  <span>Carte bancaire</span>
                </button>
                <button
                  onClick={() => setClientPaymentMethod('cash')}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium",
                    clientPaymentMethod === 'cash'
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border/50 text-muted-foreground hover:border-border"
                  )}
                >
                  <Banknote className="h-4 w-4 shrink-0" />
                  <span>Espèces</span>
                </button>
              </div>
            </div>

            {/* Search button - single automatic dispatch */}
            <Button
              className="w-full h-12 text-base font-semibold gap-2"
              onClick={() => { setSearchMode('auto'); autoConfirmTriggered.current = false; handleSearch(); }}
              disabled={!pickupAddress.trim() || !destinationAddress.trim() || !clientPaymentMethod || isGeocoding || isLoading}
            >
              {isGeocoding || isLoading ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Recherche en cours...</>
              ) : (
                <><Zap className="mr-2 h-5 w-5" />Rechercher un chauffeur</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Route info */}
        {routeDistanceKm !== null && (
          <Card className="border-border/50">
            <CardContent className="p-3 flex items-center justify-around text-center">
              <div>
                <div className="text-lg font-bold text-foreground">{routeDistanceKm.toFixed(1)} km</div>
                <div className="text-[11px] text-muted-foreground">Distance de la course</div>
              </div>
              {routeDurationMin !== null && (
                <>
                  <div className="w-px h-8 bg-border" />
                  <div>
                    <div className="text-lg font-bold text-foreground">~{Math.round(routeDurationMin)} min</div>
                    <div className="text-[11px] text-muted-foreground">Temps estimé</div>
                  </div>
                </>
              )}
              {maxSearchRadiusKm && (
                <>
                  <div className="w-px h-8 bg-border" />
                  <div>
                    <div className="text-lg font-bold text-muted-foreground">{maxSearchRadiusKm} km</div>
                    <div className="text-[11px] text-muted-foreground">Rayon de recherche</div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Cash filter info */}
        {hasSearched && clientPaymentMethod === 'cash' && filteredDrivers.length === 0 && drivers.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Aucun chauffeur dans cette zone n'accepte les espèces. Modifiez votre mode de paiement.</AlertDescription>
          </Alert>
        )}
        {hasSearched && clientPaymentMethod === 'cash' && filteredDrivers.length > 0 && filteredDrivers.length < drivers.length && (
          <p className="text-xs text-muted-foreground px-1">
            {drivers.length - filteredDrivers.length} chauffeur{drivers.length - filteredDrivers.length > 1 ? 's' : ''} masqué{drivers.length - filteredDrivers.length > 1 ? 's' : ''} (n'accepte{drivers.length - filteredDrivers.length > 1 ? 'nt' : ''} pas les espèces)
          </p>
        )}

        {hasSearched && (
          <DriverMap
            clientPosition={pickupCoords}
            destinationPosition={destCoords}
            drivers={filteredDrivers}
            selectedDriverIds={selectedDriverIds}
            onDriverClick={() => {}}
            searchRadius={searchRadius}
            mapboxToken={mapboxToken}
            tokenLoading={isTokenLoading}
          />
        )}

        {hasSearched && mapboxError && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              La carte est temporairement indisponible, mais la liste des chauffeurs reste fonctionnelle.
            </AlertDescription>
          </Alert>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {fallbackToReservation && mode === 'immediate' && filteredDrivers.length === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Aucun chauffeur n’est connecté en temps réel pour une course immédiate dans cette zone. Voici les chauffeurs disponibles sur réservation autour de vous.
            </AlertDescription>
          </Alert>
        )}

        {/* No drivers */}
        {noDriversFound && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {mode === 'immediate'
                ? `Aucun chauffeur n’est disponible immédiatement dans un rayon de ${maxSearchRadiusKm} km. Essayez d’élargir la zone de recherche ou passez en réservation.`
                : `Aucun chauffeur disponible dans un rayon de ${maxSearchRadiusKm} km. Essayez d’élargir la zone de recherche ou une autre adresse de départ.`}
            </AlertDescription>
          </Alert>
        )}

        {/* Drivers list - 2-column grid with horizontal scroll on mobile */}
        {filteredDrivers.length > 0 && clientPaymentMethod && !confirmationStep && searchMode === 'auto' && (
          <div className="space-y-3">
            {/* Independent drivers banner */}
            <div className="flex items-start gap-2.5 bg-primary/5 border border-primary/20 rounded-xl p-3">
              <Car className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-foreground">Réservez directement auprès de professionnels certifiés.</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Chaque chauffeur est un entrepreneur indépendant, engagé pour un service premium et personnalisé.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-1">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">
                  Recherche du meilleur chauffeur...
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {filteredDrivers.length} chauffeur{filteredDrivers.length > 1 ? 's' : ''} contacté{filteredDrivers.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>


            {/* Auto-scrolling carousel */}
            <div className="relative overflow-hidden">
              <div
                ref={driverScrollRef}
                className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide -mx-1 px-1"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {filteredDrivers.map((driver, index) => (
                  <div key={driver.driver_id} className="snap-start shrink-0 w-[calc(50%-6px)] min-w-[160px] max-w-[220px] min-h-[320px]">
                    <DriverResultCard
                      driver={driver}
                      routeDistanceKm={routeDistanceKm || undefined}
                      isSelected={true}
                      onToggleSelect={() => {}}
                      onViewProfile={(d) => navigate(`/chauffeur/${d.driver_id}`)}
                      rank={index + 1}
                      clientPaymentMethod={clientPaymentMethod}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CONFIRMATION STEP */}
        {confirmationStep && selectedCount > 0 && (
          <div className="space-y-4">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-muted-foreground"
              onClick={() => {
                setConfirmationStep(false);
                setShowAuthStep(false);
                setAuthChoice(null);
                setShowGuestForm(false);
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Modifier la recherche
            </Button>

            {/* Auto mode info banner */}
            {searchMode === 'auto' && (
              <Alert className="border-primary/20 bg-primary/5">
                <Zap className="h-4 w-4 text-primary" />
                <AlertDescription className="text-xs">
                  <strong>Recherche automatique :</strong> Nous avons sélectionné les {selectedCount} chauffeur{selectedCount > 1 ? 's' : ''} les plus proches. 
                  Le premier à accepter sera votre chauffeur.
                </AlertDescription>
              </Alert>
            )}

            {/* Selected drivers summary */}
            <Card className="border-border/50">
              <CardContent className="p-4 space-y-3">
                <h4 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  {selectedCount} chauffeur{selectedCount > 1 ? 's' : ''} sélectionné{selectedCount > 1 ? 's' : ''}
                </h4>
                <div className="space-y-2">
                  {drivers.filter(d => selectedDriverIds.has(d.driver_id)).map((driver) => (
                    <div key={driver.driver_id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                      <Avatar className="h-10 w-10 border-2 border-primary/30">
                        <AvatarImage src={driver.profile_photo_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {(driver.display_name || 'VTC').split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{driver.display_name || driver.company_name || 'Chauffeur VTC'}</p>
                        <p className="text-xs text-muted-foreground">À {(driver.distance_meters / 1000).toFixed(1)} km</p>
                      </div>
                      {driver.estimated_price > 0 && (
                        <span className="text-lg font-bold text-primary">{driver.estimated_price.toFixed(0)}€</span>
                      )}
                    </div>
                  ))}
                </div>
                {routeDistanceKm && (
                  <div className="flex items-center justify-around text-center pt-2 border-t border-border/50">
                    <div>
                      <div className="text-sm font-bold">{routeDistanceKm.toFixed(1)} km</div>
                      <div className="text-[10px] text-muted-foreground">Distance</div>
                    </div>
                    {routeDurationMin && (
                      <>
                        <div className="w-px h-6 bg-border" />
                        <div>
                          <div className="text-sm font-bold">~{Math.round(routeDurationMin)} min</div>
                          <div className="text-[10px] text-muted-foreground">Temps estimé</div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment info banner */}
            <Card className="border-border/50 bg-muted/20">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {clientPaymentMethod === 'card' ? (
                    <CreditCard className="h-4 w-4 text-primary" />
                  ) : (
                    <Banknote className="h-4 w-4 text-primary" />
                  )}
                  <span>Paiement : {clientPaymentMethod === 'card' ? 'Carte bancaire' : 'Espèces'}</span>
                </div>
                {(() => {
                  const selectedDriversList = drivers.filter(d => selectedDriverIds.has(d.driver_id));
                  const hasStripeDriver = selectedDriversList.some(d => d.stripe_connect_charges_enabled);
                  const hasNonStripeDriver = selectedDriversList.some(d => !d.stripe_connect_charges_enabled);
                  const isMixed = hasStripeDriver && hasNonStripeDriver;
                  
                  if (isMixed && clientPaymentMethod === 'card') {
                    return (
                      <div className="space-y-2">
                        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-500/10 p-2 rounded-lg border border-amber-500/30">
                          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                          <span>
                            <strong>Attention :</strong> Certains chauffeurs acceptent le paiement en ligne sécurisé (empreinte bancaire), 
                            d'autres utilisent leur propre terminal (TPE). Le mode de paiement dépendra du chauffeur qui acceptera votre course.
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {selectedDriversList.map(d => (
                            <Badge key={d.driver_id} variant="outline" className={cn("text-[10px]", d.stripe_connect_charges_enabled ? "border-primary/30 text-primary" : "border-muted-foreground/30 text-muted-foreground")}>
                              {d.display_name || d.company_name || 'Chauffeur'}
                              {d.stripe_connect_charges_enabled ? ' 🔒' : ' 💳 TPE'}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  if (clientPaymentMethod === 'card' && hasStripeDriver) {
                    const isMultiDriver = selectedDriversList.length > 1;
                    const estimatedPrice = selectedDriversList.find(d => d.stripe_connect_charges_enabled)?.estimated_price;
                    return (
                      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-primary/5 p-2 rounded-lg">
                        <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>
                          {isMultiDriver 
                            ? "Le montant total TTC de la course sera bloqué sur votre carte dès qu'un chauffeur accepte. Aucun prélèvement ne sera fait avant la fin de la course." 
                            : `Le montant total TTC${estimatedPrice ? ` (${estimatedPrice.toFixed(0)}€)` : ''} sera bloqué sur votre carte à la confirmation. Le prélèvement interviendra à la fin de la course.`}
                        </span>
                      </div>
                    );
                  }
                  if (clientPaymentMethod === 'card' && hasNonStripeDriver && !hasStripeDriver) {
                    return (
                      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">
                        <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <span>Le paiement en carte bancaire sera effectué directement auprès du chauffeur (TPE).</span>
                      </div>
                    );
                  }
                  if (clientPaymentMethod === 'cash') {
                    return (
                      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">
                        <Banknote className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <span>Le paiement en espèces sera effectué directement auprès du chauffeur à la fin de la course.</span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </CardContent>
            </Card>

            {/* Auth options for non-authenticated users */}
            {!user && !authChoice && (
              <Card className="border-primary/30 shadow-lg">
                <CardContent className="p-4 space-y-3">
                  <h4 className="font-semibold text-foreground text-base text-center">Comment souhaitez-vous continuer ?</h4>
                  <p className="text-xs text-muted-foreground text-center">Choisissez une option pour finaliser votre demande</p>
                  <div className="space-y-2">
                    <Button variant="default" className="w-full h-12 justify-start gap-3 text-sm font-medium" onClick={() => { setAuthChoice('guest'); setShowGuestForm(true); }}>
                      <UserX className="h-5 w-5 shrink-0" />
                      <div className="text-left">
                        <div>Commander sans inscription</div>
                        <div className="text-[10px] opacity-80 font-normal">Rapide, sans compte</div>
                      </div>
                    </Button>
                    <Button variant="outline" className="w-full h-12 justify-start gap-3 text-sm font-medium" onClick={() => navigate('/register-client', { state: { returnTo: '/chauffeurs' } })}>
                      <UserPlus className="h-5 w-5 shrink-0" />
                      <div className="text-left">
                        <div>Créer un compte</div>
                        <div className="text-[10px] text-muted-foreground font-normal">Suivez vos courses, fidélité</div>
                      </div>
                    </Button>
                    <Button variant="outline" className="w-full h-12 justify-start gap-3 text-sm font-medium" onClick={() => navigate('/login', { state: { returnTo: '/chauffeurs' } })}>
                      <LogIn className="h-5 w-5 shrink-0" />
                      <div className="text-left">
                        <div>Se connecter</div>
                        <div className="text-[10px] text-muted-foreground font-normal">J'ai déjà un compte</div>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Guest form */}
            {!user && showGuestForm && authChoice === 'guest' && (
              <Card className="border-primary/30">
                <CardContent className="p-4 space-y-3">
                  <h4 className="font-semibold text-foreground text-sm">Vos coordonnées</h4>
                  <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Votre nom *" className="h-10" />
                  <Input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="Téléphone *" type="tel" className="h-10" />
                  <Input value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder={clientPaymentMethod === 'card' ? "Email * (obligatoire pour CB)" : "Email (optionnel)"} type="email" className="h-10" />
                </CardContent>
              </Card>
            )}

            {/* Card step: show for card payments when card not yet verified */}
            {(() => {
              const selectedDriversList = drivers.filter(d => selectedDriverIds.has(d.driver_id));
              const hasStripeDriver = selectedDriversList.some(d => d.stripe_connect_charges_enabled);
              const needsCard = clientPaymentMethod === 'card' && hasStripeDriver && !cardVerifiedForBooking;
              const isGuest = !user && authChoice === 'guest';
              const isRegistered = !!user;
              const guestInfoReady = isGuest && guestName.trim() && guestPhone.trim() && guestEmail?.trim();
              
              if (!needsCard) return null;
              
              // For guests: only show card form once guest info is complete
              if (isGuest && !guestInfoReady) {
                return (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground bg-primary/5 p-2 rounded-lg">
                    <CreditCard className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>Remplissez vos coordonnées (nom, téléphone, email) pour enregistrer votre carte bancaire.</span>
                  </div>
                );
              }
              
              if (isRegistered || guestInfoReady) {
                return (
                  <BookingCardStep
                    isAuthenticated={isRegistered}
                    guestName={guestName}
                    guestEmail={guestEmail}
                    guestPhone={guestPhone}
                    estimatedPrice={selectedDriversList[0]?.estimated_price}
                    onCardReady={(info) => {
                      setCardVerifiedForBooking(true);
                      setSavedCardInfo(info);
                      toast.success('Carte vérifiée ! Vous pouvez envoyer votre demande.');
                    }}
                  />
                );
              }
              return null;
            })()}
          </div>
        )}
      </main>
      )}

      {/* Fixed bottom CTA - only for confirmation step (auth/card needed) */}
      {!showWaitingScreen && confirmationStep && selectedCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] z-50">
          <div className="container mx-auto max-w-4xl">
            <Button
              className="w-full h-12 text-sm font-bold gap-2"
              onClick={() => {
                if (!user && !authChoice) return;
                handleSubmitRequest();
              }}
              disabled={(() => {
                if (isSubmitting) return true;
                if (!user && !authChoice) return true;
                if (clientPaymentMethod === 'card') {
                  const selectedDriversList = drivers.filter(d => selectedDriverIds.has(d.driver_id));
                  const hasStripeDriver = selectedDriversList.some(d => d.stripe_connect_charges_enabled);
                  if (hasStripeDriver && !cardVerifiedForBooking) return true;
                }
                return false;
              })()}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="truncate">
                {!user && !authChoice
                  ? 'Choisissez une option ci-dessus'
                  : clientPaymentMethod === 'card' && !cardVerifiedForBooking && drivers.filter(d => selectedDriverIds.has(d.driver_id)).some(d => d.stripe_connect_charges_enabled)
                    ? 'Vérifiez votre carte ci-dessus'
                    : 'Lancer la recherche'}
              </span>
              {lowestPrice !== Infinity && (
                <span className="shrink-0">
                  dès {lowestPrice.toFixed(0)}€
                </span>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
