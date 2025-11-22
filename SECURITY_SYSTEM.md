# 🔒 SYSTÈME DE SÉCURITÉ - CRÉATION DE COURSES

Ce document décrit le système de sécurité renforcé pour la création de courses sur SoloCab.

## 🎯 Objectif

Garantir que la création de courses est **100% fiable, sécurisée et sans bugs** en appliquant :
- Validation stricte des données
- Gestion d'erreurs complète avec ErrorBoundary
- Protection contre les injections
- Vérifications de sécurité à plusieurs niveaux
- Stabilisation des composants UI (Select, Portal)

## 📁 Architecture du système

### 0. **ErrorBoundary UI** (`src/components/ErrorBoundary.tsx`)

Protection globale contre les erreurs DOM et React pour éviter les pages blanches :

```typescript
// ✅ Protection de toute la page
<ErrorBoundary>
  <CreateCourse />
</ErrorBoundary>

// ✅ Protection spécifique des composants critiques
<ErrorBoundary fallback={<SafeInput />}>
  <Select>...</Select>
</ErrorBoundary>
```

**Erreurs capturées :**
- ✅ Erreurs "removeChild" des composants Radix UI
- ✅ Erreurs de montage/démontage des portals
- ✅ Erreurs de rendu React
- ✅ Erreurs inattendues dans les composants

**Mesures de stabilisation :**
- ✅ Clés stables sur tous les Select (`key={promo-select-${length}}`)
- ✅ Fallback Input pour Select vides (évite portal vide)
- ✅ Préfixes uniques sur SelectItem keys (`client-${id}`, `promo-${id}`)
- ✅ Protection contre changements rapides de state

### 1. **Validation centralisée** (`src/lib/courseValidation.ts`)

Toutes les validations sont centralisées dans un seul fichier avec Zod :

```typescript
// ✅ Validation des coordonnées GPS
coordinatesSchema.parse({ latitude: 48.8566, longitude: 2.3522 });

// ✅ Validation complète d'une course
validateCourseData({
  pickupAddress: "10 Rue de la Paix, Paris",
  pickupCoordinates: { latitude: 48.8566, longitude: 2.3522 },
  destinationAddress: "Aéroport CDG",
  destinationCoordinates: { latitude: 49.0097, longitude: 2.5479 },
  scheduledDate: "2025-11-25T10:00:00Z",
  passengersCount: 3,
  distanceKm: 25.5,
  durationMinutes: 35
});
```

**Validations appliquées :**
- ✅ Coordonnées GPS valides (-90/90 latitude, -180/180 longitude)
- ✅ Adresses non vides (5-500 caractères)
- ✅ Date dans le futur
- ✅ Nombre de passagers cohérent (1-20)
- ✅ Distance positive et réaliste (max 2000 km)
- ✅ Durée positive et réaliste (max 24h)
- ✅ Notes limitées (max 1000 caractères)
- ✅ Code promo formaté correctement

### 2. **Hook sécurisé** (`src/hooks/useCourseCreation.ts`)

Un hook React centralisé qui gère TOUTE la logique de création :

```typescript
const { createCourse, loading } = useCourseCreation();

// Création sécurisée avec toutes les validations
const course = await createCourse({
  userId: user.id,
  clientId: "uuid-client",
  driverId: "uuid-driver",
  pickupAddress: "...",
  pickupCoordinates: { ... },
  // ... autres données
});
```

**Sécurités appliquées :**
1. ✅ Vérification authentification utilisateur
2. ✅ Validation coordonnées GPS obligatoires
3. ✅ Calcul et validation itinéraire Mapbox
4. ✅ Validation schéma Zod complet
5. ✅ Vérification existence et statut du driver
6. ✅ Vérification capacité passagers du véhicule
7. ✅ Vérification association client-driver (dual)
8. ✅ Sanitisation des notes (suppression HTML)
9. ✅ Sanitisation du code promo (alphanumérique)
10. ✅ Génération automatique du devis avec gestion d'erreur
11. ✅ Notifications automatiques driver/client

### 3. **Gestion d'erreurs** (`src/lib/errorHandler.ts`)

Système centralisé pour capturer et traiter toutes les erreurs :

```typescript
// Wrapper avec gestion automatique
const result = await safeAsync(
  () => createCourse(...),
  "Course creation"
);

if (result.success) {
  console.log("Course créée:", result.data);
} else {
  console.error("Erreur:", result.error);
}

// Retry automatique avec backoff
const data = await retryAsync(
  () => supabase.from("courses").select(),
  3, // 3 tentatives
  "Fetch courses"
);
```

**Types d'erreurs gérés :**
- 🔴 `validation` : Données invalides (schéma Zod)
- 🔴 `network` : Problèmes réseau/connexion
- 🔴 `auth` : Problèmes authentification
- 🔴 `database` : Erreurs Supabase/PostgreSQL
- 🔴 `unknown` : Erreurs inattendues

## 🔐 Niveaux de sécurité

### Niveau 0 : Protection ErrorBoundary
- ✅ ErrorBoundary global sur toutes les pages de création
- ✅ ErrorBoundary locaux sur composants critiques (Select)
- ✅ Fallbacks sécurisés en cas d'erreur UI
- ✅ Clés stables pour éviter remontages intempestifs
- ✅ Prévention erreurs "removeChild" des portals

### Niveau 1 : Interface utilisateur
- ✅ Champs requis marqués avec `*`
- ✅ Validation HTML5 (type, required, min, max)
- ✅ Boutons désactivés si données incomplètes
- ✅ Messages d'erreur clairs et précis

### Niveau 2 : Validation client (React)
- ✅ Vérification coordonnées GPS avant soumission
- ✅ Validation format date/heure
- ✅ Vérification sélection client/driver
- ✅ Calcul itinéraire Mapbox obligatoire

### Niveau 3 : Hook sécurisé
- ✅ Validation schéma Zod complet
- ✅ Sanitisation données utilisateur
- ✅ Vérifications existence ressources
- ✅ Vérifications permissions/associations

### Niveau 4 : Base de données (RLS)
- ✅ Row Level Security activé sur toutes les tables
- ✅ Policies strictes par rôle (client/driver/admin)
- ✅ Vérification associations client-driver
- ✅ Contraintes d'intégrité référentielle

## 🛡️ Protection contre les attaques

### Injection SQL
✅ **Protégé** : Utilisation de Supabase avec requêtes paramétrées

### Injection HTML/XSS
✅ **Protégé** : Sanitisation des notes (`sanitizeNotes`)
- Suppression caractères `<>` 
- Limitation 1000 caractères

### CSRF
✅ **Protégé** : Authentification JWT via Supabase

### Manipulation coordonnées
✅ **Protégé** : Validation schéma Zod stricte
- Latitude : -90 à 90
- Longitude : -180 à 180

### Données incohérentes
✅ **Protégé** : Validation business logic
- Date future obligatoire
- Distance réaliste (< 2000 km)
- Durée réaliste (< 24h)
- Passagers dans capacité véhicule

## 📊 Flux de création sécurisé

```
1. Client remplit formulaire
   └─> Validation HTML5 (required, types)

2. Client clique "Créer"
   └─> Vérification coordonnées GPS
   └─> Vérification date/sélections
   
3. Appel createCourse()
   └─> Validation schéma Zod
   └─> Calcul itinéraire Mapbox
   └─> Vérification driver existe et validé
   └─> Vérification capacité passagers
   └─> Vérification association client-driver
   
4. Insertion en base
   └─> RLS vérifie permissions
   └─> Contraintes vérifient intégrité
   
5. Génération devis automatique
   └─> Appel edge function
   └─> Gestion erreur si échec
   
6. Notifications
   └─> Driver notifié de demande
   └─> Client notifié de devis généré
   
7. Redirection dashboard
   └─> Affichage confirmation
```

## 🧪 Tests de sécurité à effectuer

### Avant chaque déploiement :

1. **Test coordonnées invalides**
   - [ ] Latitude > 90 ou < -90
   - [ ] Longitude > 180 ou < -180
   - [ ] Coordonnées nulles/undefined

2. **Test dates invalides**
   - [ ] Date passée
   - [ ] Date trop lointaine
   - [ ] Format invalide

3. **Test données manquantes**
   - [ ] Pas d'adresse de départ
   - [ ] Pas d'adresse d'arrivée
   - [ ] Pas de date
   - [ ] Pas de client sélectionné (driver)

4. **Test limites**
   - [ ] Distance > 2000 km
   - [ ] Durée > 24h
   - [ ] Passagers > capacité véhicule
   - [ ] Notes > 1000 caractères

6. **Test injections**
   - [ ] HTML dans notes : `<script>alert('XSS')</script>`
   - [ ] Caractères spéciaux dans code promo
   - [ ] SQL dans adresses (déjà protégé par Supabase)

7. **Test stabilité UI**
   - [ ] Changements rapides de Select
   - [ ] Fermeture/ouverture rapide des dropdowns
   - [ ] Démontage composant pendant chargement
   - [ ] Navigation pendant soumission formulaire

8. **Test permissions**
   - [ ] Client crée course pour autre client
   - [ ] Driver crée course pour client d'un autre driver
   - [ ] Utilisateur non connecté

## 🚨 Monitoring et alertes

### Logs à surveiller :
- `❌ Error in course creation` : Échec création
- `⚠️ Retry X/3 failed` : Tentatives échouées
- `❌ Driver verification error` : Driver invalide
- `❌ Client verification error` : Client invalide
- `❌ ErrorBoundary caught an error` : Erreur UI capturée

### Métriques importantes :
- Taux de succès création courses (objectif: >99%)
- Temps moyen création (objectif: <3s)
- Taux d'échec génération devis (objectif: <1%)

## 📝 Maintenance

### Ajout d'une nouvelle validation :

1. **Ajouter dans `courseValidation.ts`** :
```typescript
export const newFieldSchema = z.string().min(1).max(100);
```

2. **Mettre à jour `courseDataSchema`** :
```typescript
export const courseDataSchema = z.object({
  // ... champs existants
  newField: newFieldSchema,
});
```

3. **Ajouter dans `useCourseCreation`** :
```typescript
// VALIDATION X: Vérifier nouveau champ
if (!params.newField) {
  toast.error("Nouveau champ requis");
  return null;
}
```

### En cas de bug récurrent :

1. Identifier le point de défaillance
2. Ajouter validation/vérification supplémentaire
3. Ajouter test de non-régression
4. Documenter dans ce fichier

## ✅ Checklist déploiement

Avant chaque mise en production :

- [ ] Tous les tests de sécurité passés
- [ ] Validation Zod à jour
- [ ] RLS policies vérifiées
- [ ] Logs de débogage supprimés
- [ ] ErrorBoundary en place
- [ ] Notifications fonctionnelles
- [ ] Tests manuels effectués
- [ ] Documentation à jour

---

**Dernière mise à jour** : 2025-11-22  
**Version** : 3.0 (ErrorBoundary + Stabilisation UI)
