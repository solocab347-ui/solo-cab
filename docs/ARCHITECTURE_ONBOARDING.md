# Tunnel d'Onboarding Chauffeur

## Structure : 8 étapes

Le tunnel d'onboarding est un carrousel horizontal de 8 étapes obligatoires :

| # | Étape | Contenu clé |
|---|-------|-------------|
| 1 | **Vision** | Parcours interactif 4 slides : problèmes industrie (18-45% commissions) → solutions SoloCab. Sélection persona (Pionnier, Bâtisseur, Explorateur). Sub-step persisté en DB. |
| 2 | **Objectifs** | Définition multi-KPI : CA, courses, clients, heures, KM. Cibles arrondies au multiple de 5€/500€. Suggestion +25% (min +500€) basée sur le CA actuel. |
| 3 | **Tarifs** | Configuration de la grille tarifaire du chauffeur |
| 4 | **Profil** | Informations personnelles, SIRET (14 chiffres), adresse entreprise, véhicule (modèle, année, couleur via 12 pastilles) |
| 5 | **Documents** | Dépôt obligatoire : Assurance RC Pro + Assurance RC Circulation |
| 6 | **Plaque NFC** | Commande plaque NFC (skippable). QR code du dashboard utilisable en attendant. |
| 7 | **Encaissements** | 3 parcours : (1) Matériel personnel, (2) Partenariat SumUp, (3) Stripe Connect (recommandé) |
| 8 | **Lancement** | Activation manuelle de l'essai via bouton "Lancer mon indépendance" |

---

## Navigation UX

- **Flèches** haute visibilité avec backdrop blur et edge gradients
- **Pulse animé** sur la flèche "Suivant" quand les conditions sont remplies
- **Touch targets** élargis (w-12 h-24) pour mobile
- **Indicateurs d'étape** interactifs : retour aux étapes déjà complétées

---

## Garde de navigation

Tout chauffeur avec `onboarding_completed: false` est automatiquement redirigé vers `/driver-welcome`. Ce mécanisme garantit que les configurations critiques sont capturées avant l'utilisation du dashboard.

### Utilisateurs legacy
Les chauffeurs inscrits sous l'ancien système sont contraints de recommencer le tunnel depuis l'étape Vision. Leurs données précédentes sont conservées.

---

## Gouvernance documentaire

```
Inscription → Tunnel (8 étapes avec dépôt docs) → Validation admin → Activation essai
```

- Le statut `documents_status` passe à `validated` après approbation admin
- Répercuté en temps réel via Realtime côté chauffeur
- L'essai ne démarre **jamais** automatiquement : validation admin + action manuelle requises
- Pour Stripe Connect : le compte Stripe doit aussi être actif

---

## Étape Encaissements (détail)

| Option | Description |
|--------|-------------|
| Matériel personnel | Le chauffeur utilise son propre TPE |
| Partenariat SumUp | Achat TPE via lien d'affiliation |
| **Stripe Connect** (recommandé) | Badge "Recommandé". Paiements en ligne, acomptes automatisés, partage de courses, fiscalité simplifiée. Frais de gestion : 0,50€/course |

---

## Acquisition client (étape NFC)

Tunnel d'acquisition expliqué au chauffeur :
```
Scan (NFC/QR) → Services → Inscription → Fidélisation
```

Message fort : **les clients appartiennent exclusivement au chauffeur**, pas à SoloCab. Accès direct aux coordonnées pour la fidélisation.

Cibles d'acquisition mensuelles : 1 à 50 nouveaux clients avec visualiseur de tunnel de conversion (taux de rétention estimé : 35%).
