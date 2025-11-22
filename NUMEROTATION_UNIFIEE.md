# SYSTÈME DE NUMÉROTATION UNIFIÉE SOLOCAB

## PRINCIPE FONDAMENTAL

**UNE COURSE = UN SEUL NUMÉRO RES-XXX PARTOUT**

Chaque course, son devis et sa facture partagent le MÊME numéro de réservation avec le préfixe `RES-` (Réservation).

## ARCHITECTURE DE NUMÉROTATION

### Génération du Numéro Unique

1. **À la création du devis automatique** (`create-devis-auto` Edge Function):
   - Appel à `generate_reservation_number(_driver_id)` 
   - Génère un numéro séquentiel unique par driver: `RES-001`, `RES-002`, etc.
   - Ce numéro est utilisé pour:
     - `courses.course_number` 
     - `devis.quote_number`
     - `factures.invoice_number` (hérité du devis)

### Flux de Numérotation

```
COURSE CRÉÉE
    ↓
DEVIS AUTO-GÉNÉRÉ → generate_reservation_number() → RES-007
    ↓                                                    ↓
courses.course_number = RES-007 ←──────────────────────┘
devis.quote_number = RES-007
    ↓
FACTURE GÉNÉRÉE (si course terminée)
    ↓
factures.invoice_number = RES-007 (copié depuis devis.quote_number)
```

## COHÉRENCE D'AFFICHAGE

### Règles d'Affichage Strictes

| Contexte | Champ à Afficher | Format |
|----------|-----------------|---------|
| Liste de courses | `course.course_number` | "Réservation RES-007" |
| Carte de devis | `devis.quote_number` | "Devis RES-007" |
| PDF de devis | `devis.quote_number` | "Référence: RES-007" |
| Carte de facture | `facture.invoice_number` | "Facture RES-007" |
| PDF de facture | `facture.invoice_number` | "N°: RES-007" |
| Notifications | Même numéro selon contexte | "Devis RES-007 accepté" |

### Composants Critiques

**Fichiers à maintenir cohérents :**

1. `src/components/CoursesList.tsx` (Driver)
   - Affichage: `devis.quote_number` et `facture.invoice_number`
   - PDF: `devis.quote_number` et `facture.invoice_number`

2. `src/components/client/ClientCoursesList.tsx` (Client)
   - Affichage: `course.course_number`, `devis.quote_number`, `facture.invoice_number`
   - PDF: `devis.quote_number` et `facture.invoice_number`

3. `src/components/DevisList.tsx` (Driver)
   - Affichage: `devis.quote_number`
   - PDF: `devis.quote_number`

4. `src/components/client/ClientDevisFactures.tsx` (Client)
   - Affichage: `devis.quote_number` et `facture.invoice_number`

## VALIDATION DE COHÉRENCE

### Vérification SQL

```sql
-- Cette requête DOIT toujours retourner des numéros identiques pour une même course
SELECT 
  c.id as course_id,
  c.course_number,
  d.quote_number,
  f.invoice_number
FROM courses c
LEFT JOIN devis d ON d.course_id = c.id
LEFT JOIN factures f ON f.course_id = c.id
WHERE c.course_number IS NOT NULL;

-- Résultat attendu (exemple):
-- course_number: RES-007, quote_number: RES-007, invoice_number: RES-007
```

### Tests de Non-Régression

1. ✅ Créer une course → Vérifier que `course_number` est RES-XXX
2. ✅ Devis auto-généré → Vérifier que `quote_number` = `course_number`
3. ✅ Client accepte → Numéro inchangé
4. ✅ Course terminée → Facture générée avec `invoice_number` = `quote_number`
5. ✅ Affichage client/driver → Même numéro visible partout

## INTERDICTIONS ABSOLUES

❌ **NE JAMAIS:**
- Générer un nouveau numéro pour la facture
- Utiliser des compteurs séparés pour devis/factures
- Afficher des numéros différents côté client vs driver
- Modifier le numéro après création
- Utiliser `invoice_number_generated` (champ legacy à supprimer)

## MESSAGES D'ERREUR

Si incohérence détectée :
```
❌ ERREUR CRITIQUE: Numéro de réservation incohérent
   Course: RES-007
   Devis: RES-008  ← PROBLÈME
   Facture: RES-007
```

## MAINTENANCE

**Avant tout changement dans le système de numérotation:**

1. Lire ce document en entier
2. Vérifier que la modification préserve l'unicité RES-XXX
3. Tester le flux complet : Course → Devis → Facture
4. Valider l'affichage côté client ET driver
5. Exécuter la requête SQL de validation

---

**Date de dernière mise à jour:** 2025-01-XX  
**Responsable:** Architecture SoloCab  
**Criticité:** 🔴 MAXIMALE - Le cœur du métier dépend de cette cohérence
