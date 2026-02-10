# Contraintes Techniques, Monitoring et Scalabilité

## Précision financière

**Règle absolue** : Toutes les données financières sont stockées sous forme d'**entiers en centimes**.

```typescript
// Affichage
const displayPrice = (cents: number) => (cents / 100).toFixed(2);

// Stockage
const storePrice = (euros: number) => Math.round(euros * 100);
```

S'applique à : prix, revenus, frais de gestion, parts partenaires, factures, devis, statistiques dashboard.

---

## Règles de modification

### Avant toute modification
1. Vérifier les dépendances : quelles tables/fonctions sont impactées ?
2. Tester sur un chauffeur isolé avant déploiement global
3. Utiliser les fonctions de validation après modification :
   ```sql
   SELECT * FROM validate_driver_numbering_integrity('driver-id');
   ```

### Modifications à haut risque
- Structure de `drivers`, `courses`, `devis`, `factures`
- Fonctions de génération de numéros
- RLS policies

### Checklist de sécurité
- [ ] Contraintes uniques préservées
- [ ] Triggers de validation fonctionnels
- [ ] RLS policies cohérentes
- [ ] Fonctions atomiques avec verrouillage

---

## Monitoring et santé

### Vérification recommandée
```sql
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

## Récupération d'erreur

### Compteur désynchronisé
```sql
SELECT * FROM repair_driver_counter('driver-id');
```

### Numéro en doublon
1. Identifier les entrées en conflit
2. Supprimer ou renommer manuellement
3. Réparer le compteur

---

## Scalabilité

Le système supporte **des milliers de chauffeurs** grâce à :
- Verrouillage par chauffeur (pas de contention globale)
- Index optimisés par `driver_id`
- Contraintes par chauffeur (pas de contrainte globale)
- Backoff exponentiel pour les pics de charge

---

## Limites techniques

- Requêtes Supabase : limite par défaut de **1000 lignes** par requête
- Vérifier cette limite avant de diagnostiquer des données manquantes

---

*Document mis à jour le 10 février 2026 - Version 2.0*
