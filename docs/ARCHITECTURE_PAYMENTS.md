# Paiements et Stripe Connect

## Architecture Stripe Connect

SoloCab centralise les paiements via **Stripe Connect Express**. Chaque chauffeur possède son propre compte pour la réception directe des fonds. SoloCab ne détient jamais directement les fonds des courses.

### Prérequis
- Activation du mode **Marketplace/Platform** sur le compte Stripe principal de SoloCab
- Comptes **Express** activés dans les paramètres Connect
- Sans cette configuration, les edge functions retourneront une erreur 500

---

## Frais et terminologie

### Règle absolue
SoloCab ne prélève **AUCUNE commission**. Toutes les déductions sont étiquetées :
- **Frais de transaction** ou **Frais de gestion**

### Structure des frais par course
| Élément | Montant |
|---------|---------|
| Frais Stripe | ~1,5% + 0,25€ |
| Frais SoloCab | 0,50€ (fixe) |
| **Net chauffeur** | Brut - Frais Stripe - Frais SoloCab |

### Frais sur partage de course (Réseau de Partage)
| Élément | Montant |
|---------|---------|
| Commission expéditeur (< 30€) | 15% |
| Commission expéditeur (≥ 30€) | 20% |
| Frais de transaction SoloCab | 0,25€ (fixe par course) |
| **Net chauffeur exécutant** | Montant course - Commission - 0,25€ |

Les commissions sont gérées automatiquement via Stripe Connect (split payment).
Les partenariats bilatéraux ne sont plus requis : tout chauffeur avec Stripe Connect actif peut participer au réseau.

---

## Système d'acompte

Les chauffeurs peuvent demander entre **10% et 30%** du prix de la course à la réservation.

### Flux
1. Empreinte bancaire (0€) prise à la réservation
2. Acompte capturé selon le % configuré
3. Solde capturé à la complétion de la course
4. Frais SoloCab (0,50€) proratisés entre acompte et paiement final

### Demande manuelle
Un chauffeur peut déclencher une demande d'acompte pour n'importe quelle course via un bouton de partage (WhatsApp/SMS/Email) générant un lien Stripe Checkout.

---

## Politique d'annulation

### Course sans acompte
- **Fenêtre gratuite** : 1h avant la course (T-1h)
- **Après** : Client débité de 10€ de frais (reversés au chauffeur)

### Course avec acompte
- **Fenêtre gratuite** : 4h avant la course (T-4h)
- **Après** : Acompte conservé par le chauffeur

### Annulation par le chauffeur
- Client **intégralement remboursé** (acompte inclus)
- Aucun frais appliqué
- Distinction stricte via `cancelled_by`

---

## Clôture de course

1. Chauffeur clique "Terminer la course"
2. PaymentIntent généré pour le solde restant (Total - Acompte)
3. Course passe en état **"Paiement en attente"** (jaune)
4. Confirmation Stripe → **vert** / Échec → **rouge**

### En cas d'échec
Le chauffeur peut générer un **lien de paiement manuel** (Stripe Checkout) envoyé par SMS ou WhatsApp pour régularisation.

---

## Traçabilité financière

Table `stripe_transactions` enregistrant chaque événement :
- Acompte, solde, frais, remboursement
- Transition Montant Brut → Montant Net détaillée dans devis et factures

---

## Modes de paiement chauffeur

Configuration dans "Encaissements" :
1. **Matériel personnel** : TPE propre du chauffeur
2. **SoloCab Stripe Connect** : Paiements en ligne routés vers le compte Stripe du chauffeur

Méthodes acceptées configurables : Espèces, CB, Virement, etc.
Les formulaires de réservation et la vitrine s'adaptent automatiquement.

---

## Règlement hebdomadaire (Netting)

### Principe
Au lieu de transférer les commissions et collecter les frais **à chaque transaction**, SoloCab agrège tout sur une semaine et exécute un **transfert net unique** par chauffeur chaque lundi à 6h.

### Avantages
- **Réduction des frais Stripe** : 1 transfert au lieu de N (économie ~0,25€ par transaction évitée)
- **Simplification comptable** : un seul mouvement hebdomadaire par chauffeur
- **Transparence** : détail complet dans `driver_weekly_balances`

### Calcul du solde net par chauffeur
| Élément | Direction |
|---------|-----------|
| Commissions gagnées (courses partagées) | + Chauffeur reçoit |
| Frais SoloCab 0,50€ × courses standard en ligne | - SoloCab collecte |
| Frais SoloCab 0,25€ × courses partagées reçues | - SoloCab collecte |
| **Net** | Positif → transfert au chauffeur |

### Tables
- `weekly_settlements` : batch de règlement (par semaine)
- `driver_weekly_balances` : solde net par chauffeur par semaine
- `shared_course_payments.settlement_id` : lien vers le batch

### Cron
Edge Function `process-weekly-settlement` déclenchée chaque lundi 6h UTC via pg_cron.
