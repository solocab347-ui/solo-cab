# Rôles, Données et Isolation

## 1. Structure des Rôles

| Rôle | Description |
|------|-------------|
| `admin` | Administrateur unique de la plateforme (réservé) |
| `driver` | Chauffeur VTC indépendant ou membre d'une flotte |
| `client` | Client particulier |
| `company` | Entreprise cliente |
| `fleet_manager` | Gestionnaire de flotte |

### Table `user_roles`
```sql
- id: UUID (PK)
- user_id: UUID (FK → auth.users)
- role: app_role (enum)
- created_at: timestamp
```

**Règle** : Un utilisateur peut avoir plusieurs rôles (ex: driver + client).

---

## 2. Relations principales

### Chauffeur → Clients
```
drivers (1) ──→ (N) clients
  └─ via driver_id (exclusif) ou driver_ids[] (multi-chauffeur)
```

### Chauffeur → Courses → Devis → Factures
```
drivers (1) ──→ (N) courses ──→ (1) devis ──→ (1) factures
              └─ client_id (nullable pour guest bookings)
```

### Flottes
```
fleet_managers (1) ──→ (N) fleet_manager_drivers ←── (1) drivers
                └─ (N) clients (clients de la flotte)
```

---

## 3. Isolation des données (RLS)

Toutes les tables utilisent Row Level Security pour garantir que :
- Un chauffeur ne voit que **ses propres données**
- Un client ne voit que **ses propres réservations**
- Aucune donnée croisée entre chauffeurs

### Fonctions SECURITY DEFINER
Les fonctions critiques utilisent `SECURITY DEFINER` avec `SET search_path TO 'public'` pour :
- Éviter les attaques par path hijacking
- Permettre des opérations cross-table sécurisées

---

## 4. Contraintes et Index

### Contraintes uniques
| Table | Contrainte | Colonnes |
|-------|------------|----------|
| `courses` | `courses_driver_course_number_unique` | (driver_id, course_number) |
| `devis` | `devis_driver_quote_number_unique` | (driver_id, quote_number) |
| `factures` | `factures_driver_invoice_number_unique` | (driver_id, invoice_number) |
| `drivers` | `drivers_user_id_key` | (user_id) |
| `clients` | `clients_user_id_key` | (user_id) |

### Triggers de protection
| Table | Trigger | Action |
|-------|---------|--------|
| `courses` | `validate_course_number_trigger` | Vérifie unicité avant INSERT/UPDATE |
| `devis` | `validate_quote_number_trigger` | Vérifie unicité avant INSERT/UPDATE |
| `factures` | `validate_invoice_number_trigger` | Vérifie unicité avant INSERT/UPDATE |
