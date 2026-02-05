 # 📋 RAPPORT COMPLET - PARCOURS CHAUFFEUR SOLOCAB
 **Date de génération:** 5 Février 2026
 **Version:** 2.0
 **Objectif:** Documentation exhaustive du parcours chauffeur pour audit et amélioration
 
 ---
 
 ## 📑 TABLE DES MATIÈRES
 
 1. [Vue d'ensemble](#1-vue-densemble)
 2. [Phase 1: Inscription et Authentification](#2-phase-1-inscription-et-authentification)
 3. [Phase 2: Tunnel d'Onboarding (8 étapes)](#3-phase-2-tunnel-donboarding-8-étapes)
 4. [Phase 3: Définition des Objectifs](#4-phase-3-définition-des-objectifs)
 5. [Phase 4: Suivi Quotidien](#5-phase-4-suivi-quotidien)
 6. [Phase 5: Rapports Automatisés](#6-phase-5-rapports-automatisés)
 7. [Architecture Technique](#7-architecture-technique)
 8. [Points d'Amélioration Identifiés](#8-points-damélioration-identifiés)
 9. [Recommandations](#9-recommandations)
 
 ---
 
 ## 1. VUE D'ENSEMBLE
 
 ### 1.1 Flux Principal
 
 ```
 INSCRIPTION → VALIDATION ADMIN → ONBOARDING (8 étapes) → OBJECTIFS → SUIVI QUOTIDIEN → RAPPORTS
 ```
 
 ### 1.2 Statuts Chauffeur
 
 | Statut | Description | Actions Possibles |
 |--------|-------------|-------------------|
 | `pending` | Inscription soumise, en attente de validation | Aucune - Attente |
 | `validated` | Validé par admin, peut commencer onboarding | Accès tunnel onboarding |
 | `active` | Onboarding terminé, pleinement opérationnel | Toutes fonctionnalités |
 | `suspended` | Compte suspendu par admin | Aucune |
 | `rejected` | Inscription refusée | Peut re-soumettre |
 
 ### 1.3 Fichiers Clés
 
 | Fichier | Rôle |
 |---------|------|
 | `src/pages/Auth.tsx` | Page d'inscription/connexion |
 | `src/components/driver/onboarding/HorizontalOnboardingTunnel.tsx` | Contrôleur principal onboarding |
 | `src/components/driver/onboarding/OnboardingGoalsStep.tsx` | Définition objectifs + planning |
 | `src/components/driver/objectives/ObjectivesDashboard.tsx` | Dashboard suivi objectifs |
 | `src/components/driver/objectives/DailyActivityInput.tsx` | Saisie activité quotidienne |
 | `src/components/driver/objectives/ObjectivesEditor.tsx` | Modification objectifs post-onboarding |
 | `supabase/functions/send-daily-report/index.ts` | Edge Function rapports quotidiens |
 
 ---
 
 ## 2. PHASE 1: INSCRIPTION ET AUTHENTIFICATION
 
 ### 2.1 Processus d'Inscription
 
 **Fichier:** `src/pages/Auth.tsx`
 
 #### Données Collectées à l'Inscription
 
 ```typescript
 {
   // Obligatoires
   email: string,
   password: string,
   first_name: string,
   last_name: string,
   phone: string,
   
   // Optionnels (complétés après)
   address: string,
   city: string,
   postal_code: string
 }
 ```
 
 #### Triggers Automatiques à l'Inscription
 
 1. **Création Profil** (`profiles` table)
    - `id` = `auth.uid()`
    - `email`, `first_name`, `last_name`, `phone`
 
 2. **Attribution Rôle** (`user_roles` table)
    - `role` = `'driver'`
 
 3. **Création Entrée Chauffeur** (`drivers` table)
    - `user_id` = `auth.uid()`
    - `status` = `'pending'`
    - `onboarding_completed` = `false`
    - `current_onboarding_step` = `0`
 
 ### 2.2 Validation Email
 
 - **Statut actuel:** Email de confirmation ACTIVÉ
 - L'utilisateur doit valider son email avant de pouvoir se connecter
 - Template email personnalisé disponible
 
 ### 2.3 Validation Admin
 
 **Fichier:** `src/components/admin/DriversValidation.tsx`
 
 #### Critères de Validation
 
 L'admin vérifie:
 - Informations personnelles (nom, prénom, téléphone)
 - Numéro de licence VTC
 - Informations véhicule
 - Informations société (SIRET, TVA)
 - Tarification proposée
 
 #### Actions Admin
 
 | Action | Résultat | Notification |
 |--------|----------|--------------|
 | Valider | `status` → `validated` | Email de bienvenue + accès onboarding |
 | Rejeter | `status` → `rejected` | Email avec motif de rejet |
 
 ---
 
 ## 3. PHASE 2: TUNNEL D'ONBOARDING (8 ÉTAPES)
 
 ### 3.1 Architecture du Tunnel
 
 **Fichier Principal:** `src/components/driver/onboarding/HorizontalOnboardingTunnel.tsx`
 
 #### Persistance de la Progression
 
 ```typescript
 // Sauvegardé dans drivers.current_onboarding_step
 const [currentStep, setCurrentStep] = useState(driver?.current_onboarding_step || 0);
 
 // À chaque changement d'étape
 await supabase
   .from('drivers')
   .update({ current_onboarding_step: newStep })
   .eq('id', driverId);
 ```
 
 ### 3.2 Détail des 8 Étapes
 
 #### ÉTAPE 0: Vision SoloCab
 **Fichier:** `OnboardingVisionStep.tsx`
 **Durée estimée:** 1-2 minutes
 
 **Contenu:**
 - Présentation de la philosophie SoloCab
 - Avantages de l'indépendance
 - Objectifs de la plateforme
 
 **Validation:** Simple lecture → Bouton "Suivant"
 
 ---
 
 #### ÉTAPE 1: Définition des Objectifs ⭐ (CRITIQUE)
 **Fichier:** `OnboardingGoalsStep.tsx`
 **Durée estimée:** 5-10 minutes
 
 **Données Collectées:**
 
 ```typescript
 interface ObjectivesData {
   // Objectifs financiers
   monthlyRevenue: number;          // CA mensuel cible (€)
   targetClients: number;           // Nombre de clients fidèles visés
   independenceRatio: number;       // % revenus hors plateformes (0-100)
   
   // Planning hebdomadaire
   weeklyPlanning: {
     day: string;                   // 'lundi', 'mardi', etc.
     isWorking: boolean;            // Jour travaillé ?
     weight: number;                // Coefficient (0.5 - 1.5)
     targetHours: number;           // Heures prévues
     targetRevenue: number;         // CA cible jour (calculé)
   }[];
   
   // Coaching
   coachingLevel: 'light' | 'moderate' | 'intensive';
 }
 ```
 
 **Logique de Pondération Journalière:**
 
 ```typescript
 const DAY_WEIGHTS = {
   'lundi': 0.7,      // Jour calme
   'mardi': 0.85,
   'mercredi': 0.9,
   'jeudi': 1.0,
   'vendredi': 1.15,  // Jour fort
   'samedi': 1.2,     // Jour très fort
   'dimanche': 1.2    // Jour très fort
 };
 
 // Calcul CA quotidien
 const dailyTarget = (weeklyGoal * dayWeight) / totalWeeklyWeight;
 ```
 
 **Coach Alex (IA):**
 - Analyse en temps réel des objectifs saisis
 - Alertes si objectifs irréalistes
 - Suggestions personnalisées basées sur le marché
 
 **Persistance:**
 ```typescript
 // Sauvegardé dans drivers.objectives_data (JSONB)
 await supabase
   .from('drivers')
   .update({ objectives_data: objectivesData })
   .eq('id', driverId);
 ```
 
 ---
 
 #### ÉTAPE 2: Configuration Tarification
 **Fichier:** `OnboardingPricingStep.tsx`
 **Durée estimée:** 3-5 minutes
 
 **Données Collectées:**
 
 ```typescript
 {
   base_fare: number;           // Prix de prise en charge (€)
   per_km_rate: number;         // Prix au kilomètre (€)
   hourly_rate: number;         // Prix horaire (€)
   minimum_price: number;       // Prix minimum course (€)
   
   // Majorations
   evening_surcharge: number;   // % majoration soirée (19h-7h)
   weekend_surcharge: number;   // % majoration weekend
   airport_surcharge: number;   // Forfait aéroport (€)
   
   // TVA
   tva_rate: number;            // 10% ou 20%
   tva_included: boolean;       // Prix TTC ou HT
 }
 ```
 
 ---
 
 #### ÉTAPE 3: Profil Public
 **Fichier:** `OnboardingProfileStep.tsx`
 **Durée estimée:** 5-10 minutes
 
 **Données Collectées:**
 
 ```typescript
 {
   // Informations publiques
   public_name: string;              // Nom affiché
   bio: string;                      // Description service
   profile_image_url: string;        // Photo profil
   
   // Localisation
   sectors: string[];                // Secteurs desservis
   city: string;                     // Ville principale
   
   // Véhicule
   vehicle_brand: string;
   vehicle_model: string;
   vehicle_year: number;
   vehicle_image_url: string;
   
   // Services
   services_offered: string[];       // ['aeroport', 'business', 'evenements', ...]
   languages: string[];              // Langues parlées
   
   // Visibilité
   is_public_profile: boolean;       // Visible sur vitrine ?
 }
 ```
 
 ---
 
 #### ÉTAPE 4: Upload Documents
 **Fichier:** `OnboardingDocumentsStep.tsx`
 **Durée estimée:** 10-15 minutes
 
 **Documents Requis (9):**
 
 | Document | Obligatoire | Format | Taille Max |
 |----------|-------------|--------|------------|
 | Carte VTC (recto) | ✅ | JPG/PNG/PDF | 5 MB |
 | Carte VTC (verso) | ✅ | JPG/PNG/PDF | 5 MB |
 | Pièce d'identité (recto) | ✅ | JPG/PNG/PDF | 5 MB |
 | Pièce d'identité (verso) | ✅ | JPG/PNG/PDF | 5 MB |
 | Permis de conduire | ✅ | JPG/PNG/PDF | 5 MB |
 | Carte grise | ✅ | JPG/PNG/PDF | 5 MB |
 | Attestation assurance | ✅ | JPG/PNG/PDF | 5 MB |
 | KBIS / INSEE | ✅ | PDF | 5 MB |
 | RIB | ✅ | PDF | 5 MB |
 
 **Stockage:** Supabase Storage bucket `driver-documents`
 
 **Structure:**
 ```
 driver-documents/
 └── {driver_id}/
     ├── vtc_card_front.jpg
     ├── vtc_card_back.jpg
     ├── id_front.jpg
     ├── id_back.jpg
     ├── driving_license.jpg
     ├── vehicle_registration.jpg
     ├── insurance.pdf
     ├── kbis.pdf
     └── rib.pdf
 ```
 
 ---
 
 #### ÉTAPE 5: Plaque NFC
 **Fichier:** `OnboardingNfcStep.tsx`
 **Durée estimée:** 2-3 minutes
 
 **Options:**
 1. Commander une plaque NFC SoloCab
 2. Utiliser QR Code en attendant
 3. Passer cette étape
 
 **Données:**
 ```typescript
 {
   nfc_plate_ordered: boolean;
   nfc_plate_id: string | null;
   nfc_shipping_address: string | null;
 }
 ```
 
 ---
 
 #### ÉTAPE 6: Configuration Paiement
 **Fichier:** `OnboardingBillingStep.tsx`
 **Durée estimée:** 10-20 minutes
 
 **Options de Paiement:**
 
 | Méthode | Description | Frais |
 |---------|-------------|-------|
 | Stripe Connect | Paiement CB en ligne | 0.50€ + ~1.5% |
 | SumUp | Terminal physique | Variable |
 | Espèces | Paiement direct | 0% |
 | Virement | Sur facture | 0% |
 
 **Flux Stripe Connect:**
 1. Clic sur "Connecter Stripe"
 2. Appel Edge Function `stripe-connect-onboarding`
 3. Redirection vers Stripe
 4. Création compte, vérification identité, ajout RIB
 5. Retour SoloCab avec `stripe_account_id`
 
 **Données Persistées:**
 ```typescript
 {
   stripe_account_id: string;           // acct_xxx
   stripe_onboarding_complete: boolean;
   stripe_charges_enabled: boolean;
   stripe_payouts_enabled: boolean;
   
   sumup_merchant_id: string | null;
   
   accepted_payment_methods: string[];  // ['card', 'cash', 'transfer']
 }
 ```
 
 ---
 
 #### ÉTAPE 7: Lancement Essai
 **Fichier:** `OnboardingTrialStep.tsx`
 **Durée estimée:** 2-3 minutes
 
 **Contenu:**
 - Récapitulatif de la configuration
 - Explication période d'essai (30 jours)
 - Activation du compte
 
 **Actions Finales:**
 ```typescript
 await supabase
   .from('drivers')
   .update({
     status: 'active',
     onboarding_completed: true,
     onboarding_completed_at: new Date().toISOString(),
     trial_ends_at: addDays(new Date(), 30).toISOString()
   })
   .eq('id', driverId);
 ```
 
 ---
 
 ## 4. PHASE 3: DÉFINITION DES OBJECTIFS
 
 ### 4.1 Structure des Objectifs
 
 **Table:** `driver_objectives`
 
 ```typescript
 interface DriverObjective {
   id: string;
   driver_id: string;
   period_type: 'daily' | 'weekly' | 'monthly' | 'yearly';
   
   // Cibles
   revenue_target: number;        // CA cible
   courses_target: number;        // Nombre courses
   new_clients_target: number;    // Nouveaux clients
   hours_target: number;          // Heures travaillées
   km_target: number;             // Kilomètres
   rating_target: number;         // Note moyenne
   
   is_active: boolean;
   created_at: string;
   updated_at: string;
 }
 ```
 
 ### 4.2 Planning Hebdomadaire
 
 **Table:** `driver_work_schedules`
 
 ```typescript
 interface DriverWorkSchedule {
   id: string;
   driver_id: string;
   day_of_week: number;           // 0 = Dimanche, 1 = Lundi, ...
   
   is_working_day: boolean;
   start_time: string | null;     // '08:00'
   end_time: string | null;       // '20:00'
   break_start: string | null;    // '12:00'
   break_end: string | null;      // '13:00'
   
   // Objectifs du jour
   target_hours: number;
   target_revenue: number;
   target_courses: number;
   target_clients: number;
   
   notes: string | null;
 }
 ```
 
 ### 4.3 Modification Post-Onboarding
 
 **Fichier:** `src/components/driver/objectives/ObjectivesEditor.tsx`
 
 **Sections Modifiables Indépendamment:**
 
 1. **CA Mensuel** - Modifier l'objectif de revenus
 2. **Clients Cibles** - Modifier le nombre de clients fidèles
 3. **Ratio d'Indépendance** - % SoloCab vs Plateformes
 4. **Planning** - Jours travaillés et pondération
 5. **Niveau Coaching** - Intensité des notifications
 
 **Principe:** Chaque section est modifiable sans réinitialiser les autres données.
 
 ---
 
 ## 5. PHASE 4: SUIVI QUOTIDIEN
 
 ### 5.1 Saisie d'Activité
 
 **Fichier:** `src/components/driver/objectives/DailyActivityInput.tsx`
 
 #### Sources de Données
 
 | Source | Type | Données |
 |--------|------|---------|
 | SoloCab | Automatique | CA, courses, clients, km |
 | Plateformes | Manuel | CA externe (Uber, Bolt, etc.) |
 | Travail | Manuel | Heures travaillées, km parcourus |
 
 #### Synchronisation Automatique SoloCab
 
 ```typescript
 // Récupération auto des courses du jour
 const { data: courses } = await supabase
   .from('courses')
   .select('*')
   .eq('driver_id', driverId)
   .eq('status', 'completed')
   .gte('created_at', startOfDay)
   .lte('created_at', endOfDay);
 
 const soloCabStats = {
   revenue: courses.reduce((sum, c) => sum + (c.final_price || c.price || 0), 0),
   coursesCount: courses.length,
   kmDriven: courses.reduce((sum, c) => sum + (c.distance_km || 0), 0),
   newClients: countNewClients(courses)
 };
 ```
 
 #### Saisie Manuelle Plateformes
 
 ```typescript
 interface PlatformEntry {
   platform_name: string;         // 'Uber', 'Bolt', 'Heetch', etc.
   revenue: number;               // CA de la journée
   courses_count: number;         // Nombre de courses
   hours_worked: number;          // Heures sur cette plateforme
 }
 ```
 
 ### 5.2 Table des Entrées Quotidiennes
 
 **Table:** `driver_daily_entries`
 
 ```typescript
 interface DriverDailyEntry {
   id: string;
   driver_id: string;
   entry_date: string;            // Date du jour (YYYY-MM-DD)
   
   // Identifiant source
   platform_id: string | null;    // NULL = SoloCab
   is_solocab: boolean;
   
   // Métriques
   revenue: number;
   courses_count: number;
   new_clients_count: number;
   hours_worked: number;
   km_driven: number;
   
   notes: string | null;
   
   created_at: string;
   updated_at: string;
 }
 ```
 
 ### 5.3 Calcul des Totaux
 
 ```typescript
 // Total journée = SoloCab + Toutes Plateformes
 const dailyTotal = {
   revenue: soloCabRevenue + platformsRevenue.reduce((a, b) => a + b, 0),
   courses: soloCabCourses + platformsCourses.reduce((a, b) => a + b, 0),
   hours: totalHoursWorked,
   km: soloCabKm + manualKm
 };
 
 // Comparaison avec objectif du jour
 const dailyTarget = getWeightedDailyTarget(dayOfWeek, monthlyGoal);
 const progressPercent = (dailyTotal.revenue / dailyTarget) * 100;
 ```
 
 ---
 
 ## 6. PHASE 5: RAPPORTS AUTOMATISÉS
 
 ### 6.1 Rapport Quotidien
 
 **Edge Function:** `supabase/functions/send-daily-report/index.ts`
 
 **Déclencheur:** CRON Job à 7h00 (Paris)
 
 ```sql
 -- Migration CRON
 SELECT cron.schedule(
   'send-daily-reports',
   '0 6 * * *',  -- 6h UTC = 7h Paris
   $$
   SELECT net.http_post(
     url := 'https://iyothopplhbwcfrpxryc.supabase.co/functions/v1/send-daily-report',
     headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb
   )
   $$
 );
 ```
 
 #### Contenu du Rapport
 
 ```typescript
 interface DailyReport {
   driver_id: string;
   report_date: string;           // Date du jour précédent
   
   // Résumé activité
   total_revenue: number;
   solocab_revenue: number;
   platforms_revenue: number;
   
   total_courses: number;
   new_clients: number;
   hours_worked: number;
   km_driven: number;
   
   // Comparaison objectifs
   daily_target: number;
   achievement_percent: number;
   
   // Analyse
   independence_ratio: number;    // % SoloCab vs Total
   hourly_rate_effective: number; // CA / Heures
   km_rate_effective: number;     // CA / Km
   
   // Coaching
   coaching_message: string;
   coaching_type: 'motivation' | 'alert' | 'suggestion' | 'milestone';
 }
 ```
 
 #### Logique de Coaching
 
 ```typescript
 function generateCoachingMessage(report: DailyReport): string {
   if (report.achievement_percent >= 120) {
     return "🎉 Excellente journée ! Tu as dépassé ton objectif de 20%. Continue !";
   } else if (report.achievement_percent >= 100) {
     return "✅ Objectif atteint ! Bravo pour cette journée réussie.";
   } else if (report.achievement_percent >= 80) {
     return "📈 Presque ! Tu étais à 80% de ton objectif. Demain sera meilleur.";
   } else if (report.achievement_percent >= 50) {
     return "💪 Journée difficile, mais chaque jour compte. Analyse ce qui peut être amélioré.";
   } else {
     return "⚠️ Journée en dessous des attentes. Besoin d'ajuster tes objectifs ?";
   }
 }
 ```
 
 ### 6.2 Rapport Hebdomadaire
 
 **Statut:** ❌ Non implémenté
 
 **Contenu Prévu:**
 - Récapitulatif 7 jours
 - Tendances (CA en hausse/baisse)
 - Meilleur jour de la semaine
 - Recommandations d'optimisation
 
 ### 6.3 Rapport Mensuel
 
 **Statut:** ❌ Non implémenté
 
 **Contenu Prévu:**
 - Bilan mensuel complet
 - Comparaison mois précédent
 - Évolution ratio indépendance
 - Statistiques clients (nouveaux, fidèles, perdus)
 - Projection revenus annuels
 
 ### 6.4 Rapport Annuel
 
 **Statut:** ❌ Non implémenté
 
 **Contenu Prévu:**
 - Bilan fiscal
 - Évolution sur 12 mois
 - Meilleurs mois
 - Statistiques globales
 
 ---
 
 ## 7. ARCHITECTURE TECHNIQUE
 
 ### 7.1 Schéma Base de Données
 
 ```
 ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
 │   auth.users    │────▶│    profiles     │────▶│   user_roles    │
 └─────────────────┘     └─────────────────┘     └─────────────────┘
          │                       │
          ▼                       ▼
 ┌─────────────────┐     ┌─────────────────┐
 │     drivers     │◀────│     clients     │
 └─────────────────┘     └─────────────────┘
          │
          ├──────────────────────────────────────┐
          ▼                                      ▼
 ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────┐
 │driver_objectives│     │driver_work_     │     │driver_daily_entries │
 │                 │     │schedules        │     │                     │
 └─────────────────┘     └─────────────────┘     └─────────────────────┘
          │                       │                        │
          └───────────────────────┴────────────────────────┘
                                  │
                                  ▼
                     ┌─────────────────────────┐
                     │ driver_coaching_messages│
                     └─────────────────────────┘
 ```
 
 ### 7.2 Colonnes Clés Table `drivers`
 
 ```typescript
 {
   // Identification
   id: uuid;
   user_id: uuid;                    // FK → auth.users
   
   // Statut
   status: 'pending' | 'validated' | 'active' | 'suspended' | 'rejected';
   onboarding_completed: boolean;
   current_onboarding_step: number;  // 0-7
   
   // Objectifs (JSONB - données brutes onboarding)
   objectives_data: {
     monthlyRevenue: number;
     targetClients: number;
     independenceRatio: number;
     weeklyPlanning: WeeklyPlanning[];
     coachingLevel: string;
   };
   
   // Tarification
   base_fare: number;
   per_km_rate: number;
   hourly_rate: number;
   evening_surcharge: number;
   weekend_surcharge: number;
   airport_surcharge: number;
   
   // Stripe
   stripe_account_id: string;
   stripe_onboarding_complete: boolean;
   
   // Compteurs
   total_clients: number;
   total_courses: number;
   total_revenue: number;
   average_rating: number;
   
   // Timestamps
   created_at: timestamp;
   updated_at: timestamp;
   validated_at: timestamp;
   onboarding_completed_at: timestamp;
 }
 ```
 
 ### 7.3 Hooks React Principaux
 
 | Hook | Fichier | Rôle |
 |------|---------|------|
 | `useDriverObjectives` | `src/hooks/useDriverObjectives.ts` | CRUD objectifs |
 | `useDriverDailyEntries` | `src/hooks/useDriverDailyEntries.ts` | Entrées quotidiennes |
 | `useDriver` | `src/hooks/useDriver.ts` | Données chauffeur |
 | `useDriverStats` | `src/hooks/useDriverStats.ts` | Statistiques |
 
 ---
 
 ## 8. POINTS D'AMÉLIORATION IDENTIFIÉS
 
 ### 8.1 Critiques (🔴)
 
 | ID | Problème | Impact | Solution Proposée |
 |----|----------|--------|-------------------|
 | C1 | Rapports hebdo/mensuel/annuel non implémentés | Suivi long terme impossible | Créer Edge Functions + CRON |
 | C2 | Pas de dashboard analytics chauffeur | Pas de vision globale | Créer page dédiée avec graphiques |
 | C3 | Coaching IA basique | Messages génériques | Intégrer Lovable AI pour analyse |
 
 ### 8.2 Importants (🟠)
 
 | ID | Problème | Impact | Solution Proposée |
 |----|----------|--------|-------------------|
 | I1 | Saisie plateformes 100% manuelle | Friction utilisateur | API Uber/Bolt si possible |
 | I2 | Pas d'historique visible des rapports | Pas de comparaison | Créer table `driver_reports` |
 | I3 | Objectifs non liés aux courses réelles | Incohérence données | Sync auto à chaque course terminée |
 | I4 | Planning non utilisé pour notifications | Pas de rappels | Alertes si pas d'activité jour prévu |
 
 ### 8.3 Mineurs (🟡)
 
 | ID | Problème | Impact | Solution Proposée |
 |----|----------|--------|-------------------|
 | M1 | Pas d'export données (CSV/PDF) | Comptabilité difficile | Ajouter boutons export |
 | M2 | Pas de badge/gamification | Moins engageant | Système de badges/achievements |
 | M3 | Pas de comparaison entre chauffeurs | Pas de benchmark | Statistiques anonymisées |
 
 ---
 
 ## 9. RECOMMANDATIONS
 
 ### 9.1 Court Terme (1-2 semaines)
 
 1. **Implémenter rapport hebdomadaire**
    - CRON tous les lundis 7h
    - Résumé de la semaine précédente
    - Comparaison avec objectifs
 
 2. **Créer dashboard analytics chauffeur**
    - Graphiques de progression
    - Tendances sur 30/90 jours
    - Ratio SoloCab vs Plateformes
 
 3. **Améliorer coaching IA**
    - Utiliser Lovable AI (Gemini)
    - Analyse contextuelle des données
    - Suggestions personnalisées
 
 ### 9.2 Moyen Terme (1-2 mois)
 
 1. **Rapport mensuel automatisé**
    - Bilan complet du mois
    - Export PDF pour comptabilité
    - Projections pour le mois suivant
 
 2. **Système de notifications intelligent**
    - Push notifications mobile
    - Rappels basés sur le planning
    - Alertes objectifs en retard
 
 3. **Historique des rapports**
    - Table dédiée
    - Consultation passé
    - Comparaisons inter-périodes
 
 ### 9.3 Long Terme (3+ mois)
 
 1. **API Plateformes externes**
    - Intégration Uber API
    - Intégration Bolt API
    - Sync automatique CA
 
 2. **Prédictions IA**
    - Prévision CA basée sur historique
    - Recommandation jours/heures optimaux
    - Détection patterns clients
 
 3. **Gamification complète**
    - Système de niveaux
    - Badges et achievements
    - Classements (opt-in)
 
 ---
 
 ## 📎 ANNEXES
 
 ### A. Liste des Edge Functions Objectifs
 
 | Fonction | Trigger | Statut |
 |----------|---------|--------|
 | `send-daily-report` | CRON 7h | ✅ Actif |
 | `send-weekly-report` | CRON Lundi 7h | ❌ À créer |
 | `send-monthly-report` | CRON 1er du mois | ❌ À créer |
 | `analyze-driver-performance` | Manuel | ❌ À créer |
 
 ### B. Variables d'Environnement Requises
 
 ```env
 SUPABASE_URL=https://iyothopplhbwcfrpxryc.supabase.co
 SUPABASE_SERVICE_ROLE_KEY=***
 STRIPE_SECRET_KEY=***
 LOVABLE_API_KEY=*** (auto-provisionné)
 ```
 
 ### C. Métriques de Succès Suggérées
 
 | Métrique | Objectif | Mesure |
 |----------|----------|--------|
 | Taux complétion onboarding | > 80% | Chauffeurs terminés / inscrits |
 | Engagement quotidien | > 60% | Chauffeurs actifs / total |
 | Atteinte objectifs | > 70% | Objectifs atteints / total |
 | Ratio indépendance moyen | > 30% | CA SoloCab / CA Total |
 | Satisfaction coaching | > 4/5 | Note moyenne |
 
 ---
 
 **Fin du rapport**
 
 *Document généré pour audit et amélioration continue de la plateforme SoloCab.*