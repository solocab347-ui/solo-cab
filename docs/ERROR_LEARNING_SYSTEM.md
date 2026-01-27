# Système d'Apprentissage Intelligent des Erreurs

## Vue d'ensemble

SoloCab intègre un système d'apprentissage automatique qui détecte, analyse et corrige les erreurs de manière autonome. Ce système devient progressivement plus intelligent en apprenant des corrections manuelles.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                          │
├─────────────────────────────────────────────────────────────┤
│  useErrorLearning()  │  useErrorLogger()  │  useCriticalAlerts() │
└──────────┬───────────┴────────┬───────────┴────────┬────────┘
           │                    │                    │
           ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│              IntelligentErrorLearner (Service)              │
│  - Détection de patterns                                    │
│  - Gestion des règles                                       │
│  - Déclenchement auto-fix                                   │
│  - Création d'alertes                                       │
└──────────┬──────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│              Edge Function: error-intelligence               │
│  - Exécution des corrections                                 │
│  - Analyse des patterns                                      │
│  - Cycle d'apprentissage                                     │
└──────────┬──────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Base de données                           │
├─────────────────┬───────────────────┬───────────────────────┤
│ error_patterns  │ error_solutions   │ error_occurrences     │
│ error_alerts    │ manual_fixes      │ error_learning_rules  │
└─────────────────┴───────────────────┴───────────────────────┘
```

## Tables de données

### error_patterns
Stocke les patterns d'erreurs détectés automatiquement ou manuellement.
- `fingerprint`: Hash unique pour identifier les erreurs similaires
- `learning_confidence`: Score de 0 à 1 indiquant la fiabilité de l'auto-correction
- `consecutive_failures`: Compteur d'échecs consécutifs (désactive temporairement après 3)
- `cooldown_until`: Période de désactivation temporaire après échecs

### error_solutions
Solutions connues pour corriger les erreurs.
- `success_rate`: Taux de réussite calculé automatiquement
- `fix_function`: Nom de la fonction de correction à exécuter
- `rollback_query`: Query SQL pour annuler la correction si nécessaire

### error_occurrences
Historique de chaque occurrence d'erreur.
- `was_auto_fixed`: Indique si une correction automatique a été tentée
- `fix_successful`: Résultat de la correction
- `fix_duration_ms`: Temps d'exécution pour optimisation

### error_learning_rules
Règles d'apprentissage configurables.
- `trigger_condition`: Conditions JSON pour déclencher la règle
- `action_type`: Type d'action (auto_fix, alert, escalate, disable_feature, retry)
- `action_config`: Configuration spécifique à l'action

### error_alerts
Alertes générées automatiquement.
- `alert_type`: critical, warning, info, learning
- `auto_resolved`: Indique si l'alerte a été résolue automatiquement

### manual_fixes
Corrections manuelles enregistrées pour apprentissage.
- `fix_steps`: Étapes de correction en JSON
- `should_auto_fix`: Indique si cette correction peut être automatisée

## Flux d'apprentissage

### 1. Détection d'erreur
```typescript
import { errorLearner } from "@/lib/intelligentErrorLearner";

// Dans un catch block
try {
  await createCourse(data);
} catch (error) {
  await errorLearner.logError(error, {
    entityType: "course",
    entityId: courseId,
    context: { action: "creation" }
  });
}
```

### 2. Création automatique de pattern
Quand une erreur est loggée:
1. Un fingerprint est calculé (hash du message + contexte)
2. Si le fingerprint existe → incrémenter le compteur
3. Sinon → créer un nouveau pattern

### 3. Règles d'apprentissage
Les règles sont évaluées à chaque erreur:

```json
{
  "rule_code": "RETRY_NETWORK_ERRORS",
  "trigger_condition": {
    "error_contains": ["network", "fetch", "timeout"]
  },
  "action_type": "retry",
  "action_config": {
    "max_attempts": 3,
    "delay_ms": 1000
  }
}
```

### 4. Auto-correction
Quand `auto_fix_enabled = true` et qu'une solution existe:
1. Récupérer la solution avec le meilleur taux de succès
2. Exécuter via l'edge function `error-intelligence`
3. Logger le résultat et mettre à jour les statistiques
4. Ajuster la confiance (+0.1 si succès, -0.2 si échec)

### 5. Apprentissage manuel
```typescript
await errorLearner.learnFromManualFix(
  patternId,
  "Création manuelle de la facture manquante",
  {
    fixSteps: [
      { step: 1, description: "Vérifier le devis accepté" },
      { step: 2, description: "Générer le numéro de facture" },
      { step: 3, description: "Créer l'entrée en base" }
    ],
    shouldAutoFix: true // Activer l'auto-correction pour ce pattern
  }
);
```

## Utilisation dans les composants

### Hook useErrorLearning
```typescript
const { 
  metrics,      // Liste des patterns avec statistiques
  alerts,       // Alertes non résolues
  stats,        // Statistiques agrégées
  isLoading,    // État de chargement
  resolveAlert, // Résoudre une alerte
  toggleAutoFix,// Activer/désactiver auto-fix
  learnFromFix, // Enregistrer une correction manuelle
  runLearningCycle // Lancer une analyse complète
} = useErrorLearning();
```

### Hook useErrorLogger
```typescript
const { logError } = useErrorLogger();

// Dans un handler
const handleSubmit = async () => {
  try {
    await submitData();
  } catch (error) {
    logError(error, {
      entityType: "form",
      entityId: formId,
      additionalContext: { formData }
    });
    toast.error("Erreur lors de la soumission");
  }
};
```

### Hook useCriticalAlerts
```typescript
const { alerts, hasAlerts, dismissAlert, acknowledgeAlert } = useCriticalAlerts();

// Afficher un banner si alertes critiques
{hasAlerts && (
  <AlertBanner 
    alerts={alerts} 
    onDismiss={dismissAlert}
    onAcknowledge={acknowledgeAlert}
  />
)}
```

## Dashboard Admin

Le composant `ErrorLearningDashboard` fournit:
- Vue d'ensemble des statistiques
- Liste des patterns avec contrôle auto-fix
- Gestion des alertes
- Bouton pour lancer un cycle d'apprentissage

## Cycle d'apprentissage

L'edge function `error-intelligence` avec action `run_learning_cycle`:
1. Analyse les erreurs non classifiées des 24h
2. Crée des patterns pour les erreurs récurrentes (≥3 occurrences)
3. Recalcule les taux de succès des solutions
4. Désactive l'auto-fix après 5 échecs consécutifs
5. Active l'auto-fix quand confiance > 85%
6. Crée des alertes pour patterns problématiques

## Configuration des règles par défaut

| Code | Action | Description |
|------|--------|-------------|
| RETRY_NETWORK_ERRORS | retry | Réessaie 3 fois les erreurs réseau |
| ALERT_CRITICAL_5X | alert | Alerte après 5 erreurs critiques |
| AUTO_FIX_MISSING_INVOICE | auto_fix | Crée les factures manquantes |
| DISABLE_ON_FAILURE | disable_feature | Désactive après 10 échecs |
| ESCALATE_PAYMENT_ERRORS | escalate | Alerte immédiate pour paiements |

## Sécurité

- Toutes les tables ont RLS activé
- Seuls les admins peuvent accéder aux données
- Les corrections sont exécutées via service_role dans l'edge function
- Les actions sensibles sont loggées dans `auto_fix_logs`

## Métriques clés

- **learning_confidence**: Fiabilité de l'auto-correction (0-1)
- **success_rate**: Taux de réussite des solutions
- **occurrences_count**: Fréquence du pattern
- **consecutive_failures**: Échecs récents (trigger de désactivation)
- **avg_fix_duration_ms**: Performance de correction

## Bonnes pratiques

1. **Toujours logger avec contexte**: Plus de contexte = meilleur apprentissage
2. **Utiliser entityType et entityId**: Permet de tracer les erreurs par entité
3. **Décrire les corrections manuelles**: Enrichit la base de connaissances
4. **Surveiller les alertes critiques**: Indicateur de problèmes systémiques
5. **Lancer des cycles réguliers**: Améliore l'apprentissage continu
