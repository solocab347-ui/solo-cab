# 🏗️ ARCHITECTURE COMPLÈTE DES ESPACES SOLOCAB (VERSION CORRIGÉE)

**Date de correction:** 2025-11-20  
**Basé sur:** Rapport de vérification RELATIONS_VERIFICATION.md  
**Système:** PostgreSQL/Supabase (Lovable Cloud)

---

## 📋 TABLE DES MATIÈRES

1. Vue d'ensemble du système
2. Architecture Espace Chauffeur
3. Architecture Espace Client
4. Architecture Espace Admin
5. Relations et interactions entre espaces
6. Flux de données inter-espaces
7. Schéma d'architecture global

---

## 1️⃣ VUE D'ENSEMBLE DU SYSTÈME

### Les 3 espaces du système

```
┌─────────────────────────────────────────────────────────┐
│                    SOLOCAB PLATFORM                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   ESPACE     │  │   ESPACE     │  │   ESPACE     │ │
│  │  CHAUFFEUR   │  │   CLIENT     │  │    ADMIN     │ │
│  │              │  │              │  │              │ │
│  │  Dashboard   │  │  Dashboard   │  │  Dashboard   │ │
│  │  Gestion     │  │  Réservation │  │  Validation  │ │
│  │  Clients     │  │  Courses     │  │  Contrôle    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│         │                 │                 │          │
│         └─────────────────┴─────────────────┘          │
│                           │                            │
│                    ┌──────┴──────┐                     │
│                    │ SUPABASE    │                     │
│                    │ PostgreSQL  │                     │
│                    │ (8 Tables)  │                     │
│                    └─────────────┘                     │
└─────────────────────────────────────────────────────────┘
```

---

## 2️⃣ ARCHITECTURE ESPACE CHAUFFEUR

### 🎯 Objectif
Permettre aux chauffeurs VTC de gérer leur activité : clients, courses, devis, factures, et QR code de recrutement.

### 📱 Pages et Composants

```
ESPACE CHAUFFEUR (/dashboard)
│
├── 🏠 ACCUEIL (Home)
│   ├── Composant: DashboardStats + DriverDashboard.tsx
│   ├── Données affichées:
│   │   ├── Total clients
│   │   ├── Total courses
│   │   ├── Courses terminées
│   │   ├── Revenus du jour
│   │   └── Chiffre d'affaires total
│   └── Requête: SELECT depuis profiles, drivers, clients, courses
│
├── 👥 MES CLIENTS (Clients)
│   ├── Composant: DriverClientsList.tsx
│   ├── Données affichées:
│   │   ├── Liste des clients (cartes)
│   │   ├── Badge "Client Exclusif" (couronne bleue)
│   │   ├── Photo, nom, email, téléphone
│   │   ├── Nombre de courses effectuées
│   │   └── Boutons: Message, Supprimer
│   ├── Requête Supabase:
│   │   SELECT * FROM clients
│   │   WHERE driver_id = $driver_id
│   │   OR $driver_id = ANY(driver_ids)
│   └── Fonctionnalités:
│       ├── Voir détails client
│       ├── Envoyer message (à implémenter)
│       └── Supprimer client (devient libre)
│
├── 🚗 MES COURSES (Courses)
│   ├── Composant: CoursesList.tsx
│   ├── Données affichées:
│   │   ├── Numéro course (généré)
│   │   ├── Client
│   │   ├── Départ → Arrivée
│   │   ├── Date/heure
│   │   ├── Statut (badge coloré)
│   │   ├── Prix TTC
│   │   └── Actions: Voir, Annuler
│   ├── Requête Supabase:
│   │   SELECT * FROM courses
│   │   WHERE driver_id = $driver_id
│   │   OR $driver_id = ANY(driver_ids)
│   ├── Filtres:
│   │   ├── Par statut
│   │   ├── Par date
│   │   └── Par client
│   └── Statuts possibles:
│       ├── pending (En attente)
│       ├── accepted (Acceptée)
│       ├── in_progress (En cours)
│       ├── completed (Terminée)
│       └── cancelled (Annulée)
│
├── 📄 DEVIS (Quotes)
│   ├── Composant: DevisList.tsx
│   ├── Données affichées:
│   │   ├── Numéro (REV-001) - via generate_quote_number()
│   │   ├── Client
│   │   ├── Montant TTC
│   │   ├── Date création
│   │   ├── Statut
│   │   ├── Date d'expiration
│   │   └── Actions: Voir, Télécharger PDF
│   ├── Requête Supabase:
│   │   SELECT * FROM devis
│   │   WHERE driver_id = $driver_id
│   └── Statuts:
│       ├── pending (En attente)
│       ├── accepted (Accepté)
│       ├── rejected (Rejeté)
│       └── expired (Expiré)
│
├── 🧾 FACTURES (Invoices)
│   ├── Composant: DriverFacturesList.tsx
│   ├── Données affichées:
│   │   ├── Numéro (FAC-001) - via generate_invoice_number()
│   │   ├── Client
│   │   ├── Montant TTC
│   │   ├── Date paiement
│   │   ├── Méthode paiement
│   │   └── Actions: Télécharger PDF
│   └── Requête Supabase:
│       SELECT * FROM factures
│       WHERE driver_id = $driver_id
│
├── 💬 MESSAGES (Messages)
│   ├── Composant: À créer
│   ├── Fonctionnalités:
│   │   ├── Liste conversations
│   │   ├── Chat avec client
│   │   └── Notifications nouveaux messages
│   └── Status: ⚠️ NON IMPLÉMENTÉ
│
├── 📱 MON QR CODE (QR Code)
│   ├── Composant: QRCodeDisplay.tsx
│   ├── Données affichées:
│   │   ├── Image QR code (scannable)
│   │   ├── Lien d'inscription (copiable)
│   │   ├── Bouton télécharger QR
│   │   └── Boutons partage (WhatsApp, SMS, Email, Facebook)
│   ├── Requête Supabase:
│   │   SELECT * FROM qr_codes
│   │   WHERE driver_id = $driver_id
│   │   LIMIT 1  -- Contrainte UNIQUE appliquée
│   └── Fonctionnalités:
│       ├── Télécharger QR (PNG)
│       ├── Copier lien d'inscription
│       └── Partager sur réseaux sociaux
│
├── 💳 ABONNEMENT (Subscription)
│   ├── Composant: SubscriptionManager.tsx
│   ├── Données affichées:
│   │   ├── Statut abonnement (active/inactive/past_due/canceled)
│   │   ├── Date de fin
│   │   ├── Bouton: Souscrire / Gérer
│   │   └── Prix: 49.99€/mois
│   ├── Edge Functions:
│   │   ├── create-driver-subscription
│   │   └── check-driver-subscription
│   └── Paiement via Stripe
│
└── ⚙️ PARAMÈTRES (Settings)
    ├── Composant: À créer (actuellement dans tabs)
    ├── Sections:
    │   ├── Informations personnelles
    │   ├── Véhicule
    │   ├── Tarifs (hourly_rate, per_km_rate, base_fare, tva_rate)
│       ├── Entreprise
│       └── Documents
    └── Requêtes Supabase:
        ├── SELECT/UPDATE profiles
        └── SELECT/UPDATE drivers
```

### 🔄 Flux de données Espace Chauffeur

```
┌──────────────────────────────────────────────────────────┐
│                   ESPACE CHAUFFEUR                       │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Connexion → Supabase Auth → Session stockée           │
│                                                          │
│  Au chargement:                                         │
│  1. Vérification session Supabase                       │
│  2. Extraction user.id                                  │
│  3. Vérification rôle (user_roles table)               │
│  4. Chargement données chauffeur                        │
│                                                          │
│  Données chargées (via Supabase client):                │
│  ├── Profil chauffeur (profiles + drivers tables)      │
│  ├── Liste clients (clients table)                     │
│  ├── Courses (courses table)                           │
│  ├── Devis (devis table)                              │
│  ├── Factures (factures table)                        │
│  └── QR code (qr_codes table)                         │
│                                                          │
│  Navigation:                                            │
│  ├── Système d'onglets (tabs)                          │
│  ├── État géré par useState                            │
│  └── Changement d'onglet = re-render composant         │
│                                                          │
│  Actions possibles:                                     │
│  ├── Voir/gérer clients (RLS filtré par driver_id)    │
│  ├── Consulter courses/devis/factures                  │
│  ├── Partager QR code                                  │
│  ├── Gérer abonnement Stripe                          │
│  └── Modifier paramètres                               │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 📊 Modèle de données utilisé (Chauffeur)

```sql
-- Tables PostgreSQL/Supabase utilisées par l'espace chauffeur

profiles {
  id: uuid (PK) → auth.users.id
  email: text
  full_name: text
  phone: text
  profile_photo_url: text
  roles: text[] (deprecated - use user_roles table)
}

user_roles {
  id: uuid (PK)
  user_id: uuid (FK → profiles.id)
  role: app_role ('admin' | 'driver' | 'client')
  -- CRITIQUE pour RLS policies
}

drivers {
  id: uuid (PK)
  user_id: uuid (FK → profiles.id, UNIQUE)
  vehicle_model: text
  vehicle_plate: text
  vehicle_color: text
  hourly_rate: numeric
  per_km_rate: numeric
  base_fare: numeric
  tva_rate: numeric (10% ou 20%)
  company_name: text
  siret: text
  quote_counter: integer (pour REV-001, REV-002...)
  invoice_counter: integer (pour FAC-001, FAC-002...)
  course_counter: integer
  subscription_status: text ('active' | 'inactive' | 'past_due' | 'canceled')
  subscription_stripe_id: text
  subscription_end_date: timestamptz
  status: driver_status ('pending' | 'validated' | 'rejected')
}

clients {
  id: uuid (PK)
  user_id: uuid (FK → profiles.id, UNIQUE)
  driver_id: uuid (FK → drivers.id, nullable) -- Legacy
  driver_ids: uuid[] -- Nouveau système
  is_exclusive: boolean -- Client exclusif ou libre
  qr_code_id: uuid (FK → qr_codes.id, nullable)
}

courses {
  id: uuid (PK)
  client_id: uuid (FK → clients.id, NOT NULL)
  driver_id: uuid (FK → drivers.id, nullable) -- Legacy
  driver_ids: uuid[] -- Multi-drivers support
  course_number: text (généré)
  status: course_status
  pickup_address: text
  destination_address: text
  scheduled_date: timestamptz
  distance_km: numeric
  duration_minutes: integer
}

devis {
  id: uuid (PK)
  course_id: uuid (FK → courses.id, NOT NULL)
  driver_id: uuid (FK → drivers.id, NOT NULL)
  client_id: uuid (FK → clients.id, NOT NULL)
  quote_number: text (REV-001 via generate_quote_number)
  base_price: numeric
  distance_price: numeric
  time_price: numeric
  amount: numeric (total TTC)
  status: devis_status ('pending' | 'accepted' | 'rejected' | 'expired')
  valid_until: timestamptz (+7 jours)
}

factures {
  id: uuid (PK)
  course_id: uuid (FK → courses.id, NOT NULL)
  devis_id: uuid (FK → devis.id, nullable, UNIQUE) -- ✅ Contrainte ajoutée
  driver_id: uuid (FK → drivers.id, NOT NULL)
  client_id: uuid (FK → clients.id, NOT NULL)
  invoice_number: text (FAC-001 via generate_invoice_number)
  amount: numeric (total TTC)
  payment_status: payment_status ('pending' | 'paid' | 'failed' | 'refunded')
  paid_at: timestamptz
}

qr_codes {
  id: uuid (PK)
  driver_id: uuid (FK → drivers.id, NOT NULL, UNIQUE) -- ✅ Contrainte ajoutée
  code: text (unique)
  qr_code_image: text (base64)
  is_active: boolean
  scans_count: integer
}
```

---

## 3️⃣ ARCHITECTURE ESPACE CLIENT

### 🎯 Objectif
Permettre aux clients de réserver des courses auprès de leur chauffeur.

### 📱 Pages et Composants

```
ESPACE CLIENT (/client-dashboard)
│
├── 🏠 ACCUEIL (Home)
│   ├── Composant: ClientDashboard.tsx
│   ├── Données affichées:
│   │   ├── Nom du chauffeur (si exclusif)
│   │   ├── Photo du chauffeur
│   │   ├── Bouton CTA "Demander une course"
│   │   ├── Dernières 3 courses
│   │   └── Devis en attente
│   └── Requêtes Supabase:
│       ├── SELECT FROM clients WHERE user_id = $user_id
│       ├── SELECT FROM drivers WHERE id = $driver_id (si exclusif)
│       └── SELECT FROM courses/devis (derniers)
│
├── 🚗 DEMANDER UNE COURSE (Request Course)
│   ├── Composant: CreateCourse.tsx
│   ├── Formulaire:
│   │   ├── Adresse de départ * (input)
│   │   ├── Adresse d'arrivée * (input)
│   │   ├── Date et heure * (futur uniquement)
│   │   ├── Nombre de passagers * (1-8)
│   │   ├── Distance estimée (km, optionnel)
│   │   ├── Durée estimée (min, optionnel)
│   │   └── Notes (optionnel, 500 car. max)
│   ├── Comportement:
│   │   ├── Validation date >= maintenant
│   │   ├── INSERT INTO courses (status: 'pending')
│   │   ├── ✅ Appel automatique create-devis-auto Edge Function
│   │   └── Redirection vers ClientDashboard
│   └── Edge Function: create-devis-auto
│       ├── Récupère course_id, driver_id
│       ├── Calcule prix via calculate_course_price()
│       ├── Génère numéro via generate_quote_number()
│       └── INSERT INTO devis (status: 'pending')
│
├── 📋 MES COURSES (My Courses)
│   ├── Composant: ClientCoursesList.tsx
│   ├── Données affichées:
│   │   ├── Statut (badge coloré)
│   │   ├── Départ → Arrivée
│   │   ├── Date/heure
│   │   ├── Prix TTC
│   │   └── Actions selon statut
│   ├── Requête Supabase:
│   │   SELECT * FROM courses
│   │   WHERE client_id = $client_id
│   ├── Filtres:
│   │   ├── Par statut
│   │   └── Par date
│   └── Actions possibles:
│       ├── Voir détails
│       ├── Annuler (si pending)
│       └── Contacter chauffeur (à implémenter)
│
├── 📄 MES DEVIS (My Quotes)
│   ├── Composant: DevisList.tsx (mode client)
│   ├── Données affichées:
│   │   ├── Statut
│   │   ├── Montant TTC
│   │   ├── Date création
│   │   ├── Date expiration
│   │   ├── Détails course associée
│   │   └── Actions
│   ├── Requête Supabase:
│   │   SELECT devis.*, courses.* FROM devis
│   │   JOIN courses ON devis.course_id = courses.id
│   │   WHERE devis.client_id = $client_id
│   ├── Actions possibles:
│   │   ├── Accepter → Appel create-stripe-checkout Edge Function
│   │   ├── Rejeter → UPDATE devis SET status = 'rejected'
│   │   └── Voir détails
│   └── Statuts:
│       ├── pending (En attente - Actions: Accepter/Rejeter)
│       ├── accepted (Accepté - Payé)
│       ├── rejected (Rejeté)
│       └── expired (Expiré - Plus de 7 jours)
│
├── 🧾 MES FACTURES (My Invoices)
│   ├── Composant: ClientFacturesList.tsx
│   ├── Données affichées:
│   │   ├── Numéro (FAC-001)
│   │   ├── Montant TTC
│   │   ├── Date paiement
│   │   ├── Méthode paiement
│   │   └── Action: Télécharger PDF (à implémenter)
│   └── Requête Supabase:
│       SELECT * FROM factures
│       WHERE client_id = $client_id
│
├── 💬 MESSAGES (Messages)
│   ├── Composant: À créer
│   ├── Fonctionnalités:
│   │   ├── Chat avec chauffeur
│   │   └── Notifications
│   └── Status: ⚠️ NON IMPLÉMENTÉ
│
└── 👤 PROFIL (Profile)
    ├── Composant: ClientProfile.tsx
    ├── Sections:
    │   ├── Informations personnelles
    │   ├── Adresse
    │   ├── Photo de profil
    │   └── Chauffeur associé (si exclusif)
    └── Requêtes Supabase:
        ├── SELECT/UPDATE profiles
        └── SELECT/UPDATE clients
```

### 🔄 Flux de données Espace Client

```
┌──────────────────────────────────────────────────────────┐
│                    ESPACE CLIENT                         │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Inscription via QR code:                               │
│  1. Scan QR → /register-client-qr?code={code}          │
│  2. Edge Function: register-client-qr                   │
│  3. Affiche nom chauffeur                              │
│  4. Formulaire inscription                             │
│  5. Edge Function: register-client-qr (POST)           │
│  6. Création:                                          │
│     ├── INSERT INTO profiles (via Supabase Auth)       │
│     ├── INSERT INTO user_roles (role: 'client')        │
│     └── INSERT INTO clients                            │
│         ├── is_exclusive: TRUE                         │
│         ├── driver_id: {driver_id}                     │
│         ├── driver_ids: [{driver_id}]                  │
│         └── qr_code_id: {qr_code_id}                   │
│  7. Auto-login (Supabase Auth session)                │
│  8. Redirection /client-dashboard                      │
│                                                          │
│  Connexion:                                             │
│  1. Supabase Auth signInWithPassword()                 │
│  2. Session créée automatiquement                      │
│  3. Extraction user.id                                 │
│  4. Chargement données client via RLS                  │
│                                                          │
│  Données chargées (RLS filtré):                         │
│  ├── Profil client (profiles + clients tables)         │
│  ├── Info chauffeur (drivers table)                    │
│  ├── Mes courses (courses table)                       │
│  ├── Mes devis (devis table)                          │
│  └── Mes factures (factures table)                    │
│                                                          │
│  Création course:                                       │
│  1. Formulaire course → INSERT courses                 │
│  2. Frontend:                                          │
│     ├── Récupère client_id                            │
│     ├── Détermine driver_id (si exclusif)             │
│     ├── INSERT INTO courses                           │
│     └── Appelle create-devis-auto Edge Function       │
│  3. Backend (Edge Function):                           │
│     ├── Récupère course                               │
│     ├── Calcule prix (calculate_course_price)        │
│     ├── Génère numéro (generate_quote_number)        │
│     └── INSERT INTO devis                            │
│  4. Client voit devis dans "Mes Devis"                │
│                                                          │
│  Acceptation devis:                                     │
│  1. Clic "Accepter" → create-stripe-checkout           │
│  2. Redirection Stripe Checkout                        │
│  3. Paiement                                           │
│  4. Webhook → stripe-webhook Edge Function             │
│  5. Backend:                                           │
│     ├── UPDATE courses SET status = 'accepted'         │
│     ├── UPDATE devis SET status = 'accepted'           │
│     ├── Génère invoice_number                         │
│     └── INSERT INTO factures                          │
│  6. Email confirmation (via Resend)                    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 📊 Modèle de données utilisé (Client)

```sql
-- Tables PostgreSQL/Supabase utilisées par l'espace client

profiles {
  id: uuid (PK)
  email: text
  full_name: text
  phone: text
  profile_photo_url: text
}

user_roles {
  id: uuid (PK)
  user_id: uuid (FK → profiles.id)
  role: app_role -- 'client' pour clients
}

clients {
  id: uuid (PK)
  user_id: uuid (FK → profiles.id, UNIQUE)
  driver_id: uuid (FK → drivers.id, nullable) -- SON chauffeur (si exclusif)
  driver_ids: uuid[] -- SES chauffeurs (array, dual association)
  is_exclusive: boolean -- true = inscrit via QR
  qr_code_id: uuid (FK → qr_codes.id, nullable)
  total_rides: integer
  total_spent: numeric
}

drivers {
  id: uuid (PK)
  user_id: uuid (FK → profiles.id)
  vehicle_model: text
  vehicle_color: text
  company_name: text
  hourly_rate: numeric
  per_km_rate: numeric
  base_fare: numeric
  tva_rate: numeric
  -- Tarifs utilisés pour calcul devis
}

courses {
  id: uuid (PK)
  client_id: uuid (FK → clients.id, NOT NULL)
  driver_id: uuid (FK → drivers.id, nullable)
  driver_ids: uuid[]
  course_number: text (généré)
  status: course_status
  pickup_address: text
  destination_address: text
  scheduled_date: timestamptz
  passengers_count: integer
  notes: text
  distance_km: numeric
  duration_minutes: integer
}

devis {
  id: uuid (PK)
  client_id: uuid (FK → clients.id, NOT NULL)
  driver_id: uuid (FK → drivers.id, NOT NULL)
  course_id: uuid (FK → courses.id, NOT NULL)
  quote_number: text (REV-001)
  amount: numeric (total TTC)
  base_price: numeric
  distance_price: numeric
  time_price: numeric
  status: devis_status
  valid_until: timestamptz
}

factures {
  id: uuid (PK)
  client_id: uuid (FK → clients.id, NOT NULL)
  driver_id: uuid (FK → drivers.id, NOT NULL)
  course_id: uuid (FK → courses.id, NOT NULL)
  devis_id: uuid (FK → devis.id, nullable, UNIQUE)
  invoice_number: text (FAC-001)
  amount: numeric (total TTC)
  payment_status: payment_status
  paid_at: timestamptz
}
```

---

## 4️⃣ ARCHITECTURE ESPACE ADMIN

### 🎯 Objectif
Gérer et valider les chauffeurs, contrôler les utilisateurs, et surveiller la plateforme.

### 📱 Pages et Composants

```
ESPACE ADMIN (/admin)
│
├── 🏠 TABLEAU DE BORD (Dashboard)
│   ├── Composant: AdminStats.tsx
│   ├── Statistiques globales:
│   │   ├── Total chauffeurs (actifs / en attente)
│   │   ├── Total clients
│   │   ├── Total courses (par statut)
│   │   ├── CA total plateforme
│   │   ├── Revenus du mois
│   │   └── Graphiques évolution
│   └── Database Function: get_platform_stats()
│       -- Retourne JSON avec toutes les stats agrégées
│
├── ✅ VALIDATION CHAUFFEURS (Driver Validation)
│   ├── Composant: DriversValidation.tsx
│   ├── Liste chauffeurs en attente (status: pending)
│   ├── Pour chaque chauffeur:
│   │   ├── Informations:
│   │   │   ├── Nom, email, téléphone
│   │   │   ├── Entreprise, SIRET
│   │   │   ├── Véhicule (modèle, plaque)
│   │   │   ├── Tarifs
│   │   │   └── Date inscription
│   │   ├── Documents (7 minimum): ⚠️ À IMPLÉMENTER
│   │   │   ├── Kbis
│   │   │   ├── Carte grise
│   │   │   ├── Assurance
│   │   │   ├── Carte pro VTC
│   │   │   ├── Attestation vigilance URSSAF
│   │   │   ├── Carte identité (recto/verso)
│   │   │   └── Permis de conduire
│   │   └── Actions:
│   │       ├── Voir documents (modal/lightbox) ⚠️ À IMPLÉMENTER
│   │       ├── Approuver → UPDATE drivers SET status = 'validated'
│   │       └── Rejeter → UPDATE drivers SET status = 'rejected'
│   ├── Requête Supabase:
│   │   SELECT * FROM drivers
│   │   WHERE status = 'pending'
│   └── Comportement:
│       ├── Approuver → Edge Function: send-driver-validation-email
│       │   └── + Génération QR code automatique
│       └── Rejeter → Email avec raison ⚠️ À IMPLÉMENTER
│
├── 👥 GESTION UTILISATEURS (User Management)
│   ├── Composant: UsersList.tsx
│   ├── Liste tous les utilisateurs:
│   │   ├── Nom, email, rôles
│   │   ├── Date création
│   │   ├── Statut (actif/suspendu)
│   │   └── Actions
│   ├── Filtres:
│   │   ├── Par rôle (chauffeur/client/admin)
│   │   ├── Par statut
│   │   └── Recherche par nom/email
│   ├── Requête Supabase:
│   │   SELECT profiles.*, user_roles.role
│   │   FROM profiles
│   │   LEFT JOIN user_roles ON profiles.id = user_roles.user_id
│   └── Actions possibles:
│       ├── Voir détails utilisateur
│       ├── Suspendre compte ⚠️ À IMPLÉMENTER
│       ├── Activer compte ⚠️ À IMPLÉMENTER
│       ├── Supprimer compte (avec confirmation) ⚠️ À IMPLÉMENTER
│       └── Modifier rôles ⚠️ À IMPLÉMENTER
│
├── 🚗 GESTION CHAUFFEURS (Driver Management)
│   ├── Composant: AdminDriversManagement.tsx
│   ├── Liste tous les chauffeurs:
│   │   ├── Nom, email, entreprise
│   │   ├── Statut (pending/validated/rejected)
│   │   ├── Nombre clients
│   │   ├── Nombre courses
│   │   └── CA total (calculé)
│   ├── Filtres:
│   │   ├── Par statut
│   │   ├── Par secteur
│   │   └── Recherche
│   ├── Requête Supabase:
│   │   SELECT drivers.*, profiles.*, COUNT(clients), COUNT(courses)
│   │   FROM drivers
│   │   JOIN profiles ON drivers.user_id = profiles.id
│   │   LEFT JOIN clients ON drivers.id = ANY(clients.driver_ids)
│   │   LEFT JOIN courses ON drivers.id = courses.driver_id
│   │   GROUP BY drivers.id
│   └── Actions:
│       ├── Voir profil complet
│       ├── Voir documents ⚠️ À IMPLÉMENTER
│       ├── Modifier statut
│       ├── Suspendre/Réactiver ⚠️ À IMPLÉMENTER
│       └── Voir statistiques détaillées ⚠️ À IMPLÉMENTER
│
├── 👤 GESTION CLIENTS (Client Management)
│   ├── Composant: AdminClientsManagement.tsx
│   ├── Liste tous les clients:
│   │   ├── Nom, email
│   │   ├── Type (exclusif/libre)
│   │   ├── Chauffeur associé
│   │   ├── Nombre courses
│   │   └── Date inscription
│   ├── Filtres:
│   │   ├── Par type (exclusif/libre)
│   │   ├── Par chauffeur
│   │   └── Recherche
│   └── Requête Supabase:
│       SELECT clients.*, profiles.*,
│              COUNT(courses) as courses_count
│       FROM clients
│       JOIN profiles ON clients.user_id = profiles.id
│       LEFT JOIN courses ON clients.id = courses.client_id
│       GROUP BY clients.id
│
├── 📊 COURSES & TRANSACTIONS (Courses & Transactions)
│   ├── Composant: ⚠️ À CRÉER
│   ├── Vue globale:
│   │   ├── Toutes les courses
│   │   ├── Tous les devis
│   │   ├── Toutes les factures
│   │   └── Tous les paiements
│   ├── Filtres avancés:
│   │   ├── Par période
│   │   ├── Par chauffeur
│   │   ├── Par client
│   │   ├── Par statut
│   │   └── Par montant
│   └── Requêtes Supabase:
│       ├── SELECT * FROM courses (sans restriction RLS)
│       ├── SELECT * FROM devis
│       └── SELECT * FROM factures
│
├── 📈 RAPPORTS & ANALYTICS (Reports & Analytics)
│   ├── Composant: ⚠️ À CRÉER
│   ├── Rapports disponibles:
│   │   ├── CA par chauffeur
│   │   ├── CA par période
│   │   ├── Taux de conversion (devis → factures)
│   │   ├── Clients les plus actifs
│   │   ├── Courses par statut
│   │   └── Evolution inscriptions
│   └── Exports:
│       ├── CSV ⚠️ À IMPLÉMENTER
│       ├── Excel ⚠️ À IMPLÉMENTER
│       └── PDF ⚠️ À IMPLÉMENTER
│
└── ⚙️ PARAMÈTRES PLATEFORME (Platform Settings)
    ├── Composant: ⚠️ À CRÉER
    ├── Sections:
    │   ├── Configuration générale
    │   ├── Tarifs commission (futur)
    │   ├── Emails automatiques (templates Resend)
    │   ├── Intégrations (Stripe, Resend)
    │   └── Sécurité
    └── Stockage: Table settings ou edge functions
```

### 🔄 Flux de données Espace Admin

```
┌──────────────────────────────────────────────────────────┐
│                     ESPACE ADMIN                         │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Connexion:                                             │
│  1. Supabase Auth signInWithPassword()                 │
│  2. Vérification rôle via user_roles table:            │
│     SELECT role FROM user_roles                         │
│     WHERE user_id = $user_id AND role = 'admin'        │
│  3. Si admin → Accès /admin                            │
│  4. Sinon → Erreur 403                                 │
│                                                          │
│  Données chargées (RLS bypassed pour admin):            │
│  ├── TOUS les profiles (profiles table)                │
│  ├── TOUS les drivers (drivers table)                  │
│  ├── TOUS les clients (clients table)                  │
│  ├── TOUTES les courses (courses table)                │
│  ├── TOUS les devis (devis table)                     │
│  ├── TOUTES les factures (factures table)             │
│  └── Statistiques agrégées (get_platform_stats)       │
│                                                          │
│  Validation chauffeur:                                  │
│  1. SELECT * FROM drivers WHERE status = 'pending'     │
│  2. Liste chauffeurs en attente                        │
│  3. Clic "Voir documents" → Modal avec 7 docs         │
│     ⚠️ Système de stockage documents À IMPLÉMENTER     │
│  4. Clic "Approuver":                                  │
│     ├── UPDATE drivers                                 │
│     │   SET status = 'validated',                      │
│     │       validation_date = NOW()                    │
│     │   WHERE id = $driver_id                          │
│     ├── Edge Function: send-driver-validation-email    │
│     │   └── Email envoyé au chauffeur                  │
│     └── Génération automatique QR code                 │
│         (qr-code-manager Edge Function)                │
│  5. Clic "Rejeter":                                   │
│     ├── Modal raison du rejet ⚠️ À IMPLÉMENTER        │
│     ├── UPDATE drivers                                 │
│     │   SET status = 'rejected'                        │
│     │   WHERE id = $driver_id                          │
│     └── Email avec raison ⚠️ À IMPLÉMENTER             │
│                                                          │
│  Gestion utilisateur:                                   │
│  1. SELECT * FROM profiles (tous)                      │
│  2. Actions possibles:                                 │
│     ├── Suspendre: ⚠️ Nécessite champ "suspended"     │
│     ├── Activer: ⚠️ À IMPLÉMENTER                      │
│     └── Supprimer: DELETE CASCADE ⚠️ DANGEREUX         │
│                                                          │
│  Surveillance:                                          │
│  ├── Dashboard temps réel (get_platform_stats)        │
│  ├── Alertes ⚠️ À IMPLÉMENTER                          │
│  └── Logs d'activité ⚠️ À IMPLÉMENTER                  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 📊 Modèle de données utilisé (Admin)

```sql
-- Tables PostgreSQL/Supabase - L'admin a accès à TOUT

profiles {
  -- TOUS les utilisateurs
  id: uuid (PK)
  email: text
  full_name: text
  phone: text
  profile_photo_url: text
  created_at: timestamptz
  updated_at: timestamptz
}

user_roles {
  -- CRUCIAL pour sécurité
  id: uuid (PK)
  user_id: uuid (FK → profiles.id)
  role: app_role ('admin' | 'driver' | 'client')
  created_at: timestamptz
  -- Utilisé par RLS policies et has_role() function
}

drivers {
  -- TOUS les chauffeurs
  id: uuid (PK)
  user_id: uuid (FK → profiles.id)
  status: driver_status ('pending' | 'validated' | 'rejected')
  validation_date: timestamptz
  vehicle_model: text
  vehicle_plate: text
  company_name: text
  siret: text
  license_number: text
  -- ... tous les champs
}

clients {
  -- TOUS les clients
  id: uuid (PK)
  user_id: uuid (FK → profiles.id)
  driver_id: uuid (FK → drivers.id, nullable)
  driver_ids: uuid[]
  is_exclusive: boolean
  qr_code_id: uuid (FK → qr_codes.id, nullable)
  total_rides: integer
  total_spent: numeric
}

courses {
  -- TOUTES les courses
  id: uuid (PK)
  driver_id: uuid (FK → drivers.id)
  client_id: uuid (FK → clients.id)
  status: course_status
  course_number: text (généré)
  -- ... tous les champs
}

devis {
  -- TOUS les devis
  id: uuid (PK)
  driver_id: uuid (FK → drivers.id)
  client_id: uuid (FK → clients.id)
  course_id: uuid (FK → courses.id)
  quote_number: text (REV-001)
  amount: numeric
  status: devis_status
}

factures {
  -- TOUTES les factures
  id: uuid (PK)
  driver_id: uuid (FK → drivers.id)
  client_id: uuid (FK → clients.id)
  course_id: uuid (FK → courses.id)
  devis_id: uuid (FK → devis.id, nullable, UNIQUE)
  invoice_number: text (FAC-001)
  amount: numeric
  payment_status: payment_status
}

qr_codes {
  -- TOUS les QR codes
  id: uuid (PK)
  driver_id: uuid (FK → drivers.id, NOT NULL, UNIQUE)
  code: text (unique)
  qr_code_image: text
  is_active: boolean
  scans_count: integer
}
```

---

## 5️⃣ RELATIONS ET INTERACTIONS ENTRE ESPACES

### 🔗 Diagramme des Relations

```
┌─────────────────────────────────────────────────────────────────┐
│                      RELATIONS INTER-ESPACES                    │
└─────────────────────────────────────────────────────────────────┘

                    ┌──────────────────┐
                    │      ADMIN       │
                    │   (Validation    │
                    │   & Contrôle)    │
                    └────────┬─────────┘
                             │
                             │ Valide
                             ↓
                    ┌──────────────────┐
          ┌─────────│    CHAUFFEUR     │
          │         │   (Fournisseur   │
          │         │   de service)    │
          │         └────────┬─────────┘
          │                  │
          │                  │ Génère
          │                  │ QR Code (1:1)
          │                  ↓
          │         ┌──────────────────┐
          │         │    QR CODE       │
          │         │   (Unique par    │
          │         │   chauffeur)     │
          │         └────────┬─────────┘
          │                  │
          │                  │ Scan &
          │                  │ Inscription
          │                  ↓
          │         ┌──────────────────┐
          └────────→│     CLIENT       │
        Reçoit      │   (Demandeur     │
        Courses     │   de service)    │
                    └──────────────────┘
```

### 📋 Tableau des Relations (CORRIGÉ)

| Relation | Type | Direction | Cardinalité | Description |
|----------|------|-----------|-------------|-------------|
| Admin → Chauffeur | Validation | Unidirectionnelle | 1:∞ | Admin valide/rejette chauffeurs |
| Admin → Client | Supervision | Unidirectionnelle | 1:∞ | Admin peut voir/gérer clients |
| Admin → Courses | Supervision | Unidirectionnelle | 1:∞ | Admin surveille toutes courses |
| Chauffeur → QR Code | Propriété | Unidirectionnelle | **1:1** | 1 chauffeur = 1 QR code (UNIQUE) |
| QR Code → Client | Inscription | Unidirectionnelle | 1:∞ | QR code génère clients exclusifs |
| Chauffeur ↔ Client | Association | Bidirectionnelle | **1:∞** | Dual: driver_id + driver_ids |
| Client → Course | Création | Unidirectionnelle | 1:∞ | Client crée demandes de course |
| Course → Devis | Génération auto | Unidirectionnelle | **1:∞** | Course peut avoir PLUSIEURS devis |
| Devis → Facture | Paiement | Unidirectionnelle | **1:0-1** | Devis accepté → 1 facture max (UNIQUE) |
| Chauffeur → Course | Réception | Unidirectionnelle | 1:∞ | Chauffeur reçoit demandes |

### ⚠️ Corrections importantes:

1. **Chauffeur → QR Code: 1:1 (pas 1:∞)**
   - Contrainte UNIQUE ajoutée sur `qr_codes.driver_id`
   - Un driver ne peut avoir qu'un seul QR code actif

2. **Course → Devis: 1:∞ (pas 1:1)**
   - Une course peut théoriquement recevoir plusieurs devis
   - Dans le cas actuel (client exclusif): génération automatique d'1 devis
   - Futur possible (client libre): plusieurs drivers créent des devis

3. **Devis → Facture: 1:0-1 (avec UNIQUE)**
   - Contrainte UNIQUE ajoutée sur `factures.devis_id`
   - Un devis ne peut générer qu'une seule facture

---

## 6️⃣ FLUX DE DONNÉES INTER-ESPACES

### 🔄 FLUX 1: Inscription et validation complète

```
┌─────────────────────────────────────────────────────────────┐
│          FLUX: INSCRIPTION & VALIDATION CHAUFFEUR           │
└─────────────────────────────────────────────────────────────┘

1. CHAUFFEUR
   ├── S'inscrit via formulaire
   ├── Upload 7 documents ⚠️ Storage à configurer
   ├── Paie 49.99€/mois (Stripe subscription)
   └── Edge Function: create-driver-subscription
       ├── Crée customer Stripe
       ├── Crée subscription Stripe
       ├── INSERT INTO profiles (via Supabase Auth)
       ├── INSERT INTO user_roles (role: 'driver')
       └── INSERT INTO drivers (status: 'pending')
                    ↓
2. ADMIN
   ├── Edge Function → send-driver-validation-email
   │   └── Notification nouveau chauffeur
   ├── Va dans "Validation Chauffeurs"
   ├── Voit chauffeur en attente (status: 'pending')
   ├── Clique "Voir documents" ⚠️ À IMPLÉMENTER
   ├── Vérifie les 7 documents
   └── Décision:
       ├── Approuver:
       │   ├── UPDATE drivers
       │   │   SET status = 'validated',
       │   │       validation_date = NOW()
       │   ├── Edge Function: send-driver-validation-email
       │   │   └── Email envoyé au chauffeur
       │   └── Edge Function: qr-code-manager
       │       └── Génère QR code automatiquement
       └── Rejeter:
           ├── UPDATE drivers SET status = 'rejected'
           └── Email avec raison ⚠️ À IMPLÉMENTER
                    ↓
3. CHAUFFEUR (si approuvé)
   ├── Reçoit email "Compte validé"
   ├── Se connecte (Supabase Auth)
   ├── Accède à son dashboard
   ├── Voit son QR code dans onglet "QR Code"
   └── Peut commencer à recruter clients
```

### 🔄 FLUX 2: Recrutement client via QR code

```
┌─────────────────────────────────────────────────────────────┐
│          FLUX: RECRUTEMENT CLIENT VIA QR CODE               │
└─────────────────────────────────────────────────────────────┘

1. CHAUFFEUR
   ├── Va dans onglet "QR Code"
   ├── Composant: QRCodeDisplay.tsx
   ├── Partage QR code:
   │   ├── Télécharge image PNG
   │   ├── Copie lien d'inscription
   │   ├── Partage WhatsApp/SMS/Email/Facebook
   │   └── Imprime et affiche dans véhicule
   └── QR code contient:
       URL: /register-client-qr?code={unique_code}
                    ↓
2. CLIENT POTENTIEL
   ├── Scanne QR code (smartphone)
   ├── Redirigé vers /register-client-qr?code=...
   ├── Edge Function: register-client-qr (GET)
   │   └── Récupère infos driver via code QR
   ├── Voit nom du chauffeur:
   │   "Rejoindre [Nom Chauffeur]"
   ├── Remplit formulaire:
   │   ├── Nom complet
   │   ├── Email
   │   ├── Téléphone
   │   └── Mot de passe
   └── Soumet formulaire
                    ↓
3. BACKEND (Edge Function: register-client-qr POST)
   ├── Crée compte Supabase Auth
   ├── INSERT INTO profiles (email, full_name, phone)
   ├── INSERT INTO user_roles (user_id, role: 'client')
   ├── INSERT INTO clients:
   │   ├── user_id: {new_user_id}
   │   ├── is_exclusive: TRUE ← CRITIQUE
   │   ├── driver_id: {driver_id} (legacy)
   │   ├── driver_ids: [{driver_id}] (nouveau)
   │   └── qr_code_id: {qr_code_id}
   ├── UPDATE qr_codes
   │   SET scans_count = scans_count + 1
   └── Auto-login (session Supabase)
                    ↓
4. CLIENT (maintenant inscrit)
   ├── Redirigé vers /client-dashboard
   ├── Voit nom de son chauffeur
   ├── Badge "Client Exclusif"
   └── Peut créer des courses
                    ↓
5. CHAUFFEUR
   ├── Notification (à implémenter)
   ├── Va dans "Mes Clients"
   ├── Voit nouveau client apparaître
   └── Badge "Client Exclusif" (couronne bleue)
```

### 🔄 FLUX 3: Création course et paiement (COMPLET)

```
┌─────────────────────────────────────────────────────────────┐
│          FLUX: CRÉATION COURSE → DEVIS → PAIEMENT          │
└─────────────────────────────────────────────────────────────┘

1. CLIENT
   ├── Clique "Demander une course"
   ├── Route: /create-course (CreateCourse.tsx)
   ├── Remplit formulaire:
   │   ├── Départ
   │   ├── Arrivée
   │   ├── Date/heure (futur uniquement)
   │   ├── Passagers (1-8)
   │   ├── Distance estimée (optionnel)
   │   ├── Durée estimée (optionnel)
   │   └── Notes (optionnel)
   └── Soumet → INSERT INTO courses
                    ↓
2. BACKEND (CreateCourse.tsx)
   ├── Récupère client_id:
   │   SELECT id, driver_id, is_exclusive
   │   FROM clients WHERE user_id = $user_id
   ├── Détermine driver_id:
   │   ├── Si is_exclusive: TRUE → driver_id du client
   │   └── Si is_exclusive: FALSE → driver choisi
   ├── INSERT INTO courses:
   │   ├── client_id: {client_id}
   │   ├── driver_id: {driver_id}
   │   ├── driver_ids: [{driver_id}]
   │   ├── status: 'pending'
   │   └── ... autres champs
   └── ✅ Appel AUTOMATIQUE Edge Function:
       supabase.functions.invoke('create-devis-auto', {
         course_id: {new_course_id},
         driver_id: {driver_id},
         use_hourly_rate: false // TVA 10%
       })
                    ↓
3. EDGE FUNCTION: create-devis-auto
   ├── SELECT course avec détails
   ├── RPC: calculate_course_price({
   │   _driver_id: {driver_id},
   │   _distance_km: {distance},
   │   _duration_minutes: {duration},
   │   _use_hourly_rate: false
   │ }) → Retourne:
   │   ├── base_price (driver.base_fare)
   │   ├── distance_price (km × per_km_rate)
   │   ├── time_price (si hourly_rate)
   │   ├── subtotal
   │   ├── tva_amount (10% ou 20%)
   │   └── total_price (TTC)
   ├── RPC: generate_quote_number({driver_id})
   │   └── Retourne: "REV-001", "REV-002"...
   └── INSERT INTO devis:
       ├── course_id: {course_id}
       ├── driver_id: {driver_id}
       ├── client_id: {client_id}
       ├── quote_number: "REV-XXX"
       ├── base_price, distance_price, time_price
       ├── amount: {total_price}
       ├── status: 'pending'
       └── valid_until: NOW() + INTERVAL '7 days'
                    ↓
4. CLIENT
   ├── Voit toast "Réservation et devis créés !"
   ├── Redirection → /client-dashboard
   ├── Va dans onglet "Mes Devis"
   ├── Voit devis avec montant TTC
   └── Actions possibles:
       ├── Accepter → Paiement Stripe
       └── Rejeter → UPDATE status = 'rejected'
                    ↓
5. CHAUFFEUR
   ├── Notification (à implémenter)
   ├── Va dans "Mes Courses"
   ├── Voit nouvelle demande (status: 'pending')
   ├── Va dans "Devis"
   ├── Voit devis généré automatiquement
   └── Attend acceptation client
                    ↓
6. CLIENT (Accepte le devis)
   ├── Clique "Accepter" (DevisList.tsx)
   ├── Edge Function: create-stripe-checkout
   │   ├── Crée Stripe customer (si nécessaire)
   │   ├── Crée Checkout Session:
   │   │   ├── mode: 'payment'
   │   │   ├── amount: devis.amount
   │   │   ├── metadata: {devis_id, course_id}
   │   │   ├── success_url: /client-dashboard?payment=success
   │   │   └── cancel_url: /client-dashboard?payment=cancel
   │   └── Retourne: {url: checkout_url}
   ├── Redirection → Stripe Checkout (nouvelle fenêtre)
   └── Entre carte bancaire
                    ↓
7. STRIPE
   ├── Traite paiement
   ├── Si réussi: Webhook → Edge Function: stripe-webhook
   └── Event: payment_intent.succeeded
                    ↓
8. EDGE FUNCTION: stripe-webhook
   ├── Vérifie signature Stripe
   ├── Extrait metadata: {devis_id, course_id}
   ├── UPDATE courses
   │   SET status = 'accepted'
   │   WHERE id = {course_id}
   ├── UPDATE devis
   │   SET status = 'accepted',
   │       accepted_at = NOW()
   │   WHERE id = {devis_id}
   ├── RPC: generate_invoice_number({driver_id})
   │   └── Retourne: "FAC-001", "FAC-002"...
   ├── INSERT INTO factures:
   │   ├── course_id: {course_id}
   │   ├── devis_id: {devis_id}
   │   ├── driver_id: {driver_id}
   │   ├── client_id: {client_id}
   │   ├── invoice_number: "FAC-XXX"
   │   ├── amount: {devis.amount}
   │   ├── payment_status: 'paid'
   │   ├── paid_at: NOW()
   │   └── stripe_payment_id: {payment_intent_id}
   └── ⚠️ Email confirmation (Resend) À IMPLÉMENTER
                    ↓
9. CLIENT
   ├── Redirection success_url
   ├── Voit message "Paiement réussi !"
   ├── Course status: "accepted"
   └── Facture disponible dans "Mes Factures"
                    ↓
10. CHAUFFEUR
    ├── Notification paiement reçu (à implémenter)
    ├── Voit course status: "accepted"
    ├── Va dans "Factures"
    ├── Voit facture générée
    └── Peut commencer la course
                    ↓
11. ADMIN
    ├── Dashboard mis à jour automatiquement
    ├── get_platform_stats() recalculé
    ├── CA plateforme += {amount}
    └── Statistiques actualisées
```

---

## 7️⃣ SCHÉMA D'ARCHITECTURE GLOBAL (CORRIGÉ)

### 🏗️ Architecture Système Complète

```
┌───────────────────────────────────────────────────────────────────────┐
│                        SOLOCAB - ARCHITECTURE GLOBALE                 │
│                     (PostgreSQL/Supabase + Lovable Cloud)            │
└───────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                          COUCHE PRÉSENTATION                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐        │
│  │   ESPACE    │     │   ESPACE    │     │   ESPACE    │        │
│  │  CHAUFFEUR  │     │   CLIENT    │     │    ADMIN    │        │
│  │             │     │             │     │             │        │
│  │ React 18    │     │ React 18    │     │ React 18    │        │
│  │ TypeScript  │     │ TypeScript  │     │ TypeScript  │        │
│  │ TailwindCSS │     │ TailwindCSS │     │ TailwindCSS │        │
│  │ Shadcn/ui   │     │ Shadcn/ui   │     │ Shadcn/ui   │        │
│  │             │     │             │     │             │        │
│  │ /dashboard  │     │ /client-    │     │ /admin      │        │
│  │             │     │  dashboard  │     │             │        │
│  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘        │
│         │                   │                   │                │
│         └───────────────────┴───────────────────┘                │
│                             │                                    │
└─────────────────────────────┼────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │ SUPABASE AUTH     │
                    │  (Session JWT)    │
                    └─────────┬─────────┘
                              │
┌─────────────────────────────┼────────────────────────────────────┐
│                    LOVABLE CLOUD EDGE FUNCTIONS                   │
├─────────────────────────────┼────────────────────────────────────┤
│                             │                                    │
│                    ┌────────┴────────┐                          │
│                    │ Edge Functions  │                          │
│                    │   (Deno)        │                          │
│                    │                 │                          │
│                    │  Functions:     │                          │
│                    │  ├─ auth-login  │                          │
│                    │  ├─ register-*  │                          │
│                    │  ├─ create-*    │                          │
│                    │  ├─ stripe-*    │                          │
│                    │  ├─ qr-code-*   │                          │
│                    │  └─ send-email  │                          │
│                    └────────┬────────┘                          │
│                             │                                    │
│                    ┌────────┴────────┐                          │
│                    │  Middlewares:   │                          │
│                    │  ├─ CORS        │                          │
│                    │  ├─ Auth Check  │                          │
│                    │  └─ Secrets     │                          │
│                    └────────┬────────┘                          │
│                             │                                    │
└─────────────────────────────┼────────────────────────────────────┘
                              │
┌─────────────────────────────┼────────────────────────────────────┐
│                 SUPABASE DATABASE (PostgreSQL)                    │
├─────────────────────────────┼────────────────────────────────────┤
│                             │                                    │
│   ┌─────────────────────────┴─────────────────────────┐        │
│   │                   TABLES (8)                       │        │
│   ├────────────────────────────────────────────────────┤        │
│   │                                                    │        │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │        │
│   │  │ profiles │  │user_roles│  │ drivers  │       │        │
│   │  │   (PK)   │  │   (FK)   │  │   (FK)   │       │        │
│   │  └────┬─────┘  └────┬─────┘  └────┬─────┘       │        │
│   │       │ 1:1         │ ∞:1         │ 1:1          │        │
│   │  ┌────┴──────┐ ┌────┴─────┐ ┌────┴──────┐       │        │
│   │  │  clients  │ │ qr_codes │ │  courses  │       │        │
│   │  │   (FK)    │ │(FK UNIQUE│ │   (FK)    │       │        │
│   │  └────┬──────┘ └──────────┘ └────┬──────┘       │        │
│   │       │ 1:∞                      │ 1:∞          │        │
│   │  ┌────┴──────┐             ┌─────┴──────┐       │        │
│   │  │   devis   │             │  factures  │       │        │
│   │  │   (FK)    │ 1:0-1       │ (FK UNIQUE)│       │        │
│   │  └───────────┴─────────────┴────────────┘       │        │
│   │                                                  │        │
│   └──────────────────────────────────────────────────┘        │
│                                                               │
│   ┌──────────────────────────────────────────────────┐       │
│   │         DATABASE FUNCTIONS (9)                   │       │
│   ├──────────────────────────────────────────────────┤       │
│   │                                                  │       │
│   │  • calculate_course_price(...)                  │       │
│   │  • generate_quote_number(driver_id)             │       │
│   │  • generate_invoice_number(driver_id)           │       │
│   │  • generate_course_number(driver_id)            │       │
│   │  • get_client_id(user_id)                       │       │
│   │  • get_driver_id(user_id)                       │       │
│   │  • get_platform_stats()                         │       │
│   │  • has_role(user_id, role)                      │       │
│   │  • search_public_drivers(...)                   │       │
│   │                                                  │       │
│   └──────────────────────────────────────────────────┘       │
│                                                               │
│   ┌──────────────────────────────────────────────────┐       │
│   │              RLS POLICIES (30+)                  │       │
│   ├──────────────────────────────────────────────────┤       │
│   │                                                  │       │
│   │  • Drivers can view their own profile           │       │
│   │  • Clients can view their own profile           │       │
│   │  • Admins can manage all [table]                │       │
│   │  • Drivers can view/manage their data           │       │
│   │  • Clients can view/manage their data           │       │
│   │  • Public can view active QR codes              │       │
│   │  • ... (isolation des données par rôle)         │       │
│   │                                                  │       │
│   └──────────────────────────────────────────────────┘       │
│                                                               │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│                  SERVICES EXTERNES                        │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   STRIPE     │  │   RESEND     │  │   (MAPBOX)   │  │
│  │  (Paiement)  │  │   (Email)    │  │   (Maps)     │  │
│  │              │  │              │  │              │  │
│  │ • Checkout   │  │ • Validation │  │ • À impl.    │  │
│  │ • Subscript. │  │ • Paiement   │  │              │  │
│  │ • Webhook    │  │ • QR code    │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### 🔐 Flux d'Authentification Global (Supabase)

```
┌───────────────────────────────────────────────────────────┐
│              FLUX D'AUTHENTIFICATION GLOBAL               │
│                    (Supabase Auth)                        │
└───────────────────────────────────────────────────────────┘

CONNEXION
─────────
User (tout type)
     │
     ├─→ Supabase Auth: signInWithPassword(email, password)
     │
     ├─→ Supabase vérifie:
     │   ├─ Email existe dans auth.users
     │   ├─ Password haché (bcrypt)
     │   └─ Compte activé
     │
     ├─→ Génère Session JWT:
     │   {
     │     user: {
     │       id: uuid,
     │       email: string,
     │       ...
     │     },
     │     access_token: string,
     │     refresh_token: string,
     │     expires_at: timestamp
     │   }
     │
     └─→ Frontend (useAuth hook):
         ├─ Stocke session (localStorage automatique)
         ├─ SELECT role FROM user_roles WHERE user_id = $user_id
         └─ Redirection selon role:
            ├─ role = 'driver' → /dashboard
            ├─ role = 'client' → /client-dashboard
            └─ role = 'admin' → /admin

VÉRIFICATION (toutes requêtes Supabase)
────────────────────────────────────────
User
     │
     ├─→ Requête Supabase client
     │   (access_token automatiquement inclus)
     │
     ├─→ Supabase Backend:
     │   ├─ Extrait JWT du header Authorization
     │   ├─ Vérifie signature
     │   ├─ Vérifie expiration
     │   ├─ Extrait user.id
     │   └─ Applique RLS policies:
     │       - has_role(auth.uid(), 'admin')
     │       - auth.uid() = user_id
     │       - driver_id = get_driver_id(auth.uid())
     │       - etc.
     │
     └─→ Si valide: Retourne données filtrées par RLS
         Si invalide: 401 Unauthorized

RAFRAÎCHISSEMENT AUTOMATIQUE
────────────────────────────
Supabase Client (auto)
     │
     ├─→ Détecte token expiré
     ├─→ Utilise refresh_token
     ├─→ Génère nouveau access_token
     └─→ Continue requête

DÉCONNEXION
───────────
User
     │
     ├─→ Supabase Auth: signOut()
     ├─→ Supprime session (localStorage)
     ├─→ Révoque refresh_token
     └─→ Redirection /login
```

---

## 📊 RÉSUMÉ DES RELATIONS (CORRIGÉ)

### Relations de Données

```
profiles (1:1) ────→ drivers
         │
         └─────────→ (1:1) clients
         │
         └─────────→ (∞:1) user_roles ← CRITIQUE pour sécurité

drivers (1:∞) ────→ clients (exclusifs)
        │
        ├─────────→ (1:1) qr_codes ✅ UNIQUE constraint
        │
        ├─────────→ (1:∞) courses
        │
        ├─────────→ (1:∞) devis
        │
        └─────────→ (1:∞) factures

clients (1:∞) ────→ courses
        │
        ├─────────→ (∞:1) qr_codes (via qr_code_id)
        │
        ├─────────→ (1:∞) devis
        │
        └─────────→ (1:∞) factures

courses (1:∞) ────→ devis ✅ CORRIGÉ (était 1:1)
        │
        └─────────→ (1:0-∞) factures

devis (1:0-1) ────→ factures ✅ UNIQUE constraint
```

### Hiérarchie des Rôles (via user_roles table)

```
ADMIN (God Mode)
  │
  ├─→ Peut TOUT voir (RLS bypassé)
  ├─→ Peut TOUT gérer
  ├─→ Valide chauffeurs (status: pending → validated)
  ├─→ Supervise plateforme (get_platform_stats)
  └─→ Gestion utilisateurs complète

CHAUFFEUR (Fournisseur)
  │
  ├─→ Voit SES clients (RLS: driver_id = get_driver_id(auth.uid()))
  ├─→ Voit SES courses
  ├─→ Voit SES devis/factures
  ├─→ Génère SON QR code (1:1 UNIQUE)
  ├─→ Gère SON abonnement Stripe
  └─→ Gère SON profil public

CLIENT (Demandeur)
  │
  ├─→ Voit SON chauffeur (si is_exclusive = true)
  ├─→ Voit SES courses (RLS: client_id = get_client_id(auth.uid()))
  ├─→ Voit SES devis/factures
  ├─→ Crée des courses
  └─→ Accepte devis → Paiement Stripe
```

---

## ✅ CHECKLIST D'ARCHITECTURE (MISE À JOUR)

### Espace Chauffeur

- ✅ Dashboard avec stats
- ✅ Gestion clients (liste, badge exclusif)
- ✅ Gestion courses (liste, filtres)
- ✅ Gestion devis/factures (listes)
- ✅ QR code (génération, partage, téléchargement)
- ✅ Abonnement Stripe (49.99€/mois)
- ⚠️ Profil public (activation, configuration) - Partiellement
- ⚠️ Paramètres (tarifs, véhicule, entreprise) - Partiellement
- ❌ Messages (NON IMPLÉMENTÉ)

### Espace Client

- ✅ Dashboard avec infos chauffeur
- ✅ Demande de course (avec génération auto devis)
- ✅ Liste mes courses
- ✅ Liste mes devis
- ⚠️ Acceptation devis → Stripe (à tester)
- ✅ Liste mes factures
- ❌ Messages (NON IMPLÉMENTÉ)
- ✅ Profil

### Espace Admin

- ✅ Dashboard statistiques (get_platform_stats)
- ✅ Validation chauffeurs (approuver/rejeter)
- ⚠️ Documents chauffeurs (stockage à implémenter)
- ✅ Gestion utilisateurs (liste, actions basiques)
- ✅ Gestion chauffeurs (liste, filtres)
- ✅ Gestion clients (liste, filtres)
- ❌ Vue globale courses/transactions (À CRÉER)
- ❌ Rapports & analytics (À CRÉER)
- ❌ Paramètres plateforme (À CRÉER)

### Relations & Contraintes

- ✅ Admin → Chauffeur (validation)
- ✅ Chauffeur → QR Code (génération) - **UNIQUE constraint**
- ✅ QR Code → Client (inscription exclusive)
- ✅ Chauffeur ↔ Client (dual association: driver_id + driver_ids)
- ✅ Client → Course (création)
- ✅ Course → Devis (auto-génération) - **Relation 1:∞**
- ✅ Devis → Facture (après paiement) - **UNIQUE constraint**
- ✅ Stripe Webhook → Facture (génération automatique)

### Base de Données

- ✅ 8 Tables PostgreSQL/Supabase configurées
- ✅ 9 Database Functions opérationnelles
- ✅ 30+ RLS Policies actives
- ✅ user_roles table pour sécurité
- ✅ Contraintes UNIQUE critiques ajoutées
- ✅ Edge Functions déployées (8)

---

## 🎉 CONCLUSION

Cette architecture corrigée reflète l'état réel du système SoloCab:

**✅ Points forts:**
- Backend robuste (PostgreSQL/Supabase + Lovable Cloud)
- Sécurité via RLS policies et user_roles
- Génération automatique des devis
- Paiement Stripe intégré
- Contraintes d'intégrité appliquées

**⚠️ Points à améliorer:**
- Système de messages (non implémenté)
- Stockage documents chauffeurs (Storage Supabase)
- Rapports & analytics admin
- Exports PDF/CSV
- Notifications temps réel

**🔧 Corrections appliquées:**
- MongoDB → PostgreSQL/Supabase
- users → profiles + user_roles
- courses (1:1) devis → courses (1:∞) devis
- Contraintes UNIQUE ajoutées
- Génération auto devis implémentée
