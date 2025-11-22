# VÉRIFICATION DE COHÉRENCE NUMÉROTATION RES-XXX

## État Actuel du Système

### Backend (Base de Données)

✅ **CONFORME** - La numérotation unifiée fonctionne correctement :

```sql
-- Résultats de vérification actuels:
course_id: b2b08562-... | course_number: RES-007 | quote_number: RES-007 | invoice_number: RES-007
course_id: 62040542-... | course_number: RES-008 | quote_number: RES-008 | invoice_number: RES-008
course_id: 45d8f293-... | course_number: RES-009 | quote_number: RES-009 | invoice_number: NULL (pas encore générée)
```

✅ Le même numéro RES-XXX est bien utilisé pour :
- `courses.course_number`
- `devis.quote_number`  
- `factures.invoice_number`

### Frontend (Affichage)

**Fichiers vérifiés pour cohérence d'affichage :**

#### Côté Driver

1. ✅ `src/components/CoursesList.tsx`
   - Affiche `devis.quote_number` dans les cartes de devis
   - Affiche `facture.invoice_number` dans les cartes de factures
   - PDFs utilisent les bons champs

2. ✅ `src/components/DevisList.tsx`
   - Affiche `devis.quote_number` correctement
   - Messages et notifications utilisent `quote_number`

#### Côté Client

1. ✅ `src/components/client/ClientCoursesList.tsx`
   - Affiche `course.course_number` dans les cartes de courses (ligne 539)
   - Affiche `devis.quote_number` dans les sections de devis (ligne 590)
   - Affiche `facture.invoice_number` dans les sections de factures (ligne 651)

2. ✅ `src/components/client/ClientDevisFactures.tsx`
   - Affiche `devis.quote_number` et `facture.invoice_number`

### Points de Vigilance

⚠️ **Champs Legacy à Surveiller:**

- `factures.invoice_number_generated` : Ce champ est encore utilisé dans certains affichages
  - **Action requise**: Vérifier si ce champ doit être supprimé ou fusionné avec `invoice_number`

### Recommandations pour Maintenir la Cohérence

1. **Affichage Systématique du Numéro**
   - Chaque carte de course/devis/facture doit afficher clairement son numéro RES-XXX
   - Le numéro doit être visible en première position
   - Format suggéré: "Réservation RES-007" ou "N° RES-007"

2. **Design Visuel Uniforme**
   ```tsx
   // Exemple de composant réutilisable
   <div className="flex items-center gap-2 mb-2">
     <Badge variant="secondary" className="font-mono">
       RES-{number}
     </Badge>
   </div>
   ```

3. **Messages et Notifications**
   - Toujours mentionner le numéro RES-XXX
   - Format: "Devis RES-007 accepté" / "Facture RES-007 disponible"

4. **PDFs**
   - Le numéro RES-XXX doit être la première information visible
   - Position: En haut, centré, taille de police importante

### Checklist de Validation

Avant toute modification du système de numérotation :

- [ ] Vérifier que `generate_reservation_number()` est appelé une seule fois
- [ ] Confirmer que `course.course_number` = `devis.quote_number`
- [ ] Confirmer que `facture.invoice_number` = `devis.quote_number`
- [ ] Tester l'affichage côté driver
- [ ] Tester l'affichage côté client
- [ ] Vérifier que les PDFs affichent le bon numéro
- [ ] Exécuter la requête SQL de vérification

### Requête SQL de Test

```sql
-- À exécuter régulièrement pour détecter les incohérences
SELECT 
  c.id,
  c.course_number,
  d.quote_number,
  f.invoice_number,
  CASE 
    WHEN c.course_number = d.quote_number 
         AND (f.invoice_number IS NULL OR f.invoice_number = d.quote_number)
    THEN '✅ COHÉRENT'
    ELSE '❌ INCOHÉRENT'
  END as status
FROM courses c
LEFT JOIN devis d ON d.course_id = c.id
LEFT JOIN factures f ON f.course_id = c.id
WHERE c.course_number IS NOT NULL
ORDER BY c.created_at DESC
LIMIT 20;
```

---

**Conclusion:** Le système backend est déjà cohérent et unifié. L'affichage frontend utilise les bons champs. La documentation garantit le maintien de cette cohérence à long terme.
