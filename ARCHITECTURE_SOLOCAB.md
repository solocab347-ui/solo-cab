# Architecture SoloCab - Documentation de Référence

## Vue d'ensemble

SoloCab est une plateforme de gestion VTC avec **isolation complète des données par chauffeur**. Chaque chauffeur opère dans son propre espace de données, avec ses propres clients, courses, devis et factures.

**Positionnement** : SoloCab est un **outil d'infrastructure pour professionnels indépendants**, pas une place de marché. Les clients acquis via les outils de la plateforme (NFC, QR Code) appartiennent **exclusivement au chauffeur** et non à SoloCab.

---

## Documentation détaillée

Ce cahier des charges est découpé en fichiers spécialisés :

| Fichier | Contenu |
|---------|---------|
| [ARCHITECTURE_ROLES_DATA.md](./docs/ARCHITECTURE_ROLES_DATA.md) | Rôles, isolation des données, RLS, relations |
| [ARCHITECTURE_NUMBERING.md](./docs/ARCHITECTURE_NUMBERING.md) | Système de numérotation unifié RES-XXX |
| [ARCHITECTURE_ONBOARDING.md](./docs/ARCHITECTURE_ONBOARDING.md) | Tunnel d'onboarding 8 étapes, validation documents |
| [ARCHITECTURE_PAYMENTS.md](./docs/ARCHITECTURE_PAYMENTS.md) | Stripe Connect, acomptes, annulations, frais |
| [ARCHITECTURE_SUBSCRIPTIONS.md](./docs/ARCHITECTURE_SUBSCRIPTIONS.md) | Abonnements, essai 14j, cycle de vie, recouvrement |
| [ARCHITECTURE_CLIENTS.md](./docs/ARCHITECTURE_CLIENTS.md) | Types de clients, NFC/QR, acquisition, fidélisation |
| [ARCHITECTURE_OBJECTIVES.md](./docs/ARCHITECTURE_OBJECTIVES.md) | Objectifs, planning, coaching IA, KPIs |
| [ARCHITECTURE_DESIGN_SYSTEM.md](./docs/ARCHITECTURE_DESIGN_SYSTEM.md) | Tokens sémantiques, conventions CSS |
| [ARCHITECTURE_CONSTRAINTS.md](./docs/ARCHITECTURE_CONSTRAINTS.md) | Précision financière, scalabilité, monitoring |

---

## Principes fondamentaux

### 1. Isolation par chauffeur
Toutes les tables utilisent RLS. Un chauffeur ne voit que ses propres données.

### 2. Propriété des clients
Les clients appartiennent au chauffeur, pas à SoloCab. Accès direct aux coordonnées.

### 3. Aucune commission
SoloCab ne prélève **aucune commission**. Seuls des frais de transaction (0,50€/course + frais Stripe) s'appliquent.

### 4. Précision financière
Toutes les données financières sont stockées en **centimes** (entiers). Division par 100 pour l'affichage avec `.toFixed(2)`.

### 5. Terminologie
- « Encaissements » (jamais « Paiement ») pour la configuration des modes de réception
- « Frais de transaction » (jamais « Commission »)

---

*Document mis à jour le 10 février 2026 - Version 2.0*
