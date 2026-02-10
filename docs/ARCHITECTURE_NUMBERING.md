# Système de Numérotation Unifié

## Principe

Chaque chauffeur possède **sa propre séquence de numérotation** commençant à RES-001. Le format `RES-XXX` est utilisé pour :
- Courses (`course_number`)
- Devis (`quote_number`)
- Factures (`invoice_number`)

---

## Compteur atomique

```sql
-- Table drivers
reservation_counter: INTEGER -- Compteur séquentiel par chauffeur

-- Fonction atomique avec verrouillage
generate_reservation_number(_driver_id uuid) → 'RES-XXX'
```

---

## Garanties

1. **Verrouillage pessimiste** (FOR UPDATE NOWAIT) empêche les conflits
2. **Contraintes uniques** par (driver_id, number) sur chaque table
3. **Triggers de validation** vérifient avant insertion
4. **Backoff exponentiel** en cas de contention

---

## Fonctions de validation

```sql
-- Vérifier l'intégrité
SELECT * FROM validate_driver_numbering_integrity('driver-uuid');

-- Réparer si nécessaire
SELECT * FROM repair_driver_counter('driver-uuid');
```

---

## Processus critiques

### Création d'une course
1. Client ou chauffeur crée la course
2. `generate_reservation_number()` génère le numéro unique
3. Course créée avec `course_number = RES-XXX`

### Création d'un devis
1. Edge function `create-devis-auto` appelée
2. Synchronise `reservation_counter` si nécessaire
3. Génère `quote_number` via `generate_reservation_number()`
4. Insère le devis (client_id nullable pour guest bookings)

### Acceptation d'un devis
1. Client appelle `accept_devis_safely()`
2. Verrouillage atomique du devis (FOR UPDATE NOWAIT)
3. Validation du client
4. Mise à jour du statut (courses client → `pending`, courses chauffeur → `accepted`)
5. Notification au chauffeur

### Génération de facture
1. Course complétée
2. `generate_invoice_number()` génère le numéro
3. Facture créée avec le même numéro RES-XXX
