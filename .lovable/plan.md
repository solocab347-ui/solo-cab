
## Analyse de l'existant

~70% du système est déjà en place :
- ✅ Recherche chauffeurs (`useNearbyDrivers`)
- ✅ Sélection manuelle avec cartes
- ✅ `RideWaitingScreen` avec phases progressives
- ✅ Edge function `extended-driver-search` avec relance intelligente
- ✅ Popup chauffeur avec timer 60s
- ✅ Filtrage refus vs non-réponse

## Ce qui manque

### 1. Double bouton sur la page booking
Remplacer le bouton unique "Continuer" par :
- **"Rechercher un chauffeur"** (primary, gros) → mode auto
- **"Choisir mes chauffeurs"** (secondary, en dessous) → mode manuel (flow actuel)

### 2. Mode Auto
Quand le client clique "Rechercher un chauffeur" :
- Lancer la recherche
- Auto-sélectionner les 10 plus proches
- **Sauter l'étape de sélection** → aller directement au `RideWaitingScreen`
- Diffuser immédiatement la demande

### 3. UI "Chauffeurs contactés" pendant recherche
Améliorer `RideWaitingScreen` pour afficher la liste des chauffeurs contactés avec leur statut :
- 🔵 Contacté
- ⏳ En attente de réponse
- ❌ Refusé
- ✅ Accepté

### 4. Permettre modification pendant recherche
Dans le mode auto, pendant l'attente :
- Le client peut voir la liste des chauffeurs contactés
- Ajouter/retirer des chauffeurs
- Voir la carte

### Fichiers à modifier
- `UnifiedBookingPage.tsx` — Double bouton + mode auto
- `RideWaitingScreen.tsx` — Liste chauffeurs contactés avec statuts

### Ce qui ne change PAS
- La logique de diffusion (phases, relance, extension)
- La popup chauffeur (60s timer)
- Les règles de refus/non-réponse
- L'edge function `extended-driver-search`
