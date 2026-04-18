

## Plan: Test E2E complet du tunnel `/chauffeurs` (Libre + Exclusif)

### Constat

État actuel de la base :
- Client de test `kanouteabdallah666@gmail.com` → **client libre** (`is_exclusive=false`), avec 2 favoris (dont Service Prestige).
- Aucun chauffeur n'a un GPS frais (<5min) → la RPC `find_nearby_drivers` renvoie 0 résultat ⇒ impossible d'aller au-delà de l'étape 2.
- Service Prestige : GPS = 2315s (~38min), donc trop ancien pour la fenêtre de 5min réservation et 30s immédiat.

### Objectif

Valider end-to-end les 2 parcours sans toucher au code applicatif :
1. **Client libre** (état actuel) → choix parmi favoris + chauffeurs proches.
2. **Client exclusif** → driver imposé, carrousel masqué, flow direct.

### Étapes

**1. Préparer un chauffeur testable (GPS frais)**
- `UPDATE drivers SET last_location_update = now(), last_seen_at = now(), current_latitude = 48.8566, current_longitude = 2.3522 WHERE id = 'd0f4960d-1f21-4844-8e91-4251c6ca106f'` (Service Prestige, déjà favori).
- Vérifier que `find_nearby_drivers` le retourne sur Paris.

**2. Test scénario A — Client libre**
- Login déjà actif dans le preview (`kanouteabdallah666`).
- Naviguer `/chauffeurs` → étape 1 (Trajet) avec adresses Paris.
- Étape 2 : vérifier Service Prestige visible avec badge favori + prix calculé serveur.
- Étape 3 : vérifier prix affiché upfront, **aucun dialog devis**, écran d'attente actif.

**3. Test scénario B — Client exclusif**
- `UPDATE clients SET is_exclusive = true, driver_id = 'd0f4960d-1f21-4844-8e91-4251c6ca106f' WHERE id = 'b73da690-...'`.
- Recharger `/chauffeurs` → vérifier :
  - Carrousel masqué.
  - Driver auto-sélectionné.
  - Flow direct vers confirmation.
- Restauration : `UPDATE clients SET is_exclusive = false, driver_id = NULL` après le test.

**4. Audit final**
- Vérifier l'absence de toute régression (pas de devis, pas d'ancien dialog `CourseCreatedInfoDialog`).
- Confirmer que le bouton "Sauvegarder cette adresse" et la bannière fréquente sont visibles.

### Aspects techniques

- Toutes les opérations DB sont des `UPDATE` ⇒ nécessitent des migrations Supabase (pas dispo en mode plan).
- L'automation navigateur passera par `browser--navigate_to_sandbox` puis `observe`/`act` séquentiels.
- Nettoyage : remettre `is_exclusive=false` à la fin pour ne pas polluer ton compte.

### Livrable

Un compte-rendu structuré : ce qui passe ✅ / ce qui bloque ⚠️ pour chacun des 2 scénarios, avec captures.

