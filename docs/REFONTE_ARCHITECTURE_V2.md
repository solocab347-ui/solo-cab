# Refonte Architecture SoloCab v2.0

## Résumé des Améliorations

Cette refonte progressive adresse les problèmes de latence, bugs et fiabilité signalés en production.

---

## 1. Configuration Réseau Centralisée (`src/lib/networkConfig.ts`)

**Problème résolu**: Valeurs de timeout/retry éparpillées et incohérentes dans le code.

**Solution**: Un fichier unique définit toutes les constantes réseau:

| Paramètre | Valeur | Utilisation |
|-----------|--------|-------------|
| `TIMEOUTS.AUTH` | 15s | Authentification |
| `TIMEOUTS.QUERY` | 12s | Requêtes standards |
| `TIMEOUTS.CRITICAL` | 25s | Opérations critiques |
| `RETRY.MAX_ATTEMPTS` | 5 | Retry standard |
| `RETRY.MAX_ATTEMPTS_CRITICAL` | 7 | Retry opérations critiques |
| `CACHE.STANDARD_TTL` | 5 min | Cache données standard |

**Bénéfices**:
- Maintenance simplifiée (un seul endroit à modifier)
- Cohérence garantie dans toute l'application
- Valeurs adaptées aux réseaux mobiles lents

---

## 2. Hook de Requête Unifié (`src/hooks/useUnifiedQuery.ts`)

**Problème résolu**: Duplication entre React Query et hooks custom (useResilientQuery).

**Solution**: Un hook unique qui combine le meilleur des deux:

```tsx
const { data, isLoading, error, isRetrying, refetch } = useUnifiedQuery({
  queryKey: 'courses',
  queryFn: () => supabase.from('courses').select('*'),
  critical: true,  // Active plus de retries et timeout plus long
});
```

**Fonctionnalités**:
- ✅ Retry automatique avec backoff exponentiel (jusqu'à 5 tentatives)
- ✅ Cache multi-niveau avec TTL configurable
- ✅ Support offline avec fallback sur cache expiré
- ✅ État `isRetrying` visible pour l'UI
- ✅ Auto-refetch en arrière-plan après 30s d'échec
- ✅ Intégration Sentry pour les erreurs

---

## 3. Protection Anti-Double-Soumission Renforcée (`src/hooks/useSubmitProtectionV2.ts`)

**Problème résolu**: Créations multiples de courses/devis lors de double-clics.

**Solution**: Protection à 3 niveaux:

1. **Verrouillage local** (`isSubmittingRef`)
2. **Historique global** (partage entre composants)
3. **Timeout de sécurité** (libération après 60s max)

```tsx
const { protectedSubmit, isSubmitting, cooldownRemaining } = useSubmitProtection({
  critical: true,  // 10s de délai au lieu de 5s
});

// La clé unique détecte les doublons
const key = generateCourseSubmitKey({ pickupAddress, destinationAddress, scheduledDate });
await protectedSubmit(() => createCourse(data), key);
```

**Bénéfices**:
- Impossible de créer deux courses identiques en 5s
- Feedback utilisateur clair (cooldown restant)
- Mode critique pour les paiements (10s)

---

## 4. Gestionnaire d'Erreurs Amélioré (`src/lib/errorHandlerV2.ts`)

**Problème résolu**: Messages d'erreur incohérents et manque de contexte dans Sentry.

**Solution**: Gestionnaire centralisé avec classification automatique:

```tsx
// Simple wrapper
const result = await safeAsync(
  () => createCourse(data),
  'course-creation'
);

// Avec retry automatique
const data = await withRetry(
  () => fetchCriticalData(),
  { maxRetries: 5, context: 'fetch-profile' }
);

// Opération critique avec UI
await executeCriticalOperation(
  () => processPayment(amount),
  {
    context: 'payment',
    loadingMessage: 'Traitement en cours...',
    successMessage: 'Paiement effectué!',
  }
);
```

**Catégories d'erreurs**:
| Catégorie | Retryable | Message Utilisateur |
|-----------|-----------|---------------------|
| `network` | ✅ | "Problème de connexion..." |
| `timeout` | ✅ | "La requête a pris trop de temps..." |
| `auth` | ❌ | "Session expirée..." + bouton reconnexion |
| `validation` | ❌ | Message Zod ou personnalisé |
| `database` | ❌ | "Erreur serveur..." |

---

## 5. Intégration Continue

Les fichiers existants utilisent désormais la configuration centralisée:
- `queryClient.ts` → importe depuis `networkConfig.ts`
- `connectionOptimizer.ts` → importe depuis `networkConfig.ts`
- `main.tsx` → initialise le gestionnaire d'erreurs global

---

## Migration Recommandée

### Pour les nouveaux développements:

```tsx
// ❌ Ancien pattern
import { useResilientQuery } from '@/hooks/useResilientQuery';

// ✅ Nouveau pattern
import { useUnifiedQuery } from '@/hooks/useUnifiedQuery';
```

### Pour les formulaires:

```tsx
// ❌ Ancien pattern
import { useSubmitProtection } from '@/hooks/useSubmitProtection';

// ✅ Nouveau pattern  
import { useSubmitProtection } from '@/hooks/useSubmitProtectionV2';
```

### Pour la gestion d'erreurs:

```tsx
// ❌ Ancien pattern
try { ... } catch (e) { toast.error('Erreur'); }

// ✅ Nouveau pattern
import { safeAsync, withRetry } from '@/lib/errorHandlerV2';
const result = await safeAsync(() => operation(), 'context');
```

---

## Fichiers Créés/Modifiés

| Fichier | Action |
|---------|--------|
| `src/lib/networkConfig.ts` | ✨ Nouveau |
| `src/lib/unifiedQueryClient.ts` | ✨ Nouveau |
| `src/hooks/useUnifiedQuery.ts` | ✨ Nouveau |
| `src/hooks/useSubmitProtectionV2.ts` | ✨ Nouveau |
| `src/lib/errorHandlerV2.ts` | ✨ Nouveau |
| `src/lib/queryClient.ts` | 🔄 Modifié |
| `src/lib/connectionOptimizer.ts` | 🔄 Modifié |
| `src/main.tsx` | 🔄 Modifié |
