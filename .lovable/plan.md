Plan de correction proposé :

1. Unifier la source de vérité du statut chauffeur
   - Remplacer les lectures partielles qui ne regardent que `driver_status` par une lecture complète de `driver_status` + `is_available_now`.
   - Déduire l’état affiché avec une règle unique :
     - `online` + `is_available_now=true` = En ligne
     - `offline` ou `break` = Hors ligne / Pause
     - `assigned` ou `in_ride` = Course en cours, bouton verrouillé
   - Appliquer cette même règle sur le dashboard et sur la carte.

2. Corriger le clic du bouton sur la carte
   - Ajouter un état `isToggling` dans le contexte de disponibilité.
   - Pendant le changement, désactiver temporairement le bouton et afficher un chargement au lieu de donner l’impression que rien ne se passe.
   - Garder le bouton carte cliquable quand le chauffeur est vraiment hors ligne, sauf s’il est en course assignée/en course.

3. Sécuriser le changement en ligne/hors ligne côté backend
   - Créer une fonction backend atomique de changement de statut chauffeur.
   - Elle mettra à jour ensemble : `driver_status`, `is_available_now`, `last_location_update`, et l’effacement GPS quand le chauffeur passe hors ligne/pause.
   - Elle empêchera un passage hors ligne/en ligne incohérent si une course active existe.
   - Cela évite les états divergents entre dashboard, carte et recherche client.

4. Supprimer les doubles systèmes concurrents
   - Le hook GPS `useDriverLocationTracker` contient encore une ancienne méthode `updateAvailability` qui peut écrire directement dans `drivers`.
   - La disponibilité doit passer uniquement par `DriverAvailabilityContext`.
   - Le hook GPS restera responsable de la position uniquement, pas du statut métier.

5. Stabiliser la synchronisation dashboard ↔ carte
   - Éviter de remonter deux providers indépendants qui se réinitialisent quand on change entre dashboard et carte.
   - Garder un seul contexte de disponibilité autour des deux modes, pour que la carte et le dashboard partagent immédiatement le même état.
   - Forcer une relecture courte après mutation si le realtime met trop de temps à revenir.

6. Corriger l’overlay de chargement carte
   - Actuellement la carte affiche “Localisation…” même quand le chauffeur est hors ligne, ce qui peut donner l’impression d’un blocage.
   - Afficher le chargement GPS seulement si le suivi GPS est censé être actif.
   - En hors ligne, afficher plutôt un état clair “Hors ligne — activez le service pour recevoir les courses immédiates”.

7. Vérifier l’absence de résidus PWA actifs
   - Le scan ne montre pas de composant/banner/import PWA actif dans `src`, `public`, `index.html`, `vite.config` ou `package.json`.
   - Seul le script de garde `android:no-pwa` reste, volontairement, pour empêcher une réintroduction PWA dans les builds.
   - Après correction, lancer la vérification anti-PWA et un build TypeScript/Vite pour confirmer qu’aucun import inutile ni sélecteur PWA n’est conservé.

Fichiers concernés principalement :
- `src/contexts/DriverAvailabilityContext.tsx`
- `src/components/driver/planning/DriverAvailabilityToggleBig.tsx`
- `src/components/driver/map/DriverMapMode.tsx`
- `src/hooks/useDriverLocationTracker.ts`
- `src/pages/DriverDashboard.tsx`
- nouvelle migration backend pour la fonction atomique de statut chauffeur

Résultat attendu :
- Le dashboard et la carte affichent toujours le même état.
- Un clic sur “En ligne/Hors ligne” réagit immédiatement visuellement.
- Plus de faux blocage “Localisation…” en hors ligne.
- Le GPS ne reste pas actif ni affiché après déconnexion.
- Le chauffeur ne peut pas être affiché en ligne sur le dashboard et hors ligne sur la carte en même temps.