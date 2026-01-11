# SYSTÈME DE NUMÉROTATION PARTENAIRES (Solution A)

## Problème Résolu

Lorsqu'un chauffeur partage une course avec un partenaire, le conflit de numéro `RES-XXX` bloquait l'acceptation car le receiver avait potentiellement déjà le même numéro dans sa propre séquence.

**Erreur typique:** "Le numéro de course RES-004 existe déjà pour ce chauffeur"

## Solution Implémentée

### Principe: Numérotation Séparée par Contexte

| Contexte | Préfixe | Compteur | Exemple |
|----------|---------|----------|---------|
| Courses propres | `RES-` | `drivers.reservation_counter` | RES-001, RES-002 |
| Courses partenaires reçues | `PART-` | `drivers.partner_course_counter` | PART-001, PART-002 |

### Fonctionnement

1. **Sender (Expéditeur)**
   - Garde son numéro `RES-XXX` intact
   - La course `courses.driver_id` reste le sender
   - Le `course_number` ne change jamais

2. **Receiver (Destinataire)**
   - Reçoit un `partner_reference_number` unique (PART-XXX)
   - Ce numéro est stocké dans `shared_courses.partner_reference_number`
   - La course originale n'est PAS modifiée (driver_id reste le sender)
   - Le receiver voit la course via `shared_courses` avec son propre numéro

### Tables Modifiées

```sql
-- Colonnes ajoutées
ALTER TABLE drivers 
ADD COLUMN partner_course_counter INTEGER DEFAULT 0;

ALTER TABLE shared_courses 
ADD COLUMN partner_reference_number TEXT;

ALTER TABLE fleet_partner_courses 
ADD COLUMN partner_reference_number TEXT;
```

### Fonction de Génération

```sql
-- Génère PART-001, PART-002, etc. par chauffeur
SELECT generate_partner_reference_number('driver_id_uuid');
```

## Affichage dans l'Interface

### Côté Receiver (Courses Partenaires Reçues)
- **Numéro principal**: `PART-XXX` (en vert/primary)
- **Numéro original**: `RES-XXX` (en petit, gris, préfixé "Orig:")

### Côté Sender (Courses Envoyées)
- Affiche son numéro `RES-XXX` habituel
- Notification inclut le numéro partenaire du receiver

## Flux Complet

```
1. Sender crée course RES-007
2. Sender partage avec partenaire B
3. Partenaire B accepte
   → generate_partner_reference_number() → PART-003
   → shared_courses.partner_reference_number = 'PART-003'
   → courses.driver_id reste le Sender (PAS de modification)
4. Partenaire B voit "PART-003 (Orig: RES-007)"
5. Sender voit "RES-007 acceptée par partenaire (Ref: PART-003)"
```

## Vérification SQL

```sql
-- Vérifier les numéros partenaires générés
SELECT 
  sc.id,
  sc.partner_reference_number as receiver_ref,
  c.course_number as sender_ref,
  sender.reservation_counter as sender_counter,
  receiver.partner_course_counter as receiver_partner_counter
FROM shared_courses sc
JOIN courses c ON c.id = sc.course_id
JOIN drivers sender ON sender.id = sc.sender_driver_id
JOIN drivers receiver ON receiver.id = sc.receiver_driver_id
WHERE sc.status = 'accepted'
ORDER BY sc.accepted_at DESC;
```

## Avantages

1. **Isolation totale**: Chaque chauffeur a sa propre séquence isolée
2. **Pas de collision**: PART-XXX ne peut jamais entrer en conflit avec RES-XXX
3. **Traçabilité**: Le receiver voit son numéro ET le numéro original
4. **Rétrocompatibilité**: Les anciennes courses sans `partner_reference_number` continuent de fonctionner

## Points de Vigilance

⚠️ Les PDFs et exports pour le receiver doivent utiliser `partner_reference_number` comme référence principale

⚠️ Les paiements entre partenaires doivent référencer le bon numéro selon le contexte (sender vs receiver)
