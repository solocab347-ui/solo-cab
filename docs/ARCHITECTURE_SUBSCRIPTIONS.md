# Abonnements et Cycle de Vie

## Modèle Freemium

| Tier | Prix | Détail |
|------|------|--------|
| **Gratuit** | 0€ | Accès complet aux fonctionnalités de base après validation documents |
| **Premium** | 19,99€/mois | Partenariats, échange de courses, promotions, prospection, planning, objectifs, encaissements |
| Plaque NFC Standard (Bois) | 14,99€ | Achat indépendant |
| Plaque NFC Premium (Plastique) | 29,99€ | Achat indépendant |

---

## Fonctionnalités par tier

### Gratuit (par défaut après validation documents)
- Gestion illimitée de clients
- Réservations et courses sans limite
- Devis et factures automatiques
- QR Code personnel
- Profil public sur la vitrine
- 0% de commission sur les courses
- Encaissements (Stripe Connect / TPE)
- Planning et objectifs
- Statistiques

### Premium (19,99€/mois)
- **Tout le gratuit** +
- Partenariats entre chauffeurs
- Échange et partage de courses (réseau)
- Codes promotionnels et campagnes
- Prospection avancée (flyers, outils)

---

## Activation du compte

1. Chauffeur complète l'onboarding (8 étapes)
2. Admin valide les documents (`documents_status = 'validated'`)
3. **Accès gratuit immédiat** à toutes les fonctionnalités de base
4. Le chauffeur peut upgrader vers Premium à tout moment

---

## Gestion Premium

### Souscription
- Checkout Stripe via `create-premium-checkout`
- Produit Stripe : `prod_UIyvxaQ5c7vZSH` / Prix : `price_1TKMxCAdFPYTU471ZinaFMmJ`
- Pas d'essai gratuit — accès Premium immédiat après paiement

### Résiliation
- Accès Premium maintenu jusqu'au terme payé
- Retour automatique au tier gratuit
- Bouton de réabonnement disponible

### Vérification du statut
- Edge Function `check-driver-subscription` synchronise le tier avec Stripe
- Colonne `subscription_tier` dans la table `drivers` (valeurs: 'free', 'premium')
- Hook `useDriverPremium()` pour le gating côté frontend

---

## Feature Gating

Le composant `PremiumGate` protège les fonctionnalités premium :
- Affiche le contenu si l'utilisateur est premium
- Affiche un appel à l'upgrade sinon

```tsx
<PremiumGate isPremium={isPremium} featureName="Partenariats">
  <PartnershipHub />
</PremiumGate>
```

---

## Hiérarchie d'accès (par priorité)

| Niveau | Type | Tier |
|--------|------|------|
| 1 | **Accès Administratif/Illimité** | Premium (permanent) |
| 2 | **Accès Temporaire Gratuit** | Premium (jusqu'à date fin) |
| 3 | **Abonnement Premium Stripe** | Premium (tant qu'actif) |
| 4 | **Défaut** | Gratuit |

---

## Recouvrement automatisé

Déclenché via webhook `invoice.payment_failed` :

1. Mise à jour du statut `past_due` en base
2. Emails de relance progressifs
3. Après expiration → retour au tier gratuit (pas de blocage total)

---

## Synchronisation webhooks

Événements traités par `stripe-webhook` :
- `checkout.session.completed` → active le tier premium
- `customer.subscription.*` → met à jour `subscription_tier`
- `invoice.*` → gestion des impayés
