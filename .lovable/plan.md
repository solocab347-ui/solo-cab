# Synchronisation GPS ↔ État de connexion chauffeur

## Objectif
Le GPS ne doit s'activer **que** lorsque le chauffeur est utile à l'application :
- ✅ **online**, **assigned**, **in_ride** → GPS actif (foreground + background)
- ⏸️ **break** → GPS en pause (aucune émission, aucun watcher)
- ❌ **offline** → GPS coupé immédiatement, position effacée côté serveur, aucune permission sollicitée

Aujourd'hui, plusieurs composants forcent `enabled: true` en dur, ce qui maintient `watchPosition`, le wake lock et le foreground service Android même hors-ligne.

---

## 1. Composants UI — brancher `enabled` sur l'état réel

### `src/components/driver/planning/DriverAvailabilityToggleBig.tsx`
Remplacer :
```ts
const { isTracking, error } = useDriverLocationTracker({ driverId, enabled: true });
```
par :
```ts
const trackingEnabled = isOnline || isAssigned || isInRide; // pas en break, pas offline
const { isTracking, error } = useDriverLocationTracker({ driverId, enabled: trackingEnabled });
```

### `src/components/driver/DriverMapMode.tsx`
Même correction : passer `enabled` = `isOnline || isAssigned || isInRide` issu de `useDriverAvailability()` au lieu de `true`.

### `src/pages/GpsDiagnostic.tsx`
Garder `enabled: true` (page de test volontaire) mais ajouter un bandeau d'avertissement :
> « Cette page maintient le GPS actif même hors-ligne à des fins de diagnostic. Quittez la page pour revenir au comportement normal. »

---

## 2. `src/hooks/useDriverLocationTracker.ts` — hard stop quand `enabled = false`

Au passage `enabled: true → false` :
- `navigator.geolocation.clearWatch(watchId)` + `watchIdRef.current = null`
- `clearInterval` sur tous les heartbeats / refresh
- Relâcher le wake lock (`wakeLock.release()`)
- Reset state : `setLatitude(null)`, `setLongitude(null)`, `setIsTracking(false)`, `setError(null)`
- Ne **plus jamais** appeler `getCurrentPosition` tant que `enabled` reste `false` (donc plus de prompt de permission)

---

## 3. `src/hooks/useDriverBackgroundGPS.ts` — déjà conditionné sur `enabled`
À auditer pour confirmer que :
- `stop()` est bien appelé sur transition `enabled: true → false`
- `setTrackingFlag(false)` est appelé (pour que le `BootReceiver` Android ne relance pas le service)
- Le watchdog 30s est bien arrêté

Aucun changement de logique attendu, juste une vérification.

---

## 4. Effacement serveur immédiat à la mise hors-ligne

### Migration : nouvelle RPC `clear_driver_gps_on_offline(_driver_id uuid)`
```sql
create or replace function public.clear_driver_gps_on_offline(_driver_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.drivers
     set current_latitude = null,
         current_longitude = null,
         last_location_update = null
   where id = _driver_id
     and auth.uid() = user_id;
$$;
```
→ Empêche le chauffeur d'apparaître dans `find_nearby_drivers` même si la fenêtre de fraîcheur n'a pas expiré.

### `src/contexts/DriverAvailabilityContext.tsx`
Dans le handler `toggleAvailability`, après le passage à `offline` (et symétriquement quand `break` est activé) :
```ts
await supabase.rpc('clear_driver_gps_on_offline', { _driver_id: driverId });
```

---

## 5. Préférence native (Android `BootReceiver`)
Lorsque le chauffeur passe `offline`, `useDriverBackgroundGPS` doit appeler `setTrackingFlag(false)` (déjà en place). Vérifier que la clé `solocab_gps_tracking_enabled` est bien retirée pour que le `BootReceiver` ne relance pas le foreground service au reboot d'un chauffeur déconnecté.

---

## Fichiers touchés
- `src/components/driver/planning/DriverAvailabilityToggleBig.tsx` (edit)
- `src/components/driver/DriverMapMode.tsx` (edit)
- `src/pages/GpsDiagnostic.tsx` (edit — bandeau)
- `src/hooks/useDriverLocationTracker.ts` (edit — hard stop)
- `src/contexts/DriverAvailabilityContext.tsx` (edit — appel RPC)
- nouvelle migration SQL (`clear_driver_gps_on_offline`)

## Hors scope
- Aucun changement à la logique de matching client.
- Aucun changement à `find_nearby_drivers`.
- Aucun rebuild APK requis (la partie native reste identique, on ne fait que respecter le flag existant).

## Résultat attendu
| État chauffeur | `watchPosition` | Foreground service Android | Ligne en BDD `current_lat/lng` | Visible dans recherche client |
|---|---|---|---|---|
| online | ✅ | ✅ | frais (<30 s) | ✅ |
| assigned / in_ride | ✅ | ✅ | frais | ✅ (verrouillé sur la course) |
| break | ❌ | ❌ | conservé jusqu'à reprise | ❌ |
| offline | ❌ | ❌ | **NULL immédiatement** | ❌ |
| offline + reboot téléphone | ❌ | ❌ (flag absent) | NULL | ❌ |
