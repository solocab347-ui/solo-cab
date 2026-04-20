import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, MapPin, Navigation, AlertCircle, Search } from 'lucide-react';
import { useNearbyDrivers, NearbyDriver } from '@/hooks/useNearbyDrivers';
import { NearbyDriverCard } from './NearbyDriverCard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useMapboxToken } from '@/hooks/useMapboxToken';

interface ImmediateRideSearchProps {
  onDriverSelected: (driver: NearbyDriver, pickupAddress: string, destinationAddress: string, distanceKm: number) => void;
}

export function ImmediateRideSearch({ onDriverSelected }: ImmediateRideSearchProps) {
  const [pickupAddress, setPickupAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<NearbyDriver | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const { token: mapboxToken } = useMapboxToken();

  const {
    drivers,
    isLoading,
    error,
    searchRadius,
    noDriversFound,
    searchNearbyDrivers,
  } = useNearbyDrivers();

  // Get user's current location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setPickupCoords({ lat: latitude, lng: longitude });

        // Reverse geocode to get address
        try {
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1Ijoic29sb2NhYiIsImEiOiJjbTdtOGdqaWEwNHh3MmpwcjZmeWFoYWkxIn0.u2lNBfdgcxvxrYGgAO2aeg'}&language=fr`
          );
          const data = await response.json();
          if (data.features?.[0]) {
            setPickupAddress(data.features[0].place_name);
          }
        } catch (err) {
          console.error('Reverse geocoding error:', err);
        }

        setIsGettingLocation(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Geocode address
  const geocodeAddress = useCallback(async (address: string): Promise<{ lat: number; lng: number } | null> => {
    if (!address.trim()) return null;

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1Ijoic29sb2NhYiIsImEiOiJjbTdtOGdqaWEwNHh3MmpwcjZmeWFoYWkxIn0.u2lNBfdgcxvxrYGgAO2aeg'}&country=fr&language=fr`
      );
      const data = await response.json();

      if (data.features?.[0]) {
        const [lng, lat] = data.features[0].center;
        return { lat, lng };
      }
    } catch (err) {
      console.error('Geocoding error:', err);
    }

    return null;
  }, []);

  // Calculate route distance using Mapbox Directions API
  const calculateRouteDistance = useCallback(async (
    pickup: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ): Promise<number | null> => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${pickup.lng},${pickup.lat};${destination.lng},${destination.lat}?access_token=${import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1Ijoic29sb2NhYiIsImEiOiJjbTdtOGdqaWEwNHh3MmpwcjZmeWFoYWkxIn0.u2lNBfdgcxvxrYGgAO2aeg'}`
      );
      const data = await response.json();

      if (data.routes?.[0]) {
        return data.routes[0].distance / 1000; // Convert meters to km
      }
    } catch (err) {
      console.error('Directions error:', err);
    }

    return null;
  }, []);

  // Search for drivers when both addresses are set
  const handleSearch = useCallback(async () => {
    if (!pickupAddress.trim() || !destinationAddress.trim()) return;

    setIsGeocoding(true);
    setSelectedDriver(null);

    try {
      // Geocode both addresses
      const [pickupResult, destResult] = await Promise.all([
        pickupCoords ? Promise.resolve(pickupCoords) : geocodeAddress(pickupAddress),
        geocodeAddress(destinationAddress),
      ]);

      if (!pickupResult) {
        setIsGeocoding(false);
        return;
      }

      if (!destResult) {
        setIsGeocoding(false);
        return;
      }

      setPickupCoords(pickupResult);
      setDestinationCoords(destResult);

      // Calculate route distance
      const distance = await calculateRouteDistance(pickupResult, destResult);
      setRouteDistanceKm(distance);

      // Search for nearby drivers
      await searchNearbyDrivers(pickupResult.lat, pickupResult.lng, distance || undefined);
    } finally {
      setIsGeocoding(false);
    }
  }, [pickupAddress, destinationAddress, pickupCoords, geocodeAddress, calculateRouteDistance, searchNearbyDrivers]);

  // Handle driver selection
  const handleDriverSelect = (driver: NearbyDriver) => {
    setSelectedDriver(driver);
  };

  // Confirm selection
  const handleConfirmSelection = () => {
    if (selectedDriver && routeDistanceKm !== null) {
      onDriverSelected(selectedDriver, pickupAddress, destinationAddress, routeDistanceKm);
    }
  };

  return (
    <div className="space-y-4">
      {/* Address inputs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Votre trajet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Pickup */}
          <div className="space-y-2">
            <Label htmlFor="pickup">Adresse de départ</Label>
            <div className="flex gap-2">
              <Input
                id="pickup"
                value={pickupAddress}
                onChange={(e) => {
                  setPickupAddress(e.target.value);
                  setPickupCoords(null);
                }}
                placeholder="Entrez votre adresse de départ"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={getCurrentLocation}
                disabled={isGettingLocation}
                title="Utiliser ma position"
              >
                {isGettingLocation ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MapPin className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Destination */}
          <div className="space-y-2">
            <Label htmlFor="destination">Adresse d'arrivée</Label>
            <Input
              id="destination"
              value={destinationAddress}
              onChange={(e) => {
                setDestinationAddress(e.target.value);
                setDestinationCoords(null);
              }}
              placeholder="Entrez votre destination"
            />
          </div>

          {/* Search button */}
          <Button
            className="w-full"
            onClick={handleSearch}
            disabled={!pickupAddress.trim() || !destinationAddress.trim() || isGeocoding || isLoading}
          >
            {isGeocoding || isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recherche en cours...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Rechercher des chauffeurs
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Route info */}
      {routeDistanceKm !== null && (
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Distance du trajet</span>
              <Badge variant="secondary">{routeDistanceKm.toFixed(1)} km</Badge>
            </div>
            {searchRadius && (
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-muted-foreground">Rayon de recherche</span>
                <Badge variant="outline">{searchRadius} km</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* No drivers found */}
      {noDriversFound && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Aucun chauffeur disponible</AlertTitle>
          <AlertDescription>
            Aucun chauffeur n'est disponible dans un rayon de 20 km. Réessayez plus tard ou modifiez votre adresse de départ.
          </AlertDescription>
        </Alert>
      )}

      {/* Drivers list */}
      {drivers.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">
            {drivers.length} chauffeur{drivers.length > 1 ? 's' : ''} disponible{drivers.length > 1 ? 's' : ''}
          </h3>

          <div className="space-y-3">
            {drivers.map((driver) => (
              <NearbyDriverCard
                key={driver.driver_id}
                driver={driver}
                routeDistanceKm={routeDistanceKm || undefined}
                onSelect={handleDriverSelect}
                isSelected={selectedDriver?.driver_id === driver.driver_id}
              />
            ))}
          </div>

          {/* Confirm button */}
          {selectedDriver && (
            <Button
              className="w-full"
              size="lg"
              onClick={handleConfirmSelection}
            >
              Demander ce chauffeur - {selectedDriver.estimated_price?.toFixed(2)}€
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
