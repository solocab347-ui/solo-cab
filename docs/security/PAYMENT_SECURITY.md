# SoloCab — Payment Security (PCI-DSS SAQ-A)

## 1. Périmètre PCI

SoloCab est éligible **SAQ-A** : aucun PAN ne transite par nos serveurs.
- Carte saisie via **Stripe PaymentElement** (iframe Stripe)
- Stockage tokens : Stripe uniquement (`payment_method_id`, `customer_id`)
- Notre DB stocke seulement : `last4`, `brand`, `exp_month`, `exp_year`

## 2. Architecture Stripe

| Composant | Rôle |
|---|---|
| **Stripe Connect (Express)** | Compte chauffeur, payout direct |
| **Destination charges** | `on_behalf_of` chauffeur + `application_fee_amount` SoloCab |
| **PaymentElement** | Saisie PCI-compliant côté client |
| **Setup Intent** | Hold carte avant course (off_session future use) |
| **Payment Intent** | Hold puis capture après course |
| **Webhooks signés** | Source de vérité pour statuts |

## 3. Idempotency obligatoire

Tout `paymentIntents.create` et `.capture` doit avoir un `idempotencyKey` :
- `card-hold:${courseId}:v1`
- `capture:${paymentIntentId}:v1`
- `final-payment:${courseId}:v1`
- `course-payment:${courseId}:${capture_method}:v1`
- `finalize-capture:${courseId}:${holdPiId}:v1`

Garantit qu'un retry ne crée jamais 2 transactions.

## 4. Anti-double-paiement (DB)

| Index unique | Rôle |
|---|---|
| `payments_course_capture_unique_idx` | Une seule capture par course |
| `payments_course_cash_unique_idx` | Un seul paiement cash par course |
| `idx_payments_unique_stripe_payment_intent` | Un PI = une row payments |

Double protection : Stripe (idempotency) + DB (contrainte).

## 5. Webhooks

```typescript
const event = await stripe.webhooks.constructEventAsync(
  body, signature, Deno.env.get('STRIPE_WEBHOOK_SECRET')!
);
// Déduplication :
const { error } = await supabase.from('processed_stripe_events').insert({ event_id: event.id });
if (error?.code === '23505') return new Response('duplicate', { status: 200 });
```

## 6. Anti-fraude

- `card_hold_status` doit être `confirmed` avant accept course
- Risk scoring client (`+1` par no-show, `-3` par course OK, `-2` par signal positif) — block à `-5`
- Cancellation policy server-side (jamais bypass client)
- Refunds : action admin uniquement, loggée

## 7. Race conditions

- `FOR UPDATE NOWAIT` dans `finalize-course-payment` et `stripe-webhook` pour éviter capture concurrente
- Acceptation devis : verrou même pattern

## 8. Rate limits Stripe

- Live : 100 req/s read + 100 req/s write
- À 1000 paiements/min concurrents : demander upgrade Stripe support

## 9. Audit financier

- Edge function `admin-financial-audit` reconcile DB ↔ Stripe en direct
- PDF de preuve via `admin-payment-proof`
- Aucune correction manuelle sans trace dans `payments_audit_log`

## 10. Règles métier strictes

- Cash & Card uniquement (jamais autre méthode)
- **Pas de cash sur shared courses** (Stripe-only)
- Commission cash : 0.50 € débitée sur prochains payouts Stripe
- Pas d'IAP sur app native (App Store compliance)
