# Abonnements et Cycle de Vie

## Tarification

| Plan | Prix | Détail |
|------|------|--------|
| Mensuel | 29,99€/mois | Sans engagement |
| Annuel | 305,90€/an | ~15% de réduction |
| Plaque NFC Standard (Bois) | 14,99€ | -20% avec abonnement |
| Plaque NFC Premium (Plastique) | 29,99€ | -20% avec abonnement |

---

## Hiérarchie d'accès (par priorité)

| Niveau | Type | Comportement |
|--------|------|-------------|
| 1 | **Accès Administratif/Illimité** | Permanent, protégé contre toute expiration. Aucune bannière d'essai. |
| 2 | **Accès Temporaire Gratuit** | Valide jusqu'à la date de fin. Aucune demande de paiement. |
| 3 | **Abonnement Stripe** | Validé en temps réel via `subscription_paid = true` |
| 4 | **Essai 14 jours** | Activé manuellement après validation admin des documents |

La navigation et les bannières s'adaptent dynamiquement selon le statut d'accès le plus élevé.

---

## Essai de 14 jours

### Activation
1. Chauffeur complète l'onboarding (8 étapes)
2. Admin valide les documents (`documents_status = 'validated'`)
3. Pour Stripe Connect : compte Stripe actif requis
4. Chauffeur clique **"Lancer mon indépendance"** (activation manuelle)
5. L'essai démarre **sans carte bancaire**

### Expiration
- À J+14, le compte passe en **lecture seule** sans abonnement
- Redirection vers une page de souscription personnalisée célébrant les accomplissements :
  - Revenus cumulés, clients acquis, courses réalisées
  - Choix d'abonnement (mensuel/annuel)
  - Proposition de plaque NFC avec -20% si non possédée

### Annulation d'essai
- Le chauffeur peut annuler l'essai à tout moment
- Accès conservé jusqu'à la fin de la période (14 ou 30 jours)
- Bouton **"Reprendre mon essai gratuit"** via edge function `reactivate-trial`

---

## Abonnement actif

### Gestion
- Portail client Stripe pour modifier le paiement, consulter les factures, résilier
- Pour les utilisateurs en essai sans ID Stripe : message informatif

### Résiliation
- Accès maintenu jusqu'au terme de la période payée
- Bouton **"Réactiver mon abonnement"** via `reactivate-subscription`

### Reprise après expiration
- Paiement immédiat requis, **aucun nouvel essai**
- Les chauffeurs en statut `legacy` sont redirigés vers `/chauffeur/migration`

---

## Recouvrement automatisé

Déclenché via webhook `invoice.payment_failed` :

1. Mise à jour du statut `past_due` en base
2. Incrémentation du compteur d'échecs
3. Emails de relance à urgence progressive :
   - Rappel standard sous 48h
   - Relances **URGENTES** ensuite
4. Bouton **"Régulariser mon paiement"** → Portail Stripe

---

## Synchronisation webhooks

Événements traités par `stripe-webhook` :
- `checkout.session.completed`
- `customer.subscription.*`
- `invoice.*`

Réconciliation via `driver_id` dans les métadonnées Stripe.

---

## Migration entre comptes Stripe

- Ancien ID Stripe marqué `legacy` et effacé
- Prévention des doubles prélèvements
- Redirection vers `/chauffeur/migration` pour re-souscription
