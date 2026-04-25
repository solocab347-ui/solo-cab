Je vais corriger le problème à la source : le service Android GPS continue bien à tourner, mais l’interface de la carte ne se synchronise pas assez avec les mises à jour natives/background. Résultat : le bandeau “Position GPS obsolète” apparaît alors que la notification Android indique bien “GPS actif”.

Plan d’implémentation :

1. Unifier le tracking GPS natif
- Remplacer le démarrage en double du plugin `BackgroundGeolocation` par un point d’entrée stable.
- Éviter que la carte chauffeur et le composant global lancent deux watchers concurrents.
- Garder un seul flux fiable pour les positions Android foreground/background.

2. Rafraîchir automatiquement l’état UI depuis la base
- Quand l’app revient au premier plan, relire immédiatement `current_latitude`, `current_longitude` et `last_location_update` du chauffeur.
- Ajouter un abonnement realtime sur la ligne `drivers` pour que la carte reçoive aussi les mises à jour envoyées par le service Android background.
- Ainsi, même si Android throttle le JavaScript en arrière-plan, le bandeau ne dépendra plus uniquement du dernier timer React.

3. Corriger la logique “obsolète” côté application native
- Sur Android natif, ne pas afficher “gardez l’app au premier plan” si le foreground service GPS est actif.
- Remplacer ce message par un état opérationnel plus juste :
  - GPS actif si une position récente vient du service ou de la base.
  - Alerte uniquement si aucune position serveur récente n’existe après un délai réaliste.
- Conserver une alerte stricte pour les cas réels : permission perdue, service non démarré, dernier update trop ancien.

4. Rendre le heartbeat serveur plus robuste
- Le service background enverra un heartbeat régulier même si le chauffeur est stationnaire.
- Le `last_location_update` restera frais sans attendre un déplacement significatif.
- Utiliser l’RPC existant `update_driver_location_batch` quand possible pour garder `last_seen_at` et GPS synchronisés.

5. Configuration Android importante
- Ajouter `android.useLegacyBridge = true` dans la configuration Capacitor, recommandé par le plugin background-geolocation pour éviter l’arrêt des updates après quelques minutes en arrière-plan.
- Garder les permissions déjà présentes : localisation fine, background location, foreground service location, notifications, wake lock.

6. Diagnostic visible
- Ajouter/adapter les logs UI du diagnostic GPS pour distinguer :
  - dernier fix natif,
  - dernier update serveur,
  - service background actif,
  - état permission/batterie.
- Cela permettra de voir immédiatement si le problème vient du téléphone, de la WebView, du service Android ou de la base.

Fichiers concernés :
- `capacitor.config.ts`
- `src/hooks/useDriverLocationTracker.ts`
- `src/hooks/useDriverBackgroundGPS.ts`
- `src/hooks/useNativeGeolocation.ts`
- `src/components/driver/map/DriverMapMode.tsx`
- éventuellement `src/pages/GpsDiagnostic.tsx`

Après validation, j’implémente ces changements. Ensuite il faudra refaire une build Android propre avec `npx cap sync android`, puis installer la nouvelle APK/AAB : certaines corrections touchent la couche native Capacitor et ne peuvent pas être entièrement validées dans le simple preview web.