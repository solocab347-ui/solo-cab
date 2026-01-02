# Architecture SoloCab - Documentation de Référence

## Vue d'ensemble

SoloCab est une plateforme de gestion VTC avec **isolation complète des données par chauffeur**. Chaque chauffeur opère dans son propre espace de données, avec ses propres clients, courses, devis et factures.

---

## 1. Structure des Rôles

### Rôles disponibles
| Rôle | Description |
|------|-------------|
| `admin` | Administrateur unique de la plateforme (réservé) |
| `driver` | Chauffeur VTC indépendant ou membre d'une flotte |
| `client` | Client particulier |
| `company` | Entreprise cliente |
| `fleet_manager` | Gestionnaire de flotte |

### Table `user_roles`
```sql
- id: UUID (PK)
- user_id: UUID (FK → auth.users)
- role: app_role (enum)
- created_at: timestamp
```

**Règle**: Un utilisateur peut avoir plusieurs rôles (ex: driver + client).

---

## 2. Système de Numérotation Unifié

### Principe
Chaque chauffeur possède **sa propre séquence de numérotation** commençant à RES-001. Le format `RES-XXX` est utilisé pour:
- Courses (`course_number`)
- Devis (`quote_number`)
- Factures (`invoice_number`)

### Compteur Atomique
```sql
-- Table drivers
reservation_counter: INTEGER -- Compteur séquentiel par chauffeur

-- Fonction atomique avec verrouillage
generate_reservation_number(_driver_id uuid) → 'RES-XXX'
```

### Garanties
1. **Verrouillage pessimiste** (FOR UPDATE NOWAIT) empêche les conflits
2. **Contraintes uniques** par (driver_id, number) sur chaque table
3. **Triggers de validation** vérifient avant insertion
4. **Backoff exponentiel** en cas de contention

### Fonctions de validation
```sql
-- Vérifier l'intégrité
SELECT * FROM validate_driver_numbering_integrity('driver-uuid');

-- Réparer si nécessaire
SELECT * FROM repair_driver_counter('driver-uuid');
```

---

## 3. Relations Principales

### Chauffeur → Clients
```
drivers (1) ──→ (N) clients
  └─ via driver_id (exclusif) ou driver_ids[] (multi-chauffeur)
```

**Types de clients**:
- **Exclusif** (`is_exclusive=true`): Lié à un seul chauffeur via QR code
- **Libre** (`is_exclusive=false`): Peut réserver chez plusieurs chauffeurs

### Chauffeur → Courses → Devis → Factures
```
drivers (1) ──→ (N) courses ──→ (1) devis ──→ (1) factures
              └─ client_id (nullable pour guest bookings)
```

### Flottes
```
fleet_managers (1) ──→ (N) fleet_manager_drivers ←── (1) drivers
                └─ (N) clients (clients de la flotte)
```

---

## 4. Isolation des Données

### RLS (Row Level Security)
Toutes les tables utilisent RLS pour garantir que:
- Un chauffeur ne voit que **ses propres données**
- Un client ne voit que **ses propres réservations**
- Aucune donnée croisée entre chauffeurs

### Fonctions SECURITY DEFINER
Les fonctions critiques utilisent `SECURITY DEFINER` avec `SET search_path TO 'public'` pour:
- Éviter les attaques par path hijacking
- Permettre des opérations cross-table sécurisées

---

## 5. Contraintes et Index Critiques

### Contraintes Uniques
| Table | Contrainte | Colonnes |
|-------|------------|----------|
| `courses` | `courses_driver_course_number_unique` | (driver_id, course_number) |
| `devis` | `devis_driver_quote_number_unique` | (driver_id, quote_number) |
| `factures` | `factures_driver_invoice_number_unique` | (driver_id, invoice_number) |
| `drivers` | `drivers_user_id_key` | (user_id) |
| `clients` | `clients_user_id_key` | (user_id) |

### Triggers de Protection
| Table | Trigger | Action |
|-------|---------|--------|
| `courses` | `validate_course_number_trigger` | Vérifie unicité avant INSERT/UPDATE |
| `devis` | `validate_quote_number_trigger` | Vérifie unicité avant INSERT/UPDATE |
| `factures` | `validate_invoice_number_trigger` | Vérifie unicité avant INSERT/UPDATE |

---

## 6. Processus Critiques

### Création d'une Course
1. Client ou chauffeur crée la course
2. `generate_reservation_number()` génère le numéro unique
3. Course créée avec `course_number = RES-XXX`

### Création d'un Devis
1. Edge function `create-devis-auto` appelée
2. Synchronise `reservation_counter` si nécessaire
3. Génère `quote_number` via `generate_reservation_number()`
4. Insère le devis

### Acceptation d'un Devis
1. Client appelle `accept_devis_safely()`
2. Verrouillage atomique du devis (FOR UPDATE NOWAIT)
3. Validation du client
4. Mise à jour du statut
5. Notification au chauffeur

### Génération de Facture
1. Course complétée
2. `generate_invoice_number()` génère le numéro
3. Facture créée avec le même numéro RES-XXX

---

## 7. Règles de Modification

### Avant toute modification
1. **Vérifier les dépendances**: Quelles tables/fonctions sont impactées?
2. **Tester sur un chauffeur isolé** avant déploiement global
3. **Utiliser les fonctions de validation** après modification:
   ```sql
   SELECT * FROM validate_driver_numbering_integrity('driver-id');
   ```

### Modifications à haut risque
- Changement de structure sur `drivers`, `courses`, `devis`, `factures`
- Modification des fonctions de génération de numéros
- Modification des RLS policies

### Checklist de sécurité
- [ ] Contraintes uniques préservées
- [ ] Triggers de validation fonctionnels
- [ ] RLS policies cohérentes
- [ ] Fonctions atomiques avec verrouillage

---

## 8. Monitoring et Santé

### Vérification quotidienne recommandée
```sql
-- Pour chaque chauffeur actif
SELECT d.id, v.* 
FROM drivers d
CROSS JOIN LATERAL validate_driver_numbering_integrity(d.id) v
WHERE d.status = 'validated';
```

### Indicateurs de santé
- `is_valid = true` pour tous les chauffeurs
- `current_counter >= max(course_num, quote_num, invoice_num)`
- Aucun doublon dans les contraintes uniques

---

## 9. Récupération d'Erreur

### Si un compteur est désynchronisé
```sql
SELECT * FROM repair_driver_counter('driver-id');
```

### Si un numéro est en doublon
1. Identifier les entrées en conflit
2. Supprimer ou renommer manuellement
3. Réparer le compteur

---

## 10. Scalabilité

Le système est conçu pour supporter **des milliers de chauffeurs** avec:
- Verrouillage par chauffeur (pas de contention globale)
- Index optimisés par driver_id
- Contraintes par chauffeur (pas de contrainte globale)
- Backoff exponentiel pour gérer les pics de charge

---

*Document généré le 2 janvier 2026 - Version 1.0*
