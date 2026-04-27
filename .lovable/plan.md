## Contexte — ce qui existe déjà

L'écosystème objectifs SoloCab est riche mais fragmenté. Audit :

**Tables BDD**
- `driver_objectives` : cibles par période (revenue, courses, hours, km, qr_scans, cards_proposed, direct_clients, independence_pct)
- `drivers.objectives_data` (JSONB) : config de référence avec un schéma précis (`target_monthly_revenue`, `target_weekly_revenue`, `target_direct_clients`, `target_monthly_courses`, `target_monthly_km`, `work_hours_per_day`, `work_days_per_week`, `selected_work_days`, `platform_percentage`, `solocab_percentage`, `daily_targets`, `estimated_hourly_target`)
- `driver_platforms` : Uber/Bolt/Heetch/etc. saisies par le chauffeur
- `driver_daily_entries` : suivi quotidien (CA + courses + km + heures + scans QR + cartes proposées) par plateforme ET pour SoloCab

**Composants en place**
- `OnboardingObjectivesStep` (tunnel d'inscription) : choisit un *profil de motivation* mais n'écrit PAS les chiffres dans `objectives_data`
- `ObjectivesEditor` / `InlineObjectivesEditor` (réglages dashboard) : éditent `objectives_data` avec le schéma complet et propagent vers `driver_objectives` (4 périodes)
- `AcquisitionTargetsQuickEdit` : édite les 4 cibles d'acquisition
- `PlatformsManager` + `QuickPlatformEntry` : ajout plateformes + saisie quotidienne
- `IndependenceFunnel` : visualise Courses → Propositions → Scans → Inscrits → Fidèles
- `DashboardObjectivesWidget`, `MonthlyAcquisitionRecap`, `ObjectivesHistory` : suivi temps réel
- `useDriverObjectives` : auto-seed des `driver_objectives` à partir de `objectives_data` SI `target_monthly_revenue` est présent

**Problème de continuité identifié**
Mon `ObjectivesGoalsFunnel` actuel écrit `objectives_data: { revenue_monthly, courses_per_week, hours_per_week, qr_clients_per_month }` — clés inconnues du reste du système. Conséquence : l'auto-seed ne déclenche pas, les éditeurs lisent du vide, le suivi ne s'aligne pas.

## Plan d'action

### 1. Refonte du `ObjectivesGoalsFunnel` (7 étapes)

Aligner le funnel sur le schéma existant et y intégrer plateformes externes, dépenses et libération.

```text
Étape 1  Intro            Valeurs SoloCab + promesse "indépendance"
Étape 2  Revenu           target_monthly_revenue + estimation hebdo/horaire
Étape 3  Activité         target_monthly_courses + target_monthly_km
Étape 4  Planning         work_hours_per_day + selected_work_days
Étape 5  Plateformes      Sélection Uber/Bolt/Heetch/... + estimation %
                          actuel sur plateformes (-> platform_percentage)
Étape 6  Dépenses         Dépenses mensuelles estimées (carburant,
                          assurance, loyer véhicule, entretien, etc.)
                          → calcul revenu net visé
Étape 7  Libération       Cibles d'acquisition (cartes/QR/clients directs)
                          + objectif % indépendance + récap final
```

### 2. Schéma `objectives_data` unifié

Écrire dans `objectives_data` exactement les clés attendues par `ObjectivesEditor` + ajouts dépenses :

```ts
{
  // Revenu (compat éditeur)
  target_monthly_revenue, target_weekly_revenue,
  target_monthly_courses, target_monthly_km,
  // Planning (compat éditeur)
  work_hours_per_day, work_days_per_week,
  selected_work_days, daily_targets, estimated_hourly_target,
  // Mix plateformes (compat éditeur)
  platform_percentage, solocab_percentage,
  current_monthly_revenue, current_direct_clients,
  // Acquisition (compat AcquisitionTargetsQuickEdit)
  target_direct_clients,
  // NOUVEAU — dépenses
  monthly_expenses: {
    fuel, insurance, vehicle_lease, maintenance,
    licenses, accountant, other, total
  },
  target_net_revenue, // revenu - dépenses - frais SoloCab
  // Audit
  goals_completed_at, source: 'goals_funnel_v2'
}
```

### 3. Propagation vers `driver_objectives` + `driver_platforms`

Dans la même transaction de validation finale :
- Upsert 4 lignes `driver_objectives` (daily/weekly/monthly/yearly) avec les multiplicateurs déjà utilisés par `ObjectivesEditor` (revenue, courses, hours, km, new_clients, qr_scans_target, cards_proposed_target, direct_clients_target, independence_percentage_target)
- Upsert `driver_work_schedules` (7 lignes, jours travaillés selon selected_work_days)
- Upsert les `driver_platforms` sélectionnées (réutilise `addPlatform` du hook)
- Marquer `drivers.objectives_completed = true` + `onboarding_objectives_completed = true`

### 4. Continuité — vérifications

- L'`ObjectivesEditor` du dashboard lit `objectives_data` → toutes les valeurs préremplies après le funnel
- Le hook `useDriverObjectives` a déjà l'auto-seed sur `target_monthly_revenue` → on lui fournit la clé attendue
- `AcquisitionTargetsQuickEdit` lit directement `driver_objectives` → on aura écrit `qr_scans_target`/`cards_proposed_target`/`direct_clients_target`
- Le `DailyEntryForm` propose les plateformes du `driver_platforms` → seedées au funnel
- `IndependenceFunnel` agrège entries vs targets → cohérent dès le 1er jour
- Le `MonthlyAcquisitionRecap` se base sur les snapshots d'objectifs → trigger `trg_snapshot_driver_objectives` déjà en place

### 5. Étape "Dépenses" (nouvelle, locale au funnel)

Sliders pour 6 postes types VTC France (références Solocab) :
- Carburant : 400-1200 €/mois
- Assurance pro VTC : 80-200 €/mois
- Location/leasing véhicule : 0-900 €/mois
- Entretien : 50-200 €/mois
- Licence/redevances : 30-80 €/mois
- Comptable + autres : 50-200 €/mois

Affiche en direct :
- Total dépenses mensuelles
- Frais SoloCab estimés (courses × 0,50 €)
- **Revenu net visé** = revenu cible − dépenses − frais SoloCab
- % de marge nette

Stocké dans `objectives_data.monthly_expenses` (pas de nouvelle table — léger, modifiable depuis l'éditeur plus tard si demandé).

### 6. Étape "Libération" (acquisition + indépendance)

Sliders pour les 4 cibles d'acquisition mensuelles avec explications SoloCab :
- Cartes proposées (`cards_proposed_target`) — défaut 60
- Scans QR (`qr_scans_target`) — défaut 30
- Clients directs convertis (`direct_clients_target`) — défaut 8
- % d'indépendance visé (`independence_percentage_target`) — défaut 30 %

Réutilise visuellement le funnel d'indépendance (Courses → Cartes → Scans → Inscrits → Fidèles) à titre pédagogique.

## Ce qu'il faut changer

| Fichier | Action |
|---|---|
| `src/components/driver/objectives/ObjectivesGoalsFunnel.tsx` | Refonte complète : 7 étapes, schéma `objectives_data` unifié, persistance plateformes/horaires/objectifs |
| `src/pages/DriverDashboard.tsx` | Aucun changement (intégration déjà en place) |
| Aucune migration BDD nécessaire | Toutes les colonnes existent déjà |

## Hors scope (pour rester focus)

- Pas de table `driver_expenses` dédiée (les dépenses fines vivront dans `objectives_data.monthly_expenses`, suffisant pour la cible "objectif")
- Pas de modification de `OnboardingObjectivesStep` (reste l'étape "vision") — le funnel post-inscription prend le relais sur les chiffres
- Pas de changement de l'`ObjectivesEditor` (déjà compatible)

## Résultat attendu

Après le funnel :
1. `objectives_data` contient toutes les clés attendues par l'éditeur dashboard
2. `driver_objectives` contient 4 lignes alignées (daily/weekly/monthly/yearly) avec cibles complètes incluant acquisition
3. `driver_platforms` contient les plateformes externes du chauffeur
4. `driver_work_schedules` contient les jours travaillés
5. Le suivi quotidien (`DailyEntryForm`), l'`IndependenceFunnel`, le `DashboardObjectivesWidget` et le `MonthlyAcquisitionRecap` affichent immédiatement la progression cohérente
